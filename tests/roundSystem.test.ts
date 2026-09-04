/**
 * Integration test for the engine-facing glue layer.
 *
 * Drives `roundSystem` exactly as react-native-game-engine would — synthetic
 * touches and a time delta — with a recording stand-in for audio. This runs in
 * plain Node because nothing below the host component imports React, which is
 * the architectural claim M4 is supposed to deliver (AGENTS.md rule 4). Matter
 * is exercised for real here; only the audio device is faked.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import type { AudioService } from '../game/audio/audioService.ts';
import { createSceneEntities, type GameEntities } from '../game/entities/sceneEntities.ts';
import { STAGES } from '../game/levels/stages.ts';
import { canvasToScreen, fitCanvas } from '../game/rendering/layout.ts';
import { roundSystem } from '../game/systems/roundSystem.ts';
import { createRound, startRound, targetViews } from '../game/state/roundState.ts';
import { PERFORMER_ANCHORS, VOCALIST_BLOCKING_RECT } from '../game/config/stage.ts';
import { COUNTDOWN, GROOVE_PAD, beatTimeMs } from '../game/config/rhythm.ts';
import { isReacting, performerPose } from '../game/systems/stageMotion.ts';
import { level01 } from '../game/levels/level01.ts';
import { addStrike, addBurst, STRIKE_TTL_MS, BURST_TTL_MS } from '../game/systems/effects.ts';

interface RecordingAudio extends AudioService {
  readonly calls: string[];
}

function createRecordingAudio(): RecordingAudio {
  const calls: string[] = [];
  return {
    calls,
    available: true,
    failureReason: null,
    playMusic: () => void calls.push('playMusic'),
    pauseMusic: () => void calls.push('pauseMusic'),
    resumeMusic: () => void calls.push('resumeMusic'),
    stopMusic: () => void calls.push('stopMusic'),
    restartMusic: () => void calls.push('restartMusic'),
    playSfx: (key) => void calls.push(`sfx:${key}`),
    dispose: () => void calls.push('dispose'),
  };
}

const SCREEN = { width: 2340, height: 1080 };

/**
 * The play surface is rarely at the window origin on a real device: a status
 * bar, a cutout inset, or safe-area padding shifts it. Every test here runs
 * with a non-zero offset so a regression that ignores it cannot pass —
 * deliberately larger than a real inset, so that dropping the offset lands
 * outside the (generous) M5A hitboxes rather than inside them by luck.
 */
const SURFACE_OFFSET = { pageX: 300, pageY: 260 };


/**
 * These tests are about the round that asks for **both jobs at once**, which
 * is the show — Stage 2 at M15, Stage 3 since M16 inserted the beat-teaching
 * stage in front of it.
 *
 * It is selected by what it *is* rather than by its index, so inserting
 * another stage cannot silently re-point these tests at a different round: the
 * Groove must be on, and objects must be in the air from the first second.
 * M16's Stage 2 has the Groove but throws nothing for twelve seconds, which is
 * exactly the round a dual-task test must not accidentally get.
 *
 * `createSceneEntities` opens on Stage 1, the defense-only drill, because that
 * is where the game itself opens. Selecting the stage here is exactly what
 * `GameEngine`'s stage selection does: point the scene at the stage and build
 * its round.
 */
function selectGrooveStage(entities: GameEntities): void {
  const stage = STAGES.find(
    (entry) => entry.groove && entry.level.phases.some((phase) => phase.fromMs === 0),
  );
  if (stage === undefined) throw new Error('no stage asks for both jobs at once');
  entities.scene.stage = stage;
  entities.scene.round = createRound(stage.level);
}

function setup() {
  const audio = createRecordingAudio();
  const entities = createSceneEntities(audio, null as never);
  selectGrooveStage(entities);
  entities.scene.viewport.width = SCREEN.width;
  entities.scene.viewport.height = SCREEN.height;
  entities.scene.viewport.pageX = SURFACE_OFFSET.pageX;
  entities.scene.viewport.pageY = SURFACE_OFFSET.pageY;
  startRound(entities.scene.round);
  return { audio, entities };
}

function surfacePoint(entities: GameEntities, x: number, y: number) {
  const fit = fitCanvas(entities.scene.viewport.width, entities.scene.viewport.height);
  return canvasToScreen(fit, x, y);
}

/**
 * A native touch-down at a canvas position, as the engine would deliver it.
 *
 * Page coordinates, because that is what the engine's bubbling `onTouchStart`
 * reliably provides — `locationX` is measured from whichever nested view the
 * finger happened to land on (M5A, Priority 1).
 */
function touchAtCanvas(entities: GameEntities, x: number, y: number) {
  const point = surfacePoint(entities, x, y);
  return [
    {
      type: 'start',
      event: {
        pageX: point.x + entities.scene.viewport.pageX,
        pageY: point.y + entities.scene.viewport.pageY,
      },
    },
  ];
}

/** The same touch as reported by a platform that omits page coordinates. */
function legacyTouchAtCanvas(entities: GameEntities, x: number, y: number) {
  const point = surfacePoint(entities, x, y);
  return [{ type: 'start', event: { locationX: point.x, locationY: point.y } }];
}

/** A browser click at a canvas position, as react-game-engine delivers it. */
function clickAtCanvas(entities: GameEntities, x: number, y: number) {
  const point = surfacePoint(entities, x, y);
  return {
    name: 'onMouseDown',
    payload: {
      clientX: point.x + entities.scene.viewport.pageX,
      clientY: point.y + entities.scene.viewport.pageY,
    },
  };
}

function step(
  entities: GameEntities,
  deltaMs = 16,
  touches: unknown[] = [],
  input: unknown[] = [],
) {
  roundSystem(entities, {
    touches: touches as never,
    input: input as never,
    time: { delta: deltaMs },
  });
}

/** Runs the engine until something is in the air, then returns it. */
function firstTargetInFlight(entities: GameEntities) {
  let guard = 0;
  while (guard < 1000) {
    const view = targetViews(entities.scene.round).find((v) => v.status === 'active');
    if (view) return view;
    step(entities);
    guard += 1;
  }
  throw new Error('no target spawned');
}

test('a touch in device coordinates resolves a hit in canvas space', () => {
  const { audio, entities } = setup();

  let guard = 0;
  while (targetViews(entities.scene.round).length === 0 && guard < 1000) {
    step(entities);
    guard += 1;
  }
  const view = targetViews(entities.scene.round).find((v) => v.status === 'active');
  assert.ok(view, 'no target to aim at');

  step(entities, 16, touchAtCanvas(entities, view.x, view.y));

  assert.equal(entities.scene.round.targetsDestroyed, 1);
  assert.ok(audio.calls.includes('sfx:glassBreak'));
  assert.ok(audio.calls.includes('sfx:stickWhoosh'));
});

test('a hit produces strike, burst, and physical debris', () => {
  const { entities } = setup();
  let guard = 0;
  while (targetViews(entities.scene.round).length === 0 && guard < 1000) {
    step(entities);
    guard += 1;
  }
  const view = targetViews(entities.scene.round).find((v) => v.status === 'active');
  assert.ok(view);

  step(entities, 16, touchAtCanvas(entities, view.x, view.y));

  assert.equal(entities.scene.effects.strikes.length, 1);
  assert.equal(entities.scene.effects.bursts.length, 1);
  assert.ok(entities.scene.shards.shards.length > 0, 'no debris spawned');

  // Debris is driven by Matter and must actually move, then be cleaned up.
  const start = entities.scene.shards.shards[0].body.position.y;
  for (let i = 0; i < 12; i += 1) step(entities);
  const moved = entities.scene.shards.shards[0]?.body.position.y ?? start + 1;
  assert.notEqual(moved, start, 'shards did not simulate');

  for (let i = 0; i < 120; i += 1) step(entities);
  assert.equal(entities.scene.shards.shards.length, 0, 'debris was never released');
  assert.equal(entities.scene.effects.strikes.length, 0);
  assert.equal(entities.scene.effects.bursts.length, 0);
});

test('a tap on empty canvas produces no hit feedback at all', () => {
  const { audio, entities } = setup();
  step(entities, 16, touchAtCanvas(entities, 30, 1040));
  assert.equal(entities.scene.effects.strikes.length, 0);
  assert.equal(entities.scene.shards.shards.length, 0);

  /*
   * The beat click is deliberately excluded rather than asserted away (M16).
   * It is a metronome: it sounds because a beat happened, not because anything
   * was hit, and the first tick of a round crosses the `GO` beat. What this
   * test is about is that a swing at nothing is answered by nothing — so the
   * check is that no *hit* sound was made.
   */
  assert.deepEqual(
    audio.calls.filter((call) => call !== 'sfx:beatClick'),
    [],
    'a tap that hit nothing still made a noise',
  );
  assert.ok(audio.calls.includes('sfx:beatClick'), 'the beat itself should still have sounded');
});

test('a slow frame does not discard new hit feedback before its first render', () => {
  const { entities, audio } = setup();
  const view = firstTargetInFlight(entities);
  addStrike(entities.scene.effects, 10, 10);
  addBurst(entities.scene.effects, 10, 10);

  step(entities, 350, touchAtCanvas(entities, view.x, view.y));

  assert.equal(entities.scene.round.targetsDestroyed, 1);
  assert.equal(audio.calls.filter(c => c === 'sfx:glassBreak').length, 1);
  assert.equal(entities.scene.effects.strikes.length, 1, 'old strike expires, new strike survives');
  assert.equal(entities.scene.effects.bursts.length, 1, 'old burst expires, new burst survives');
  assert.equal(entities.scene.effects.strikes[0].ageMs, 0);
  assert.equal(entities.scene.effects.bursts[0].ageMs, 0);
  assert.ok(entities.scene.shards.shards.every(shard => shard.ageMs === 0));

  step(entities, STRIKE_TTL_MS);
  assert.equal(entities.scene.effects.strikes.length, 0);
  assert.equal(entities.scene.effects.bursts.length, 1);
  step(entities, BURST_TTL_MS - STRIKE_TTL_MS);
  assert.equal(entities.scene.effects.bursts.length, 0);
});

test('a missed target reports an impact on the kit', () => {
  const { audio, entities } = setup();
  for (let i = 0; i < 400 && entities.scene.round.misses === 0; i += 1) step(entities);
  assert.equal(entities.scene.round.misses, 1);
  assert.ok(audio.calls.includes('sfx:impactThwack'));
});

test('a full played round reaches SHOW_COMPLETE and cues the crowd once', () => {
  const { audio, entities } = setup();

  let guard = 0;
  while (entities.scene.round.state !== 'SHOW_COMPLETE' && guard < 8000) {
    const round = entities.scene.round;
    assert.notEqual(round.state, 'SHOW_RUINED', 'perfect play still ruined the show');

    const target = targetViews(round).find((v) => v.status === 'active');
    const vocalist = round.vocalist.status === 'blocking';
    const touches = vocalist
      ? touchAtCanvas(
          entities,
          VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2,
          VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2,
        )
      : target
        ? touchAtCanvas(entities, target.x, target.y)
        : [];

    step(entities, 16, touches);
    guard += 1;
  }

  const round = entities.scene.round;
  assert.equal(round.state, 'SHOW_COMPLETE');
  assert.equal(round.elapsedMs, level01.durationMs);
  assert.ok(round.score > 0);
  assert.ok(round.vocalist.triggered, 'the vocalist never appeared');
  assert.equal(audio.calls.filter((c) => c === 'sfx:crowdApplause').length, 1);
  assert.equal(audio.calls.filter((c) => c === 'stopMusic').length, 1);
});

test('the system keeps running for a full round without a single throw', () => {
  const { entities } = setup();
  assert.doesNotThrow(() => {
    for (let i = 0; i < 4000; i += 1) {
      // Mash the screen at a fixed spot regardless of what is happening.
      step(entities, 16, i % 3 === 0 ? touchAtCanvas(entities, 960, 700) : []);
    }
  });
});

/* --- M5A: input reliability and stage life --- */

test('page coordinates are mapped through the play surface offset', () => {
  const { entities } = setup();
  const view = firstTargetInFlight(entities);

  // The same finger position, reported the way the engine actually reports it.
  step(entities, 16, touchAtCanvas(entities, view.x, view.y));
  assert.equal(entities.scene.round.targetsDestroyed, 1, 'a page-coordinate touch missed');
});

test('page coordinates are not mistaken for surface coordinates', () => {
  const { entities } = setup();
  const view = firstTargetInFlight(entities);

  // Page coordinates that have not had the surface offset removed. Treating
  // them as surface-relative is precisely the mapping bug under test, so this
  // event must resolve nothing.
  const surface = surfacePoint(entities, view.x, view.y);
  step(entities, 16, [{ type: 'start', event: { pageX: surface.x, pageY: surface.y } }]);
  assert.equal(entities.scene.round.targetsDestroyed, 0, 'a badly mapped touch still scored');

  // ...and the correctly mapped event for the same finger still does.
  step(entities, 16, touchAtCanvas(entities, view.x, view.y));
  assert.equal(entities.scene.round.targetsDestroyed, 1);
});

test('a platform without page coordinates still resolves through the location pair', () => {
  const { entities } = setup();
  const view = firstTargetInFlight(entities);
  step(entities, 16, legacyTouchAtCanvas(entities, view.x, view.y));
  assert.equal(entities.scene.round.targetsDestroyed, 1, 'the fallback path stopped working');
});

test('a touch with no usable coordinates at all is ignored rather than thrown on', () => {
  const { entities } = setup();
  firstTargetInFlight(entities);
  assert.doesNotThrow(() => step(entities, 16, [{ type: 'start', event: {} }]));
  assert.equal(entities.scene.round.targetsDestroyed, 0);
});

test('a browser reporting one finger twice resolves one swing', () => {
  const { entities } = setup();
  const round = entities.scene.round;
  firstTargetInFlight(entities);

  // Two objects almost on top of one another, so a second resolution of the
  // same swing has somewhere to land — without deduplication one tap would
  // smash both.
  const index = round.targets.findIndex((t) => t.status === 'active');
  assert.ok(index >= 0);
  const anchor = round.targets[index];
  round.targets = [
    anchor,
    { ...anchor, id: 4242, trajectory: { ...anchor.trajectory, driftPx: anchor.trajectory.driftPx + 30 } },
  ];
  const view = targetViews(round).find((v) => v.id === anchor.id);
  assert.ok(view);

  // A touch device in a browser fires onTouchStart and onMouseDown for the
  // same contact; both arrive in the same frame.
  const point = surfacePoint(entities, view.x, view.y);
  step(entities, 16, [], [
    {
      name: 'onTouchStart',
      payload: {
        touches: [
          {
            clientX: point.x + entities.scene.viewport.pageX,
            clientY: point.y + entities.scene.viewport.pageY,
          },
        ],
      },
    },
    clickAtCanvas(entities, view.x, view.y),
  ]);

  assert.equal(round.targetsDestroyed, 1, 'one swing destroyed two objects');
  assert.equal(entities.scene.effects.strikes.length, 1, 'one swing drew two strikes');
});

test('two genuinely separate fingers still resolve two swings', () => {
  const { entities } = setup();
  let guard = 0;
  while (targetViews(entities.scene.round).filter((v) => v.status === 'active').length < 2) {
    step(entities);
    guard += 1;
    if (guard > 2000) break;
  }
  const views = targetViews(entities.scene.round).filter((v) => v.status === 'active');
  assert.ok(views.length >= 2, 'could not get two targets in the air');

  const touches = [
    ...touchAtCanvas(entities, views[0].x, views[0].y),
    ...touchAtCanvas(entities, views[1].x, views[1].y),
  ];
  step(entities, 16, touches);
  assert.equal(entities.scene.round.targetsDestroyed, 2, 'a two-handed mash resolved once');
});

test('a hit next to a performer makes them flinch', () => {
  const { entities } = setup();
  firstTargetInFlight(entities);

  // Park a target exactly on the bassist rather than aiming at whatever
  // happened to spawn: the reaction is driven by where the break landed, not
  // by which target it was.
  const round = entities.scene.round;
  const index = round.targets.findIndex((t) => t.status === 'active');
  assert.ok(index >= 0, 'no target to reposition');
  round.targets[index] = {
    ...round.targets[index],
    // Progress 0 puts the pose exactly on the throw origin.
    spawnAtMs: round.elapsedMs,
    trajectory: {
      ...round.targets[index].trajectory,
      originX: PERFORMER_ANCHORS.bassist.x,
      originY: PERFORMER_ANCHORS.bassist.y,
    },
  };
  const aimed = targetViews(round).find((v) => v.status === 'active');
  assert.ok(aimed);
  assert.equal(aimed.x, PERFORMER_ANCHORS.bassist.x);
  assert.equal(aimed.y, PERFORMER_ANCHORS.bassist.y);
  assert.ok(aimed);
  step(entities, 16, touchAtCanvas(entities, aimed.x, aimed.y));

  assert.equal(round.targetsDestroyed, 1);
  assert.ok(
    isReacting(entities.scene.stageMotion, 'bassist'),
    'the bassist ignored a bottle exploding next to them',
  );
});

test('the stage keeps moving while the round is not running', () => {
  const audio = createRecordingAudio();
  const entities = createSceneEntities(audio, null as never);
  entities.scene.viewport.width = SCREEN.width;
  entities.scene.viewport.height = SCREEN.height;
  // Deliberately not started: this is the title screen.
  assert.equal(entities.scene.round.state, 'READY');

  const poses = new Set<string>();
  for (let i = 0; i < 200; i += 1) {
    step(entities);
    poses.add(performerPose(entities.scene.stageMotion, 'bassist'));
  }
  assert.equal(entities.scene.round.elapsedMs, 0, 'the round clock ran on the title screen');
  assert.ok(entities.scene.stageMotion.elapsedMs > 0, 'the stage froze on the title screen');
  assert.ok(poses.size > 1, 'the band stood still on the title screen');
});

test('the band reacts to what is in the air across a whole round', () => {
  const { entities } = setup();
  const seen = new Set<string>();
  for (let i = 0; i < 4000; i += 1) {
    step(entities);
    for (const id of ['bassist', 'guitarist', 'vocalist'] as const) {
      seen.add(performerPose(entities.scene.stageMotion, id));
    }
    if (entities.scene.round.state === 'SHOW_RUINED') break;
  }
  assert.ok(seen.has('dodge'), 'nobody ever ducked an incoming object');
});

// ---------------------------------------------------------------------------
// The beat click (M16)
// ---------------------------------------------------------------------------

/** How many clicks have sounded so far. */
function clicks(audio: RecordingAudio): number {
  return audio.calls.filter((call) => call === 'sfx:beatClick').length;
}

/** Runs a whole pre-roll in engine-sized steps. */
function runCountdown(entities: GameEntities): void {
  let guard = 0;
  while (entities.scene.round.state === 'COUNTDOWN' && guard < 1000) {
    step(entities, 16);
    guard += 1;
  }
}

test('the count-in is audible: three numerals and GO', () => {
  const { audio, entities } = setup();
  assert.equal(entities.scene.round.state, 'COUNTDOWN');

  runCountdown(entities);
  assert.equal(entities.scene.round.state, 'PLAYING');

  /*
   * Four clicks by the time the round begins: the three pre-roll beats and the
   * `GO` beat itself, which is round beat 0. This is the whole reason the
   * click is fired from `pulseClockMs` rather than from the scoring tick —
   * `tickRhythm` does not run in COUNTDOWN, and a count-in nobody can hear is
   * not a count-in.
   */
  assert.equal(clicks(audio), COUNTDOWN.leadBeats + 1);
});

test('the beat clicks once per beat through a round, and never twice', () => {
  const { audio, entities } = setup();
  runCountdown(entities);
  const afterCountdown = clicks(audio);

  // Eight beats of play, in ticks that do not divide the beat interval.
  const target = beatTimeMs(8);
  let guard = 0;
  while (entities.scene.round.elapsedMs < target && guard < 5000) {
    step(entities, 17);
    guard += 1;
  }

  assert.equal(clicks(audio) - afterCountdown, 8, 'the beat did not click once per beat');
});

test('the click can be switched off, and switching it off changes nothing else', () => {
  /*
   * The guarantee the whole switch rests on. The click is an *output* of the
   * beat clock, so muting it must not be able to move a judgement — and the
   * only way to show that is to play the same round twice, tap it in the same
   * places, and compare everything that is not the sound.
   */
  function play(clickEnabled: boolean) {
    const { audio, entities } = setup();
    entities.scene.flow.clickEnabled = clickEnabled;
    runCountdown(entities);

    /*
     * Tap the pad on every other beat, deliberately 45 ms late, so the round
     * ends up holding hits *and* misses *and* a broken streak — a comparison
     * across a round where nothing ever went wrong would not be worth much.
     */
    const pad = touchAtCanvas(entities, GROOVE_PAD.centerX, GROOVE_PAD.centerY);
    let nextBeat = 1;
    let guard = 0;
    while (nextBeat <= 11 && guard < 5000) {
      const due = entities.scene.round.elapsedMs >= beatTimeMs(nextBeat) + 45;
      step(entities, 16, due ? pad : []);
      if (due) nextBeat += 2;
      guard += 1;
    }
    return { audio, rhythm: entities.scene.rhythm, round: entities.scene.round };
  }

  const on = play(true);
  const off = play(false);

  assert.ok(clicks(on.audio) > 0, 'the click never sounded with the switch on');
  assert.equal(clicks(off.audio), 0, 'the click sounded with the switch off');

  // Everything the player is actually judged on is identical.
  assert.ok(on.rhythm.hits > 0, 'the test never landed a beat, so it proves nothing');
  assert.equal(off.rhythm.score, on.rhythm.score);
  assert.equal(off.rhythm.hits, on.rhythm.hits);
  assert.equal(off.rhythm.misses, on.rhythm.misses);
  assert.equal(off.rhythm.perfects, on.rhythm.perfects);
  assert.equal(off.rhythm.goods, on.rhythm.goods);
  assert.equal(off.rhythm.bestStreak, on.rhythm.bestStreak);
  assert.equal(off.rhythm.nextBeatToFinalize, on.rhythm.nextBeatToFinalize);
  assert.equal(off.round.score, on.round.score);
  assert.equal(off.round.integrity, on.round.integrity);
  assert.equal(off.round.targetsDestroyed, on.round.targetsDestroyed);

  // The one thing that does differ is the cursor's own bookkeeping, which is
  // fine: it is what decides whether a sound is due, and nothing reads it.
  assert.equal(off.rhythm.lastPulsedBeatIndex, on.rhythm.lastPulsedBeatIndex);
});

test('a defense-only stage never clicks, because it has no beat to keep', () => {
  const audio = createRecordingAudio();
  const entities = createSceneEntities(audio, null as never);
  // The scene opens on Stage 1, which is the defense drill.
  assert.equal(entities.scene.stage.groove, false);
  startRound(entities.scene.round);

  for (let i = 0; i < 400; i += 1) step(entities, 16);

  assert.ok(entities.scene.round.elapsedMs > 0, 'the round never started');
  assert.equal(clicks(audio), 0, 'a stage with no Groove made a metronome noise');
});

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
import { canvasToScreen, fitCanvas } from '../game/rendering/layout.ts';
import { roundSystem } from '../game/systems/roundSystem.ts';
import { startRound, targetViews } from '../game/state/roundState.ts';
import { PERFORMER_ANCHORS, VOCALIST_BLOCKING_RECT } from '../game/config/stage.ts';
import { isReacting, performerPose } from '../game/systems/stageMotion.ts';
import { level01 } from '../game/levels/level01.ts';

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

function setup() {
  const audio = createRecordingAudio();
  const entities = createSceneEntities(audio, null as never);
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

test('a tap on empty canvas produces no feedback at all', () => {
  const { audio, entities } = setup();
  step(entities, 16, touchAtCanvas(entities, 30, 1040));
  assert.equal(entities.scene.effects.strikes.length, 0);
  assert.equal(entities.scene.shards.shards.length, 0);
  assert.deepEqual(audio.calls, []);
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

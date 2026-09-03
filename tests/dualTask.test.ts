/**
 * Dual-task integration tests (M11).
 *
 * Every case in `docs/verification/M11-gate.md` and the Input and Independence
 * sections of `docs/verification/RHYTHM-PIVOT-TEST-MATRIX.md`, driven through
 * `roundSystem` exactly as the engine would — synthetic touches and a time
 * delta, with only the audio device faked.
 *
 * The point of the milestone is that Groove and Defense coexist without either
 * one quietly stealing the other's input, so these run the real routing rather
 * than calling the two domains side by side.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import type { AudioService } from '../game/audio/audioService.ts';
import { createSceneEntities, type GameEntities } from '../game/entities/sceneEntities.ts';
import { canvasToScreen, fitCanvas } from '../game/rendering/layout.ts';
import { roundSystem } from '../game/systems/roundSystem.ts';
import {
  createRound,
  startRound,
  pauseRound,
  resumeRound,
  targetViews,
  type TargetView,
} from '../game/state/roundState.ts';
import { clearRhythm, nearestBeatIndex } from '../game/state/rhythmState.ts';
import { GROOVE_PAD, RHYTHM, beatTimeMs, padContainsPoint } from '../game/config/rhythm.ts';
import { HIT_FORGIVENESS } from '../game/config/targets.ts';
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
const SURFACE_OFFSET = { pageX: 300, pageY: 260 };

function setup() {
  const audio = createRecordingAudio();
  const entities = createSceneEntities(audio, null as never);
  entities.scene.viewport.width = SCREEN.width;
  entities.scene.viewport.height = SCREEN.height;
  entities.scene.viewport.pageX = SURFACE_OFFSET.pageX;
  entities.scene.viewport.pageY = SURFACE_OFFSET.pageY;
  startRound(entities.scene.round);
  runCountdown(entities);
  return { audio, entities };
}

/**
 * Drives the M13.1 pre-roll through the real system loop until the round
 * begins, so every case below starts where it always did: PLAYING, at elapsed
 * zero, with nothing spawned.
 */
function runCountdown(entities: GameEntities): void {
  for (let guard = 0; guard < 1000; guard += 1) {
    if (entities.scene.round.state !== 'COUNTDOWN') break;
    step(entities);
  }
  assert.equal(entities.scene.round.state, 'PLAYING', 'the countdown never reached GO');
  assert.equal(entities.scene.round.elapsedMs, 0, 'the round must begin at elapsed zero');
}

function surfacePoint(entities: GameEntities, x: number, y: number) {
  const fit = fitCanvas(entities.scene.viewport.width, entities.scene.viewport.height);
  return canvasToScreen(fit, x, y);
}

/** One native touch-down at a canvas position, page coordinates as on device. */
function touch(entities: GameEntities, x: number, y: number) {
  const point = surfacePoint(entities, x, y);
  return {
    type: 'start',
    event: {
      pageX: point.x + entities.scene.viewport.pageX,
      pageY: point.y + entities.scene.viewport.pageY,
    },
  };
}

/** A browser touch event carrying any number of simultaneous fingers. */
function webTouch(entities: GameEntities, points: Array<{ x: number; y: number }>) {
  const changedTouches = points.map(({ x, y }) => {
    const point = surfacePoint(entities, x, y);
    return {
      clientX: point.x + entities.scene.viewport.pageX,
      clientY: point.y + entities.scene.viewport.pageY,
    };
  });
  return { name: 'onTouchStart', payload: { changedTouches, touches: changedTouches } };
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

/** Advances until a target is in flight, tapping nothing. */
function firstTargetInFlight(entities: GameEntities): TargetView {
  for (let guard = 0; guard < 1000; guard += 1) {
    const view = targetViews(entities.scene.round).find((v) => v.status === 'active');
    if (view) return view;
    step(entities);
  }
  throw new Error('no target spawned');
}

/**
 * Runs the round to just before a beat, so the next tap lands on it.
 *
 * Stops one step short and returns the exact tap time, because `roundSystem`
 * judges a tap against the clock as it stood when the frame began.
 */
function advanceToBeat(entities: GameEntities, beatIndex: number): void {
  const target = beatTimeMs(beatIndex);
  for (let guard = 0; guard < 10_000; guard += 1) {
    const round = entities.scene.round;
    if (round.elapsedMs >= target) return;
    const remaining = target - round.elapsedMs;
    step(entities, Math.min(remaining, 16));
  }
  throw new Error('never reached the beat');
}

const PAD_POINT = { x: GROOVE_PAD.centerX, y: GROOVE_PAD.centerY };

// ---------------------------------------------------------------------------
// Each resolver minds its own business
// ---------------------------------------------------------------------------

test('a pad tap scores the Groove without touching the Defense', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  advanceToBeat(entities, 4);
  const scoreBefore = round.score;
  const destroyedBefore = round.targetsDestroyed;
  const comboBefore = round.combo;

  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);

  assert.equal(rhythm.hits, 1);
  assert.ok(rhythm.score > 0);
  assert.equal(round.score, scoreBefore, 'Defense score must not move');
  assert.equal(round.targetsDestroyed, destroyedBefore);
  assert.equal(round.combo, comboBefore);
});

test('a target tap hits the Defense without falsely scoring the Groove', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  const view = firstTargetInFlight(entities);
  // Deliberately on a beat, so only the *position* can disqualify it.
  const grooveBefore = rhythm.score;
  const hitsBefore = rhythm.hits;

  step(entities, 16, [touch(entities, view.x, view.y)]);

  assert.equal(round.targetsDestroyed, 1);
  assert.ok(round.score > 0);
  assert.equal(rhythm.score, grooveBefore, 'a tap off the pad must not score Groove');
  assert.equal(rhythm.hits, hitsBefore);
});

// ---------------------------------------------------------------------------
// The overlap case: one tap, two legitimate outcomes
// ---------------------------------------------------------------------------

/**
 * Drops a bottle into a chosen lane at a chosen progress.
 *
 * The seeded level never guarantees a bottle over the hi-hat exactly on a
 * beat, and waiting for one would make these tests depend on the spawn cadence
 * and throw speeds M11 forbids changing. The trajectory is authored the way
 * `spawnTarget` authors one — a real target on a real arc — with only its lane
 * and its point in the flight chosen. A straight throw (no arc, drift, or
 * spin) keeps the expected position readable.
 */
const PLANT_DURATION_MS = 3000;

function plantTarget(entities: GameEntities, laneX: number, progress = 0.99): TargetView {
  const round = entities.scene.round;
  const id = round.nextTargetId++;
  round.targets.push({
    id,
    kind: 'beerBottle',
    spawnAtMs: round.elapsedMs - PLANT_DURATION_MS * progress,
    durationMs: PLANT_DURATION_MS,
    laneX,
    trajectory: {
      originX: laneX,
      originY: 450,
      laneX,
      arcHeightPx: 0,
      driftPx: 0,
      spinTurns: 0,
    },
    status: 'active',
    resolvedAtMs: null,
  });
  const view = targetViews(round).find((v) => v.id === id);
  assert.ok(view, 'planted target should be visible to the renderer');
  return view;
}

test('one tap inside both the pad and a target resolves each exactly once', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  advanceToBeat(entities, 6);
  const planted = plantTarget(entities, GROOVE_PAD.centerX);

  // The tap point must genuinely lie inside both regions for this to mean
  // anything: on the pad, and within the target's own hit radius.
  assert.ok(padContainsPoint(PAD_POINT.x, PAD_POINT.y));
  assert.ok(
    Math.hypot(planted.x - PAD_POINT.x, planted.y - PAD_POINT.y) <= planted.hitRadius,
    'the planted target must actually overlap the pad',
  );

  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);

  assert.equal(rhythm.hits, 1, 'the beat is scored');
  assert.equal(round.targetsDestroyed, 1, 'and the bottle breaks');
  // Exactly once each, not twice.
  assert.equal(rhythm.score, RHYTHM.perfectPoints);
  assert.equal(round.combo, 1);
});

test('a second tap in the same beat window cannot double-score or double-hit', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  advanceToBeat(entities, 6);
  plantTarget(entities, GROOVE_PAD.centerX);

  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);
  const grooveScore = rhythm.score;
  const defenseScore = round.score;
  const destroyed = round.targetsDestroyed;

  // Same place, still inside the same beat's GOOD window.
  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);
  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);

  assert.equal(rhythm.hits, 1, 'one beat, one score');
  assert.equal(rhythm.score, grooveScore);
  assert.equal(round.targetsDestroyed, destroyed, 'a resolved target cannot be hit again');
  assert.equal(round.score, defenseScore);
});

// ---------------------------------------------------------------------------
// One finger and two fingers
// ---------------------------------------------------------------------------

test('two distinct fingers in one native frame resolve the pad and a target', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  advanceToBeat(entities, 8);
  // The far lane, so the two fingers are nowhere near each other.
  const bottle = plantTarget(entities, 1490);
  assert.ok(
    Math.hypot(bottle.x - PAD_POINT.x, bottle.y - PAD_POINT.y) >
      HIT_FORGIVENESS.duplicateTapDistancePx,
    'the two touch points must not be near-coincident',
  );
  assert.ok(!padContainsPoint(bottle.x, bottle.y), 'the bottle must not be on the pad');

  const destroyedBefore = round.targetsDestroyed;
  step(entities, 16, [
    touch(entities, PAD_POINT.x, PAD_POINT.y),
    touch(entities, bottle.x, bottle.y),
  ]);

  assert.equal(rhythm.hits, 1, 'one finger kept the beat');
  assert.equal(round.targetsDestroyed, destroyedBefore + 1, 'the other broke a bottle');
});

test('two distinct fingers in one browser touch event stay distinct', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  advanceToBeat(entities, 8);
  const bottle = plantTarget(entities, 1490);
  const destroyedBefore = round.targetsDestroyed;

  step(entities, 16, [], [
    webTouch(entities, [
      { x: PAD_POINT.x, y: PAD_POINT.y },
      { x: bottle.x, y: bottle.y },
    ]),
  ]);

  assert.equal(rhythm.hits, 1, 'the browser frame must not collapse to one point');
  assert.equal(round.targetsDestroyed, destroyedBefore + 1);
});

test('a second finger landing while the first is held is not a phantom re-tap', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  advanceToBeat(entities, 8);
  const bottle = plantTarget(entities, 1490);
  const held = surfacePoint(entities, PAD_POINT.x, PAD_POINT.y);
  const landing = surfacePoint(entities, bottle.x, bottle.y);
  const client = (p: { x: number; y: number }) => ({
    clientX: p.x + entities.scene.viewport.pageX,
    clientY: p.y + entities.scene.viewport.pageY,
  });

  // The pad finger is already down; only the bottle finger is new. Reading
  // `touches[0]` here would re-tap the pad and score a beat nobody just hit.
  const destroyedBefore = round.targetsDestroyed;
  const hitsBefore = rhythm.hits;
  step(entities, 16, [], [
    {
      name: 'onTouchStart',
      payload: {
        changedTouches: [client(landing)],
        touches: [client(held), client(landing)],
      },
    },
  ]);

  assert.equal(round.targetsDestroyed, destroyedBefore + 1, 'the new finger breaks the bottle');
  assert.equal(rhythm.hits, hitsBefore, 'the held finger must not tap again');
});

test('one finger alternating between the two jobs works on its own', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  // Keep every scored beat from the first one, breaking whatever is in the air
  // in between — never two fingers at once, and never two in the same frame.
  // Beat 1 is the first that scores: beat 0 is GO (M13.1).
  const beats = [1, 2, 3, 4, 5, 6];
  for (const beat of beats) {
    advanceToBeat(entities, beat);
    step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);

    const flying = targetViews(round).find((v) => v.status === 'active');
    if (flying) step(entities, 16, [touch(entities, flying.x, flying.y)]);
  }

  assert.equal(rhythm.hits, beats.length, 'every beat was kept with a single finger');
  assert.equal(rhythm.misses, 0, 'and none was dropped while defending');
  assert.ok(round.targetsDestroyed > 0, 'bottles were still broken');
});

test('the browser reporting one finger as touch and mouse is still one swing', () => {
  const { entities } = setup();
  const { rhythm } = entities.scene;
  advanceToBeat(entities, 4);

  const point = surfacePoint(entities, PAD_POINT.x, PAD_POINT.y);
  const client = {
    clientX: point.x + entities.scene.viewport.pageX,
    clientY: point.y + entities.scene.viewport.pageY,
  };

  step(entities, 16, [], [
    { name: 'onTouchStart', payload: { changedTouches: [client], touches: [client] } },
    { name: 'onMouseDown', payload: client },
  ]);

  assert.equal(rhythm.hits, 1, 'the duplicate representation must fold to one tap');
});

// ---------------------------------------------------------------------------
// Independence
// ---------------------------------------------------------------------------

test('a missed beat leaves Show Integrity and the Defense combo alone', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  // Build a Defense combo first.
  for (let i = 0; i < 2; i += 1) {
    const view = firstTargetInFlight(entities);
    step(entities, 16, [touch(entities, view.x, view.y)]);
  }
  const combo = round.combo;
  const integrity = round.integrity;
  assert.ok(combo >= 2);

  // Now ignore several beats.
  const missesBefore = rhythm.misses;
  const stopAt = round.elapsedMs + 3000;
  while (round.elapsedMs < stopAt && round.state === 'PLAYING') step(entities);

  assert.ok(rhythm.misses > missesBefore, 'beats must actually have been missed');
  assert.equal(round.integrity, integrity, 'Show Integrity must not move');
  assert.equal(round.combo, combo, 'the Defense combo must not reset');
});

test('a missed bottle does not touch the Groove streak', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  // Keep every scored beat from the very first one, so the streak is unbroken.
  const beats = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const integrityBefore = round.integrity;
  for (const beat of beats) {
    advanceToBeat(entities, beat);
    step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);
  }

  // Nothing was ever defended, so bottles have been landing throughout.
  assert.ok(round.misses > 0, 'a bottle must actually have got through');
  assert.ok(round.integrity < integrityBefore, 'and cost Show Integrity');
  assert.equal(rhythm.misses, 0, 'no beat was missed');
  assert.equal(rhythm.streak, beats.length, 'the Groove streak survives a Defense miss');
  assert.equal(rhythm.bestStreak, beats.length);
});

test('a Groove hit does not move the Defense score, and the reverse', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  advanceToBeat(entities, 4);
  const defenseBefore = round.score;
  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);
  assert.equal(round.score, defenseBefore);

  const grooveAfterBeat = rhythm.score;
  const view = firstTargetInFlight(entities);
  step(entities, 16, [touch(entities, view.x, view.y)]);
  assert.equal(rhythm.score, grooveAfterBeat);
  assert.ok(round.score > defenseBefore);
});

// ---------------------------------------------------------------------------
// Pause, vocalist, restart
// ---------------------------------------------------------------------------

test('pause freezes both systems', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  advanceToBeat(entities, 4);
  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);

  const snapshot = {
    elapsedMs: round.elapsedMs,
    defense: round.score,
    integrity: round.integrity,
    targets: round.targets.length,
    groove: rhythm.score,
    grooveHits: rhythm.hits,
    grooveMisses: rhythm.misses,
  };

  pauseRound(round);
  for (let i = 0; i < 200; i += 1) {
    step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);
  }

  assert.equal(round.elapsedMs, snapshot.elapsedMs);
  assert.equal(round.score, snapshot.defense);
  assert.equal(round.integrity, snapshot.integrity);
  assert.equal(round.targets.length, snapshot.targets);
  assert.equal(rhythm.score, snapshot.groove);
  assert.equal(rhythm.hits, snapshot.grooveHits);
  assert.equal(rhythm.misses, snapshot.grooveMisses);

  // And both come back.
  resumeRound(round);
  step(entities, 16);
  assert.ok(round.elapsedMs > snapshot.elapsedMs);
});

test('the vocalist event leaves the Groove playable and scoring', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  // Run to the interruption, defending the kit so the show is not ruined on
  // the way there. The Groove is deliberately ignored until the event starts.
  let guard = 0;
  while (round.state === 'PLAYING' && guard < 20_000) {
    const flying = targetViews(round).find((v) => v.status === 'active' && v.progress > 0.5);
    step(entities, 16, flying ? [touch(entities, flying.x, flying.y)] : []);
    guard += 1;
  }
  assert.equal(round.state, 'VOCALIST_EVENT', 'the interruption must actually start');

  const hitsBefore = rhythm.hits;
  const missesBefore = rhythm.misses;

  // The pad is outside the singer's tap region, so it is still reachable.
  const nextBeat = nearestBeatIndex(round.elapsedMs) + 1;
  advanceToBeat(entities, nextBeat);
  assert.equal(round.state, 'VOCALIST_EVENT', 'still mid-interruption');
  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);

  assert.equal(rhythm.hits, hitsBefore + 1, 'the beat must still score');
  assert.ok(rhythm.misses > missesBefore, 'and beats kept closing during the event');
});

test('restart resets both the Groove and the Defense', () => {
  const { entities } = setup();
  const scene = entities.scene;

  advanceToBeat(entities, 4);
  step(entities, 16, [touch(entities, PAD_POINT.x, PAD_POINT.y)]);
  const view = firstTargetInFlight(entities);
  step(entities, 16, [touch(entities, view.x, view.y)]);
  assert.ok(scene.rhythm.hits > 0 && scene.round.targetsDestroyed > 0);

  // Exactly what GameEngine's resetScene does.
  scene.round = createRound(level01);
  clearRhythm(scene.rhythm);

  assert.equal(scene.rhythm.score, 0);
  assert.equal(scene.rhythm.hits, 0);
  assert.equal(scene.rhythm.misses, 0);
  assert.equal(scene.rhythm.streak, 0);
  assert.equal(scene.rhythm.bestStreak, 0);
  assert.equal(scene.rhythm.lastJudgement, null);
  assert.equal(scene.round.score, 0);
  assert.equal(scene.round.targetsDestroyed, 0);
  assert.equal(scene.round.integrity, level01.startingIntegrity);
});

// ---------------------------------------------------------------------------
// Determinism with both systems live
// ---------------------------------------------------------------------------

test('a seeded round replays identically with the Groove running', () => {
  const play = (stepMs: number) => {
    const { entities } = setup();
    const round = entities.scene.round;
    const spawns: string[] = [];
    let lastId = 0;

    // Tap the pad on every beat and never touch a bottle, so the input
    // schedule is a pure function of the clock.
    let nextBeat = RHYTHM.unscoredLeadBeats;
    while (round.state === 'PLAYING' || round.state === 'VOCALIST_EVENT') {
      const beatAt = beatTimeMs(nextBeat);
      const touches =
        round.elapsedMs >= beatAt ? [touch(entities, PAD_POINT.x, PAD_POINT.y)] : [];
      if (touches.length > 0) nextBeat += 1;
      step(entities, stepMs, touches);
      for (const target of round.targets) {
        if (target.id > lastId) {
          lastId = target.id;
          spawns.push(`${target.id}:${target.kind}:${Math.round(target.durationMs)}`);
        }
      }
    }

    return {
      spawns,
      defense: round.score,
      integrity: round.integrity,
      state: round.state,
      grooveHits: entities.scene.rhythm.hits,
      grooveMisses: entities.scene.rhythm.misses,
      grooveScore: entities.scene.rhythm.score,
    };
  };

  const a = play(16);
  const b = play(16);
  assert.deepEqual(b, a, 'the same schedule must replay exactly');

  // The seeded spawn stream is independent of tick size, which is the property
  // the Defense already guaranteed and the Groove must not have broken.
  const coarse = play(33);
  assert.deepEqual(coarse.spawns, a.spawns);
  assert.equal(coarse.state, a.state);
});

test('the Groove never spends Show Integrity, over a whole ignored round', () => {
  const { entities } = setup();
  const { round, rhythm } = entities.scene;

  // Break every bottle, ignore every beat: Integrity must survive intact.
  let guard = 0;
  while ((round.state === 'PLAYING' || round.state === 'VOCALIST_EVENT') && guard < 20_000) {
    const flying = targetViews(round).find((v) => v.status === 'active' && v.progress > 0.5);
    step(entities, 16, flying ? [touch(entities, flying.x, flying.y)] : []);
    guard += 1;
  }

  assert.equal(round.state, 'SHOW_COMPLETE', 'the show should have been survived');
  assert.equal(round.integrity, level01.startingIntegrity, 'no beat may cost Integrity');
  assert.ok(rhythm.misses > 50, 'and the beats really were all ignored');
  assert.equal(rhythm.hits, 0);
});

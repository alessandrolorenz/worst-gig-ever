/**
 * Round domain tests (M4).
 *
 * These run under `node --test` with no renderer, which is the point: if a
 * rule in M1 cannot be asserted here, gameplay logic has leaked into a
 * component (AGENTS.md rule 4).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activeTargets,
  comboMultiplier,
  createRound,
  MAX_TICK_DELTA_MS,
  pauseRound,
  phaseAt,
  remainingMs,
  resolveTap,
  resumeRound,
  startRound,
  targetViews,
  tickRound,
  VOCALIST_EXIT_MS,
  VOCALIST_TIMEOUT_MS,
  type RoundState,
} from '../game/state/roundState.ts';
import { VOCALIST_BLOCKING_RECT } from '../game/config/stage.ts';
import { TARGET_DEFINITIONS } from '../game/config/targets.ts';
import { SCORING } from '../game/config/scoring.ts';
import { countdownDurationMs } from '../game/config/rhythm.ts';
import { level01 } from '../game/levels/level01.ts';

/** Advances the round in frame-sized steps, collecting every event. */
function advance(state: RoundState, totalMs: number, stepMs = 16) {
  const events = [];
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    events.push(...tickRound(state, step));
    remaining -= step;
  }
  return events;
}

/**
 * A round that has reached the first frame of actual play.
 *
 * Start now opens the M13.1 pre-roll rather than the round, so this runs the
 * countdown out and hands back exactly what `startRound` used to: PLAYING, at
 * elapsed zero, with nothing spawned.
 */
function playing(): RoundState {
  const state = createRound();
  startRound(state);
  advance(state, countdownDurationMs());
  assert.equal(state.state, 'PLAYING');
  assert.equal(state.elapsedMs, 0);
  return state;
}

/** Taps the centre of the first active target, returning the emitted events. */
function tapFirstTarget(state: RoundState) {
  const view = targetViews(state).find((v) => v.status === 'active');
  assert.ok(view, 'expected an active target to tap');
  return resolveTap(state, { x: view.x, y: view.y });
}

/** Runs the round until at least one target is active. */
function advanceToFirstTarget(state: RoundState): void {
  let guard = 0;
  while (activeTargets(state).length === 0 && guard < 1000) {
    tickRound(state, 16);
    guard += 1;
  }
  assert.ok(activeTargets(state).length > 0, 'no target spawned');
}

/**
 * Advances the round while clearing every target, so the show survives long
 * enough to reach a given round time. Left alone, a round ends in SHOW_RUINED
 * after three misses — around five seconds in — which is correct behavior but
 * useless for testing anything later in the timeline.
 *
 * The vocalist is deliberately not tapped here; tests that want the bonus ask
 * for it explicitly.
 */
function playPerfectlyUntil(state: RoundState, untilMs: number, stepMs = 16) {
  const events = [];
  let guard = 0;
  while (state.elapsedMs < untilMs && guard < 20_000) {
    events.push(...tickRound(state, stepMs));
    for (const view of targetViews(state)) {
      if (view.status === 'active') resolveTap(state, { x: view.x, y: view.y });
    }
    if (state.state === 'SHOW_COMPLETE' || state.state === 'SHOW_RUINED') break;
    guard += 1;
  }
  return events;
}

test('a new round starts READY with the M1 opening values', () => {
  const state = createRound();
  assert.equal(state.state, 'READY');
  assert.equal(state.score, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.integrity, level01.startingIntegrity);
  assert.equal(state.elapsedMs, 0);
  assert.equal(remainingMs(state), level01.durationMs);
});

test('the clock does not advance until the round starts', () => {
  const state = createRound();
  advance(state, 5000);
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.state, 'READY');
});

test('READY -> COUNTDOWN -> PLAYING -> PAUSED -> PLAYING -> VOCALIST_EVENT -> SHOW_COMPLETE', () => {
  const state = createRound();
  assert.equal(state.state, 'READY');
  startRound(state);
  assert.equal(state.state, 'COUNTDOWN', 'Start opens the pre-roll, not the round');
  advance(state, countdownDurationMs());
  assert.equal(state.state, 'PLAYING');
  pauseRound(state);
  assert.equal(state.state, 'PAUSED');
  resumeRound(state);
  assert.equal(state.state, 'PLAYING');
  playPerfectlyUntil(state, level01.vocalistEventAtMs);
  assert.equal(state.state, 'VOCALIST_EVENT');
  playPerfectlyUntil(state, level01.durationMs);
  assert.equal(state.state, 'SHOW_COMPLETE');
});

test('an unplayed round ends in SHOW_RUINED long before the final whistle', () => {
  const state = playing();
  advance(state, level01.durationMs);
  assert.equal(state.state, 'SHOW_RUINED');
  assert.equal(state.integrity, 0);
  assert.equal(state.misses, level01.startingIntegrity);
});

test('pause freezes the round clock and resume continues from the same time', () => {
  const state = playing();
  advance(state, 3000);
  const frozenAt = state.elapsedMs;
  assert.equal(frozenAt, 3000);

  pauseRound(state);
  advance(state, 5000);
  assert.equal(state.elapsedMs, frozenAt, 'clock advanced while paused');

  resumeRound(state);
  advance(state, 1000);
  assert.equal(state.elapsedMs, frozenAt + 1000);
});

test('pause blocks scoring', () => {
  const state = playing();
  advanceToFirstTarget(state);
  pauseRound(state);
  const view = targetViews(state).find((v) => v.status === 'active');
  assert.ok(view);
  const events = resolveTap(state, { x: view.x, y: view.y });
  assert.equal(events.length, 0);
  assert.equal(state.score, 0);
});

test('gameplay speed does not depend on frame rate', () => {
  // Played perfectly on purpose. A ruined show stops the clock, and when the
  // third miss is *noticed* is inherently tick-bound — a 100 ms step can spot
  // it up to 100 ms after an 8 ms step does. That is detection latency,
  // capped by MAX_TICK_DELTA_MS, not a difference in how fast the game runs.
  // What must not move with the step size is the schedule itself.
  const run = (stepMs: number) => {
    const state = playing();
    const events = [];
    for (let elapsed = 0; elapsed < 12_000; elapsed += stepMs) {
      events.push(...tickRound(state, Math.min(stepMs, 12_000 - elapsed)));
      for (let guard = 0; guard < 8; guard += 1) {
        const view = targetViews(state).find((v) => v.status === 'active');
        if (!view) break;
        resolveTap(state, { x: view.x, y: view.y });
      }
    }
    return { state, events };
  };

  const coarse = run(MAX_TICK_DELTA_MS);
  const fine = run(8);

  assert.equal(coarse.state.elapsedMs, fine.state.elapsedMs);
  assert.equal(coarse.state.nextTargetId, fine.state.nextTargetId, 'different spawn counts');
  assert.deepEqual(
    coarse.events.filter((event) => event.type === 'TARGET_SPAWNED'),
    fine.events.filter((event) => event.type === 'TARGET_SPAWNED'),
    'spawn stream diverged between step sizes',
  );
  assert.ok(coarse.state.nextTargetId > 5, 'expected a useful number of throws');
});

test('the same seed replays the same round', () => {
  const a = playing();
  const b = playing();
  advance(a, 20_000);
  advance(b, 20_000);
  assert.deepEqual(
    a.targets.map((t) => [t.id, t.kind, t.laneX, t.spawnAtMs]),
    b.targets.map((t) => [t.id, t.kind, t.laneX, t.spawnAtMs]),
  );
});

test('a hit scores basePoints x multiplier and increments the combo', () => {
  const state = playing();
  advanceToFirstTarget(state);
  const kind = activeTargets(state)[0].kind;
  const events = tapFirstTarget(state);

  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.multiplier, 1);
  assert.equal(hit.points, TARGET_DEFINITIONS[kind].basePoints);
  assert.equal(state.score, TARGET_DEFINITIONS[kind].basePoints);
  assert.equal(state.combo, 1);
  assert.equal(state.bestCombo, 1);
  assert.equal(state.targetsDestroyed, 1);
});

test('the combo multiplier follows the M1 table', () => {
  assert.equal(comboMultiplier(0), 1);
  assert.equal(comboMultiplier(4), 1);
  assert.equal(comboMultiplier(5), 2);
  assert.equal(comboMultiplier(9), 2);
  assert.equal(comboMultiplier(10), 3);
  assert.equal(comboMultiplier(19), 3);
  assert.equal(comboMultiplier(20), 4);
  assert.equal(comboMultiplier(250), 4);
});

test('a target cannot score twice', () => {
  const state = playing();
  advanceToFirstTarget(state);

  const view = targetViews(state).find((v) => v.status === 'active');
  assert.ok(view);
  const point = { x: view.x, y: view.y };

  const first = resolveTap(state, point);
  const scoreAfterFirst = state.score;
  assert.ok(first.some((e) => e.type === 'TARGET_HIT'));

  // Same point, same frame, repeatedly.
  for (let i = 0; i < 5; i += 1) {
    const repeat = resolveTap(state, point);
    assert.ok(!repeat.some((e) => e.type === 'TARGET_HIT'), 'resolved target scored again');
  }
  assert.equal(state.score, scoreAfterFirst);
  assert.equal(state.combo, 1);
  assert.equal(state.targetsDestroyed, 1);
});

test('one tap resolves at most one target', () => {
  const state = playing();
  advanceToFirstTarget(state);
  const before = state.targetsDestroyed;
  tapFirstTarget(state);
  assert.equal(state.targetsDestroyed, before + 1);
});

test('a tap on empty space scores nothing and keeps the combo', () => {
  const state = playing();
  advanceToFirstTarget(state);
  tapFirstTarget(state);
  const scoreAfterHit = state.score;

  const events = resolveTap(state, { x: 40, y: 1040 });
  assert.equal(events.length, 0);
  assert.equal(state.score, scoreAfterHit);
  assert.equal(state.combo, 1, 'missing with a tap must not reset the combo');
});

test('a missed target costs integrity and resets the combo', () => {
  const state = playing();
  advanceToFirstTarget(state);
  tapFirstTarget(state);
  assert.equal(state.combo, 1);

  const integrityBefore = state.integrity;
  // Let the next target run past the danger line untouched.
  let missed = false;
  for (let i = 0; i < 1000 && !missed; i += 1) {
    missed = tickRound(state, 16).some((e) => e.type === 'TARGET_MISSED');
  }
  assert.ok(missed, 'no target was missed');
  assert.equal(state.integrity, integrityBefore - 1);
  assert.equal(state.combo, 0, 'combo did not reset on a miss');
  assert.equal(state.misses, 1);
});

test('Show Integrity reaching zero ends the round as SHOW_RUINED', () => {
  const state = playing();
  let guard = 0;
  while (state.state !== 'SHOW_RUINED' && guard < 20_000) {
    tickRound(state, 16);
    guard += 1;
  }
  assert.equal(state.state, 'SHOW_RUINED');
  assert.equal(state.integrity, 0);
  assert.ok(state.elapsedMs < level01.durationMs, 'ruined only at the end of the round');
});

test('surviving the full duration ends the round as SHOW_COMPLETE', () => {
  const state = playing();
  // Perfect play: resolve everything the moment it can be resolved.
  let guard = 0;
  while (!['SHOW_COMPLETE', 'SHOW_RUINED'].includes(state.state) && guard < 20_000) {
    tickRound(state, 16);
    for (const view of targetViews(state)) {
      if (view.status === 'active') resolveTap(state, { x: view.x, y: view.y });
    }
    if (state.vocalist.status === 'blocking') {
      resolveTap(state, {
        x: VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2,
        y: VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2,
      });
    }
    guard += 1;
  }
  assert.equal(state.state, 'SHOW_COMPLETE');
  assert.equal(state.integrity, level01.startingIntegrity);
  assert.equal(state.elapsedMs, level01.durationMs);
  assert.equal(remainingMs(state), 0);
  assert.ok(state.score > 0);
  assert.ok(state.bestCombo >= 4);
});

test('a terminal round ignores further ticks and taps', () => {
  const state = playing();
  playPerfectlyUntil(state, level01.durationMs);
  assert.equal(state.state, 'SHOW_COMPLETE');
  const scoreAtEnd = state.score;
  const elapsedAtEnd = state.elapsedMs;

  advance(state, 5000);
  assert.equal(state.elapsedMs, elapsedAtEnd);
  assert.equal(resolveTap(state, { x: 960, y: 800 }).length, 0);
  assert.equal(state.score, scoreAtEnd);
});

test('the vocalist event triggers exactly once, at the scheduled time', () => {
  const state = playing();
  const before = playPerfectlyUntil(state, level01.vocalistEventAtMs - 500);
  assert.equal(before.filter((e) => e.type === 'VOCALIST_EVENT_STARTED').length, 0);
  assert.notEqual(state.state, 'VOCALIST_EVENT');

  const rest = playPerfectlyUntil(state, level01.durationMs);
  const started = rest.filter((e) => e.type === 'VOCALIST_EVENT_STARTED');
  assert.equal(started.length, 1, 'vocalist event did not fire exactly once');
  assert.ok(state.vocalist.triggered);
});

test('the vocalist event pauses spawning and awards a fixed bonus when hit', () => {
  const state = playing();
  playPerfectlyUntil(state, level01.vocalistEventAtMs);
  assert.equal(state.state, 'VOCALIST_EVENT');
  assert.equal(state.vocalist.status, 'blocking');

  const spawnedBefore = state.nextTargetId;
  advance(state, 500);
  assert.equal(state.state, 'VOCALIST_EVENT');
  assert.equal(state.nextTargetId, spawnedBefore, 'targets spawned during the interruption');

  const scoreBefore = state.score;
  const comboBefore = state.combo;
  const events = resolveTap(state, {
    x: VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2,
    y: VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2,
  });

  const hit = events.find((e) => e.type === 'VOCALIST_HIT');
  assert.ok(hit && hit.type === 'VOCALIST_HIT');
  assert.equal(hit.points, SCORING.vocalistEventBonus);
  assert.equal(state.score, scoreBefore + SCORING.vocalistEventBonus);
  assert.equal(state.combo, comboBefore, 'the vocalist bonus must not touch the combo');
  assert.equal(state.vocalist.status, 'hit');

  // The bonus is fixed: tapping again pays nothing.
  const again = resolveTap(state, {
    x: VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2,
    y: VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2,
  });
  assert.equal(again.length, 0);
  assert.equal(state.score, scoreBefore + SCORING.vocalistEventBonus);
});

test('normal play resumes after the vocalist reacts', () => {
  const state = playing();
  playPerfectlyUntil(state, level01.vocalistEventAtMs);
  resolveTap(state, {
    x: VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2,
    y: VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2,
  });
  const events = advance(state, VOCALIST_EXIT_MS + 100);
  const ended = events.find((e) => e.type === 'VOCALIST_EVENT_ENDED');
  assert.ok(ended && ended.type === 'VOCALIST_EVENT_ENDED' && ended.wasHit);
  assert.equal(state.state, 'PLAYING');
  assert.equal(state.vocalist.status, 'idle');
});

test('an ignored vocalist gives up so the round cannot stall', () => {
  const state = playing();
  playPerfectlyUntil(state, level01.vocalistEventAtMs);
  const events = playPerfectlyUntil(state, state.elapsedMs + VOCALIST_TIMEOUT_MS + 100);
  const ended = events.find((e) => e.type === 'VOCALIST_EVENT_ENDED');
  assert.ok(ended && ended.type === 'VOCALIST_EVENT_ENDED' && !ended.wasHit);
  assert.equal(state.state, 'PLAYING');
});

test('targets already in flight stay hittable during the interruption', () => {
  const state = playing();
  playPerfectlyUntil(state, level01.vocalistEventAtMs);
  assert.equal(state.state, 'VOCALIST_EVENT');

  // Force a target into the air so there is something to defend against.
  const withTarget = playing();
  advanceToFirstTarget(withTarget);
  withTarget.elapsedMs = level01.vocalistEventAtMs - 1;
  tickRound(withTarget, 16);
  assert.equal(withTarget.state, 'VOCALIST_EVENT');

  const view = targetViews(withTarget).find((v) => v.status === 'active');
  if (view) {
    const scoreBefore = withTarget.score;
    resolveTap(withTarget, { x: view.x, y: view.y });
    assert.ok(withTarget.score > scoreBefore, 'in-flight target was not hittable');
  }
});

test('the blocking vocalist takes tap priority over anything behind them', () => {
  const state = playing();
  playPerfectlyUntil(state, level01.vocalistEventAtMs);
  assert.equal(state.vocalist.status, 'blocking');
  const destroyedBefore = state.targetsDestroyed;

  const events = resolveTap(state, {
    x: VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2,
    y: VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2,
  });
  assert.ok(events.some((e) => e.type === 'VOCALIST_HIT'));
  assert.ok(!events.some((e) => e.type === 'TARGET_HIT'));
  assert.equal(state.targetsDestroyed, destroyedBefore);
});

test('concurrent targets never exceed the configured maximum', () => {
  const state = playing();
  let peak = 0;
  for (let i = 0; i < 4000; i += 1) {
    tickRound(state, 16);
    peak = Math.max(peak, activeTargets(state).length);
    if (state.state === 'SHOW_RUINED' || state.state === 'SHOW_COMPLETE') break;
  }
  assert.ok(peak <= level01.maxConcurrentTargets, `peak ${peak} exceeded the cap`);
});

test('phase lookup matches the level schedule', () => {
  assert.equal(phaseAt(level01, 0)?.spawnEveryMs, 1800);
  assert.equal(phaseAt(level01, 14_999)?.spawnEveryMs, 1800);
  assert.equal(phaseAt(level01, 15_000)?.spawnEveryMs, 1300);
  assert.equal(phaseAt(level01, 40_000), null, 'the vocalist window must be unscheduled');
  assert.equal(phaseAt(level01, 50_000)?.spawnEveryMs, 850);
  assert.equal(phaseAt(level01, level01.durationMs), null);
});

test('a restarted round is identical to a fresh one', () => {
  const played = playing();
  advance(played, 20_000);
  const fresh = createRound();
  const restarted = createRound();
  assert.deepEqual(restarted, fresh);
  assert.notEqual(played.elapsedMs, restarted.elapsedMs);
});

/* --- M5A: throw trajectories and hit forgiveness --- */

import { effectiveHitRadius, isRoundOver, type ActiveTarget } from '../game/state/roundState.ts';
import { throwPoseAt } from '../game/systems/approach.ts';
import { HIT_FORGIVENESS } from '../game/config/targets.ts';
import { STAGE, THROW_ORIGIN } from '../game/config/stage.ts';

/** Runs the round until exactly one target is in the air, then returns it. */
function oneTargetInFlight(): { state: RoundState; view: ReturnType<typeof targetViews>[number] } {
  const state = playing();
  advanceToFirstTarget(state);
  // Clear anything else so a forgiveness assertion cannot be satisfied by a
  // different target than the one under test.
  for (const target of state.targets.slice(1)) target.status = 'hit';
  const view = targetViews(state).find((v) => v.status === 'active');
  assert.ok(view, 'expected exactly one target in flight');
  return { state, view };
}

/** Every target a full round spawns, captured before it is cleaned up. */
function throwsAcrossARound(): ActiveTarget[] {
  const state = playing();
  const seen = new Map<number, ActiveTarget>();
  let guard = 0;
  while (!isRoundOver(state) && guard < 20_000) {
    tickRound(state, 16);
    for (const target of state.targets) {
      if (!seen.has(target.id)) seen.set(target.id, target);
      if (target.status === 'active') resolveTap(state, targetCentre(state, target.id));
    }
    guard += 1;
  }
  return [...seen.values()];
}

function targetCentre(state: RoundState, id: number) {
  const view = targetViews(state).find((v) => v.id === id);
  assert.ok(view);
  return { x: view.x, y: view.y };
}

test('every spawned target is thrown from the crowd, not from a hole in the wall', () => {
  const thrown = throwsAcrossARound();
  assert.ok(thrown.length > 20, `only ${thrown.length} targets spawned`);

  const origins = new Set<number>();
  for (const target of thrown) {
    const { trajectory } = target;
    assert.ok(
      trajectory.originX >= THROW_ORIGIN.minX && trajectory.originX <= THROW_ORIGIN.maxX,
      `origin x ${trajectory.originX} is outside the crowd`,
    );
    assert.ok(
      trajectory.originY >= THROW_ORIGIN.minY && trajectory.originY <= THROW_ORIGIN.maxY,
      `origin y ${trajectory.originY} is outside the crowd`,
    );
    assert.equal(trajectory.laneX, target.laneX, 'the throw must land on the target lane');
    assert.ok(trajectory.arcHeightPx > 0, 'a flat throw is the thing M5A removed');
    origins.add(Math.round(trajectory.originX));
  }
  assert.ok(origins.size > 1, 'every object was thrown from the same spot');
  // The vanishing point was the M4 behavior; it must no longer be the rule.
  assert.ok(
    thrown.some((t) => Math.abs(t.trajectory.originX - STAGE.vanishingPoint.x) > 200),
    'every throw still starts on the sightline',
  );
});

test('objects stay on screen for the whole flight', () => {
  for (const target of throwsAcrossARound()) {
    for (let step = 0; step <= 40; step += 1) {
      const pose = throwPoseAt(step / 40, target.trajectory);
      assert.ok(pose.y > 0, `target ${target.id} flew off the top at ${step / 40}`);
      assert.ok(pose.y <= STAGE.dangerLineY + 1e-9, `target ${target.id} overshot the danger line`);
      assert.ok(pose.x > 0 && pose.x < 1920, `target ${target.id} left the canvas`);
    }
  }
});

test('arc parameters stay inside the tuning budget for their kind', () => {
  const state = playing();
  let checked = 0;
  for (let i = 0; i < 3000; i += 1) {
    tickRound(state, 16);
    for (const target of state.targets) {
      const { arc } = TARGET_DEFINITIONS[target.kind];
      const { trajectory } = target;
      assert.ok(trajectory.arcHeightPx >= arc.minHeightPx, `${target.kind} arc too flat`);
      assert.ok(trajectory.arcHeightPx <= arc.maxHeightPx, `${target.kind} arc too high`);
      assert.ok(Math.abs(trajectory.driftPx) <= arc.maxDriftPx, `${target.kind} drifted too far`);
      assert.ok(Math.abs(trajectory.spinTurns) <= arc.maxSpinTurns, `${target.kind} spun too fast`);
      checked += 1;
    }
    if (state.state === 'SHOW_RUINED') break;
  }
  assert.ok(checked > 0, 'no target was checked');
});

test('a target view reports the pose its own trajectory produces', () => {
  const { state, view } = oneTargetInFlight();
  const target = state.targets.find((t) => t.id === view.id);
  assert.ok(target);
  const pose = throwPoseAt(view.progress, target.trajectory);
  assert.equal(view.x, pose.x);
  assert.equal(view.y, pose.y);
  assert.equal(view.rotation, pose.rotation);
  assert.notEqual(view.rotation, 0, 'a target in flight should have tumbled by now');
});

test('a round throws from both windows, and never from between them', () => {
  // The point of the fast window is that it is *reachable* in a real round and
  // still the exception. A chance that never fires is a dead constant; one
  // that fires most of the time is just a faster game with no baseline to
  // read against.
  const state = playing();
  const thrown = new Map<number, { kind: 'beerBottle' | 'beerMug'; durationMs: number }>();
  let guard = 0;
  while (state.elapsedMs < level01.durationMs && guard < 20_000) {
    tickRound(state, 16);
    for (const target of state.targets) {
      thrown.set(target.id, { kind: target.kind, durationMs: target.durationMs });
    }
    for (const view of targetViews(state)) {
      if (view.status === 'active') resolveTap(state, { x: view.x, y: view.y });
    }
    guard += 1;
  }

  const throws = [...thrown.values()];
  assert.ok(throws.length > 10, `only ${throws.length} throws in a full round`);
  const isFast = ({ kind, durationMs }: { kind: 'beerBottle' | 'beerMug'; durationMs: number }) =>
    durationMs <= TARGET_DEFINITIONS[kind].fastApproachMs.maxMs;

  for (const target of throws) {
    const { approachMs, fastApproachMs } = TARGET_DEFINITIONS[target.kind];
    const window = isFast(target) ? fastApproachMs : approachMs;
    assert.ok(
      target.durationMs >= window.minMs && target.durationMs <= window.maxMs,
      `a ${target.kind} crossed in ${target.durationMs.toFixed(0)}ms, outside both windows`,
    );
  }

  const fastballs = throws.filter(isFast).length;
  assert.ok(fastballs > 0, 'a full round threw no fastball at all');
  assert.ok(fastballs < throws.length / 2, `${fastballs} of ${throws.length} throws were fastballs`);
});

test('the same seed still replays the same throws', () => {
  const a = playing();
  const b = playing();
  advance(a, 20_000);
  advance(b, 20_000);
  assert.deepEqual(
    a.targets.map((t) => t.trajectory),
    b.targets.map((t) => t.trajectory),
    'trajectories diverged between two runs of the same seed',
  );
});

test('the hitbox is enlarged and floored so a distant target is never a pinprick', () => {
  for (const kind of ['beerBottle', 'beerMug'] as const) {
    const raw = TARGET_DEFINITIONS[kind].hitRadiusAtDangerLine;
    assert.equal(effectiveHitRadius(kind, 1), raw * HIT_FORGIVENESS.radiusMultiplier);

    const distant = effectiveHitRadius(kind, 1 / STAGE.farDepth);
    assert.equal(distant, HIT_FORGIVENESS.minRadiusPx, 'the floor did not apply at spawn');
    assert.ok(distant > raw / STAGE.farDepth, 'the floor made a distant target no easier');

    // Forgiveness never makes a far target easier than a near one.
    assert.ok(effectiveHitRadius(kind, 1) > distant);
  }
});

test('a tap short of the centre still lands the hit', () => {
  const { state, view } = oneTargetInFlight();
  const events = resolveTap(state, { x: view.x + view.hitRadius * 0.9, y: view.y });
  assert.ok(events.some((e) => e.type === 'TARGET_HIT'), 'an off-centre tap missed');
});

test('a tap that hits nothing directly still resolves the nearest target', () => {
  const { state, view } = oneTargetInFlight();
  const events = resolveTap(state, {
    x: view.x + view.hitRadius + HIT_FORGIVENESS.assistRadiusPx * 0.8,
    y: view.y,
  });
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT', 'the assist did not rescue a near miss');
  assert.equal(hit.targetId, view.id);
});

test('the assist has a limit: a wild tap still scores nothing', () => {
  const { state, view } = oneTargetInFlight();
  const events = resolveTap(state, {
    x: view.x + view.hitRadius + HIT_FORGIVENESS.assistRadiusPx + 60,
    y: view.y,
  });
  assert.equal(events.length, 0, 'the assist reached further than it is configured to');
  assert.equal(state.combo, 0);
});

test('a hit is reported at the target position, not at the finger', () => {
  const { state, view } = oneTargetInFlight();
  const events = resolveTap(state, { x: view.x + view.hitRadius * 0.95, y: view.y });
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.x, view.x);
  assert.equal(hit.y, view.y);
});

test('a direct hit always beats an assisted one', () => {
  const state = playing();
  advanceToFirstTarget(state);
  const views = targetViews(state).filter((v) => v.status === 'active');
  assert.ok(views.length >= 1);
  const near = views[0];

  // Plant a second target whose centre is closer to the finger than the first,
  // but whose hitbox the finger is still outside of.
  const decoyPoint = { x: near.x, y: near.y };
  const events = resolveTap(state, decoyPoint);
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.targetId, near.id, 'a direct hit was overruled');
});

test('with overlapping targets the most urgent one is resolved', () => {
  const state = playing();
  advanceToFirstTarget(state);

  // Two targets stacked at the same point, at different stages of approach.
  const early = state.targets[0];
  state.targets = [early];
  const late: typeof early = {
    ...early,
    id: 999,
    spawnAtMs: early.spawnAtMs - 600,
    trajectory: { ...early.trajectory },
  };
  state.targets.push(late);

  const lateView = targetViews(state).find((v) => v.id === 999);
  assert.ok(lateView);
  const events = resolveTap(state, { x: lateView.x, y: lateView.y });
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.targetId, 999, 'the tap resolved the less urgent target');
});

test('forgiveness does not resurrect a resolved target', () => {
  const { state, view } = oneTargetInFlight();
  resolveTap(state, { x: view.x, y: view.y });
  const again = resolveTap(state, { x: view.x + view.hitRadius * 0.5, y: view.y });
  assert.equal(again.length, 0);
  assert.equal(state.targetsDestroyed, 1);
});

test('forgiveness does not outrank the blocking vocalist', () => {
  const state = playing();
  playPerfectlyUntil(state, level01.vocalistEventAtMs);
  assert.equal(state.vocalist.status, 'blocking');
  const events = resolveTap(state, {
    x: VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2,
    y: VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2,
  });
  assert.ok(events.some((e) => e.type === 'VOCALIST_HIT'));
  assert.ok(!events.some((e) => e.type === 'TARGET_HIT'));
});

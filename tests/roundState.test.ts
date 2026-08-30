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

function playing(): RoundState {
  const state = createRound();
  startRound(state);
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

test('READY -> PLAYING -> PAUSED -> PLAYING -> VOCALIST_EVENT -> SHOW_COMPLETE', () => {
  const state = createRound();
  assert.equal(state.state, 'READY');
  startRound(state);
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
  const coarse = playing();
  const fine = playing();
  advance(coarse, 12_000, MAX_TICK_DELTA_MS);
  advance(fine, 12_000, 8);

  assert.equal(coarse.elapsedMs, fine.elapsedMs);
  assert.equal(coarse.nextTargetId, fine.nextTargetId, 'different spawn counts');
  assert.deepEqual(
    coarse.targets.map((t) => [t.kind, t.laneX, t.spawnAtMs]),
    fine.targets.map((t) => [t.kind, t.laneX, t.spawnAtMs]),
    'target schedule diverged between step sizes',
  );
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

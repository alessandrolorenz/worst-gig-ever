/**
 * Pre-roll contract (M13.1).
 *
 * Every case in `docs/verification/M13.1-test-matrix.md` under Countdown,
 * Lifecycle and Determinism. The whole point of the milestone is that the
 * three seconds before the round are *inert* — the player is being handed the
 * tempo, and nothing they do or fail to do in that window can score, miss, or
 * cost them the show — so most of what follows asserts that nothing happened.
 *
 * Nothing here touches React, React Native, or an audio device.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COUNTDOWN,
  RHYTHM,
  beatIntervalMs,
  beatTimeMs,
  countdownDurationMs,
  countdownStep,
  isUnscoredLeadBeat,
} from '../game/config/rhythm.ts';
import {
  createRhythm,
  isBeatClockRunning,
  isPadPulsing,
  padPulse,
  pulseClockMs,
  resolvePadTap,
  tickRhythm,
  type BeatContext,
} from '../game/state/rhythmState.ts';
import {
  cancelCountdown,
  createRound,
  pauseRound,
  resumeRound,
  startRound,
  tickRound,
  type RoundState,
} from '../game/state/roundState.ts';
import { level01 } from '../game/levels/level01.ts';

const DURATION = level01.durationMs;

/** Advances a round in fixed steps, as the engine loop does. */
function advance(state: RoundState, totalMs: number, stepMs = 16): void {
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    tickRound(state, step);
    remaining -= step;
  }
}

/** A round sitting in the pre-roll, one tick after Start. */
function counting(): RoundState {
  const state = createRound();
  startRound(state);
  return state;
}

function context(elapsedMs: number, state: RoundState['state'] = 'PLAYING'): BeatContext {
  return { elapsedMs, durationMs: DURATION, state };
}

// ---------------------------------------------------------------------------
// The sequence
// ---------------------------------------------------------------------------

test('Start opens the pre-roll rather than the round', () => {
  const state = createRound();
  assert.equal(state.state, 'READY');
  startRound(state);
  assert.equal(state.state, 'COUNTDOWN');
  assert.equal(state.countdownMs, 0);
  assert.equal(state.elapsedMs, 0, 'the round clock has not started');
});

test('the pre-roll is three beats long, so 3 -> 2 -> 1 -> GO is four beats', () => {
  assert.equal(COUNTDOWN.leadBeats, 3);
  // Three numerals before the round, and GO is round beat 0 rather than a
  // fourth countdown tick — which is what puts the round start on the beat.
  assert.equal(countdownDurationMs(), beatTimeMs(COUNTDOWN.leadBeats));
  assert.equal(countdownDurationMs(), 2000);
  assert.equal(countdownDurationMs(), 3 * beatIntervalMs());
});

test('the numerals count 3, 2, 1 on consecutive beats and never a fourth', () => {
  assert.equal(countdownStep(0), 3);
  assert.equal(countdownStep(beatTimeMs(1) - 1), 3);
  assert.equal(countdownStep(beatTimeMs(1)), 2);
  assert.equal(countdownStep(beatTimeMs(2) - 1), 2);
  assert.equal(countdownStep(beatTimeMs(2)), 1);
  assert.equal(countdownStep(countdownDurationMs() - 1), 1);
  // Never a 0 and never a 4, however the float lands at the boundaries.
  for (let t = 0; t <= countdownDurationMs(); t += 1) {
    const step = countdownStep(t);
    assert.ok(step >= 1 && step <= COUNTDOWN.leadBeats, `step ${step} at ${t} ms`);
  }
});

test('the pad pulses on every one of the four countdown beats', () => {
  assert.ok(isPadPulsing('COUNTDOWN'), 'the pad animates through the pre-roll');

  // The three numerals, at their own beat instants on the shared clock.
  for (const beatsOut of [3, 2, 1]) {
    const countdownMs = countdownDurationMs() - beatTimeMs(beatsOut);
    const clock = pulseClockMs('COUNTDOWN', 0, countdownMs);
    // The beat interval is 666.66... ms, so this is a float subtraction and
    // lands within a rounding error of the beat rather than exactly on it.
    assert.ok(Math.abs(clock + beatTimeMs(beatsOut)) < 1e-9, `"${beatsOut}" is off its beat`);
    assert.ok(padPulse(clock) > 0.95, `pad did not peak on the "${beatsOut}" beat`);
  }

  // And GO, which is round beat 0 on the same schedule.
  assert.equal(pulseClockMs('PLAYING', 0, 0), 0);
  assert.ok(padPulse(0) > 0.95, 'pad did not peak on GO');
});

test('the pulse clock runs continuously from the pre-roll into the round', () => {
  // -2000 at Start, rising to 0 at GO, and the round clock from there. One
  // schedule, so the countdown beats and the scored beats are the same beats.
  assert.equal(pulseClockMs('COUNTDOWN', 0, 0), -countdownDurationMs());
  assert.equal(pulseClockMs('COUNTDOWN', 0, countdownDurationMs()), 0);
  assert.equal(pulseClockMs('PLAYING', 1234, 0), 1234);
  assert.equal(pulseClockMs('READY', 0, 0), 0);
});

// ---------------------------------------------------------------------------
// Nothing happens before GO
// ---------------------------------------------------------------------------

test('the pre-roll spawns nothing, costs nothing, and moves no timeline', () => {
  const state = counting();
  const integrityBefore = state.integrity;

  let ticks = 0;
  while (state.state === 'COUNTDOWN') {
    tickRound(state, 16);
    ticks += 1;
    assert.ok(ticks < 1000, 'the pre-roll never ended');
    if (state.state !== 'COUNTDOWN') break;
    assert.equal(state.elapsedMs, 0, 'the round clock must not run before GO');
    assert.deepEqual(state.targets, [], 'no target may spawn before GO');
    assert.equal(state.nextSpawnAtMs, null, 'spawning is not even scheduled yet');
    assert.equal(state.misses, 0, 'nothing can be missed before GO');
    assert.equal(state.integrity, integrityBefore, 'Show Integrity cannot move before GO');
    assert.equal(state.score, 0);
    assert.equal(state.combo, 0);
    assert.equal(state.vocalist.triggered, false, 'the vocalist timeline is frozen');
    assert.equal(state.vocalist.status, 'idle');
  }

  assert.equal(state.state, 'PLAYING');
  assert.ok(ticks > 1, 'the pre-roll lasted more than a single frame');
});

test('the Groove cannot score, miss, or judge during the pre-roll', () => {
  const rhythm = createRhythm();
  assert.ok(!isBeatClockRunning('COUNTDOWN'), 'the beat clock does not run in COUNTDOWN');

  // Taps land on the pad through the whole pre-roll and are worth nothing.
  for (let t = 0; t <= countdownDurationMs(); t += 16) {
    assert.deepEqual(resolvePadTap(rhythm, context(0, 'COUNTDOWN')), []);
    assert.deepEqual(tickRhythm(rhythm, context(0, 'COUNTDOWN')), []);
  }

  assert.equal(rhythm.score, 0);
  assert.equal(rhythm.hits, 0);
  assert.equal(rhythm.misses, 0, 'a beat cannot be missed before the round starts');
  assert.equal(rhythm.streak, 0);
  assert.equal(rhythm.nextBeatToFinalize, 0, 'no beat was even opened');
});

// ---------------------------------------------------------------------------
// The GO boundary
// ---------------------------------------------------------------------------

test('GO happens exactly once, at the end of the pre-roll, with the clock at zero', () => {
  const state = counting();
  let transitions = 0;
  let previous = state.state;

  for (let guard = 0; guard < 1000; guard += 1) {
    tickRound(state, 16);
    if (state.state !== previous) {
      transitions += 1;
      previous = state.state;
      assert.equal(state.state, 'PLAYING');
      assert.equal(state.elapsedMs, 0, 'the round begins at its zero point');
      assert.equal(state.countdownMs, 0, 'the pre-roll clock is put away');
      // Spawning becomes eligible only here.
      assert.equal(state.nextSpawnAtMs, level01.phases[0].spawnEveryMs);
    }
    if (state.elapsedMs > 1000) break;
  }

  assert.equal(transitions, 1, 'the GO boundary must be crossed exactly once');
});

test('GO is not a scored beat, and the first scored beat is one interval later', () => {
  // GO is round beat 0. It pulses, and it cannot be scored.
  assert.ok(isUnscoredLeadBeat(0));
  assert.equal(RHYTHM.unscoredLeadBeats, 1);

  const rhythm = createRhythm();
  assert.deepEqual(resolvePadTap(rhythm, context(beatTimeMs(0))), [], 'GO must not score');
  assert.equal(rhythm.score, 0);

  // One beat interval after GO, and not a moment before it, the Groove starts.
  const events = resolvePadTap(rhythm, context(beatTimeMs(1)));
  assert.equal(events.length, 1);
  assert.equal(events[0]?.type, 'BEAT_HIT');
  assert.equal(rhythm.hits, 1);
  assert.equal(beatTimeMs(1), beatIntervalMs());
});

test('the old two-beat count-in is gone rather than stacked behind the countdown', () => {
  /*
   * M10 held beats 0 and 1 unscored. If that behaviour had survived the
   * countdown the player would sit through 3 -> 2 -> 1 -> GO and then a
   * further silent beat, which is the "stacked preparation" M13.1 forbids.
   */
  assert.equal(RHYTHM.unscoredLeadBeats, 1);
  assert.ok(!isUnscoredLeadBeat(1), 'beat 1 must score');

  const rhythm = createRhythm();
  const missed = tickRhythm(rhythm, context(beatTimeMs(1) + RHYTHM.goodWindowMs + 1));
  // Letting beat 1 go is a real miss, which it would not be under a count-in.
  assert.deepEqual(missed, [{ type: 'BEAT_MISSED', beatIndex: 1 }]);
  assert.equal(rhythm.misses, 1);
});

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

test('backgrounding during the pre-roll cancels it and returns to READY', () => {
  const state = counting();
  advance(state, 1000);
  assert.equal(state.state, 'COUNTDOWN');
  assert.ok(state.countdownMs > 0);

  cancelCountdown(state);
  assert.equal(state.state, 'READY');
  assert.equal(state.countdownMs, 0, 'no stale pre-roll progress survives');
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.integrity, level01.startingIntegrity, 'cancelling costs nothing');
  assert.equal(state.score, 0);
  assert.deepEqual(state.targets, []);

  // And the clock stays stopped afterwards: READY does not tick.
  advance(state, 5000);
  assert.equal(state.state, 'READY');
  assert.equal(state.countdownMs, 0);
  assert.equal(state.elapsedMs, 0);
});

test('cancelling is only possible from the pre-roll', () => {
  const state = counting();
  advance(state, countdownDurationMs());
  assert.equal(state.state, 'PLAYING');
  assert.deepEqual(cancelCountdown(state), []);
  assert.equal(state.state, 'PLAYING', 'a running round is paused, never cancelled');
});

test('starting again after a cancel runs a whole fresh pre-roll', () => {
  const state = counting();
  advance(state, 1300);
  cancelCountdown(state);

  startRound(state);
  assert.equal(state.state, 'COUNTDOWN');
  assert.equal(state.countdownMs, 0, 'the countdown restarts from 3');
  assert.equal(countdownStep(state.countdownMs), 3);
  advance(state, countdownDurationMs());
  assert.equal(state.state, 'PLAYING');
});

test('the pre-roll has no pause of its own, and PLAYING pause is unchanged', () => {
  const state = counting();
  advance(state, 800);
  // M13.1: do not add a pause control to COUNTDOWN.
  assert.deepEqual(pauseRound(state), []);
  assert.equal(state.state, 'COUNTDOWN', 'the pre-roll is not pausable');

  advance(state, countdownDurationMs());
  assert.equal(state.state, 'PLAYING');

  // Existing behaviour, untouched.
  advance(state, 1000);
  const frozenAt = state.elapsedMs;
  pauseRound(state);
  assert.equal(state.state, 'PAUSED');
  advance(state, 5000);
  assert.equal(state.elapsedMs, frozenAt, 'the clock froze while paused');
  resumeRound(state);
  assert.equal(state.state, 'PLAYING');
  advance(state, 500);
  assert.equal(state.elapsedMs, frozenAt + 500);
});

test('a fresh round is always ready to count in again', () => {
  // Restart replaces the round object, so whatever the last one ended as —
  // complete, ruined, or abandoned mid-count — the next Start sees READY.
  const finished = counting();
  advance(finished, countdownDurationMs() + 5000);
  assert.notEqual(finished.state, 'READY');

  const next = createRound();
  assert.equal(next.state, 'READY');
  assert.equal(next.countdownMs, 0);
  startRound(next);
  assert.equal(next.state, 'COUNTDOWN');
  assert.equal(countdownStep(next.countdownMs), 3);
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test('the pre-roll ends at the same point at any tick size', () => {
  // The wall time it takes to notice depends on the tick, but the state the
  // round enters must not: GO is always at the full pre-roll length, and the
  // round always starts at elapsed zero, so no judgement in the round can
  // depend on the frame rate the countdown happened to run at.
  const observed = [16, 33, 50, 97, 100].map((stepMs) => {
    const state = counting();
    const steps: number[] = [];
    while (state.state === 'COUNTDOWN') {
      steps.push(countdownStep(state.countdownMs));
      tickRound(state, stepMs);
    }
    return {
      stepMs,
      state: state.state,
      countdownMs: state.countdownMs,
      elapsedMs: state.elapsedMs,
      nextSpawnAtMs: state.nextSpawnAtMs,
      // The numerals seen, in order, with repeats collapsed.
      sequence: steps.filter((value, index) => value !== steps[index - 1]),
    };
  });

  for (const run of observed) {
    assert.equal(run.state, 'PLAYING', `tick ${run.stepMs}`);
    assert.equal(run.elapsedMs, 0, `tick ${run.stepMs}`);
    assert.equal(run.countdownMs, 0, `tick ${run.stepMs}`);
    assert.equal(run.nextSpawnAtMs, level01.phases[0].spawnEveryMs, `tick ${run.stepMs}`);
    assert.deepEqual(run.sequence, [3, 2, 1], `tick ${run.stepMs} saw ${run.sequence}`);
  }
});

test('the pre-roll does not shift the round that follows it', () => {
  /*
   * The M13.1 claim is that the countdown is *free*: the round on the far side
   * of it is the round that would have been played without it. So this plays
   * the same level twice at the same tick size — once through the pre-roll,
   * once from a round put straight into PLAYING the way `beginPlaying` leaves
   * it — and requires the two spawn schedules to be identical, instant for
   * instant.
   */
  const collect = (state: RoundState, stepMs: number) => {
    const spawns: string[] = [];
    let lastId = 0;
    while (state.elapsedMs < state.level.durationMs) {
      tickRound(state, stepMs);
      // Nothing is ever defended here, so the show would be ruined in seconds.
      // The subject is the spawn schedule, not survival.
      state.integrity = state.level.startingIntegrity;
      if (state.state === 'SHOW_RUINED') state.state = 'PLAYING';
      for (const target of state.targets) {
        if (target.id > lastId) {
          lastId = target.id;
          spawns.push(
            `${target.id}:${target.kind}:${Math.round(target.spawnAtMs)}:` +
              `${Math.round(target.durationMs)}`,
          );
        }
      }
    }
    return spawns;
  };

  for (const stepMs of [16, 33, 50]) {
    const counted = counting();
    while (counted.state === 'COUNTDOWN') tickRound(counted, stepMs);

    // The same round with the pre-roll skipped entirely.
    const direct = createRound();
    direct.state = 'PLAYING';
    direct.nextSpawnAtMs = level01.phases[0].spawnEveryMs;

    assert.deepEqual(collect(counted, stepMs), collect(direct, stepMs), `tick ${stepMs}`);
  }
});

test('the round composition is the same at any tick size', () => {
  /*
   * Which objects a seeded round throws, and how long each is in the air, come
   * from the round's generator in a fixed call order, so they do not depend on
   * how the time was sliced (AGENTS.md rules 5 and 6).
   *
   * The spawn *instants* after a phase gap are deliberately not compared: the
   * cadence is re-based on the tick that reopens a phase, which is M4
   * behaviour that predates this milestone and is untouched by it. The test
   * above is what holds the countdown responsible for the schedule.
   */
  const play = (stepMs: number) => {
    const state = counting();
    while (state.state === 'COUNTDOWN') tickRound(state, stepMs);
    const spawns: string[] = [];
    let lastId = 0;
    while (state.elapsedMs < state.level.durationMs) {
      tickRound(state, stepMs);
      state.integrity = state.level.startingIntegrity;
      if (state.state === 'SHOW_RUINED') state.state = 'PLAYING';
      for (const target of state.targets) {
        if (target.id > lastId) {
          lastId = target.id;
          spawns.push(`${target.id}:${target.kind}:${Math.round(target.durationMs)}`);
        }
      }
    }
    return spawns;
  };

  const fine = play(16);
  assert.ok(fine.length > 20, 'expected a useful number of spawns');
  assert.deepEqual(play(33), fine);
  assert.deepEqual(play(50), fine);
});

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------

const gameDir = join(dirname(fileURLToPath(import.meta.url)), '../game');

function sourceOf(relativePath: string): string {
  return readFileSync(join(gameDir, relativePath), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

test('backgrounding is wired to cancel the pre-roll, not to pause it', () => {
  // The AppState listener lives in a component this suite cannot import, so
  // the wiring is asserted at the source. The behaviour it calls into is
  // covered above.
  const engine = sourceOf('systems/GameEngine.tsx');
  assert.ok(engine.includes("round.state === 'COUNTDOWN'"), 'the pre-roll must be handled');
  assert.ok(engine.includes('cancelCountdown(round)'), 'and cancelled, not paused');
  assert.ok(engine.includes('audio.stopMusic()'), 'the music stops with it');
});

test('the countdown reads the beat clock and never a timer of its own', () => {
  for (const file of ['state/roundState.ts', 'config/rhythm.ts', 'rendering/Countdown.tsx']) {
    const source = sourceOf(file);
    assert.ok(!source.includes('setInterval'), `${file} must not use setInterval`);
    assert.ok(!source.includes('setTimeout'), `${file} must not use setTimeout`);
    assert.ok(!source.includes('Date.now'), `${file} must not read wall-clock time`);
    assert.ok(!source.includes('performance.now'), `${file} must not read wall-clock time`);
  }
});

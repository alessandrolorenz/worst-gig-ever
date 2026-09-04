/**
 * Groove domain tests (M10).
 *
 * Every case in `docs/verification/M10-gate.md` and the Beat Clock section of
 * `docs/verification/RHYTHM-PIVOT-TEST-MATRIX.md`. Nothing here touches React,
 * React Native, an audio device, or a playback position — the beat clock is a
 * function of gameplay elapsed time and is asserted as one.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BEAT_BAR,
  BEAT_MARKERS,
  COUNTDOWN,
  GROOVE_PAD,
  GROOVE_PULSE,
  RHYTHM,
  beatIntervalMs,
  beatTimeMs,
  countdownDurationMs,
  countdownStep,
  isUnscoredLeadBeat,
  padBounds,
  padContainsPoint,
  scheduledBeatCount,
} from '../game/config/rhythm.ts';
import {
  barPosition,
  createRhythm,
  clearRhythm,
  isBeatClockRunning,
  isPadPulsing,
  markerOpacity,
  markerTravel,
  pulseBeatIndex,
  pulseBeats,
  judgedBeats,
  meanAbsTimingErrorMs,
  nearestBeatIndex,
  padPulse,
  pulseClockMs,
  resolvePadTap,
  resolveRhythmTap,
  tickRhythm,
  upcomingBeatIndex,
  type BeatContext,
  type RhythmState,
} from '../game/state/rhythmState.ts';
import { VOCALIST_BLOCKING_RECT } from '../game/config/stage.ts';
import { level01 } from '../game/levels/level01.ts';
import { GAME_STATES, type GameState } from '../game/state/gameState.ts';

const DURATION = level01.durationMs;

function context(elapsedMs: number, state: GameState = 'PLAYING'): BeatContext {
  return { elapsedMs, durationMs: DURATION, state, grooveEnabled: true };
}

/** Runs the clock to `toMs` in fixed steps, judging nothing. */
function advance(rhythm: RhythmState, toMs: number, stepMs: number, state: GameState = 'PLAYING') {
  for (let t = stepMs; t <= toMs; t += stepMs) {
    tickRhythm(rhythm, context(Math.min(t, toMs), state));
  }
  tickRhythm(rhythm, context(toMs, state));
}

/** The first beat that is actually scored. */
const FIRST_SCORED = RHYTHM.unscoredLeadBeats;

// ---------------------------------------------------------------------------
// Beat clock
// ---------------------------------------------------------------------------

test('the beat interval derives from BPM, not from a frame count', () => {
  assert.equal(beatIntervalMs(), 60_000 / RHYTHM.bpm);
  assert.equal(beatIntervalMs(), 60_000 / 90);
  // Beat times are a single division, so beat 89 is not 89 accumulated errors.
  for (const index of [0, 1, 2, 45, 89]) {
    assert.equal(beatTimeMs(index), (index * 60_000) / RHYTHM.bpm);
  }
  assert.equal(beatTimeMs(0), 0);
});

test('a 60-second round at 90 BPM holds 90 beats, none of them on the whistle', () => {
  assert.equal(scheduledBeatCount(60_000), 90);
  // The 91st beat would land exactly on the final whistle, so it does not exist.
  assert.ok(beatTimeMs(89) < 60_000);
  assert.equal(beatTimeMs(90), 60_000);
  // A round that is not a whole number of beats keeps the partial one.
  assert.equal(scheduledBeatCount(60_100), 91);
  assert.ok(beatTimeMs(90) < 60_100);
  assert.equal(scheduledBeatCount(0), 0);
});

test('the GOOD window is narrower than half a beat, so no tap is ambiguous', () => {
  // The whole domain assumes at most one beat can claim any instant.
  assert.ok(RHYTHM.goodWindowMs * 2 < beatIntervalMs());
  assert.ok(RHYTHM.perfectWindowMs < RHYTHM.goodWindowMs);
});

test('beat 0 is the unscored GO beat and beat 1 is the first scored one', () => {
  // M13.1 replaced M10's two-beat count-in with the 3 -> 2 -> 1 -> GO pre-roll.
  // Exactly one beat at the head of the round is unscored, and it is GO.
  assert.equal(RHYTHM.unscoredLeadBeats, 1);
  assert.ok(isUnscoredLeadBeat(0));
  assert.ok(!isUnscoredLeadBeat(1));

  // The first scored beat is therefore exactly one beat interval after GO,
  // which happens at round time zero.
  assert.equal(beatTimeMs(RHYTHM.unscoredLeadBeats), beatIntervalMs());
});

// ---------------------------------------------------------------------------
// Judgement windows
// ---------------------------------------------------------------------------

test('a tap exactly on the beat is PERFECT', () => {
  const rhythm = createRhythm();
  const at = beatTimeMs(FIRST_SCORED);
  const events = resolvePadTap(rhythm, context(at));

  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'BEAT_HIT');
  assert.equal(rhythm.perfects, 1);
  assert.equal(rhythm.goods, 0);
  assert.equal(rhythm.score, RHYTHM.perfectPoints);
  assert.equal(rhythm.lastJudgement?.grade, 'perfect');
  assert.equal(rhythm.lastJudgement?.timingErrorMs, 0);
});

test('the PERFECT boundary is inclusive on both sides', () => {
  for (const offset of [RHYTHM.perfectWindowMs, -RHYTHM.perfectWindowMs]) {
    const rhythm = createRhythm();
    resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED) + offset));
    assert.equal(rhythm.perfects, 1, `${offset} ms should be PERFECT`);
    assert.equal(rhythm.score, RHYTHM.perfectPoints);
  }
});

test('just outside PERFECT and up to the GOOD boundary is GOOD', () => {
  for (const offset of [
    RHYTHM.perfectWindowMs + 1,
    -(RHYTHM.perfectWindowMs + 1),
    RHYTHM.goodWindowMs,
    -RHYTHM.goodWindowMs,
  ]) {
    const rhythm = createRhythm();
    resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED) + offset));
    assert.equal(rhythm.goods, 1, `${offset} ms should be GOOD`);
    assert.equal(rhythm.perfects, 0);
    assert.equal(rhythm.score, RHYTHM.goodPoints);
  }
});

test('beyond the GOOD window is not a beat hit at all', () => {
  for (const offset of [RHYTHM.goodWindowMs + 1, -(RHYTHM.goodWindowMs + 1), 300, -300]) {
    const rhythm = createRhythm();
    const events = resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED) + offset));
    assert.equal(events.length, 0, `${offset} ms should not score`);
    assert.equal(rhythm.hits, 0);
    assert.equal(rhythm.score, 0);
    assert.equal(rhythm.streak, 0);
  }
});

test('the nearest beat is the only one a tap can claim', () => {
  // Halfway between two beats belongs to neither.
  const between = beatTimeMs(FIRST_SCORED) + beatIntervalMs() / 2;
  const rhythm = createRhythm();
  assert.equal(resolvePadTap(rhythm, context(between)).length, 0);
  assert.equal(nearestBeatIndex(beatTimeMs(5) + 10), 5);
  assert.equal(nearestBeatIndex(beatTimeMs(5) - 10), 5);
});

// ---------------------------------------------------------------------------
// Count-in
// ---------------------------------------------------------------------------

test('count-in beats are never scored and never counted as misses', () => {
  const rhythm = createRhythm();

  // Tapping perfectly on both count-in beats scores nothing.
  for (let index = 0; index < RHYTHM.unscoredLeadBeats; index += 1) {
    assert.equal(resolvePadTap(rhythm, context(beatTimeMs(index))).length, 0);
  }
  assert.equal(rhythm.score, 0);
  assert.equal(rhythm.hits, 0);

  // Letting both windows close produces no miss either.
  advance(rhythm, beatTimeMs(FIRST_SCORED) - 1, 16);
  assert.equal(rhythm.misses, 0);
  assert.equal(judgedBeats(rhythm), 0);
  // ...but finalization has still walked past them.
  assert.equal(rhythm.nextBeatToFinalize, FIRST_SCORED);
});

// ---------------------------------------------------------------------------
// One beat, one score
// ---------------------------------------------------------------------------

test('one beat cannot score twice, however many taps land in its window', () => {
  const rhythm = createRhythm();
  const at = beatTimeMs(FIRST_SCORED);

  resolvePadTap(rhythm, context(at));
  const second = resolvePadTap(rhythm, context(at + 20));
  const third = resolvePadTap(rhythm, context(at + 60));

  assert.equal(second.length, 0);
  assert.equal(third.length, 0);
  assert.equal(rhythm.hits, 1);
  assert.equal(rhythm.score, RHYTHM.perfectPoints);
  assert.equal(rhythm.streak, 1);
});

test('a beat already closed as a miss cannot be scored retroactively', () => {
  const rhythm = createRhythm();
  const beat = FIRST_SCORED;
  advance(rhythm, beatTimeMs(beat) + RHYTHM.goodWindowMs + 1, 16);
  assert.equal(rhythm.misses, 1);

  // A tap that would otherwise have matched that beat is now worth nothing.
  assert.equal(resolvePadTap(rhythm, context(beatTimeMs(beat) + 10)).length, 0);
  assert.equal(rhythm.hits, 0);
  assert.equal(rhythm.score, 0);
});

test('extra taps score nothing, subtract nothing, and break no streak', () => {
  const rhythm = createRhythm();
  resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED)));
  const scoreAfterHit = rhythm.score;
  const streakAfterHit = rhythm.streak;

  // Mash the pad well away from any beat.
  for (let i = 0; i < 40; i += 1) {
    const t = beatTimeMs(FIRST_SCORED) + beatIntervalMs() / 2 + i;
    assert.equal(resolvePadTap(rhythm, context(t)).length, 0);
  }

  assert.equal(rhythm.score, scoreAfterHit);
  assert.equal(rhythm.streak, streakAfterHit);
  assert.equal(rhythm.misses, 0);
  assert.ok(rhythm.score >= 0);
});

// ---------------------------------------------------------------------------
// Misses and streak
// ---------------------------------------------------------------------------

test('a beat whose window closes unhit is a miss and resets the streak', () => {
  const rhythm = createRhythm();

  resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED)));
  resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED + 1)));
  assert.equal(rhythm.streak, 2);
  assert.equal(rhythm.bestStreak, 2);

  // Ignore the next beat entirely.
  const events = [];
  const closeAt = beatTimeMs(FIRST_SCORED + 2) + RHYTHM.goodWindowMs + 1;
  events.push(...tickRhythm(rhythm, context(closeAt)));

  assert.ok(events.some((event) => event.type === 'BEAT_MISSED'));
  assert.equal(rhythm.misses, 1);
  assert.equal(rhythm.streak, 0);
  // The best streak is a high-water mark and survives the reset.
  assert.equal(rhythm.bestStreak, 2);
  assert.equal(judgedBeats(rhythm), 3);
});

test('a beat is still hittable at exactly +goodWindowMs and closed one ms later', () => {
  const beat = FIRST_SCORED;
  const closeAt = beatTimeMs(beat) + RHYTHM.goodWindowMs;

  const onBoundary = createRhythm();
  tickRhythm(onBoundary, context(closeAt));
  assert.equal(onBoundary.misses, 0, 'the window must still be open on the boundary');
  assert.equal(resolvePadTap(onBoundary, context(closeAt)).length, 1);

  const pastBoundary = createRhythm();
  tickRhythm(pastBoundary, context(closeAt + 1));
  assert.equal(pastBoundary.misses, 1);
});

test('a missed beat costs no points and never makes the score negative', () => {
  const rhythm = createRhythm();
  advance(rhythm, beatTimeMs(20), 16);
  assert.ok(rhythm.misses > 0);
  assert.equal(rhythm.score, 0);
  assert.equal(RHYTHM.missPoints, 0);
});

// ---------------------------------------------------------------------------
// Pause / vocalist / terminal semantics
// ---------------------------------------------------------------------------

test('the beat clock runs in PLAYING and VOCALIST_EVENT and nowhere else', () => {
  assert.ok(isBeatClockRunning('PLAYING'));
  assert.ok(isBeatClockRunning('VOCALIST_EVENT'));
  for (const state of ['READY', 'PAUSED', 'SHOW_COMPLETE', 'SHOW_RUINED'] as const) {
    assert.ok(!isBeatClockRunning(state), `${state} must freeze the beat clock`);
  }
});

test('PAUSED neither advances beats nor judges taps', () => {
  const rhythm = createRhythm();
  const at = beatTimeMs(FIRST_SCORED);

  // A perfectly timed tap while paused is ignored.
  assert.equal(resolvePadTap(rhythm, context(at, 'PAUSED')).length, 0);
  // And time passing while paused closes no windows.
  tickRhythm(rhythm, context(at + 10_000, 'PAUSED'));

  assert.equal(rhythm.hits, 0);
  assert.equal(rhythm.misses, 0);
  assert.equal(rhythm.nextBeatToFinalize, 0);
});

test('READY and the terminal states freeze the Groove', () => {
  for (const state of ['READY', 'SHOW_COMPLETE', 'SHOW_RUINED'] as const) {
    const rhythm = createRhythm();
    assert.equal(resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED), state)).length, 0);
    tickRhythm(rhythm, context(30_000, state));
    assert.equal(rhythm.hits, 0, state);
    assert.equal(rhythm.misses, 0, state);
    assert.equal(rhythm.nextBeatToFinalize, 0, state);
  }
});

test('the vocalist event leaves the Groove fully playable', () => {
  const rhythm = createRhythm();
  const beat = 40;

  // Beats keep closing during the interruption...
  tickRhythm(rhythm, context(beatTimeMs(beat) - 1, 'VOCALIST_EVENT'));
  assert.ok(rhythm.misses > 0, 'beats must keep progressing during the event');

  // ...and can still be scored.
  const events = resolvePadTap(rhythm, context(beatTimeMs(beat), 'VOCALIST_EVENT'));
  assert.equal(events.length, 1);
  assert.equal(rhythm.hits, 1);
});

// ---------------------------------------------------------------------------
// Determinism
// ---------------------------------------------------------------------------

test('the same elapsed-time and tap schedule gives the same result at any tick size', () => {
  // Taps expressed as offsets from a beat, so the schedule is tick-independent.
  const taps: Array<[number, number]> = [
    [2, 0],
    [3, -85],
    [4, 120],
    [6, 179],
    [7, -179],
    [9, 400], // outside every window
    [10, 30],
  ];

  const play = (stepMs: number): RhythmState => {
    const rhythm = createRhythm();
    const schedule = taps
      .map(([beat, offset]) => beatTimeMs(beat) + offset)
      .sort((a, b) => a - b);
    let next = 0;
    for (let t = 0; t <= beatTimeMs(14); t += stepMs) {
      // Resolve every tap the frame just passed, at its own exact time, then
      // advance the clock — the order the round system uses.
      while (next < schedule.length && schedule[next] <= t) {
        resolvePadTap(rhythm, context(schedule[next]));
        next += 1;
      }
      tickRhythm(rhythm, context(t));
    }
    return rhythm;
  };

  const fine = play(4);
  const coarse = play(33);
  const lumpy = play(97);

  for (const other of [coarse, lumpy]) {
    assert.deepEqual(
      { ...other, lastJudgement: other.lastJudgement },
      { ...fine, lastJudgement: fine.lastJudgement },
    );
  }
  assert.equal(fine.hits, 6);
  assert.equal(fine.perfects, 3);
  assert.equal(fine.goods, 3);
});

test('a full silent round judges every scored beat as a miss', () => {
  const rhythm = createRhythm();
  advance(rhythm, DURATION, 16);

  const scored = scheduledBeatCount(DURATION) - RHYTHM.unscoredLeadBeats;
  assert.equal(rhythm.misses, scored);
  assert.equal(rhythm.hits, 0);
  assert.equal(judgedBeats(rhythm), scored);
  assert.equal(rhythm.score, 0);
  // Every beat in the round is resolved by the time it ends.
  assert.equal(rhythm.nextBeatToFinalize, scheduledBeatCount(DURATION));
});

test('a perfect round scores every beat and nothing is left open', () => {
  const rhythm = createRhythm();
  const total = scheduledBeatCount(DURATION);

  for (let beat = FIRST_SCORED; beat < total; beat += 1) {
    resolvePadTap(rhythm, context(beatTimeMs(beat)));
    tickRhythm(rhythm, context(beatTimeMs(beat) + RHYTHM.goodWindowMs + 1));
  }
  tickRhythm(rhythm, context(DURATION));

  const scored = total - RHYTHM.unscoredLeadBeats;
  assert.equal(rhythm.hits, scored);
  assert.equal(rhythm.misses, 0);
  assert.equal(rhythm.perfects, scored);
  assert.equal(rhythm.streak, scored);
  assert.equal(rhythm.bestStreak, scored);
  assert.equal(rhythm.score, scored * RHYTHM.perfectPoints);
  assert.equal(meanAbsTimingErrorMs(rhythm), 0);
});

// ---------------------------------------------------------------------------
// Pad geometry
// ---------------------------------------------------------------------------

test('the pad is an ellipse at its configured centre and half-extents', () => {
  const { centerX, centerY, halfWidthPx, halfHeightPx } = GROOVE_PAD;
  assert.ok(padContainsPoint(centerX, centerY));

  // Both axes are inclusive at the boundary and exclusive one pixel past it.
  assert.ok(padContainsPoint(centerX + halfWidthPx, centerY));
  assert.ok(!padContainsPoint(centerX + halfWidthPx + 1, centerY));
  assert.ok(padContainsPoint(centerX, centerY + halfHeightPx));
  assert.ok(!padContainsPoint(centerX, centerY + halfHeightPx + 1));

  // A true ellipse, not its bounding box: the corners are outside it.
  assert.ok(!padContainsPoint(centerX + halfWidthPx, centerY + halfHeightPx));

  // Somewhere else entirely on the canvas is not the pad.
  assert.ok(!padContainsPoint(960, 540));
});

test('the pad is meaningfully larger than the M10 pad it replaced', () => {
  // M13.1 asks for roughly 30-50% more tappable footprint, and for none of it
  // to come from a timing window. The old pad was a 150 px circle.
  const before = Math.PI * 150 * 150;
  const after = Math.PI * GROOVE_PAD.halfWidthPx * GROOVE_PAD.halfHeightPx;
  const growth = after / before - 1;
  assert.ok(growth >= 0.3, `pad grew only ${(growth * 100).toFixed(1)}%`);
  assert.ok(growth <= 0.5, `pad grew ${(growth * 100).toFixed(1)}%, beyond the M13.1 guidance`);
});

test('the pad sits low and centred, inside the canvas, clear of the singer', () => {
  const bounds = padBounds();

  // Lower centre: horizontally on the canvas centre line, and below the
  // midline where the kit is drawn (M13.1).
  assert.equal(GROOVE_PAD.centerX, bounds.canvasWidth / 2);
  assert.ok(GROOVE_PAD.centerY > bounds.canvasHeight / 2);

  // Fully on screen, so no part of the pad is unreachable.
  assert.ok(bounds.left >= 0 && bounds.right <= bounds.canvasWidth);
  assert.ok(bounds.top >= 0 && bounds.bottom <= bounds.canvasHeight);

  // On the drawn kit rather than beside it. Measured in drumkit_pov.png and
  // mapped through DRUM_KIT_RECT: the kick's black head covers canvas x
  // 780-1140 from y 940, and the snare head x 620-1300 from y 1004.
  assert.ok(padContainsPoint(960, 1000), 'the pad centre line must be on the kick head');

  // The blocking vocalist must never be able to cover the pad (M11). The rect
  // is checked against the pad's bounding box, which contains the ellipse.
  const r = VOCALIST_BLOCKING_RECT;
  const overlaps =
    bounds.left < r.x + r.width &&
    r.x < bounds.right &&
    bounds.top < r.y + r.height &&
    r.y < bounds.bottom;
  assert.ok(!overlaps, 'the singer must not overlap the Groove Pad');
});

test('a tap off the pad is not judged at all', () => {
  const rhythm = createRhythm();
  // Perfect timing, wrong place.
  const events = resolveRhythmTap(rhythm, { x: 960, y: 540 }, context(beatTimeMs(FIRST_SCORED)));
  assert.equal(events.length, 0);
  assert.equal(rhythm.hits, 0);
});

test('a tap on the pad at the right time is judged', () => {
  const rhythm = createRhythm();
  const events = resolveRhythmTap(
    rhythm,
    { x: GROOVE_PAD.centerX, y: GROOVE_PAD.centerY },
    context(beatTimeMs(FIRST_SCORED)),
  );
  assert.equal(events.length, 1);
  assert.equal(rhythm.hits, 1);
});

// ---------------------------------------------------------------------------
// Pulse
// ---------------------------------------------------------------------------

test('the pulse peaks exactly on every beat and rests between them', () => {
  for (const beat of [0, 1, 2, 17, 89]) {
    assert.equal(padPulse(beatTimeMs(beat)), 1, `beat ${beat} must peak`);
  }
  // A rest exists between the fall and the next swell, or there is no silence
  // to make the swell legible.
  const restStart = beatTimeMs(3) + GROOVE_PULSE.decayMs;
  const restEnd = beatTimeMs(4) - GROOVE_PULSE.leadInMs;
  assert.ok(restEnd > restStart, 'lead-in and decay must fit inside one beat');
  assert.equal(padPulse((restStart + restEnd) / 2), 0);
});

test('the pulse swells into the beat and falls away after it', () => {
  const beat = beatTimeMs(4);
  // Rising.
  let previous = -1;
  for (let t = beat - GROOVE_PULSE.leadInMs; t <= beat; t += 10) {
    const value = padPulse(t);
    assert.ok(value >= previous - 1e-9, `pulse must not dip while swelling at ${t}`);
    previous = value;
  }
  // Falling.
  previous = 2;
  for (let t = beat; t <= beat + GROOVE_PULSE.decayMs; t += 10) {
    const value = padPulse(t);
    assert.ok(value <= previous + 1e-9, `pulse must not rise while decaying at ${t}`);
    previous = value;
  }
});

test('the pulse is continuous, so the pad breathes instead of strobing', () => {
  let previous = padPulse(0);
  for (let t = 1; t < beatIntervalMs() * 4; t += 1) {
    const value = padPulse(t);
    assert.ok(Math.abs(value - previous) < 0.05, `pulse jumped at ${t}`);
    previous = value;
  }
});

test('the pulse stays inside 0..1 and never depends on wall-clock time', () => {
  for (let t = 0; t < 60_000; t += 7) {
    const value = padPulse(t);
    assert.ok(value >= 0 && value <= 1, `pulse out of range at ${t}`);
  }
  // Purity: the same input always gives the same output.
  assert.equal(padPulse(12_345), padPulse(12_345));
});

test('the pulse crosses the GO boundary without a seam', () => {
  /*
   * The pre-roll and the round are one beat schedule read through one pure
   * function, so the swell into GO must be continuous: the last frame of the
   * countdown and the first frame of the round are a millisecond apart on the
   * same clock, and the pad must not jump between them.
   */
  const before = padPulse(pulseClockMs('COUNTDOWN', 0, countdownDurationMs() - 1));
  const after = padPulse(pulseClockMs('PLAYING', 0, 0));
  assert.ok(Math.abs(after - before) < 0.02, `pulse jumped at GO: ${before} -> ${after}`);
  assert.ok(after > 0.95, 'GO itself is a peak');

  // Walking the whole pre-roll: in range everywhere, and smooth throughout.
  // The per-beat peaks themselves are asserted in tests/countdown.test.ts.
  let previous = padPulse(pulseClockMs('COUNTDOWN', 0, 0));
  let swells = 0;
  for (let t = 1; t <= countdownDurationMs(); t += 1) {
    const value = padPulse(pulseClockMs('COUNTDOWN', 0, t));
    assert.ok(value >= 0 && value <= 1, `pulse out of range at ${t}`);
    assert.ok(Math.abs(value - previous) < 0.05, `pulse jumped at ${t}`);
    // Each swell crosses up through 0.99 exactly once. The pre-roll opens
    // already at the peak of "3", so the crossings counted are "2", "1", GO.
    if (previous < 0.99 && value >= 0.99) swells += 1;
    previous = value;
  }
  assert.equal(swells, COUNTDOWN.leadBeats, 'the pad swells into every counted beat');
});

test('the pad animates through the pre-roll but the beat clock does not run', () => {
  // The two predicates differ on exactly one state, which is the whole of the
  // M13.1 boundary: the player sees the beat, and nothing is judged.
  for (const state of GAME_STATES) {
    const expected = state === 'COUNTDOWN' ? true : isBeatClockRunning(state);
    assert.equal(isPadPulsing(state), expected, state);
  }
  assert.ok(isPadPulsing('COUNTDOWN'));
  assert.ok(!isBeatClockRunning('COUNTDOWN'));
  // And the numerals it draws come off the same schedule.
  assert.equal(countdownStep(0), COUNTDOWN.leadBeats);
});

test('the unscored GO beat is identifiable from the clock alone', () => {
  assert.ok(isUnscoredLeadBeat(upcomingBeatIndex(0)));
  assert.ok(!isUnscoredLeadBeat(upcomingBeatIndex(beatTimeMs(1) - 1)));
  assert.ok(!isUnscoredLeadBeat(upcomingBeatIndex(beatTimeMs(2) - 1)));
});

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

test('clearing the Groove returns it to a fresh one', () => {
  const rhythm = createRhythm();
  resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED)));
  advance(rhythm, beatTimeMs(20), 16);
  assert.ok(rhythm.hits > 0 && rhythm.misses > 0);

  clearRhythm(rhythm);
  assert.deepEqual(rhythm, createRhythm());
  assert.equal(rhythm.lastJudgement, null);
  assert.equal(rhythm.lastHitBeatIndex, -1);
});

test('mean timing error is null until a beat is actually hit', () => {
  const rhythm = createRhythm();
  assert.equal(meanAbsTimingErrorMs(rhythm), null);
  resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED) + 40));
  resolvePadTap(rhythm, context(beatTimeMs(FIRST_SCORED + 1) - 20));
  assert.equal(meanAbsTimingErrorMs(rhythm), 30);
});

// ---------------------------------------------------------------------------
// The beat cue (M16)
// ---------------------------------------------------------------------------

test('the pulse index counts the pre-roll beats, and does not invent one', () => {
  // The whole reason `pulseBeatIndex` multiplies by the BPM instead of
  // dividing by the interval. The pre-roll begins at exactly -2000 ms, and
  // `-2000 / (60000 / 90)` is -3.0000000000000004 in floating point — whose
  // floor is -4, a fourth count-in beat that does not exist and would click a
  // fraction of a millisecond early.
  assert.equal(pulseBeatIndex(-countdownDurationMs()), -COUNTDOWN.leadBeats);
  assert.equal(pulseBeatIndex(-beatTimeMs(2)), -2);
  assert.equal(pulseBeatIndex(-beatTimeMs(1)), -1);
  assert.equal(pulseBeatIndex(0), 0);
  assert.equal(pulseBeatIndex(beatTimeMs(1)), 1);

  // It is the beat we are *in*, so it holds until the next one arrives.
  assert.equal(pulseBeatIndex(beatIntervalMs() - 1), 0);
  assert.equal(pulseBeatIndex(beatIntervalMs() + 1), 1);
});

test('the bar counts 3 - 2 - 1 - GO across a bar line', () => {
  // Not a decorative detail: it is what makes the pre-roll read as a musician
  // counting a band in rather than as four unrelated blinks.
  assert.equal(barPosition(-3), 2);
  assert.equal(barPosition(-2), 3);
  assert.equal(barPosition(-1), 4);
  assert.equal(barPosition(0), 1);
  assert.equal(barPosition(1), 2);
  assert.equal(barPosition(BEAT_BAR.beats), 1, 'the bar must wrap');

  for (let beat = -12; beat <= 40; beat += 1) {
    const position = barPosition(beat);
    assert.ok(
      position >= 1 && position <= BEAT_BAR.beats,
      `beat ${String(beat)} fell outside the bar at position ${String(position)}`,
    );
  }
});

test('the markers meet exactly on the beat, and only on the beat', () => {
  // The whole cue is a coincidence, so the coincidence has to be exact.
  for (const beat of [0, 1, 2, 17, 88]) {
    const atBeat = markerTravel(beatTimeMs(beat));
    assert.ok(
      Math.abs(atBeat - 1) < 1e-9 || atBeat < 1e-9,
      `travel at beat ${String(beat)} was ${String(atBeat)}`,
    );
  }
  // Just before a beat they are as good as touching; just after, back at the rim.
  assert.ok(markerTravel(beatTimeMs(4) - 1) < 0.01, 'the markers had not arrived');
  assert.ok(markerTravel(beatTimeMs(4) + 1) > 0.99, 'the markers did not restart');
});

test('the markers close at a constant rate, so the eye can predict them', () => {
  // An eased approach is prettier and useless: a timing cue has to let the
  // player extrapolate where the marker will be, and only a straight line
  // does that. Asserted as equal travel over equal time.
  const interval = beatIntervalMs();
  const samples = [0.1, 0.3, 0.5, 0.7].map((fraction) => markerTravel(interval * fraction));
  for (let i = 1; i < samples.length; i += 1) {
    const step = samples[i - 1] - samples[i];
    assert.ok(Math.abs(step - 0.2) < 1e-9, `travel step was ${String(step)}, expected 0.2`);
  }
});

test('the markers fade in rather than snapping back to the rim', () => {
  // Reappearing at full brightness reads as a strobe, which is the defect M6B
  // fixed in the stage overlay for exactly the same reason.
  assert.equal(markerOpacity(1), 0, 'the markers popped in at the rim');
  assert.equal(markerOpacity(1 - BEAT_MARKERS.fadeInFraction), 1);
  assert.equal(markerOpacity(0), 1, 'the markers must be solid when they meet');
  assert.ok(markerOpacity(1 - BEAT_MARKERS.fadeInFraction / 2) > 0);
});

test('the markers start inside the pad they belong to', () => {
  // They live in the existing SVG surface, and that is the point: a converging
  // ring would have needed a bigger one, on the device whose render cost is
  // still under an open retest.
  assert.ok(BEAT_MARKERS.startFraction < 1, 'the markers would start outside the tap area');
  const startOffset = BEAT_MARKERS.startFraction * GROOVE_PAD.halfWidthPx;
  assert.ok(
    startOffset + BEAT_MARKERS.widthPx / 2 <= GROOVE_PAD.halfWidthPx,
    'a marker overhangs the pad rim at the start of its travel',
  );
});

test('the bar counter sits inside the pad, clear of the markers', () => {
  // Above the axis, on purpose: below it collides with the markers, and the
  // canvas band from y 1020 is where a phone gesture pill sits (open item 15).
  const dy = BEAT_BAR.offsetY;
  assert.ok(dy < 0, 'the bar row must sit above the axis the markers travel');
  assert.ok(
    Math.abs(dy) + BEAT_BAR.radiusPx * 1.35 < GROOVE_PAD.halfHeightPx,
    'the bar row spills out of the pad vertically',
  );

  // The row has to fit the ellipse at its own height, not at the widest point.
  const halfWidthAtRow =
    GROOVE_PAD.halfWidthPx * Math.sqrt(1 - (dy / GROOVE_PAD.halfHeightPx) ** 2);
  const rowHalfSpan = ((BEAT_BAR.beats - 1) / 2) * BEAT_BAR.spacingPx + BEAT_BAR.radiusPx * 1.35;
  assert.ok(
    rowHalfSpan < halfWidthAtRow,
    `the bar row is ${String(Math.round(rowHalfSpan))} px wide against ${String(Math.round(halfWidthAtRow))} px of pad`,
  );

  const padTop = GROOVE_PAD.centerY - GROOVE_PAD.halfHeightPx;
  assert.ok(GROOVE_PAD.centerY + dy > padTop, 'the bar row left the pad');
  assert.ok(GROOVE_PAD.centerY + dy < 1020, 'the bar row runs under the system navigation bar');
});

test('a beat pulses once, whatever the tick size', () => {
  const rhythm = createRhythm();

  // The first call arms the cursor and reports the beat it landed in, so the
  // very first pre-roll beat is never silent.
  const first = pulseBeats(rhythm, -countdownDurationMs(), true);
  assert.deepEqual(first, [{ type: 'BEAT_PULSE', beatIndex: -COUNTDOWN.leadBeats }]);

  // Ticking on inside the same beat reports nothing more.
  assert.deepEqual(pulseBeats(rhythm, -countdownDurationMs() + 10, true), []);
  assert.deepEqual(pulseBeats(rhythm, -countdownDurationMs() + 300, true), []);

  // Crossing into the next one reports exactly one.
  assert.deepEqual(pulseBeats(rhythm, -beatTimeMs(2), true), [
    { type: 'BEAT_PULSE', beatIndex: -2 },
  ]);
});

test('a stalled frame cannot machine-gun a bar of clicks', () => {
  const rhythm = createRhythm();
  pulseBeats(rhythm, 0, true);
  // Eight beats in one step: a resumed app, or a very long stall.
  const events = pulseBeats(rhythm, beatTimeMs(8), true);
  assert.equal(events.length, 1, 'a backlog was flushed as a burst of clicks');
  assert.deepEqual(events, [{ type: 'BEAT_PULSE', beatIndex: 8 }]);
});

test('the pulse cursor is dropped whenever the pad stops, so the next round counts in', () => {
  const rhythm = createRhythm();
  pulseBeats(rhythm, beatTimeMs(3), true);
  assert.equal(rhythm.lastPulsedBeatIndex, 3);

  assert.deepEqual(pulseBeats(rhythm, beatTimeMs(4), false), []);
  assert.equal(rhythm.lastPulsedBeatIndex, null);

  // And the next round's first pre-roll beat still sounds.
  assert.deepEqual(pulseBeats(rhythm, -countdownDurationMs(), true), [
    { type: 'BEAT_PULSE', beatIndex: -COUNTDOWN.leadBeats },
  ]);
});

test('the pulse never touches a judgement', () => {
  // The guarantee the click switch rests on: pulsing is an output of the clock
  // and can neither score, miss, nor advance finalization.
  const rhythm = createRhythm();
  const before = { ...rhythm };
  for (let beat = -3; beat < 20; beat += 1) pulseBeats(rhythm, beatTimeMs(beat), true);

  assert.equal(rhythm.score, before.score);
  assert.equal(rhythm.hits, before.hits);
  assert.equal(rhythm.misses, before.misses);
  assert.equal(rhythm.streak, before.streak);
  assert.equal(rhythm.nextBeatToFinalize, before.nextBeatToFinalize);
  assert.equal(rhythm.lastHitBeatIndex, before.lastHitBeatIndex);
  assert.equal(rhythm.lastJudgement, before.lastJudgement);
});

test('clearing the rhythm clears the pulse cursor with it', () => {
  const rhythm = createRhythm();
  pulseBeats(rhythm, beatTimeMs(9), true);
  clearRhythm(rhythm);
  assert.equal(rhythm.lastPulsedBeatIndex, null);
});

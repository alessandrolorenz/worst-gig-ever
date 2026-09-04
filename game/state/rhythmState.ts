/**
 * Groove domain: the visual beat clock, beat judgement, and Groove scoring.
 *
 * This module owns every rhythm truth — which beats exist, which have been
 * judged, what a tap was worth, the streak, and the timing-error aggregate.
 * It imports no React, no React Native, no audio, and not even the round
 * state, so all of it is testable without rendering (AGENTS.md rule 4) and
 * without an audio device (rhythm-pivot test matrix, "No audio coupling").
 *
 * ## Time
 *
 * The clock is **gameplay elapsed time**, handed in by the caller. It is never
 * read from `Date.now()`, a timer, a frame counter, or the music player's
 * position. That single choice is what gives the rest of the pivot for free:
 * the round clock already stops in READY, PAUSED, and terminal states and
 * already keeps running through `VOCALIST_EVENT`, so the beat clock inherits
 * exactly the pause semantics M10 asks for without a rule of its own.
 *
 * ## Why so little state
 *
 * The GOOD window (180 ms either side) is narrower than half a beat interval
 * (333 ms at 90 BPM), so the windows of two beats can never overlap: for any
 * instant there is **at most one** beat a tap could belong to, and it is
 * simply the nearest one. That removes the need to search a list of open
 * beats, and it means "the nearest unjudged beat inside the active window" is
 * one rounding operation. `RHYTHM.goodWindowMs` is held below that bound by
 * `tests/rhythm.test.ts`, because this whole module assumes it.
 *
 * Beats are therefore finalized strictly in order, and two integers are enough
 * to know what has already happened: how far finalization has run, and which
 * beat was last scored.
 */
import {
  BEAT_BAR,
  BEAT_MARKERS,
  GROOVE_PULSE,
  RHYTHM,
  beatIntervalMs,
  beatTimeMs,
  countdownDurationMs,
  isUnscoredLeadBeat,
  padContainsPoint,
  scheduledBeatCount,
} from '../config/rhythm.ts';
import type { GameState } from './gameState.ts';

export const BEAT_GRADES = ['perfect', 'good'] as const;

export type BeatGrade = (typeof BEAT_GRADES)[number];

/** What the last judged beat was worth, kept for on-screen feedback. */
export interface BeatJudgement {
  readonly beatIndex: number;
  readonly grade: BeatGrade;
  /** Signed: negative is early, positive is late. */
  readonly timingErrorMs: number;
  /** Gameplay time the tap landed, so a renderer can age the feedback. */
  readonly atMs: number;
  readonly points: number;
}

export interface RhythmState {
  score: number;
  /** Beats scored. */
  hits: number;
  /** Scored beats whose window closed with nobody on them. */
  misses: number;
  perfects: number;
  goods: number;
  streak: number;
  bestStreak: number;
  /**
   * Lowest beat index not yet finalized. Finalization runs in order, so every
   * beat below this has been resolved as a hit or a miss.
   */
  nextBeatToFinalize: number;
  /** The last beat that scored, or -1. A beat can never score twice. */
  lastHitBeatIndex: number;
  /** Summed absolute error over scored beats, for the mean in the summary. */
  totalAbsTimingErrorMs: number;
  lastJudgement: BeatJudgement | null;
  /**
   * The last beat the *pulse* reached, or null when the pad is not animating
   * (M16).
   *
   * Deliberately separate from `nextBeatToFinalize`, which is about judgement.
   * This one counts beats that merely *happened*, including the three pre-roll
   * beats that have negative indices and are never scored — it is the cursor
   * the click is emitted from, and it must advance through the count-in or the
   * count-in is silent.
   */
  lastPulsedBeatIndex: number | null;
}

export type RhythmEvent =
  | {
      type: 'BEAT_HIT';
      beatIndex: number;
      grade: BeatGrade;
      timingErrorMs: number;
      points: number;
      streak: number;
    }
  | { type: 'BEAT_MISSED'; beatIndex: number }
  /**
   * A beat arrived. Not a judgement of any kind — it fires whether or not the
   * player tapped, and it fires for the unscored pre-roll beats too.
   */
  | { type: 'BEAT_PULSE'; beatIndex: number };

/**
 * Everything the Groove needs to know about the round, passed in rather than
 * imported, so the rhythm domain stays independent of the round domain.
 */
export interface BeatContext {
  /** Gameplay elapsed milliseconds. */
  readonly elapsedMs: number;
  /** Round length, which decides how many beats exist at all. */
  readonly durationMs: number;
  readonly state: GameState;
  /**
   * Whether this stage asks for the Groove at all (M15).
   *
   * Stage 1 is defense only, and "defense only" has to mean the beat clock
   * genuinely does not run — not merely that the pad is hidden. A hidden pad
   * over a live clock would still finalize a missed beat every 667 ms, and the
   * player would reach the results screen having lost a streak in a job they
   * were never shown.
   *
   * It arrives per frame in the context rather than being stored on
   * `RhythmState`, for the same reason `elapsedMs` does: this module owns
   * judgements, not configuration, and the stage that is running is something
   * the caller knows and it does not.
   */
  readonly grooveEnabled: boolean;
}

export function createRhythm(): RhythmState {
  return {
    score: 0,
    hits: 0,
    misses: 0,
    perfects: 0,
    goods: 0,
    streak: 0,
    bestStreak: 0,
    nextBeatToFinalize: 0,
    lastHitBeatIndex: -1,
    totalAbsTimingErrorMs: 0,
    lastJudgement: null,
    lastPulsedBeatIndex: null,
  };
}

/** Restores a rhythm state in place, for restart. */
export function clearRhythm(state: RhythmState): void {
  Object.assign(state, createRhythm());
}

/**
 * True while the beat clock is running.
 *
 * The vocalist interruption is deliberately included: the whole point of the
 * pivot is that the player keeps the groove while the gig falls apart around
 * them (rhythm-pivot architecture, "Vocalist event").
 */
export function isBeatClockRunning(state: GameState): boolean {
  return state === 'PLAYING' || state === 'VOCALIST_EVENT';
}

/**
 * True while the pad is animating, which is a wider set of states than the
 * ones that score (M13.1).
 *
 * The pre-roll exists to hand the player the tempo before anything is at
 * stake, so the pad has to pulse through it — but COUNTDOWN is deliberately
 * absent from `isBeatClockRunning`, so nothing in this module can score, miss,
 * or judge during it.
 */
export function isPadPulsing(state: GameState): boolean {
  return state === 'COUNTDOWN' || isBeatClockRunning(state);
}

/**
 * The single clock the pad pulse and the countdown numerals are both drawn
 * from, in milliseconds relative to `GO` (M13.1).
 *
 * Negative through the pre-roll and zero at `GO`, which is what makes
 * `3 -> 2 -> 1 -> GO` four consecutive beats of one schedule rather than a
 * separate animation bolted onto the front of the round: at 90 BPM the
 * numerals land on -2000, -1333, -667 and `GO` on 0, and `padPulse` — being a
 * pure function of time modulo the beat interval — swells into each of them
 * without knowing the countdown exists.
 *
 * It is not a second clock. Both inputs are gameplay time owned by the round,
 * and neither is advanced here.
 */
export function pulseClockMs(state: GameState, elapsedMs: number, countdownMs: number): number {
  if (state === 'COUNTDOWN') return countdownMs - countdownDurationMs();
  return elapsedMs;
}

/** Scored beats resolved so far — the denominator of "hits / judged". */
export function judgedBeats(state: RhythmState): number {
  return state.hits + state.misses;
}

/** Mean absolute timing error over the beats that were actually hit. */
export function meanAbsTimingErrorMs(state: RhythmState): number | null {
  if (state.hits === 0) return null;
  return state.totalAbsTimingErrorMs / state.hits;
}

/** The beat a tap at this instant could possibly belong to. */
export function nearestBeatIndex(elapsedMs: number): number {
  return Math.round(elapsedMs / beatIntervalMs());
}

/**
 * Advances the Groove clock and closes out any beat whose window has passed.
 *
 * Takes an absolute elapsed time rather than a delta on purpose: the round
 * already owns the clock, and re-deriving the same number from a stream of
 * deltas is how two clocks drift apart. It also makes the whole module
 * insensitive to tick size — the result depends only on which beat windows the
 * elapsed time has passed, never on how many steps it took to get there.
 *
 * Ticking while the clock is stopped is a no-op, so pause and the terminal
 * states freeze the Groove without a special case.
 */
export function tickRhythm(state: RhythmState, context: BeatContext): RhythmEvent[] {
  const events: RhythmEvent[] = [];
  // A stage without the Groove has no beats to close out, so nothing here can
  // record a miss (M15).
  if (!context.grooveEnabled) return events;
  if (!isBeatClockRunning(context.state)) return events;

  const total = scheduledBeatCount(context.durationMs);

  while (state.nextBeatToFinalize < total) {
    const beatIndex = state.nextBeatToFinalize;
    // Inclusive: a beat is still hittable at exactly +goodWindowMs.
    if (context.elapsedMs <= beatTimeMs(beatIndex) + RHYTHM.goodWindowMs) break;
    // Only unhit beats reach here: a scored beat is finalized the moment it is
    // scored, so `nextBeatToFinalize` is already past it.
    missBeat(state, beatIndex, events);
    state.nextBeatToFinalize = beatIndex + 1;
  }

  return events;
}

/** Closes one beat out as a miss. The unscored GO beat is closed but never counted. */
function missBeat(state: RhythmState, beatIndex: number, events: RhythmEvent[]): void {
  if (isUnscoredLeadBeat(beatIndex)) return;
  state.misses += 1;
  state.streak = 0;
  events.push({ type: 'BEAT_MISSED', beatIndex });
}

/**
 * Judges a tap that landed on the Groove Pad.
 *
 * The caller has already decided the point is on the pad; this resolves what
 * the tap was worth. A tap that matches no open beat is simply worth nothing:
 * it does not score, does not subtract, does not break the streak, does not
 * touch Show Integrity, and does not consume a beat (M10, "extra taps").
 * Mashing the pad is therefore pointless rather than punished, which is the
 * right shape for a mechanic the player is still learning.
 *
 * `elapsedMs` is the time the player actually saw. The caller resolves taps
 * before advancing the clock (ADR 0005, point 6), so a tap is judged against
 * the frame it was aimed at rather than the one after it.
 */
export function resolvePadTap(state: RhythmState, context: BeatContext): RhythmEvent[] {
  if (!context.grooveEnabled) return [];
  if (!isBeatClockRunning(context.state)) return [];

  const beatIndex = nearestBeatIndex(context.elapsedMs);

  // Outside the round, the unscored GO beat, already scored, or already closed out.
  if (beatIndex < 0 || beatIndex >= scheduledBeatCount(context.durationMs)) return [];
  if (isUnscoredLeadBeat(beatIndex)) return [];
  if (beatIndex <= state.lastHitBeatIndex) return [];
  if (beatIndex < state.nextBeatToFinalize) return [];

  const timingErrorMs = context.elapsedMs - beatTimeMs(beatIndex);
  const absError = Math.abs(timingErrorMs);
  if (absError > RHYTHM.goodWindowMs) return [];

  const grade: BeatGrade = absError <= RHYTHM.perfectWindowMs ? 'perfect' : 'good';
  const points = grade === 'perfect' ? RHYTHM.perfectPoints : RHYTHM.goodPoints;

  const events: RhythmEvent[] = [];

  /*
   * Close out every beat before this one, then this one, before scoring.
   *
   * Landing a tap on beat b proves every earlier beat is already unreachable:
   * the tap can be at most `goodWindowMs` early, and beat b-1's window shut a
   * further `beatInterval - 2 * goodWindowMs` (307 ms at 90 BPM) before that.
   * So the beats being closed here are genuinely missed, not merely unjudged.
   *
   * Doing it now rather than waiting for the next tick is what makes the
   * result independent of tick cadence. Without it, two taps landing between
   * two ticks would leave the first scored beat still open, and the tick would
   * then close it as a miss because only the most recent hit was remembered —
   * the same round would score differently at 16 ms and at 97 ms steps.
   *
   * The misses are registered before the hit so the streak reads in the order
   * the beats happened: reset by the gap, then opened by this beat.
   */
  for (let index = state.nextBeatToFinalize; index < beatIndex; index += 1) {
    missBeat(state, index, events);
  }
  state.nextBeatToFinalize = beatIndex + 1;

  state.score += points;
  state.hits += 1;
  if (grade === 'perfect') state.perfects += 1;
  else state.goods += 1;
  state.streak += 1;
  state.bestStreak = Math.max(state.bestStreak, state.streak);
  state.totalAbsTimingErrorMs += absError;
  state.lastHitBeatIndex = beatIndex;
  state.lastJudgement = {
    beatIndex,
    grade,
    timingErrorMs,
    atMs: context.elapsedMs,
    points,
  };

  events.push({
    type: 'BEAT_HIT',
    beatIndex,
    grade,
    timingErrorMs,
    points,
    streak: state.streak,
  });
  return events;
}

/**
 * Resolves a tap anywhere on the play surface against the Groove Pad.
 *
 * Returns no events when the point is off the pad, which is what keeps the two
 * resolvers independent: the caller hands every tap to both, and each one
 * decides for itself whether the tap was any of its business.
 */
export function resolveRhythmTap(
  state: RhythmState,
  point: { x: number; y: number },
  context: BeatContext,
): RhythmEvent[] {
  if (!padContainsPoint(point.x, point.y)) return [];
  return resolvePadTap(state, context);
}

/**
 * How lit the pad is right now, from 0 (resting) to 1 (on the beat).
 *
 * A pure function of gameplay time, so the renderer reads the pulse and never
 * advances it — there is exactly one clock and the drawing cannot disagree
 * with the judgement. Three phases per beat:
 *
 *   swell -> peak on the beat -> fall -> rest
 *
 * The swell is eased (smoothstep) so it accelerates into the beat, and the
 * fall is a fast ease-out so the stick reads as having already landed. The
 * value is continuous everywhere, including across the beat line, where the
 * end of one swell meets the start of the next fall at exactly 1.
 */
export function padPulse(elapsedMs: number): number {
  const interval = beatIntervalMs();
  if (!(interval > 0)) return 0;

  const { leadInMs, decayMs } = GROOVE_PULSE;
  const phase = ((elapsedMs % interval) + interval) % interval;

  if (phase < decayMs) {
    // Just after a beat: fall away quickly.
    const t = phase / decayMs;
    return 1 - t * t;
  }

  const untilNextBeat = interval - phase;
  if (untilNextBeat <= leadInMs) {
    // Approaching the next beat: swell into it.
    const t = 1 - untilNextBeat / leadInMs;
    return t * t * (3 - 2 * t);
  }

  return 0;
}

/**
 * The beat index the pulse is currently counting toward, so a renderer can
 * mark the unscored GO beat differently from a scored one.
 */
export function upcomingBeatIndex(elapsedMs: number): number {
  return Math.ceil(elapsedMs / beatIntervalMs());
}

/**
 * The index of the beat the pulse has most recently reached (M16).
 *
 * Floor rather than round, because this answers "which beat are we in", not
 * "which beat is a tap nearest to" — `nearestBeatIndex` already does the
 * latter and they are different questions. It goes negative through the
 * pre-roll: -3, -2, -1 for the three numerals and 0 for `GO`.
 *
 * Derived by multiplying by the BPM rather than dividing by the interval, for
 * the same reason `scheduledBeatCount` and `countdownStep` are: the pre-roll
 * starts at exactly -2000 ms, and `-2000 / (60000 / 90)` is -3.0000000000000004
 * in floating point, whose floor is -4 — an extra count-in beat that does not
 * exist, clicking a fraction of a millisecond before the real one.
 */
export function pulseBeatIndex(clockMs: number): number {
  return Math.floor((clockMs * RHYTHM.bpm) / 60_000);
}

/**
 * Where a beat falls in the bar, from 1 to `BEAT_BAR.beats` (M16).
 *
 * The modulo is taken the long way round so negative indices land correctly:
 * `-3 % 4` is `-3` in JavaScript, not 1. Working it out for the pre-roll is
 * what shows the numbering is right — the three numerals come out as bar
 * positions 2, 3, 4 and `GO` as 1, so `3 - 2 - 1 - GO` is a musician counting
 * the band in across a bar line rather than four arbitrary blinks.
 */
export function barPosition(beatIndex: number): number {
  const beats = BEAT_BAR.beats;
  return (((beatIndex % beats) + beats) % beats) + 1;
}

/**
 * How far the converging markers still have to travel, from 1 (just restarted
 * at the rim) to 0 (touching at the centre, on the beat) (M16).
 *
 * A pure function of the clock, like every other thing the pad draws, so the
 * cue cannot disagree with the judgement it is cueing.
 *
 * It is deliberately linear. The markers are a timing cue, and the only thing
 * that lets an eye predict *when* something will arrive is constant velocity;
 * an eased approach looks better standing still and is useless in motion.
 */
export function markerTravel(clockMs: number): number {
  const interval = beatIntervalMs();
  if (!(interval > 0)) return 0;
  const phase = ((clockMs % interval) + interval) % interval;
  return 1 - phase / interval;
}

/**
 * How visible the markers are at a given point in their travel (M16).
 *
 * They restart at the rim the instant they have met, and reappearing at full
 * brightness reads as a strobe — the same defect M6B fixed in the stage
 * overlay. Fading the first fraction of the journey keeps the arrival sharp
 * and the departure quiet.
 */
export function markerOpacity(travel: number): number {
  const fade = BEAT_MARKERS.fadeInFraction;
  if (!(fade > 0)) return 1;
  return Math.max(0, Math.min(1, (1 - travel) / fade));
}

/**
 * Advances the pulse cursor and reports beats that have just arrived (M16).
 *
 * This is what the click is fired from, and it is separate from `tickRhythm`
 * for one reason: `tickRhythm` runs only while the beat clock is *scoring*,
 * and the click has to sound through the `3 -> 2 -> 1 -> GO` pre-roll, which is
 * the whole point of a count-in. So this takes `pulseClockMs` — negative
 * through the pre-roll — and `isPadPulsing`, which is the wider set of states.
 *
 * At most one beat is reported per call, however long the tick was. The round
 * already caps a tick at `MAX_TICK_DELTA_MS` (100 ms), well under a 667 ms
 * beat, so a backlog cannot build up in practice; refusing to emit one anyway
 * means a resumed app or a stalled frame can never machine-gun a bar's worth
 * of clicks at once.
 *
 * It records nothing that judgement reads, and judgement records nothing it
 * reads. Muting the click therefore cannot move a beat window — the click is
 * an output of the clock, never an input to it.
 */
export function pulseBeats(
  state: RhythmState,
  clockMs: number,
  pulsing: boolean,
): RhythmEvent[] {
  if (!pulsing) {
    // Between rounds and on a menu the cursor is dropped rather than kept, so
    // the next round's first pre-roll beat always clicks.
    state.lastPulsedBeatIndex = null;
    return [];
  }

  const beatIndex = pulseBeatIndex(clockMs);
  if (state.lastPulsedBeatIndex !== null && beatIndex <= state.lastPulsedBeatIndex) return [];

  state.lastPulsedBeatIndex = beatIndex;
  return [{ type: 'BEAT_PULSE', beatIndex }];
}

/**
 * How fresh the last judgement is, from 1 (just now) to 0 (expired), or 0 when
 * there is nothing to show. Presentation reads this; it stores no clock.
 */
export function judgementFreshness(
  state: RhythmState,
  elapsedMs: number,
  windowMs: number,
): number {
  if (state.lastJudgement === null || !(windowMs > 0)) return 0;
  const age = elapsedMs - state.lastJudgement.atMs;
  if (age < 0 || age >= windowMs) return 0;
  return 1 - age / windowMs;
}

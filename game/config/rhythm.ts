/**
 * Groove (visual rhythm) tuning data.
 *
 * Source of truth: docs/specs/M10-visual-beat-clock-and-groove-pad.md
 *                  docs/architecture/rhythm-pivot-architecture.md
 *
 * Data only. Every number the rhythm rules read lives here rather than in a
 * renderer constant, so the Groove can be retuned without touching logic or
 * layout (M10, "All values live in configuration, not renderer constants").
 *
 * The beat clock is deliberately **visual**. It is derived from gameplay
 * elapsed time and has no relationship to the music track's playback position
 * — nothing here is measured from, seeked to, or corrected against audio
 * (rhythm-pivot architecture, "Audio non-goal").
 */
import { REFERENCE_CANVAS } from './stage.ts';

export const RHYTHM = {
  /**
   * Deliberately slower than a rock hi-hat pattern. The first pivot asks
   * whether doing two jobs at once is fun; difficulty is supposed to come from
   * splitting attention, not from tapping fast. 90 BPM is one tap every ~667
   * ms, which leaves room to look away and defend the kit.
   */
  bpm: 90,
  /**
   * Pulses the player watches before scoring starts. They animate exactly like
   * every other beat, so the tap moment can be learned without instructions,
   * but they are never scored and never counted as misses.
   */
  countInBeats: 2,
  /** Absolute timing error at or under this is PERFECT. */
  perfectWindowMs: 90,
  /**
   * Absolute timing error at or under this is GOOD; anything beyond it is not
   * a beat hit at all.
   *
   * This must stay below half a beat interval (333 ms at 90 BPM), or two
   * beats' windows would overlap and a tap could be ambiguous between them.
   * `tests/rhythm.test.ts` holds it there.
   */
  goodWindowMs: 180,
  perfectPoints: 100,
  goodPoints: 70,
  /**
   * A missed beat is worth nothing and costs nothing. It does not touch Show
   * Integrity and it does not reset the Defense combo — the two systems are
   * intentionally independent (M11), so a player can be bad at one and good at
   * the other and see that clearly.
   */
  missPoints: 0,
} as const;

/**
 * The Groove Pad: one existing cymbal, promoted to the timekeeping pad.
 *
 * Measured off `assets/art/drums/drumkit_pov.png` rather than guessed. The
 * hi-hat's gold pixels occupy x 0-431, y 385-462 in that 1920x700 bitmap,
 * which `DRUM_KIT_RECT` places at canvas y 885-962 — so this centre sits on
 * the drawn cymbal, not beside it. Re-measure if the kit art or
 * `DRUM_KIT_DROP` moves.
 *
 * Why the hi-hat and not one of the three crashes:
 *
 *  - it is the cymbal a drummer actually keeps time on, so the mechanic reads
 *    without being explained;
 *  - it is bottom-left, which is where a thumb already rests in landscape,
 *    and far from the pause button in the opposite corner — a pad under that
 *    button would eat taps that never reach the game at all;
 *  - it is outside `VOCALIST_BLOCKING_RECT` (x 700-1220), so the singer
 *    stepping into the drummer's face can never cover the pad. M11 requires
 *    the pad to stay tappable during the vocalist event.
 *
 * The radius is a little larger than the biggest target hitbox (a mug's
 * 120 x 1.25 = 150), because this is a mark that gets hit on every beat for a
 * minute rather than one aimed swing.
 *
 * It is a tap region owned by configuration, exactly like
 * `VOCALIST_BLOCKING_RECT`. No art dimension defines it (AGENTS.md rule 17)
 * and no `Pressable` implements it — the pad is hit-tested against this circle
 * by the same surface input pipeline that resolves every other tap.
 */
export const GROOVE_PAD = {
  centerX: 218,
  centerY: 928,
  radiusPx: 150,
} as const;

/**
 * Pulse shape, in milliseconds around each beat.
 *
 * The pad anticipates the beat, peaks exactly on it, then falls away and rests
 * at its base until the next lead-in begins. Rise and fall are deliberately
 * different lengths: a slow swell reads as "now, now, NOW" and a fast drop
 * reads as the stick landing. Equal ramps read as breathing, which is what the
 * stage lights already do and is the wrong signal for a tap cue.
 *
 * `leadInMs + decayMs` must stay under one beat interval (667 ms at 90 BPM) or
 * the pulses run into each other and there is no rest to make the swell
 * legible. `tests/rhythm.test.ts` holds them there.
 */
export const GROOVE_PULSE = {
  /** Swell before the beat. */
  leadInMs: 260,
  /** Fall after it. */
  decayMs: 300,
  /** Extra scale at the peak, as a fraction of the pad's resting size. */
  peakScale: 0.34,
  /** How long the confirmation flash after a judged beat lasts. */
  hitFlashMs: 260,
  /** How long PERFECT/GOOD text stays up next to the pad. */
  judgementTextMs: 620,
} as const;

/** Milliseconds in one beat. Everything about the clock derives from this. */
export function beatIntervalMs(): number {
  return 60_000 / RHYTHM.bpm;
}

/**
 * Gameplay time of a beat, as a single division rather than a repeated
 * addition, so beat 89 is not the accumulation of 89 rounding errors.
 */
export function beatTimeMs(beatIndex: number): number {
  return (beatIndex * 60_000) / RHYTHM.bpm;
}

/**
 * How many beats a round of this length contains.
 *
 * A beat counts only if it falls strictly inside the round, so a 60-second
 * round at 90 BPM has beats 0-89 and not a 91st sitting exactly on the final
 * whistle. Derived from the BPM rather than from a division by the interval:
 * `60000 / (60000 / 90)` is 90.00000000000001 in floating point, which rounds
 * up to an extra beat that does not exist.
 */
export function scheduledBeatCount(roundDurationMs: number): number {
  if (!(roundDurationMs > 0)) return 0;
  return Math.ceil((roundDurationMs * RHYTHM.bpm) / 60_000);
}

/** True for the unscored beats the player watches before scoring begins. */
export function isCountInBeat(beatIndex: number): boolean {
  return beatIndex < RHYTHM.countInBeats;
}

/** True if the tap point falls on the Groove Pad. */
export function padContainsPoint(x: number, y: number): boolean {
  return Math.hypot(x - GROOVE_PAD.centerX, y - GROOVE_PAD.centerY) <= GROOVE_PAD.radiusPx;
}

/** The pad's bounding box on the reference canvas, for layout and tests. */
export function padBounds() {
  return {
    left: GROOVE_PAD.centerX - GROOVE_PAD.radiusPx,
    top: GROOVE_PAD.centerY - GROOVE_PAD.radiusPx,
    right: GROOVE_PAD.centerX + GROOVE_PAD.radiusPx,
    bottom: GROOVE_PAD.centerY + GROOVE_PAD.radiusPx,
    canvasWidth: REFERENCE_CANVAS.width,
    canvasHeight: REFERENCE_CANVAS.height,
  };
}

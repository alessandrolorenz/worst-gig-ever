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
   * Beats at the start of the round that pulse but are never scored and never
   * counted as misses.
   *
   * Exactly one, and it is the `GO` beat. M13.1 replaced M10's two-beat
   * count-in with an explicit `3 -> 2 -> 1 -> GO` pre-roll (`COUNTDOWN` below):
   * the three numerals are beats of their own phase before the round clock
   * starts, and `GO` is round beat 0. Scoring the beat the player is being told
   * to start on would judge them for a pulse that is still an instruction, so
   * beat 0 is silent and the first scored beat is beat 1 — exactly one interval
   * after `GO`, which is the M13.1 contract.
   *
   * This is the whole of the preparation sequence. There is deliberately no
   * second count-in behind it (M13.1, "one coherent preparation sequence").
   */
  unscoredLeadBeats: 1,
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
 * The Groove Pad: the lower-centre face of the kit, where the player is
 * already looking (M13.1).
 *
 * ## Why it moved
 *
 * M10 put the pad on the hi-hat at (218, 928) because that is the cymbal a
 * drummer keeps time on and it is where a thumb rests in landscape. The first
 * physical playtest found the real cost of that: bottles converge on the
 * centre of the screen, so keeping the groove meant looking away from the
 * corridor twice a second. The dual-task challenge is supposed to come from
 * coordinating two jobs, not from the eye travel between them.
 *
 * ## Why an ellipse, and why this one
 *
 * The vertical band available in the centre is fixed at both ends:
 * `VOCALIST_BLOCKING_RECT` reaches y 860 and the canvas ends at y 1080, and
 * the pad must clear the first (M11 requires the singer never to interfere
 * with the pad) and stay inside the second. That is 220 px, so a *circle*
 * centred at x 960 could have a radius of at most 110 — smaller than the 150
 * it already had. A wide ellipse is what makes the pad bigger rather than
 * smaller in that band, and it is also the honest shape: a drum head seen from
 * the drummer's seat is a wide ellipse, not a circle.
 *
 * Measured against `assets/art/drums/drumkit_pov.png` through `DRUM_KIT_RECT`,
 * not guessed. In canvas coordinates the kick's black head covers x 780-1140
 * from y 940 down past the canvas edge, its red rim sits at y 954-1004, and
 * the snare head runs x 620-1300 from y 1004. So this ellipse lands on the
 * drum faces directly in front of the player: 67.8% of its area is on drawn
 * kit art, against 64.8% for the old hi-hat pad. Re-measure if the kit art or
 * `DRUM_KIT_DROP` moves.
 *
 * Footprint: 320 x 105 gives 105,558 px2 against the old circle's 70,686 —
 * 49% larger, at the top of the 30-50% M13.1 asks for. The tap area grew; no
 * timing window did.
 *
 * It is a tap region owned by configuration, exactly like
 * `VOCALIST_BLOCKING_RECT`. No art dimension defines it (AGENTS.md rule 17)
 * and no `Pressable` implements it — the pad is hit-tested against this
 * ellipse by the same surface input pipeline that resolves every other tap.
 */
export const GROOVE_PAD = {
  centerX: 960,
  centerY: 970,
  /** Half-extent along x. */
  halfWidthPx: 320,
  /** Half-extent along y, bounded by the singer above and the canvas below. */
  halfHeightPx: 105,
} as const;

/**
 * The `3 -> 2 -> 1 -> GO` pre-roll between Start and the round (M13.1).
 *
 * Three numerals, then `GO` on the fourth beat — and that fourth beat is round
 * beat 0, not a fourth countdown tick, which is what makes the round start
 * *on* the beat the player was counted into rather than after an awkward gap.
 *
 * `leadBeats` beats at 90 BPM is exactly 2000 ms, so the pre-roll is a whole
 * number of milliseconds and `beatTimeMs` returns it without rounding error.
 */
export const COUNTDOWN = {
  /** Numerals shown before the round clock starts: 3, 2, 1. */
  leadBeats: 3,
  /** How long `GO!` stays up once the round has actually begun. */
  goTextMs: 600,
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

/**
 * The converging beat markers (M16).
 *
 * ## Why markers and not an approach ring
 *
 * M16 was specified with the standard rhythm-game cue: a ring that shrinks
 * onto the pad and coincides with its rim on the beat. Two facts about *this*
 * pad ruled it out once the geometry was measured.
 *
 * The pad is a wide ellipse whose bottom edge sits at y 1075 on a 1080 px
 * canvas. Any concentric ring larger than 1.03x is therefore cut off by the
 * bottom of the screen — a converging ring here could only ever converge from
 * above and the sides, which is exactly the half of the shape the drum kit art
 * is busiest behind.
 *
 * And it would have cost the surface M14.1 just bought back. A 1.45x ring
 * needs a 952x329 SVG against the current 664x234 — 2x the rasterized area, on
 * the same device whose tap responsiveness is still under an open retest. A
 * readability fix that reopens a performance question answers neither.
 *
 * So the cue converges *inside* the pad instead: two markers slide along its
 * horizontal axis, from just inside the rim to touching at the centre, and
 * they touch exactly on the beat. The coincidence is what makes it legible —
 * two shapes meeting is unambiguous in a way that one shape being at its
 * largest is not — and the whole thing lives inside the existing surface, so
 * `PAD_SURFACE` does not move by a pixel.
 *
 * They travel at **constant velocity** on purpose. An eased approach is
 * prettier and useless: a timing cue has to let the eye extrapolate where the
 * marker will be, and only a straight line does that.
 */
export const BEAT_MARKERS = {
  /** Starting offset from the centre, as a fraction of `halfWidthPx`. */
  startFraction: 0.86,
  widthPx: 34,
  heightPx: 52,
  /**
   * Fraction of the travel spent fading in.
   *
   * The markers restart at the rim the instant they have met, and a hard
   * reappearance at full brightness reads as a strobe — the defect M6B fixed
   * in the stage overlay for the same reason. Fading the first sixth of the
   * journey keeps the arrival sharp and the departure quiet.
   */
  fadeInFraction: 0.15,
} as const;

/**
 * The bar counter (M16).
 *
 * Four marks inside the pad, above its horizontal axis, filled by the beat's
 * position in the bar. Eighty-nine identical pulses are a texture; twenty-two
 * bars of four are a phrase the player can count, predict, and recover into
 * after looking away to smash a bottle.
 *
 * `offsetY` is negative — *above* the axis — for two reasons, both measured.
 * Below it would collide with the markers, which own the axis itself; and the
 * canvas band from y 1020 to 1080 is where a phone's gesture pill sits (open
 * item 15), so a row of dots down there would be half-covered on the very
 * device this milestone is for. At y 908 the row is inside the pad, clear of
 * the markers, and below the target corridor, which ends at y 880.
 */
export const BEAT_BAR = {
  /** Beats per bar. Four, because the game is a rock show. */
  beats: 4,
  offsetY: -62,
  spacingPx: 80,
  radiusPx: 11,
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

/**
 * True for a beat at the head of the round that pulses but is never scored.
 *
 * Only beat 0, the `GO` beat. Named for what it is rather than for a count-in,
 * because M13.1 removed the count-in it used to describe.
 */
export function isUnscoredLeadBeat(beatIndex: number): boolean {
  return beatIndex < RHYTHM.unscoredLeadBeats;
}

/**
 * True if the tap point falls on the Groove Pad.
 *
 * The pad is an axis-aligned ellipse, so the test is the unit-circle one on
 * normalized offsets. `<= 1` keeps the boundary inclusive, exactly as the
 * circle it replaced was.
 */
export function padContainsPoint(x: number, y: number): boolean {
  const dx = (x - GROOVE_PAD.centerX) / GROOVE_PAD.halfWidthPx;
  const dy = (y - GROOVE_PAD.centerY) / GROOVE_PAD.halfHeightPx;
  return dx * dx + dy * dy <= 1;
}

/** The pad's bounding box on the reference canvas, for layout and tests. */
export function padBounds() {
  return {
    left: GROOVE_PAD.centerX - GROOVE_PAD.halfWidthPx,
    top: GROOVE_PAD.centerY - GROOVE_PAD.halfHeightPx,
    right: GROOVE_PAD.centerX + GROOVE_PAD.halfWidthPx,
    bottom: GROOVE_PAD.centerY + GROOVE_PAD.halfHeightPx,
    canvasWidth: REFERENCE_CANVAS.width,
    canvasHeight: REFERENCE_CANVAS.height,
  };
}

/** How long the pre-roll lasts, in gameplay milliseconds. Exactly 2000 at 90 BPM. */
export function countdownDurationMs(): number {
  return beatTimeMs(COUNTDOWN.leadBeats);
}

/**
 * The numeral the countdown is showing, from 3 down to 1.
 *
 * Derived by multiplying by the BPM rather than dividing by the beat interval,
 * for the same reason `scheduledBeatCount` is: `2000 / (60000 / 90)` is
 * 3.0000000000000004 in floating point, and a `ceil` on that reads a fourth
 * numeral that does not exist.
 */
export function countdownStep(countdownMs: number): number {
  const beatsElapsed = Math.floor((Math.max(0, countdownMs) * RHYTHM.bpm) / 60_000);
  return Math.max(1, COUNTDOWN.leadBeats - beatsElapsed);
}

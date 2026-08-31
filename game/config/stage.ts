/**
 * Stage geometry for the graybox composition.
 *
 * All values are in reference-canvas pixels (1920x1080 landscape, M3). The
 * renderer scales this space to the device; gameplay never works in device
 * pixels, so hit resolution is resolution-independent.
 *
 * Data only — the perspective math that consumes it lives in
 * `game/systems/approach.ts`.
 */

export const REFERENCE_CANVAS = {
  width: 1920,
  height: 1080,
} as const;

export const STAGE = {
  /** Vanishing point the targets emerge from. */
  vanishingPoint: { x: 960, y: 430 },
  /** Screen line where an unhit target reaches the drummer. */
  dangerLineY: 880,
  /**
   * Canvas line where the foreground drum kit's solid mass begins, measured
   * off the Pack 1 kit art. Below it a target is nearer to the player than
   * their own toms, so the renderer draws it in front of the kit rather than
   * behind (M6B). Presentation only: no rule reads it.
   */
  drumkitNearY: 740,
  /**
   * Lane x positions at full approach. Targets diverge from the vanishing
   * point toward one of these as they come forward.
   */
  laneXs: [430, 700, 960, 1220, 1490],
  /** Apparent depth of the spawn plane. 1 = the danger line. */
  farDepth: 4.2,
} as const;

/** Tap region for the vocalist while they block the drummer's sightline. */
export const VOCALIST_BLOCKING_RECT = {
  x: 700,
  y: 300,
  width: 520,
  height: 560,
} as const;

/**
 * Band-member anchors, in canvas pixels. Reaction proximity is defined here
 * rather than derived from the placeholder block sizes, so replacing the
 * graybox with M3 art cannot change who ducks (AGENTS.md rule 17).
 *
 * The idle vocalist has no rectangle of their own: all three performers share
 * one frame and one floor line off these anchors (M6B,
 * `game/rendering/composition.ts`). Only the blocking event, which is a tap
 * region, keeps an authored rectangle.
 */
export const PERFORMER_ANCHORS = {
  bassist: { x: 320, y: 470 },
  guitarist: { x: 1640, y: 470 },
  vocalist: { x: 960, y: 510 },
} as const;

/**
 * Band in the crowd that objects are thrown from.
 *
 * M4 launched every target from the single vanishing point, which read as
 * sliding rather than throwing. Spreading the origin across the crowd line is
 * what makes the throw look like it came from a person (M5A, Priority 2).
 */
export const THROW_ORIGIN = {
  minX: 260,
  maxX: 1660,
  minY: 400,
  maxY: 505,
} as const;

/**
 * Ambient stage cadence (M5A, Priority 4).
 *
 * Intentionally low-frame: loops step between poses on the beat rather than
 * interpolating, because "alive enough" is the target and choppy is acceptable.
 * `bpm` is an authored cadence, not a value measured from the music track —
 * it is a tuning input like every other number in `config/`.
 */
export const STAGE_MOTION = {
  bpm: 132,
  /** Pack 1 cycles idle, loopA, and loopB as a deliberately choppy loop. */
  loopFrames: 3,
  /**
   * Beats spent on a full loop, so the stage moves with the song. One beat per
   * pose: at three frames over two beats the poses landed off the beat and
   * held for 300 ms each, which reads as twitching rather than as playing.
   */
  beatsPerLoop: 3,
  /** One-shot reaction durations. */
  hitReactionMs: 420,
  dodgeMs: 520,
  /** How close a target must pass a performer, in canvas px, to scare them. */
  dodgeProximity: 210,
  /** A target only reads as "passing" the band inside this progress window. */
  dodgeFromProgress: 0.2,
  dodgeToProgress: 0.8,
  /** How close an impact must land to a performer for them to flinch. */
  impactReactionRadius: 320,
} as const;

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
   * Canvas line below which a target is nearer to the player than their own
   * toms, so the renderer draws it in front of the kit rather than behind
   * (M6B). Presentation only: no rule reads it.
   *
   * It must sit at or above where the kit's solid mass begins, or an arriving
   * object is hidden inside the drums. It must also sit high enough to be
   * reached while the object is still in flight: `y` climbs very steeply at
   * the end of an arc, so a line set flush with the drums is only crossed in
   * the last one percent of the throw and the swap never reads.
   *
   * Moves with `DRUM_KIT_DROP` in `game/rendering/composition.ts`: the line is
   * a property of where the kit is drawn, not of the canvas.
   */
  drumkitNearY: 800,
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
  /**
   * The venue's cadence, and it is deliberately `RHYTHM.bpm` (M16).
   *
   * It was 132 against the Groove's 90 until M16, which meant the band's pose
   * loop and the stage glow beat against the Groove Pad at 22:15 — aligning
   * once every fifteen groove beats, about every ten seconds, and sitting in
   * antiphase for most of the time between. The player was being shown a stage
   * where the lights, the guitarist and the pad each said a different "now",
   * and the pad is the smallest of the three signals.
   *
   * Matching them turns the largest distractor on screen into the largest
   * reinforcement: the band now steps a pose on the same beats the player is
   * asked to tap. The loop lengthens from 1.36 s to 2.0 s, which is slower but
   * still "alive enough", and the poses land on musical beats instead of
   * between them.
   *
   * Written as a literal rather than imported from `config/rhythm.ts`, which
   * imports `REFERENCE_CANVAS` from this file and would make the two modules
   * circular. `tests/stageMotion.test.ts` asserts the equality instead, so the
   * two cannot drift apart again without a red test.
   */
  bpm: 90,
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

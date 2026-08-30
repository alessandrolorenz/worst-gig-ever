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
  /** Top of the foreground drum kit block. */
  drumkitTopY: 812,
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

/** Where the vocalist stands when not interrupting. */
export const VOCALIST_IDLE_RECT = {
  x: 810,
  y: 300,
  width: 300,
  height: 420,
} as const;

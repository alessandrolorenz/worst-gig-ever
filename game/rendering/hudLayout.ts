/**
 * Where the two score readouts sit on the reference canvas (M12).
 *
 * Pure data and pure functions — no React, no React Native — so the layout is
 * assertable without a renderer, in the same way `composition.ts` holds the
 * scene's rectangles (AGENTS.md rule 4). Nothing here is gameplay truth: no
 * hit test reads a rectangle in this file.
 *
 * The constraint the numbers exist to satisfy is that the HUD must not eat the
 * middle of the screen. Targets converge from the vanishing point to the lanes
 * at the danger line, so the corridor is the band between the outermost lanes
 * above `STAGE.dangerLineY`; both readouts stay out of it, and
 * `tests/hudContract.test.ts` fails if either one moves into it.
 */
import { GROOVE_PAD } from '../config/rhythm.ts';
import { REFERENCE_CANVAS, STAGE } from '../config/stage.ts';
import type { Rect } from './composition.ts';

/** Canvas inset the top row of the HUD is laid out against. */
export const HUD_MARGIN = { x: 56, top: 36 } as const;

/** Height of the top HUD row: the tallest of score, timer, and integrity. */
export const HUD_TOP_HEIGHT = 190;

/**
 * The Groove readout, directly above the Groove Pad.
 *
 * M12 asks for it "near Groove Pad but outside the hit area". Above rather
 * than beside, because beside means to the right, and to the right of the
 * hi-hat is where lane 430 and lane 700 targets arrive — text there would sit
 * in the corridor. Above the pad is drum-kit hardware, which nothing lands on.
 *
 * The box is fixed, and every line inside it is fixed-height, so a score
 * growing a digit or a PERFECT flashing on and off cannot move anything
 * (M12, "dynamic updates must not cause HUD layout jumps").
 */
export const GROOVE_PANEL: Rect = {
  x: HUD_MARGIN.x,
  y: 586,
  /*
   * Narrow enough to clear the leftmost lane. At 380 px this box reached
   * x=436 and crossed into the corridor, whose left edge is lane 430 — six
   * pixels of Groove score sitting where a bottle flies. The width is bounded
   * by the corridor, not chosen for the text.
   */
  width: 360,
  height: GROOVE_PAD.centerY - GROOVE_PAD.radiusPx - 586,
};

/** Fixed line heights inside the Groove panel, top to bottom. */
export const GROOVE_PANEL_ROWS = {
  label: 32,
  score: 74,
  streak: 38,
  /** Reserved whether or not a judgement is showing, so nothing shifts. */
  judgement: 42,
} as const;

/**
 * The corridor targets fly down: from the vanishing point out to the lanes,
 * ending at the danger line.
 *
 * Taken from the outermost lanes rather than from the canvas, so it tracks the
 * lane table if that is ever retuned.
 */
export function targetCorridor(): Rect {
  const lanes = STAGE.laneXs;
  const left = Math.min(...lanes);
  const right = Math.max(...lanes);
  return {
    x: left,
    y: STAGE.vanishingPoint.y,
    width: right - left,
    height: STAGE.dangerLineY - STAGE.vanishingPoint.y,
  };
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width &&
    b.x < a.x + a.width &&
    a.y < b.y + b.height &&
    b.y < a.y + a.height
  );
}

/** True if the rect lies entirely on the reference canvas. */
export function withinCanvas(rect: Rect): boolean {
  return (
    rect.x >= 0 &&
    rect.y >= 0 &&
    rect.x + rect.width <= REFERENCE_CANVAS.width &&
    rect.y + rect.height <= REFERENCE_CANVAS.height
  );
}

/** The circle the Groove Pad occupies, as a rect, for overlap checks. */
export function padBoundingRect(): Rect {
  return {
    x: GROOVE_PAD.centerX - GROOVE_PAD.radiusPx,
    y: GROOVE_PAD.centerY - GROOVE_PAD.radiusPx,
    width: GROOVE_PAD.radiusPx * 2,
    height: GROOVE_PAD.radiusPx * 2,
  };
}

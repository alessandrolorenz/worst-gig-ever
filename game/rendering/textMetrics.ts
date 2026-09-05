/**
 * A line-wrapping model, so layout can be gated without a renderer (M20).
 *
 * Source of truth: docs/specs/M20-translation-safe-layout.md
 *
 * Pure functions over numbers — no React, no React Native — in the same spirit
 * as `hudLayout.ts` and `composition.ts` (AGENTS.md rule 4). Nothing here is
 * gameplay truth and nothing reads it at runtime; it exists so a test can ask
 * "does this sentence fit in this box" without an emulator.
 *
 * ## This is a model, and the old one lied
 *
 * M18.1 estimated briefing height with a characters-per-line constant and then
 * compared it against `viewport * 1.6` — a budget that permits 60% overflow.
 * It passed a card that was clipping the mug rule in English. A model is
 * unavoidable without a renderer; a model with a dishonest budget is not.
 *
 * Two things make this one usable:
 *
 * 1. **It is calibrated against a measurement.** On the Pixel_9 emulator on
 *    2026-09-05, stage 1's 205-character third bullet wrapped to three lines in
 *    a 538 dp column at 15 dp type. That is about 0.52 em of advance width per
 *    character, averaged over real English prose.
 * 2. **It rounds against itself.** `AVG_CHAR_EM` is 0.55 rather than the
 *    measured 0.52, so the model predicts wrapping slightly sooner than the
 *    renderer does. For a gate whose failure mode is text disappearing, over-
 *    predicting a wrap is the safe direction to be wrong in.
 */

/**
 * Average advance width of a character, in `em`, for proportional prose.
 *
 * Deliberately above the 0.52 measured on device. See the module note: this
 * constant decides which direction the gate is wrong in, and it is set to be
 * wrong toward "will not fit".
 */
export const AVG_CHAR_EM = 0.55;

/**
 * The smallest screen the overlays are designed against.
 *
 * A 1080p phone in landscape at 420 dpi is 923 x 411 **dp**, not pixels, and
 * the whole overlay stack has been measured against that since M12 — it is the
 * budget the M12 results screen overflowed and the one M15's two new screens
 * were checked against. It is stated here as a number instead of a comment so
 * a test can use it.
 */
export const MIN_VIEWPORT = { width: 923, height: 411 } as const;

/** Width one character of prose takes at a given font size, in dp. */
export function charWidth(fontSize: number): number {
  return fontSize * AVG_CHAR_EM;
}

/** How many characters fit on one line of `maxWidth` at `fontSize`. */
export function charsPerLine(fontSize: number, maxWidth: number): number {
  return Math.max(1, Math.floor(maxWidth / charWidth(fontSize)));
}

/**
 * How many lines a string wraps to.
 *
 * Explicit `\n` breaks are honoured and each segment wraps on its own, because
 * a caption written as two deliberate lines is two lines however short they
 * are. Word boundaries are **not** modelled: prose averages out over a
 * paragraph, and a word-aware model would need the font's real metrics to be
 * any more truthful than this one.
 */
export function wrappedLines(text: string, fontSize: number, maxWidth: number): number {
  const perLine = charsPerLine(fontSize, maxWidth);
  return text
    .split('\n')
    .reduce((total, segment) => total + Math.max(1, Math.ceil(segment.length / perLine)), 0);
}

/** The height a string occupies when wrapped into `maxWidth`. */
export function textHeight(
  text: string,
  { fontSize, lineHeight, maxWidth }: { fontSize: number; lineHeight: number; maxWidth: number },
): number {
  return wrappedLines(text, fontSize, maxWidth) * lineHeight;
}

/**
 * The height of a list of strings, each on its own row, with a gap between.
 *
 * The gap is *between* entries rather than after each, which is what
 * `marginBottom` on every item minus the last actually costs.
 */
export function stackHeight(
  texts: readonly string[],
  metrics: { fontSize: number; lineHeight: number; maxWidth: number },
  gap: number,
): number {
  if (texts.length === 0) return 0;
  const lines = texts.reduce((total, text) => total + textHeight(text, metrics), 0);
  return lines + gap * (texts.length - 1);
}

/** True if a single-line box can hold the text without wrapping. */
export function fitsOnOneLine(text: string, fontSize: number, maxWidth: number): boolean {
  return wrappedLines(text, fontSize, maxWidth) <= 1;
}

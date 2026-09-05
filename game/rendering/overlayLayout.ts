/**
 * The overlay dimensions that decide whether text fits (M20).
 *
 * Source of truth: docs/specs/M20-translation-safe-layout.md
 *
 * Every number here is read **twice**: once by `Overlays.tsx` to build its
 * StyleSheet, and once by `tests/layoutBudget.test.ts` to decide whether a
 * locale's strings fit inside it. That is the whole reason the module exists.
 *
 * M18.1's height gate mirrored these values by hand in the test — "Mirrors
 * `styles.briefingScroll` in Overlays.tsx: 200 px of viewport…" — and a
 * mirrored constant is a constant that drifts. It is also how a card could be
 * raised to 200 while the test kept checking against a budget nobody revisited.
 *
 * Only the numbers that affect **fit** live here. Colours, radii, borders and
 * shadows stay in the StyleSheet, because no test needs to reason about them.
 */

/** Padding the scrim puts around every overlay screen. */
export const OVERLAY_PADDING = { horizontal: 28, vertical: 10 } as const;

/** The button row at the bottom of every overlay screen. */
export const BUTTON = {
  fontSize: 16,
  compactFontSize: 14,
  paddingVertical: 10,
  compactPaddingVertical: 8,
  paddingHorizontal: 30,
  compactPaddingHorizontal: 20,
  marginTop: 6,
  marginHorizontal: 6,
  minWidth: 200,
  compactMinWidth: 150,
  /**
   * Widest a single button may grow before the row wraps.
   *
   * A label the size of the screen is not a button. Long labels wrap inside
   * this width rather than pushing their neighbours off the row.
   */
  maxWidth: 320,
} as const;

/** The briefing card: kicker, title, the scrolling list, and its figures. */
export const BRIEFING = {
  kicker: { fontSize: 12 },
  title: { fontSize: 26, marginBottom: 8 },
  /** One bullet. `gutter` is the ▸ glyph plus the gap to the text. */
  bullet: {
    fontSize: 15,
    lineHeight: 20,
    /** `marginBottom` on every entry but the last. */
    gap: 5,
    /**
     * `briefingItem`'s maxWidth: the bullet and its text together.
     *
     * Widened from 560 at M20. That number was an English line-length choice
     * inside a 923 dp landscape screen with 867 dp of usable width — the space
     * was there and was not being used, and every line it saves is a line the
     * card does not have to scroll. At 640 the text column runs 75 characters,
     * which is the top of the comfortable range for prose rather than past it;
     * going wider buys no further wrapping and only costs readability.
     */
    maxWidth: 640,
    gutter: 16,
  },
  list: { paddingBottom: 4 },
  /** The "there is more below" mark, and the row that always reserves it. */
  moreCue: { fontSize: 14, height: 16 },
  figure: {
    width: 128,
    artHeight: 62,
    rowPaddingBottom: 8,
    caption: { fontSize: 12, lineHeight: 15, paddingTop: 4 },
  },
} as const;

/** Text column inside a briefing bullet, once the ▸ gutter is taken out. */
export const BRIEFING_TEXT_WIDTH = BRIEFING.bullet.maxWidth - BRIEFING.bullet.gutter;

/**
 * Everything on the briefing screen that is not the scrolling card: the
 * padding, the kicker, the title and the button row.
 *
 * **Measured, not derived.** Summing the declared font sizes at 1.2 em gave
 * 118 dp; the Pixel_9 emulator on 2026-09-05 gave the card 270 of a 411 dp
 * screen, so the real chrome is 141. The 23 dp gap is line boxes at
 * `fontWeight: '800'` with letter spacing, which a stylesheet does not state
 * and this module cannot compute.
 *
 * Deriving it looked more principled and was wrong in the optimistic
 * direction, which is the direction that lets text disappear. A number taken
 * off a screenshot is worth more than an arithmetic that agrees with itself.
 */
export const BRIEFING_CHROME_HEIGHT = 141;

/**
 * Height the briefing card has to work with on a viewport of `viewportHeight`.
 *
 * The screen's chrome is fixed and the card gets the rest — which is what
 * `flexShrink: 1` and no `maxHeight` mean in the StyleSheet. Stated as a
 * function so the test can ask the question at the smallest supported screen
 * rather than at whatever the developer's emulator happens to be.
 */
export function briefingCardHeight(viewportHeight: number): number {
  return viewportHeight - BRIEFING_CHROME_HEIGHT - BRIEFING.moreCue.height;
}

/** One stage button on the title screen. */
export const STAGE_CARD = {
  minWidth: 210,
  maxWidth: 260,
  paddingHorizontal: 16,
  paddingVertical: 10,
  marginHorizontal: 8,
  number: { fontSize: 11 },
  name: { fontSize: 18 },
  subtitle: { fontSize: 12 },
} as const;

/** Text column inside a stage card. */
export const STAGE_CARD_TEXT_WIDTH = STAGE_CARD.minWidth - STAGE_CARD.paddingHorizontal * 2;

/** One column of the results summary. */
export const SUMMARY = {
  columnMinWidth: 280,
  columnMaxWidth: 330,
  marginHorizontal: 14,
  heading: { fontSize: 13 },
  label: { fontSize: 13 },
  value: { fontSize: 13 },
  detail: { fontSize: 11, lineHeight: 15 },
  /** Space kept clear for the number, so a long label can never push it out. */
  valueGutter: 56,
} as const;

/** Width a summary label may use before it starts wrapping. */
export const SUMMARY_LABEL_WIDTH = SUMMARY.columnMinWidth - SUMMARY.valueGutter;

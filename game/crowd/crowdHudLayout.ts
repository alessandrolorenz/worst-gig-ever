/**
 * Where the Crowd round's checklist sits (M33).
 *
 * Source of truth: docs/specs/M33-crowd-checklist-and-optional-beat.md
 *
 * Pure numbers and one split, in the spirit of `hudLayout.ts`: the overlay
 * reads its styles from here, and `tests/crowdHudLayout.test.ts` reads the same
 * numbers to prove the panels clear the band on the screens the game ships to.
 * Nothing here is gameplay truth; the checklist is drawn `pointerEvents="none"`
 * and cannot take a touch from the throw whatever its size.
 *
 * ## Why the bottom corners
 *
 * Up to M32 the checklist hung under the stage name in the top-left column,
 * and on a 784 x 384 dp phone it ran down over the bassist. The bottom strip
 * of the plate is the audience: no bottle can land there
 * (`CROWD_THROW.impactBounds.bottom` is 720 on a 1080 canvas), the throwing
 * hand owns the middle of it, and each corner is free below the feet of the
 * performer above it. So the list is split in two and stood in those corners.
 *
 * ## Why these sizes
 *
 * The right corner is the tight one: the guitarist's art box ends at canvas
 * y 830, which on a 384 dp-tall screen leaves 89 dp under it. Stage 3's nine
 * objectives put five rows there (four objectives and "Spare the waiter"), so
 * a row is 13 dp with a 2 dp gap. The type itself is unchanged from M32.
 *
 * The width holds every label on one line in every locale, the pseudo one
 * included: its "Disarm the guitarist" is 29 characters at 11 dp, two more
 * than pt-BR's longest, "Derrube o prato de condução". A wrapped row is a
 * taller panel, and on the left that is the bassist's feet.
 */

export const CROWD_CHECKLIST = {
  panelWidth: 210,
  /** From the safe-area edge. Matches the HUD columns' own side padding. */
  edgeInset: 8,
  bottomInset: 4,
  paddingHorizontal: 8,
  paddingVertical: 5,
  borderRadius: 10,
  heading: { fontSize: 10, lineHeight: 13, letterSpacing: 1.5, marginBottom: 1 },
  /** `gap` is the panel's `rowGap`: between children, the heading included. */
  row: { fontSize: 11, lineHeight: 13, gap: 2 },
  /** The completion box, or the ✕ on the waiter row, and the gap after it. */
  marker: { size: 9, gap: 6 },
} as const;

/** The width a checklist label may use before it wraps. */
export const CROWD_CHECKLIST_TEXT_WIDTH =
  CROWD_CHECKLIST.panelWidth -
  CROWD_CHECKLIST.paddingHorizontal * 2 -
  CROWD_CHECKLIST.marker.size -
  CROWD_CHECKLIST.marker.gap;

export interface CrowdChecklistSplit<T> {
  /** The first half, under the heading in the bottom-left corner. */
  readonly left: readonly T[];
  /** The rest, in the bottom-right corner, with "Spare the waiter" after them. */
  readonly right: readonly T[];
}

/**
 * The checklist in two halves, in its original order.
 *
 * The left half takes the odd one out, because the right panel also carries the
 * waiter row: 4 objectives draw as 2 | 2+1, 7 as 4 | 3+1, 9 as 5 | 4+1. Each
 * corner therefore holds the same number of rows, or one fewer on the right.
 */
export function splitCrowdChecklist<T>(objectives: readonly T[]): CrowdChecklistSplit<T> {
  const leftCount = Math.ceil(objectives.length / 2);
  return { left: objectives.slice(0, leftCount), right: objectives.slice(leftCount) };
}

/**
 * Height of one panel, in dp, from how many lines each of its rows takes.
 *
 * The model the test checks against; the overlay never calls it. The gap is
 * the panel's `rowGap`, which falls between children — the heading is one —
 * and never above the first or below the last.
 */
export function crowdChecklistPanelHeight(rowLines: readonly number[], heading: boolean): number {
  const { heading: headingType, row, paddingVertical } = CROWD_CHECKLIST;
  const lines = rowLines.reduce((total, count) => total + count, 0);
  const children = rowLines.length + (heading ? 1 : 0);
  const gaps = Math.max(0, children - 1) * row.gap;
  const top = heading ? headingType.lineHeight + headingType.marginBottom : 0;
  return paddingVertical * 2 + top + lines * row.lineHeight + gaps;
}

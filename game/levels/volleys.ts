/**
 * Volleys — authored groups of throws that arrive as a figure (M17).
 *
 * Source of truth: docs/specs/M17-difficulty-curve-and-throw-patterns.md
 *
 * Owner request, 2026-09-04: *"deve ter uns padrões pra serem feitos tipo combo
 * de três garrafas em sequência, de um lado e de outro, tipo: tap, tap, tap, no
 * mesmo lugar."*
 *
 * Every spawn before M17 was independent — its own kind, lane, fastball roll
 * and duration. Three bottles down one lane could therefore only happen by
 * coincidence, and because durations are drawn per target from a 900 ms-wide
 * window they would have arrived scrambled even then.
 *
 * ## The two rules that make a pattern readable
 *
 * **1. Volleys are authored in arrival time, not spawn time.** One approach
 * duration is drawn for the whole volley and members are spawned staggered by
 * `arriveAfterMs`, so they *arrive* at the authored spacing. This is the whole
 * trick: a pattern the player cannot perceive is not a pattern.
 *
 * **2. A volley is admitted whole or not at all.** The scheduler drops a spawn
 * when `maxConcurrentTargets` is reached; dropping the middle member of a
 * three-bottle line turns the intended figure into a random pair. If the cap
 * cannot take every member the volley is refused and an ordinary single throw
 * happens instead.
 *
 * Data only. The scheduler that reads it is `game/state/roundState.ts`.
 */
import type { TargetKind } from '../state/gameState.ts';

export interface VolleyMember {
  /**
   * Lane index into `STAGE.laneXs`, before any drift is applied.
   *
   * An index rather than an x position, so a volley follows the lane table if
   * it is ever retuned and can never author a throw into a lane that does not
   * exist.
   */
  readonly lane: number;
  /**
   * Arrival offset from the first member, in milliseconds.
   *
   * **Arrival**, not spawn. Zero means "at the same instant as the first
   * member" and is what makes a pincer a pincer.
   */
  readonly arriveAfterMs: number;
  readonly kind: TargetKind;
}

export interface VolleyTemplate {
  readonly id: string;
  /**
   * Whether the whole figure slides to a random position across the lanes.
   *
   * True for figures whose *shape* is the point and whose position is not —
   * three bottles in one lane are the same idea in any lane, and drifting them
   * stops the player learning a fixed spot. False for figures defined by the
   * width of the stage: a pincer that drifts is not a pincer.
   *
   * The drift is drawn so that every member stays on the lane table, rather
   * than clamped or wrapped afterwards. Clamping would collapse a spread
   * figure against the edge and wrapping would tear it in half.
   */
  readonly driftLanes: boolean;
  readonly members: readonly VolleyMember[];
}

/**
 * "Tap, tap, tap, no mesmo lugar."
 *
 * Three bottles down one lane, 360 ms apart. The gap is deliberately shorter
 * than a beat interval (667 ms): the player is holding a groove with one hand,
 * and a figure that resolves inside a single beat is one decision rather than
 * three.
 */
const tripleSameLane: VolleyTemplate = {
  id: 'TRIPLE_SAME_LANE',
  driftLanes: true,
  members: [
    { lane: 2, arriveAfterMs: 0, kind: 'beerBottle' },
    { lane: 2, arriveAfterMs: 360, kind: 'beerBottle' },
    { lane: 2, arriveAfterMs: 720, kind: 'beerBottle' },
  ],
};

/**
 * "De um lado e de outro."
 *
 * Outer lane, far outer lane, back again. 460 ms apart rather than 360: this
 * one is paid for in travel across the screen, not in reaction speed, and the
 * thumb has to physically get there.
 */
const sideToSide: VolleyTemplate = {
  id: 'SIDE_TO_SIDE',
  driftLanes: false,
  members: [
    { lane: 0, arriveAfterMs: 0, kind: 'beerBottle' },
    { lane: 4, arriveAfterMs: 460, kind: 'beerBottle' },
    { lane: 0, arriveAfterMs: 920, kind: 'beerBottle' },
  ],
};

/**
 * Two bottles on opposite edges, arriving together.
 *
 * The first figure in the game that cannot simply be *done* — one hand, two
 * places, one instant. The player has to give one of them up, or read it early
 * enough to take the first while it is still far out. It is the sharpest thing
 * M17 adds and it is deliberately rare.
 */
const pincer: VolleyTemplate = {
  id: 'PINCER',
  driftLanes: false,
  members: [
    { lane: 0, arriveAfterMs: 0, kind: 'beerBottle' },
    { lane: 4, arriveAfterMs: 0, kind: 'beerBottle' },
  ],
};

/**
 * A mug between two bottles, 300 ms apart.
 *
 * The mug is slower and wider, so the eye wants to deal with it first and the
 * clock says otherwise. Drifts, because it is a shape rather than a position.
 */
const mugSandwich: VolleyTemplate = {
  id: 'MUG_SANDWICH',
  driftLanes: true,
  members: [
    { lane: 1, arriveAfterMs: 0, kind: 'beerBottle' },
    { lane: 2, arriveAfterMs: 300, kind: 'beerMug' },
    { lane: 3, arriveAfterMs: 600, kind: 'beerBottle' },
  ],
};

export const VOLLEY_TEMPLATES: Readonly<Record<string, VolleyTemplate>> = {
  [tripleSameLane.id]: tripleSameLane,
  [sideToSide.id]: sideToSide,
  [pincer.id]: pincer,
  [mugSandwich.id]: mugSandwich,
};

export function volleyTemplate(id: string): VolleyTemplate | null {
  return VOLLEY_TEMPLATES[id] ?? null;
}

/** How long a volley takes to fully arrive, from its first member. */
export function volleySpanMs(template: VolleyTemplate): number {
  return Math.max(...template.members.map((member) => member.arriveAfterMs));
}

/**
 * The inclusive range of lane drift that keeps every member on the lane table.
 *
 * Returns `[0, 0]` for a template that does not drift, so the caller needs no
 * special case.
 */
export function laneDriftRange(
  template: VolleyTemplate,
  laneCount: number,
): { readonly min: number; readonly max: number } {
  if (!template.driftLanes) return { min: 0, max: 0 };
  const lanes = template.members.map((member) => member.lane);
  return { min: -Math.min(...lanes), max: laneCount - 1 - Math.max(...lanes) };
}

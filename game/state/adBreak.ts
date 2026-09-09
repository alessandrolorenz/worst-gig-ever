/**
 * When an ad break may happen, and — far more often — when it may not (M23).
 *
 * Source of truth: docs/specs/M23-monetization-and-store-readiness.md
 *
 * Pure. No SDK, no React, no clock, no network. Everything here is decided
 * from a finished round's own facts, which is what makes "an ad can never
 * block the result transition" testable in Node instead of provable only on a
 * device with a filled ad inventory.
 *
 * ## The shape of the rule
 *
 * The decision is deliberately split in two, because the halves fail for
 * different reasons and only one of them is a product decision:
 *
 *   - `isAdBreakBoundary` — *may* the game ever show an ad here? A property of
 *     the show's structure. It is the same on every device, every session and
 *     every install, and it is the half a policy reviewer would ask about.
 *   - `shouldShowAdBreak` — is it showing one *this* time? Adds the two
 *     runtime facts that can each independently say no: the player bought
 *     their way out, or nothing finished loading.
 *
 * Kept apart so a test can state "Stage 3 is never an ad break" without
 * inventing an entitlement and a preloaded ad to say it, and so a future
 * change to *readiness* cannot quietly widen *placement*.
 */
import type { GameState } from './gameState.ts';
import type { AppFlowState } from './appFlow.ts';
import { stageAt, type StageId } from '../levels/stages.ts';

/**
 * The only boundary in the show where an interstitial is allowed.
 *
 * By stage id rather than by index, and that is not decoration. "Stage 2" is a
 * claim about *which song the player just finished*, not about a position in
 * an array. Reordering `STAGES` — or inserting a fifth stage — would silently
 * move an index-based ad break onto a different stage and there would be
 * nothing to notice it; by id, a reorder moves the break with the stage it
 * belongs to, and deleting a stage is a type error.
 *
 * ## Why Stage 4 is not in this list
 *
 * It was, in the 2026-09-08 spec, which allowed two opportunities per show.
 * The owner removed it on 2026-09-09 and the reason is recorded in M23 under
 * "Amendments": Stage 4 now runs straight into the strongest thing the game
 * has to give — SHOW COMPLETE, the gig payout, NEXT GIG BOOKED, and on a first
 * clear the custom setlist unlock. That sequence is the ending. An interstitial
 * in front of it does not interrupt a stage boundary, it interrupts the payoff,
 * and the payoff is what a player tells someone else about.
 *
 * The cost is deliberate and known: one opportunity per show instead of two,
 * so roughly half the interstitial inventory of the original design. That is
 * the price of the ending landing, and it was paid on purpose.
 */
export const AD_BREAK_STAGES: readonly StageId[] = ['stage-2-beat'];

/**
 * Everything the decision needs. Assembled by the caller at the boundary, so
 * this module never reaches for a service to ask a question.
 */
export interface AdBreakContext {
  readonly flow: Pick<AppFlowState, 'stageIndex'>;
  /** The round's terminal state. Anything non-terminal is not a boundary. */
  readonly outcome: GameState;
  /** Confirmed `remove_ads` entitlement. Once true, never false again. */
  readonly adsRemoved: boolean;
  /**
   * Whether a preloaded interstitial is ready **at this instant**.
   *
   * Not "will be ready shortly". An ad that finishes loading after the player
   * has started reading their result arrives over something they are already
   * looking at, which M23 forbids outright — so lateness is not a delay to be
   * waited out, it is a miss.
   */
  readonly adReady: boolean;
}

/**
 * Is this a boundary where the show is *structurally* allowed to break?
 *
 * True only for a **successful Stage 2**. Everything else is false, and the
 * list of everything else is the point: Stage 1, Stage 3 and Stage 4
 * successes, every ruined attempt, and every non-terminal state a round can be
 * in — `READY`, `COUNTDOWN`, `PLAYING`, `PAUSED`, `VOCALIST_EVENT`.
 *
 * Screens outside a round — boot, language, story, title, setlist, briefing —
 * cannot reach this function with a terminal outcome at all, which is why they
 * need no clause here: they are excluded by never being asked.
 *
 * Two exclusions are product decisions rather than mechanics, and both are the
 * kind that get "optimized" back in later by someone reading a revenue graph:
 *
 *   - **A ruined show.** Failing a stage is the moment a player is closest to
 *     quitting, and also the moment they must retry through. An ad between a
 *     player and their retry monetizes frustration.
 *   - **Stage 4.** It leads directly into the ending — payout, next booking,
 *     and the custom setlist unlock. See `AD_BREAK_STAGES`.
 */
export function isAdBreakBoundary(
  flow: Pick<AppFlowState, 'stageIndex'>,
  outcome: GameState,
): boolean {
  if (outcome !== 'SHOW_COMPLETE') return false;
  return AD_BREAK_STAGES.includes(stageAt(flow.stageIndex).id);
}

/**
 * Is an interstitial actually being shown at this boundary, right now?
 *
 * The two runtime vetoes are independent and either alone is enough:
 *
 *   - **`adsRemoved`** — the player paid for this to stop. It is checked here
 *     as well as at load time so that an ad which was already preloaded when
 *     the purchase confirmed cannot still be spent.
 *   - **`adReady`** — nothing is ready, so nothing is shown. The opportunity
 *     is skipped, not deferred and not retried. A skipped break costs a single
 *     impression; a deferred one costs the result screen.
 *
 * Note what this function cannot express: there is no return value meaning
 * "wait". The caller advances to the result either way, and that is the whole
 * reason the answer is a `boolean` rather than a promise or a state — an ad
 * can never block the result transition if the decision to show one cannot be
 * asynchronous in the first place.
 */
export function shouldShowAdBreak(context: AdBreakContext): boolean {
  if (context.adsRemoved) return false;
  if (!context.adReady) return false;
  return isAdBreakBoundary(context.flow, context.outcome);
}

/**
 * Whether the player has bought their way out of ads, and how that is decided
 * from what a store tells us (M23).
 *
 * Source of truth: docs/specs/M23-monetization-and-store-readiness.md
 *
 * Pure. No `expo-iap`, no React, no clock, no network — the adapter that talks
 * to Google Play is a separate, deliberately thin module, in the same way
 * `storage.ts` is the only file that touches a disk (M22) and `deviceLocale.ts`
 * is the only one that imports `expo-localization` (M19). Every hostile input
 * a store can produce is this module's problem, and every one of them is
 * testable in Node.
 *
 * ## The one property that outranks the rest
 *
 * **The entitlement is monotonic.** Once confirmed, nothing in this build
 * turns ads back on — not a failed store query, not an offline launch, not a
 * transaction that arrives looking like a refund. `applyStoreReport` can only
 * ever move `false -> true`.
 *
 * That is not generosity, it is the only honest option available. Reversing an
 * entitlement correctly needs a trustworthy signal that a refund happened, and
 * a trustworthy signal needs a secure backend or the Play Developer API. This
 * project has neither, so a client-side reversal would be acting on a guess.
 * The two ways to be wrong are not symmetric: wrongly keeping ads off costs
 * the developer a few impressions; wrongly turning them back on takes
 * something away from a player who paid for it, which is the failure that
 * generates a one-star review and deserves to.
 *
 * M23 names client-side validation as an accepted limitation of this milestone
 * and requires it to be stated in the release report. This comment is where
 * the reasoning lives; the report cites it.
 *
 * ## Pending is not owned
 *
 * Google Play has a pending state for slow payment methods — a player can
 * complete a purchase flow and have nothing charged yet. Treating pending as
 * owned gives away the product to anyone who starts a payment they never
 * finish. Treating it as a failure is worse: it tells a player who did nothing
 * wrong that their purchase failed. It is its own state, and the UI says
 * "waiting", not "done" and not "failed".
 */

/**
 * What a store says about one transaction.
 *
 * Deliberately not the shape any particular SDK returns. The adapter maps
 * `expo-iap` into this, so a change of billing library is an adapter rewrite
 * rather than a change to the rule about what grants an entitlement.
 */
export const PURCHASE_OUTCOMES = [
  /** Paid and complete. The only outcome that can grant. */
  'purchased',
  /** Payment started, nothing charged yet. Not owned. */
  'pending',
  /** The player backed out. Not an error, and never shown as one. */
  'cancelled',
  /** The store already knows they own it. Grants, exactly like `purchased`. */
  'alreadyOwned',
  /** No such product, or billing unavailable on this device. */
  'unavailable',
  /** Transient. Worth a Retry button; not worth an apology. */
  'error',
] as const;

export type PurchaseOutcome = (typeof PURCHASE_OUTCOMES)[number];

/** Outcomes that mean the player owns the product right now. */
const GRANTING_OUTCOMES: readonly PurchaseOutcome[] = ['purchased', 'alreadyOwned'];

/**
 * One transaction as the adapter observed it.
 *
 * `finished` is the acknowledgement flag: Google Play refunds an
 * unacknowledged purchase automatically after three days, so a purchase the
 * app never finished is a purchase the player is about to lose. M23 requires
 * the transaction to be finished as a non-consumable **before** the
 * entitlement is confirmed, which is why this is an input to the decision and
 * not a detail the adapter keeps to itself.
 */
export interface StoreReport {
  readonly outcome: PurchaseOutcome;
  /** Whether the adapter has already acknowledged/finished this transaction. */
  readonly finished: boolean;
}

/** Everything the app knows about the player's relationship to `remove_ads`. */
export interface EntitlementState {
  /** Confirmed ownership. Monotonic: once true, never false again. */
  adsRemoved: boolean;
  /** A payment is in flight and nothing has been charged. */
  purchasePending: boolean;
  /**
   * How many times ownership has been granted.
   *
   * Not a statistic. It exists so a test can state "restoring twice grants
   * exactly once" as a fact about the state rather than as an absence of
   * observable change, and so a double-grant bug is loud instead of invisible.
   */
  grantCount: number;
}

/** A fresh install: nothing owned, nothing pending. */
export function emptyEntitlement(): EntitlementState {
  return { adsRemoved: false, purchasePending: false, grantCount: 0 };
}

/**
 * The entitlement a cold start begins with, from whatever the save file held.
 *
 * The cached value may only ever say "already owned". A save that says `false`
 * is not evidence of anything — it is also what a fresh install and a corrupt
 * file look like — so it starts the session unowned and lets the store answer.
 *
 * Caching the `true` is what keeps a returning player who paid from seeing ads
 * during the seconds before the store reconnects, or for the whole session on
 * a plane. M23 permits exactly this and nothing more.
 */
export function restoreCachedEntitlement(cached: boolean): EntitlementState {
  const state = emptyEntitlement();
  if (cached === true) {
    state.adsRemoved = true;
    state.grantCount = 1;
  }
  return state;
}

/**
 * Fold one store report into the entitlement.
 *
 * Returns the same object, mutated, matching how `appFlow.ts` transitions are
 * written in this project.
 *
 * The order of the checks is the specification:
 *
 *   1. **A granting outcome that is not finished does not grant.** An
 *      unacknowledged purchase is one Google Play will refund out from under
 *      the player in three days. Confirming ownership from it would show them
 *      an ad-free game that quietly reverts.
 *   2. **Pending sets pending and nothing else.** It never grants and never
 *      clears an existing grant.
 *   3. **Nothing ever revokes.** `cancelled`, `unavailable` and `error` clear
 *      the pending flag — the flow is over — and leave ownership alone.
 */
export function applyStoreReport(
  state: EntitlementState,
  report: StoreReport,
): EntitlementState {
  if (report.outcome === 'pending') {
    state.purchasePending = true;
    return state;
  }

  // Every non-pending outcome ends the in-flight flow, whatever it decides.
  state.purchasePending = false;

  if (!GRANTING_OUTCOMES.includes(report.outcome)) return state;
  if (!report.finished) return state;

  // Monotonic, and grants exactly once however many times a store repeats
  // itself — restoring on three devices, or a query that returns the same
  // owned product on every launch, is one grant.
  if (!state.adsRemoved) {
    state.adsRemoved = true;
    state.grantCount += 1;
  }
  return state;
}

/**
 * May this session request ads?
 *
 * Both halves must agree, and they fail for unrelated reasons: the player may
 * have bought the product, or consent may never have been established. M23
 * requires ad requests to fail closed when consent cannot be established, so
 * "we could not ask" and "they said no" produce the same answer here.
 */
export function canRequestAds(state: EntitlementState, consentAllowsAds: boolean): boolean {
  if (state.adsRemoved) return false;
  return consentAllowsAds;
}

/** What gets written to the save file. Only the confirmed fact is durable. */
export function entitlementToSave(state: EntitlementState): boolean {
  return state.adsRemoved;
}

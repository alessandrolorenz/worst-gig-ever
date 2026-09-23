/**
 * Which store product grants Remove Ads, and how a store's answer becomes a
 * `StoreReport` (M23, piece 5B).
 *
 * Source of truth: docs/specs/M23-monetization-and-store-readiness.md
 * Compatibility: docs/decisions/0015-revenuecat-as-the-billing-adapter.md
 *
 * Pure. No `react-native-purchases`, no React, no clock, no network — the same
 * split `monetization.ts` draws around AdMob identifiers and `entitlement.ts`
 * draws around ownership. Everything that *decides* anything lives here and is
 * tested in Node; `game/billing/billingService.ts` is the only file that
 * actually talks to the SDK.
 *
 * That split is the whole point of the adapter. `entitlement.ts` already owns
 * the rule about what grants ownership, and it must keep owning it: this
 * module's entire job is to turn RevenueCat's vocabulary into the six
 * `PurchaseOutcome` values that module already understands, so that swapping
 * billing libraries again is a rewrite of two files and not a change to the
 * rule about what a purchase means.
 *
 * ## Non-consumable, and never consumed
 *
 * `remove_ads` is a one-time Google Play product that is owned forever. It is
 * never consumed — consuming it would let Play sell it again, which for an
 * ad-removal entitlement means charging a player twice for something they
 * already bought.
 *
 * This is not a rule we have to remember to follow. RevenueCat acknowledges
 * Google Play purchases and does not consume them unless a product is
 * explicitly configured as consumable in the RevenueCat dashboard, and this
 * repository exposes no consume call at all. The dashboard setting is the one
 * place the mistake can still be made, which is why it is written down in the
 * ADR and in the Play Console checklist rather than only here.
 */

import type { PurchaseOutcome, StoreReport } from '../state/entitlement.ts';

/**
 * The Google Play product id. Canonical, and matching the M23 spec's "Build
 * configuration" section, which names `remove_ads` as *the* product id.
 */
export const REMOVE_ADS_PRODUCT_ID = 'remove_ads';

/**
 * The RevenueCat entitlement identifier.
 *
 * Deliberately the same string as the product id. RevenueCat models these as
 * two separate concepts — a product is what Play sells, an entitlement is what
 * the app grants — and for a product that grants exactly one thing, keeping
 * the names identical removes the only interesting way to misconfigure the
 * dashboard: attaching the product to an entitlement nobody queries produces a
 * successful purchase that grants nothing, and the symptom is a player who
 * paid and still sees ads.
 */
export const REMOVE_ADS_ENTITLEMENT_ID = 'remove_ads';

/**
 * RevenueCat's error codes, as the values the SDK actually reports.
 *
 * **They are strings.** `PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR` is the
 * string `'20'`, not the number `20`. A `===` against a number silently never
 * matches, which would turn every pending purchase into a generic error and
 * tell a player whose payment is still clearing that something went wrong.
 * They are written out here as strings, compared as strings, and the test
 * suite asserts the string form, so the trap is caught in Node rather than on
 * a handset holding a boleto.
 *
 * Only the codes this product can actually produce are named. Everything else
 * falls through to `error`, which is the correct answer for an unknown code.
 */
const RC_ERROR = {
  /** The player backed out of the Play sheet. Never shown as a failure. */
  PURCHASE_CANCELLED: '1',
  /** Play itself is unhappy — no Play Store, no account, service down. */
  STORE_PROBLEM: '2',
  /** Play refuses this purchase: parental controls, managed device. */
  PURCHASE_NOT_ALLOWED: '3',
  /** No such product, or it is not active in the Play Console. */
  PRODUCT_NOT_AVAILABLE: '5',
  /** Play already knows they own it. Grants, exactly like `purchased`. */
  PRODUCT_ALREADY_PURCHASED: '6',
  /** Slow payment method. Nothing charged yet, and nothing granted yet. */
  PAYMENT_PENDING: '20',
  /** The SDK was never configured, or has no API key. Our bug, not theirs. */
  CONFIGURATION: '23',
  /** Billing is not available on this device at all. */
  UNSUPPORTED: '24',
} as const;

/**
 * Codes that mean "there is nothing to buy from here", as distinct from "that
 * did not work, try again".
 *
 * The difference is what the screen says. `unavailable` is a dead end and the
 * copy says so; `error` is transient and offers a retry. Telling a player on a
 * device with no Play Store to try again is a loop with no exit.
 */
const UNAVAILABLE_CODES: readonly string[] = [
  RC_ERROR.STORE_PROBLEM,
  RC_ERROR.PURCHASE_NOT_ALLOWED,
  RC_ERROR.PRODUCT_NOT_AVAILABLE,
  RC_ERROR.CONFIGURATION,
  RC_ERROR.UNSUPPORTED,
];

/**
 * The shape this module needs from a RevenueCat `CustomerInfo`.
 *
 * Structural, and a subset: the real object carries several dozen fields about
 * subscriptions, renewals and billing issues that a one-time non-consumable
 * has no opinion about. Declaring only what is read keeps the tests honest —
 * a fixture here is a thing the mapping actually depends on, not a transcript
 * of an SDK response.
 */
export interface CustomerInfoLike {
  readonly entitlements?: {
    readonly active?: Record<string, { readonly isActive?: boolean } | undefined>;
  };
}

/** The shape this module needs from a thrown RevenueCat error. */
export interface PurchasesErrorLike {
  readonly code?: string | number;
  /** Deprecated by RevenueCat in favour of `code`, and still read. See below. */
  readonly userCancelled?: boolean | null;
}

/**
 * Is the Remove Ads entitlement active in this customer info?
 *
 * `entitlements.active` only ever contains entitlements RevenueCat considers
 * live, so a key being present is already the answer; `isActive` is checked
 * anyway because a map that contains an inactive entry would otherwise grant,
 * and the cost of being wrong here is an ad-free game that reverts.
 */
export function hasActiveRemoveAds(info: CustomerInfoLike | null | undefined): boolean {
  const entry = info?.entitlements?.active?.[REMOVE_ADS_ENTITLEMENT_ID];
  if (entry === undefined || entry === null) return false;
  return entry.isActive !== false;
}

/**
 * What a `CustomerInfo` says about ownership.
 *
 * Used for the three paths that end in a customer info rather than a throw:
 * a completed purchase, a restore, and the launch-time ownership query.
 *
 * ## Why `finished` is true whenever the entitlement is active
 *
 * `entitlement.ts` refuses to grant on an unacknowledged purchase, because
 * Google Play refunds one automatically after three days. With `expo-iap` the
 * app had to acknowledge the transaction itself, so `finished` was a fact the
 * adapter tracked.
 *
 * RevenueCat acknowledges Google Play purchases on its own — the entitlement
 * only becomes active in `CustomerInfo` after RevenueCat's backend has
 * validated the purchase token with Play and acknowledged it. So an active
 * entitlement *is* the acknowledgement signal, and reporting `finished: false`
 * here would mean never granting at all.
 *
 * The check in `entitlement.ts` is not thereby pointless: it is the rule, and
 * this is one adapter's evidence for it. A future adapter that acknowledges
 * manually reports the flag it actually knows, and the rule does not move.
 */
export function storeReportFromCustomerInfo(
  info: CustomerInfoLike | null | undefined,
): StoreReport {
  if (hasActiveRemoveAds(info)) return { outcome: 'purchased', finished: true };
  return { outcome: 'unavailable', finished: false };
}

/**
 * What a thrown RevenueCat error says about ownership.
 *
 * Order matters, and cancellation is checked first: a player who taps outside
 * the Play sheet has done nothing wrong and must never see an error.
 */
export function storeReportFromPurchaseError(
  error: PurchasesErrorLike | null | undefined,
): StoreReport {
  const code = error?.code === undefined || error?.code === null ? null : String(error.code);

  /*
   * `userCancelled` is deprecated in favour of `code`, and is still consulted
   * because it is the only signal on some older hybrid paths and because the
   * cost of missing a cancellation — accusing a player of a failure they
   * chose — is the one this screen's copy was written to avoid.
   */
  if (code === RC_ERROR.PURCHASE_CANCELLED || error?.userCancelled === true) {
    return { outcome: 'cancelled', finished: false };
  }

  if (code === RC_ERROR.PAYMENT_PENDING) {
    return { outcome: 'pending', finished: false };
  }

  /*
   * Already owned, and the purchase therefore already acknowledged by whoever
   * completed it. This is the path a player hits after reinstalling without
   * restoring, and it grants — `entitlement.ts` treats `alreadyOwned` exactly
   * like `purchased`.
   */
  if (code === RC_ERROR.PRODUCT_ALREADY_PURCHASED) {
    return { outcome: 'alreadyOwned', finished: true };
  }

  if (code !== null && UNAVAILABLE_CODES.includes(code)) {
    return { outcome: 'unavailable', finished: false };
  }

  // Unknown codes, network failures, and anything thrown that is not a
  // RevenueCat error at all. Transient by assumption, which is the reading
  // that offers a retry rather than closing the door.
  return { outcome: 'error', finished: false };
}

/**
 * What a restore attempt that completed without throwing means.
 *
 * Restoring is not the same question as purchasing, and the difference is the
 * empty case: a restore that finds nothing is not an error and not a dead end,
 * it is "no previous purchase found on this account", which the catalogue
 * already says. `entitlement.ts` treats `unavailable` as a no-op that clears
 * the pending flag and leaves ownership alone, which is exactly right.
 */
export function storeReportFromRestore(
  info: CustomerInfoLike | null | undefined,
): StoreReport {
  return storeReportFromCustomerInfo(info);
}

/** Did a restore that did not throw actually find the entitlement? */
export function restoreFoundEntitlement(info: CustomerInfoLike | null | undefined): boolean {
  return hasActiveRemoveAds(info);
}

/**
 * The outcomes the Remove Ads screen has copy for.
 *
 * Exported so a test can assert that the mapping never produces an outcome the
 * catalogue cannot render — a state with no words is a blank screen, and it
 * would only ever appear on a stranger's handset.
 */
export const OUTCOMES_WITH_COPY: readonly PurchaseOutcome[] = [
  'purchased',
  'pending',
  'cancelled',
  'alreadyOwned',
  'unavailable',
  'error',
];

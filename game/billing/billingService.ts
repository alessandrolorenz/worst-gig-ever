/**
 * The only file in this repository that imports `react-native-purchases`
 * (M23, piece 5B).
 *
 * Source of truth: docs/specs/M23-monetization-and-store-readiness.md
 * Compatibility: docs/decisions/0015-revenuecat-as-the-billing-adapter.md
 *
 * The same boundary `adService.ts` draws around the Google Mobile Ads SDK,
 * `storage.ts` draws around `expo-file-system` (M22) and `deviceLocale.ts`
 * draws around `expo-localization` (M19). Everything that *decides* anything
 * lives in pure modules tested in Node — `entitlement.ts` owns what grants
 * ownership, `config/billing.ts` owns how a store's vocabulary becomes a
 * `StoreReport` — and this module goes and talks to the SDK.
 *
 * ## Nothing here throws
 *
 * Every method resolves. A store that is down, a device with no Play Store, a
 * network that disappears mid-purchase and an SDK that was never configured
 * all produce a `StoreReport` describing what happened, because the caller is
 * a screen that has to render something either way. The one thing a billing
 * failure must never do is take down a game that is otherwise working.
 *
 * ## Restore is never automatic
 *
 * `initialize()` and `getEntitlementStatus()` read `getCustomerInfo()`, which
 * is a silent cache/network read. Only the Restore button calls
 * `restorePurchases()`.
 *
 * The distinction matters because restore is the operation that can surface an
 * OS-level account interaction — on iOS StoreKit it can prompt for an Apple
 * Account password. M23 forbids triggering that without the player asking, and
 * "check quietly on launch, ask loudly only on tap" is the shape that
 * satisfies it on both platforms rather than only the one we ship first.
 */
import { Platform } from 'react-native';

import type { StoreReport } from '../state/entitlement.ts';
import {
  REMOVE_ADS_PRODUCT_ID,
  hasActiveRemoveAds,
  storeReportFromCustomerInfo,
  storeReportFromPurchaseError,
  storeReportFromRestore,
  restoreFoundEntitlement,
} from '../config/billing.ts';

/**
 * Whether this build can talk to the SDK at all.
 *
 * Web has no `react-native-purchases` native module, and M23 requires the web
 * export to stay playable with the monetization adapters disabled. Every entry
 * point below short-circuits on this, exactly as `adService.ts` does.
 */
const BILLING_SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

/**
 * The RevenueCat public SDK key for Android.
 *
 * Spelled statically, and the reason is the one `buildFlags.ts` documents at
 * length: Expo substitutes the literal `process.env.NAME` expression at bundle
 * time, so `process.env[SOME_CONST]` reads better and silently resolves to
 * nothing in a release bundle. A billing key that is `undefined` in exactly
 * the builds that matter is not a bug anyone finds quickly.
 *
 * This is a *public* key (`goog_…`). RevenueCat publishes it as safe to embed —
 * it can start purchases and read entitlements, and it cannot grant them. The
 * secret key, which can, is never in a client build and is not in this repo.
 */
export const REVENUECAT_ANDROID_KEY_FLAG = 'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY';

function androidApiKey(): string | null {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') return null;
  const value = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/** What the Remove Ads screen needs to draw itself. Never a promise. */
export interface BillingServiceState {
  /** The SDK is configured and answering. */
  ready: boolean;
  /** Google Play's own formatted price, e.g. `R$ 9,90`. Never built by us. */
  priceString: string | null;
  /** Confirmed ownership, as the store currently reports it. */
  owned: boolean;
}

function emptyState(): BillingServiceState {
  return { ready: false, priceString: null, owned: false };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sdk = {
  configure: (options: { apiKey: string }) => void;
  getProducts: (ids: string[]) => Promise<any[]>;
  purchaseStoreProduct: (product: any) => Promise<any>;
  purchaseProduct: (id: string) => Promise<any>;
  restorePurchases: () => Promise<any>;
  getCustomerInfo: () => Promise<any>;
};

/**
 * Loaded lazily and never at module scope.
 *
 * A static `import` is hoisted, so the web bundle would resolve
 * `react-native-purchases` at load time, find no native module and fail before
 * the title screen — breaking M23's requirement that web stays playable with
 * the monetization adapters disabled.
 */
function loadSdk(): Sdk | null {
  if (!BILLING_SUPPORTED) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-purchases');
    return (mod?.default ?? mod) as Sdk;
  } catch {
    return null;
  }
}

/**
 * The boundary M23 piece 5B is built against.
 *
 * Named for what the game needs rather than for what RevenueCat offers: there
 * is one product, it is bought once, and it is never consumed. An interface
 * shaped like the SDK would leak offerings, packages and subscription periods
 * into a game that has none of those things.
 */
export class BillingService {
  private readonly state: BillingServiceState = emptyState();
  private product: any = null;
  private configured = false;

  /** A snapshot the UI can read synchronously. Never a promise. */
  snapshot(): Readonly<BillingServiceState> {
    return { ...this.state };
  }

  /**
   * Cold start. Safe to call once per launch; safe to fail entirely.
   *
   * Configures the SDK and asks — quietly, with no account interaction — what
   * this Google account already owns. A returning player who paid has their
   * entitlement back before the title screen finishes drawing, without ever
   * having tapped Restore.
   */
  async initialize(): Promise<StoreReport | null> {
    const sdk = loadSdk();
    if (sdk === null) return null;

    const apiKey = androidApiKey();
    /*
     * No key means the RevenueCat project does not exist yet. That is a real
     * state this repository has been in for the whole spike, and it must look
     * like "the store is not available" rather than like a crash: the screen
     * has copy for `unavailable`, and a build without a key is still a
     * playable build with ads.
     */
    if (apiKey === null) return { outcome: 'unavailable', finished: false };

    try {
      if (!this.configured) {
        sdk.configure({ apiKey });
        this.configured = true;
      }
      this.state.ready = true;
    } catch {
      return { outcome: 'unavailable', finished: false };
    }

    try {
      const info = await sdk.getCustomerInfo();
      this.state.owned = hasActiveRemoveAds(info);
      return storeReportFromCustomerInfo(info);
    } catch (error) {
      return storeReportFromPurchaseError(error as any);
    }
  }

  /**
   * Google Play's formatted price for `remove_ads`.
   *
   * `priceString` and never a number: Play returns the price already formatted
   * for the buyer's country and currency, and M23 forbids a hard-coded one.
   * The catalogue's `buy` string is `'Buy — {price}'` for exactly this reason.
   */
  async getRemoveAdsPrice(): Promise<string | null> {
    const sdk = loadSdk();
    if (sdk === null || !this.state.ready) return null;
    try {
      const products = await sdk.getProducts([REMOVE_ADS_PRODUCT_ID]);
      const match = Array.isArray(products)
        ? (products.find(p => p?.identifier === REMOVE_ADS_PRODUCT_ID) ?? products[0])
        : null;
      if (match === null || match === undefined) return null;
      this.product = match;
      const price = match.priceString;
      this.state.priceString = typeof price === 'string' && price !== '' ? price : null;
      return this.state.priceString;
    } catch {
      return null;
    }
  }

  /**
   * Buy Remove Ads.
   *
   * Prefers the already-fetched product object over the bare id: purchasing a
   * `StoreProduct` is the path RevenueCat documents, and it avoids a second
   * product lookup at the moment the player is waiting on a sheet.
   */
  async purchaseRemoveAds(): Promise<StoreReport> {
    const sdk = loadSdk();
    if (sdk === null || !this.state.ready) {
      return { outcome: 'unavailable', finished: false };
    }
    try {
      const result =
        this.product !== null
          ? await sdk.purchaseStoreProduct(this.product)
          : await sdk.purchaseProduct(REMOVE_ADS_PRODUCT_ID);
      const info = result?.customerInfo ?? result;
      this.state.owned = hasActiveRemoveAds(info);
      return storeReportFromCustomerInfo(info);
    } catch (error) {
      return storeReportFromPurchaseError(error as any);
    }
  }

  /**
   * Restore Purchases, and only ever from the player tapping it.
   *
   * Returns both the report and whether anything was found, because "restored
   * successfully, you own it" and "restored successfully, there was nothing on
   * this account" are different sentences and the catalogue has both.
   */
  async restorePurchases(): Promise<{ report: StoreReport; found: boolean }> {
    const sdk = loadSdk();
    if (sdk === null || !this.state.ready) {
      return { report: { outcome: 'unavailable', finished: false }, found: false };
    }
    try {
      const info = await sdk.restorePurchases();
      const found = restoreFoundEntitlement(info);
      this.state.owned = found;
      return { report: storeReportFromRestore(info), found };
    } catch (error) {
      return { report: storeReportFromPurchaseError(error as any), found: false };
    }
  }

  /** The silent ownership question. Never triggers an account interaction. */
  async getEntitlementStatus(): Promise<StoreReport> {
    const sdk = loadSdk();
    if (sdk === null || !this.state.ready) {
      return { outcome: 'unavailable', finished: false };
    }
    try {
      const info = await sdk.getCustomerInfo();
      this.state.owned = hasActiveRemoveAds(info);
      return storeReportFromCustomerInfo(info);
    } catch (error) {
      return storeReportFromPurchaseError(error as any);
    }
  }
}

/**
 * The only file in this repository that imports the Google Mobile Ads SDK
 * (M23, piece 5A).
 *
 * Source of truth: docs/specs/M23-monetization-and-store-readiness.md
 * Compatibility: docs/decisions/0014-admob-and-billing-compatibility-on-expo-53.md
 *
 * The same boundary `storage.ts` draws around `expo-file-system` (M22) and
 * `deviceLocale.ts` draws around `expo-localization` (M19): everything that
 * *decides* anything lives in pure modules tested in Node — `adBreak.ts` owns
 * placement, `entitlement.ts` owns ownership, `monetization.ts` owns which
 * identifiers a build may use — and this module goes and talks to the SDK.
 *
 * ## Nothing here throws, and nothing here is awaited by the game
 *
 * M23's hardest rule is that an ad can never block the result transition. The
 * pure layer makes that true by construction — `shouldShowAdBreak` returns a
 * boolean, so there is no value meaning "wait" — and this module must not
 * quietly undo it. So `show()` is synchronous and returns nothing, every
 * promise is swallowed, and a failure anywhere leaves the game exactly as it
 * would have been with no ads at all.
 *
 * ## The order at cold start is a contract, not a preference
 *
 * Consent first, ads second, and never the other way round:
 *
 *   1. `requestInfoUpdate` — refresh what the UMP SDK knows.
 *   2. `loadAndShowConsentFormIfRequired` — show the European regulations
 *      message where it applies.
 *   3. `canRequestAds` — **the authority**. Not the consent status, not the
 *      geography, not our own guess about either. If it is false the session
 *      requests nothing, which is what M23 means by failing closed.
 *   4. Only then initialize Mobile Ads and preload.
 */
import { Platform } from 'react-native';

import { currentInterstitialUnitId } from '../config/monetization.ts';
import { forcesUmpEeaGeography, umpTestDeviceHashedId } from '../config/buildFlags.ts';

/**
 * Whether this build can talk to the SDK at all.
 *
 * Web has no Google Mobile Ads native module, and M23 requires the web export
 * to stay playable with the monetization adapters disabled. Every entry point
 * below short-circuits on this, so the web bundle never reaches an import that
 * does not exist there.
 */
const ADS_SUPPORTED = Platform.OS === 'android' || Platform.OS === 'ios';

export interface AdServiceState {
  /** UMP's answer, and the only thing allowed to authorise a request. */
  canRequestAds: boolean;
  /** UMP says a privacy-options entry point must exist for this user. */
  privacyOptionsRequired: boolean;
  /** An interstitial is loaded and can be shown this instant. */
  interstitialReady: boolean;
}

/**
 * Diagnostics, on only in a build that exists to validate consent.
 *
 * Reuses the UMP debug flag rather than inventing a second one: a build with
 * `EXPO_PUBLIC_UMP_DEBUG_EEA` set is by definition a validation build, and a
 * build that reaches a player prints nothing.
 */
function log(message: string, detail?: unknown): void {
  if (!forcesUmpEeaGeography()) return;
  // eslint-disable-next-line no-console
  console.log(`[ads] ${message}`, detail === undefined ? '' : JSON.stringify(detail));
}

function emptyState(): AdServiceState {
  return { canRequestAds: false, privacyOptionsRequired: false, interstitialReady: false };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Sdk = {
  MobileAds: () => { initialize: () => Promise<unknown> };
  InterstitialAd: { createForAdRequest: (unitId: string) => any };
  AdEventType: Record<string, string>;
  AdsConsent: any;
  AdsConsentDebugGeography: { DISABLED: number; EEA: number };
};

/**
 * Loaded lazily and never at module scope.
 *
 * A static import would put the native module in the web bundle's dependency
 * graph, where it resolves to nothing and takes the whole app down at load
 * rather than at the first ad.
 */
function loadSdk(): Sdk | null {
  if (!ADS_SUPPORTED) return null;
  try {
    /*
     * `require`, and the lint rule is suppressed for this one line only.
     *
     * A static `import` is hoisted, so the web bundle would resolve
     * `react-native-google-mobile-ads` at load time, find no native module,
     * and fail before the title screen — breaking M23's requirement that web
     * stays playable with the monetization adapters disabled. An `await
     * import()` would make every caller async, and the one caller that must
     * stay synchronous is `show()`, because a promise there is exactly the
     * "wait" that the no-blocking rule exists to prevent.
     */
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-google-mobile-ads') as Sdk;
  } catch {
    return null;
  }
}

export class AdService {
  private readonly state: AdServiceState = emptyState();
  private interstitial: any = null;
  private unsubscribers: Array<() => void> = [];
  private disposed = false;

  /** A snapshot the UI can read synchronously. Never a promise. */
  snapshot(): Readonly<AdServiceState> {
    return { ...this.state };
  }

  /**
   * Cold start. Safe to call once per launch; safe to fail entirely.
   *
   * Awaited by nothing the player is waiting on: the title screen renders
   * whether or not this has finished, and if it never finishes the game is a
   * game with no ads.
   */
  async start(adsRemoved: boolean): Promise<void> {
    if (this.disposed) return;

    // A player who paid is never asked for advertising consent, because
    // nothing will request an ad for them. Asking anyway would be collecting a
    // decision we have no use for.
    if (adsRemoved) return;

    const sdk = loadSdk();
    log('start', {
      sdkLoaded: sdk !== null,
      forcedEea: forcesUmpEeaGeography(),
      testDevice: umpTestDeviceHashedId() !== null,
    });
    if (sdk === null) return;

    try {
      /*
       * Debug geography only when a build explicitly asked for it. Google's
       * own testing mechanism, and it makes the real published message
       * appear — it does not simulate one. Emulators are registered test
       * devices for UMP automatically, so no hashed id is needed here.
       */
      const testDevice = umpTestDeviceHashedId();
      await sdk.AdsConsent.gatherConsent(
        forcesUmpEeaGeography()
          ? {
              debugGeography: sdk.AdsConsentDebugGeography.EEA,
              /*
               * Without this, `debugGeography` is ignored on a physical
               * device and the failure is silent — the app simply behaves as
               * though the flag were off. Emulators are registered test
               * devices automatically; handsets are not.
               */
              ...(testDevice === null ? {} : { testDeviceIdentifiers: [testDevice] }),
            }
          : undefined,
      );
    } catch (error) {
      // Consent could not be established. `canRequestAds` stays false and the
      // session runs without ads — M23's fail-closed rule.
      log('gatherConsent threw', String(error));
      return;
    }

    try {
      const info = await sdk.AdsConsent.getConsentInfo();
      this.state.canRequestAds = info?.canRequestAds === true;
      /*
       * The enum is upper-case: 'REQUIRED', not 'required'. Written lower-case
       * first, which made `privacyOptionsRequired` permanently false and would
       * have silently hidden the privacy-options entry from every European
       * player who is entitled to it.
       */
      this.state.privacyOptionsRequired =
        info?.privacyOptionsRequirementStatus === 'REQUIRED';
      log('consent info', {
        status: info?.status,
        canRequestAds: info?.canRequestAds,
        privacyOptions: info?.privacyOptionsRequirementStatus,
        formAvailable: info?.isConsentFormAvailable,
      });
    } catch (error) {
      log('getConsentInfo threw', String(error));
      return;
    }

    if (!this.state.canRequestAds) {
      log('canRequestAds is false — no ads this session');
      return;
    }

    try {
      await sdk.MobileAds().initialize();
      log('mobile ads initialized');
    } catch (error) {
      log('initialize threw', String(error));
      return;
    }

    this.preload(sdk);
  }

  /**
   * Ask for the next interstitial.
   *
   * Called at start and again after one is shown, so the single opportunity in
   * a later show is already loaded when it arrives. A load failure is silence:
   * `interstitialReady` stays false and the opportunity is skipped.
   */
  private preload(sdk: Sdk): void {
    if (this.disposed || !this.state.canRequestAds) return;

    try {
      const ad = sdk.InterstitialAd.createForAdRequest(currentInterstitialUnitId());

      const onLoaded = ad.addAdEventListener(sdk.AdEventType.LOADED, () => {
        this.state.interstitialReady = true;
        log('interstitial loaded');
      });
      const onError = ad.addAdEventListener(sdk.AdEventType.ERROR, (error: unknown) => {
        this.state.interstitialReady = false;
        log('interstitial error', String(error));
      });
      const onClosed = ad.addAdEventListener(sdk.AdEventType.CLOSED, () => {
        this.state.interstitialReady = false;
        this.interstitial = null;
        // The next show's opportunity starts loading now rather than at the
        // boundary, because an ad requested at the boundary is an ad that
        // arrives late, and M23 forbids one arriving over a result.
        this.preload(sdk);
      });

      this.unsubscribers = [onLoaded, onError, onClosed].filter(
        (fn): fn is () => void => typeof fn === 'function',
      );
      this.interstitial = ad;
      log('requesting interstitial', { unit: currentInterstitialUnitId() });
      ad.load();
    } catch (error) {
      log('preload threw', String(error));
      this.state.interstitialReady = false;
    }
  }

  /**
   * Show the loaded interstitial, if there is one.
   *
   * Synchronous and returns nothing on purpose. The caller has already decided
   * — via `shouldShowAdBreak` — and is going to advance to the result on the
   * next line whatever happens here.
   */
  show(): void {
    if (this.disposed || !this.state.interstitialReady || this.interstitial === null) return;

    this.state.interstitialReady = false;
    try {
      this.interstitial.show();
    } catch {
      // Shown or not, the result screen is already on its way.
    }
  }

  /**
   * Re-open the consent form so a player can change their mind.
   *
   * Offered by the UI only when `privacyOptionsRequired` is true, which is
   * UMP's own answer rather than our inference from a country code.
   */
  async showPrivacyOptions(): Promise<void> {
    const sdk = loadSdk();
    if (sdk === null || !this.state.privacyOptionsRequired) return;

    try {
      await sdk.AdsConsent.showPrivacyOptionsForm();
      const info = await sdk.AdsConsent.getConsentInfo();
      this.state.canRequestAds = info?.canRequestAds === true;
      this.state.privacyOptionsRequired =
        info?.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch {
      // The form did not open. Nothing changes, including consent.
    }
  }

  dispose(): void {
    this.disposed = true;
    for (const off of this.unsubscribers) {
      try {
        off();
      } catch {
        /* the listener is going away with the module */
      }
    }
    this.unsubscribers = [];
    this.interstitial = null;
    this.state.interstitialReady = false;
  }
}

/** A service that does nothing, for web and for tests that must not touch a SDK. */
export function disabledAdService(): AdService {
  const service = new AdService();
  service.dispose();
  return service;
}

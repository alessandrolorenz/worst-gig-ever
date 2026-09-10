/**
 * Which AdMob identifiers this build is allowed to use, and which ones must
 * stop it (M23).
 *
 * Source of truth: docs/specs/M23-monetization-and-store-readiness.md,
 * including the 2026-09-09 correction under "Amendments".
 *
 * Pure. No SDK, no `app.json` read, no filesystem. The values it judges are
 * passed in, which is what lets the unit tests state every rule with fixture
 * identifiers and never need the real ones.
 *
 * ## The two identifiers are not interchangeable, and only one may be fake
 *
 * This is the correction that this module exists to encode, because getting it
 * wrong is silent in exactly the way that matters.
 *
 *   - The **App ID** (`ca-app-pub-…~…`, tilde) identifies *the app* to Google.
 *     The UMP SDK resolves which Privacy & Messaging configuration to fetch
 *     from the App ID embedded in the build. Point it at Google's published
 *     sample App ID and UMP looks up a Google-owned app: our consent message is
 *     never found, and the consent flow appears to work while testing nothing
 *     we wrote. So the App ID must be the real one in every build that
 *     initializes AdMob or UMP at all — including development and friend
 *     builds, which is the opposite of what the original spec said.
 *   - The **ad unit ID** (`ca-app-pub-…/…`, slash) identifies *the placement*.
 *     It alone decides whether a real ad is served. Google's demo units always
 *     return the "Test Ad" card, so development, friend and test builds use
 *     them and cannot generate an impression, invalid traffic or revenue no
 *     matter how the ad is interacted with.
 *
 * The App ID is therefore never faked and the ad unit is faked everywhere
 * except production. There is deliberately no fallback that substitutes the
 * sample App ID when the real one is missing: a build with no App ID must fail
 * and say so, because the alternative is a build that looks configured and
 * tests a consent message belonging to somebody else.
 */

/**
 * The two classes of build, by what they are allowed to ask Google for.
 *
 * `test` covers development, friend, preview and audition builds — everything
 * that is not the artifact a stranger installs from a store. They differ from
 * each other in plenty of ways; they do not differ in which ad unit they are
 * allowed to request, so they are one profile here rather than four.
 */
export const AD_PROFILES = ['test', 'production'] as const;

export type AdProfile = (typeof AD_PROFILES)[number];

/**
 * Google's publisher id for published demo inventory.
 *
 * Every demo identifier — app id, banner, interstitial, rewarded, native —
 * sits under this one publisher, so membership is decided by the publisher
 * segment rather than by a list of individual ids that would go stale the
 * moment Google publishes a new format.
 */
export const GOOGLE_DEMO_PUBLISHER_ID = '3940256099942544';

/** Google's official demo interstitial for Android. Used by every test build. */
export const GOOGLE_DEMO_INTERSTITIAL_ANDROID = 'ca-app-pub-3940256099942544/1033173712';

/**
 * Google's published sample App ID.
 *
 * Present in this file **so that it can be rejected**, and for no other
 * reason. It is what every AdMob tutorial pastes into a manifest, which is
 * exactly why an explicit named constant and a test that refuses it are worth
 * more than a comment asking people not to.
 */
export const GOOGLE_SAMPLE_APP_ID = 'ca-app-pub-3940256099942544~3347511713';

/**
 * The real production interstitial unit (recorded 2026-09-10).
 *
 * Requested only by a build that declares itself production — see
 * `currentAdProfile`, which defaults to `test` in every ambiguous case. A
 * development, friend or audition build never asks for this unit however it is
 * launched, so recording it here cannot cause an impression from a developer's
 * own device.
 *
 * Not a secret: it is compiled into the APK and readable by anyone who unzips
 * it, which is why it is committed rather than injected. The values that must
 * never be committed are the signing key and the store credentials.
 */
export const PRODUCTION_INTERSTITIAL_UNIT_ID: string | null =
  'ca-app-pub-2216849192122306/7968976548';

/** `ca-app-pub-` + 16-digit publisher + `~` + 10-digit app. */
const APP_ID_PATTERN = /^ca-app-pub-\d{16}~\d{10}$/;

/** `ca-app-pub-` + 16-digit publisher + `/` + 10-digit unit. */
const AD_UNIT_PATTERN = /^ca-app-pub-\d{16}\/\d{10}$/;

/**
 * Is this syntactically an AdMob App ID?
 *
 * Syntax only. Nothing here can tell whether the id belongs to this app, to
 * another developer, or to nobody — that requires asking Google, which a build
 * step must not depend on. What it does catch is the whole family of mistakes
 * that are otherwise found on a device: an ad unit id pasted into the app id
 * field (the separator is `/`, not `~`), a truncated paste, a quoted empty
 * string, a leftover `YOUR_APP_ID`.
 */
export function isValidAdMobAppId(value: unknown): value is string {
  return typeof value === 'string' && APP_ID_PATTERN.test(value);
}

/** Is this syntactically an AdMob ad unit id? Same caveat as the App ID. */
export function isValidAdUnitId(value: unknown): value is string {
  return typeof value === 'string' && AD_UNIT_PATTERN.test(value);
}

/** Does this identifier belong to Google's demo publisher, whatever its format? */
export function isGoogleDemoId(value: string): boolean {
  return value.startsWith(`ca-app-pub-${GOOGLE_DEMO_PUBLISHER_ID}`);
}

/**
 * Which profile this bundle was built as.
 *
 * **Defaults to `test`, and every ambiguous case resolves that way.** The two
 * failure directions are not symmetric: a production build that resolves as
 * `test` serves demo ads and loses revenue, while a test build that resolves
 * as `production` requests real ads from a developer's own device — which is
 * invalid traffic, and invalid traffic is an account problem rather than a
 * revenue one. Defaulting toward the recoverable failure is the same reasoning
 * that makes the `remove_ads` entitlement monotonic.
 *
 * The environment variable is spelled out as a static member expression for
 * the reason `buildFlags.ts` documents at length: Expo's Babel transform
 * substitutes the literal `process.env.NAME` expression at bundle time and
 * cannot see through a variable, so a dynamic lookup silently reads nothing in
 * a release bundle. Allow-list rather than truthiness, for the same reason —
 * an empty string, `0` and `false` are all things a CI environment produces by
 * accident, and every one of them means test.
 */
export function currentAdProfile(): AdProfile {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') return 'test';
  const value = process.env.EXPO_PUBLIC_ADMOB_PRODUCTION;
  return value === '1' || value === 'true' ? 'production' : 'test';
}

/** The environment variable that declares a production build. */
export const ADMOB_PRODUCTION_FLAG = 'EXPO_PUBLIC_ADMOB_PRODUCTION';

export const MONETIZATION_PROBLEM_CODES = [
  'app-id-missing',
  'app-id-malformed',
  'app-id-is-google-sample',
  'production-unit-missing',
  'production-unit-malformed',
  'production-unit-is-google-demo',
] as const;

export type MonetizationProblemCode = (typeof MONETIZATION_PROBLEM_CODES)[number];

export interface MonetizationProblem {
  readonly code: MonetizationProblemCode;
  /** Written to be read on a failed build, so it says what to do next. */
  readonly message: string;
}

export interface MonetizationInputs {
  readonly profile: AdProfile;
  /**
   * The App ID configured for the native build, from `app.json`'s
   * `react-native-google-mobile-ads` plugin options. `null` when absent.
   *
   * It is an input rather than a constant in this file because the runtime
   * never needs it: the Google Mobile Ads SDK reads the App ID from the
   * Android manifest, so putting it in the bundle as well would be a second
   * copy that could disagree with the first.
   */
  readonly appId: string | null;
  readonly productionInterstitialUnitId: string | null;
}

/**
 * Every reason this configuration cannot be built, in the order a person
 * would fix them. Empty means shippable.
 *
 * Returns problems rather than throwing so that a build script can print all
 * of them at once and a test can assert on them. `resolveMonetizationConfig`
 * is the throwing wrapper.
 *
 * The App ID is required in **both** profiles. That is the whole point of the
 * 2026-09-09 correction: a development build that initializes UMP against
 * somebody else's App ID is not a development build that tested consent.
 */
export function validateMonetizationConfig(
  inputs: MonetizationInputs,
): readonly MonetizationProblem[] {
  const problems: MonetizationProblem[] = [];

  if (inputs.appId === null || inputs.appId === '') {
    problems.push({
      code: 'app-id-missing',
      message:
        'No AdMob App ID is configured. Create the AdMob app, then set it as ' +
        'androidAppId in the react-native-google-mobile-ads plugin options in ' +
        'app.json. Google\'s sample App ID is not a substitute: UMP would look ' +
        'up a Google-owned app and never find this app\'s consent message.',
    });
  } else if (inputs.appId === GOOGLE_SAMPLE_APP_ID) {
    problems.push({
      code: 'app-id-is-google-sample',
      message:
        `The configured App ID is Google's published sample (${GOOGLE_SAMPLE_APP_ID}). ` +
        'UMP resolves the Privacy & Messaging configuration from this value, so ' +
        'the consent form shown would belong to a Google demo app, not this one. ' +
        'Use the real Worst Gig Ever App ID.',
    });
  } else if (!isValidAdMobAppId(inputs.appId)) {
    problems.push({
      code: 'app-id-malformed',
      message:
        `"${inputs.appId}" is not a valid AdMob App ID. The expected shape is ` +
        'ca-app-pub-<16 digits>~<10 digits>. Note the separator: an App ID uses ' +
        '"~" and an ad unit id uses "/", and pasting one into the other is the ' +
        'usual cause of this.',
    });
  }

  if (inputs.profile === 'production') {
    const unit = inputs.productionInterstitialUnitId;

    if (unit === null || unit === '') {
      problems.push({
        code: 'production-unit-missing',
        message:
          'A production build needs the real interstitial ad unit id. Create ' +
          'the interstitial unit in AdMob and set PRODUCTION_INTERSTITIAL_UNIT_ID ' +
          'in game/config/monetization.ts.',
      });
    } else if (isGoogleDemoId(unit)) {
      problems.push({
        code: 'production-unit-is-google-demo',
        message:
          `"${unit}" is one of Google's demo ad units. Demo units always return ` +
          'the "Test Ad" card, so a production build configured with one earns ' +
          'nothing and shows every player a test placeholder.',
      });
    } else if (!isValidAdUnitId(unit)) {
      problems.push({
        code: 'production-unit-malformed',
        message:
          `"${unit}" is not a valid AdMob ad unit id. The expected shape is ` +
          'ca-app-pub-<16 digits>/<10 digits>.',
      });
    }
  }

  return problems;
}

export interface MonetizationConfig {
  readonly profile: AdProfile;
  readonly interstitialUnitId: string;
}

/**
 * The ad unit this build must request, or a thrown error naming every reason
 * it cannot.
 *
 * A `test` profile always resolves to Google's demo interstitial. It never
 * consults `productionInterstitialUnitId`, so a half-filled production id
 * cannot leak into a development build.
 */
export function resolveMonetizationConfig(inputs: MonetizationInputs): MonetizationConfig {
  const problems = validateMonetizationConfig(inputs);
  if (problems.length > 0) {
    throw new Error(
      `Monetization configuration is not shippable:\n${problems
        .map(problem => `  - [${problem.code}] ${problem.message}`)
        .join('\n')}`,
    );
  }

  return {
    profile: inputs.profile,
    interstitialUnitId:
      inputs.profile === 'production'
        ? (inputs.productionInterstitialUnitId as string)
        : GOOGLE_DEMO_INTERSTITIAL_ANDROID,
  };
}

/**
 * The ad unit for the running bundle.
 *
 * Deliberately does not validate the App ID: the runtime has no access to the
 * manifest value and inventing a second copy of it in the bundle would create
 * two sources of truth that can disagree. The App ID is enforced at the build
 * boundary by `scripts/check-monetization-config.mjs`, which reads `app.json`.
 */
export function currentInterstitialUnitId(): string {
  const profile = currentAdProfile();
  if (profile === 'test') return GOOGLE_DEMO_INTERSTITIAL_ANDROID;

  const unit = PRODUCTION_INTERSTITIAL_UNIT_ID;
  if (unit === null || isGoogleDemoId(unit) || !isValidAdUnitId(unit)) {
    throw new Error(
      `${ADMOB_PRODUCTION_FLAG} declares a production build, but no valid ` +
        'production interstitial unit is configured in ' +
        'game/config/monetization.ts (PRODUCTION_INTERSTITIAL_UNIT_ID).',
    );
  }
  return unit;
}

# M23 — Monetization and Store Readiness

**Status:** active, specification locked for local implementation.

## Outcome

Prepare Worst Gig Ever for an Android Google Play internal test with:

- AdMob interstitials at two predictable full-stage boundaries;
- a one-time, non-consumable `remove_ads` purchase;
- consent and privacy-choice handling before ad requests;
- an API 36 release AAB and store-policy checklist;
- no change to gameplay, scoring, music, progression, or the fictional gig
  payout.

Live ads and real purchases remain disabled until the external AdMob and Play
Console records exist. Local builds use Google's published test identifiers.

## Product decisions

### Ads

Only interstitials are in scope. There are no banners, rewarded ads, app-open
ads, native ads, cross-promotion, or analytics.

An ad break is eligible only after a successful Stage 2 or Stage 4 completion.
This caps a four-stage show at two interstitial opportunities and never puts an
ad after every action. Stage 1, Stage 3, failed attempts, boot, story, briefing,
pause, setlist browsing, purchasing, and quitting never trigger an ad.

The ad is preloaded and may appear only at the already-finished round boundary.
If it is not ready at that moment, the opportunity is skipped; it must not
arrive late over a result the player has started reading. Closing or failing an
ad never blocks progress. Music is already stopped at this boundary.

### Remove Ads

`remove_ads` is a one-time, non-consumable store product. Its localized price
comes from Google Play / App Store product metadata and is never hard-coded.
Purchase, pending, cancellation, unavailable, already-owned, restoration, and
acknowledgement are explicit states.

Store ownership is authoritative. The app queries existing purchases on launch
and when the player requests Restore. A successful purchased (not pending)
transaction is finished as non-consumable before the entitlement is confirmed.
The confirmed entitlement may be cached locally so an offline returning player
does not see ads while the store reconnects. Because this is a low-value
ad-removal entitlement and the project has no backend, client-side validation
is an accepted M23 limitation and must be stated in the release report.

Once confirmed, the entitlement is monotonic: this build never turns ads back
on. Refund/revocation reconciliation needs a secure backend or Play Developer
API and is deferred rather than pretended.

### Player surface

The title screen gets one localized `REMOVE ADS` entry. It opens a small,
scroll-safe support screen containing:

- the product description and store-supplied price;
- Buy and Restore actions;
- a privacy-choices action when the consent SDK says it is required;
- clear success, pending, cancellation, unavailable, and retryable-error copy;
- Back.

The surface does not imply that purchasing changes gameplay or buys currency.

## Consent and privacy

The User Messaging Platform consent information is refreshed at every cold
start before Mobile Ads initialization. If consent cannot be established, ad
requests fail closed for that session. Where required, the app exposes the
privacy-options form so consent can be revisited.

The illustration, gameplay, save file, and purchase entitlement carry no
advertising identifiers. The Google Mobile Ads SDK itself may collect/share IP
address, product interactions, diagnostics, and device/account identifiers;
the privacy policy and Play Data safety form must describe the exact SDK build
that ships.

## Build configuration

- Android package remains `com.worstgigever.app`.
- Product id is `remove_ads`.
- Development and friend builds use Google test app/ad-unit identifiers.
- A production build is blocked unless real AdMob app and interstitial unit IDs
  are injected and the test identifiers are absent.
- New Google Play submissions on or after 2026-08-31 target Android API 36.
- The store artifact is an AAB; the standalone APK remains a device-test aid.
- `RECORD_AUDIO` remains blocked.
- Release audition controls remain absent.

## Store declarations and assets

Before the first non-internal listing:

1. Create the Google Play app for `com.worstgigever.app`.
2. Create and activate the `remove_ads` one-time product.
3. Create the AdMob app and one interstitial ad unit.
4. Publish a privacy policy and provide its public URL and support contact.
5. Declare Contains ads = Yes.
6. Complete Data safety from the final SDK behavior, including Google Mobile
   Ads automatic collection/sharing.
7. Complete content rating, target audience, app access, and ads declarations.
8. Supply localized store listing copy and required phone/tablet graphics.
9. Upload an API 36 production AAB to internal testing.
10. Configure license testers and AdMob test devices; never click live ads.

## Verification contract

Pure tests own eligibility and entitlement transitions. Adapter contract tests
must prove:

- at most Stage 2 and Stage 4 success are eligible;
- failure, first/third stages, ads-removed state, and an unready ad skip;
- an ad can never block the result transition;
- pending purchases do not grant entitlement;
- purchased/restored non-consumables are finished and grant exactly once;
- every locale supplies all monetization copy;
- the product price is store metadata, not a catalogue literal;
- web remains playable with monetization adapters disabled;
- production configuration rejects Google test IDs;
- the built APK/AAB has the expected package, API level, billing/ad
  dependencies, permissions, and no audition UI.

Run `npm run verify`, `git diff --check`, web export, release APK, and release
AAB. Real purchase and live-ad delivery require Play internal testing and are
therefore an external gate.

## External records

### Recorded

| | Value |
|---|---|
| Privacy policy URL | https://alessandrolorenz.github.io/worst-gig-ever/ |
| Public support contact | worstgigevergame@gmail.com |

The policy is served by GitHub Pages from `site/` in this repository, deployed
by `.github/workflows/pages.yml`. Only that directory is published; the specs,
prompts and marketing pack stay in the repository without becoming pages.

**The policy describes the build that ships with ads and `remove_ads`, which
does not exist yet.** The URL is sufficient for the AdMob consent message,
which only requires a reachable page. It is *not* yet safe for the Play
listing: what the page claims must be what the uploaded artifact does. Section
4 of the policy promises a privacy-options control inside a Remove Ads screen,
so that screen is a release blocker for the listing, not a nice-to-have.

### Still blocking

- The Expo project linked by id still needs its server-side slug renamed to
  `worst-gig-ever`; do not create a replacement project.
- Google Play app, product, license testers, and signing track are not yet
  recorded in this repository.
- AdMob app id and interstitial unit id are not yet recorded.

These block store submission and live monetization, not the local test-mode
implementation.

## Sources checked 2026-09-08

- Google AdMob interstitial guidance:
  https://developers.google.com/admob/android/interstitial
- Google AdMob prohibited/recommended placements:
  https://support.google.com/admob/answer/6201362 and
  https://support.google.com/admob/answer/6201350
- Google Mobile Ads Play Data disclosure:
  https://developers.google.com/admob/android/privacy/play-data-disclosure
- Google Play Billing integration and one-time purchase lifecycle:
  https://developer.android.com/google/play/billing/integrate and
  https://developer.android.com/google/play/billing/lifecycle/one-time
- Google Play Data safety:
  https://support.google.com/googleplay/android-developer/answer/10787469
- Google Play target API requirements:
  https://support.google.com/googleplay/android-developer/answer/11926878
- Expo in-app purchase guide:
  https://docs.expo.dev/guides/in-app-purchases/

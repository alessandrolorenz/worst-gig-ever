# M23 — Monetization and Store Readiness

**Status:** active, specification locked for local implementation.

## Outcome

Prepare Worst Gig Ever for an Android Google Play internal test with:

- an AdMob interstitial at one predictable full-stage boundary;
- a one-time, non-consumable `remove_ads` purchase;
- consent and privacy-choice handling before ad requests;
- an API 36 release AAB and store-policy checklist;
- no change to gameplay, scoring, music, progression, or the fictional gig
  payout.

Live ads and real purchases remain disabled until the external AdMob and Play
Console records exist. Local builds use Google's published demo **ad units**
and the real **App ID** — the two are not interchangeable, and the reason is
the 2026-09-09 correction under "Amendments".

## Product decisions

### Ads

Only interstitials are in scope. There are no banners, rewarded ads, app-open
ads, native ads, cross-promotion, or analytics.

An ad break is eligible only after a successful **Stage 2** completion. This
caps a four-stage show at one interstitial opportunity and never puts an ad
after every action. Stage 1, Stage 3, **Stage 4**, failed attempts, boot,
story, briefing, pause, setlist browsing, purchasing, and quitting never
trigger an ad.

Stage 4 was an eligible boundary in this document's original 2026-09-08 text
and is not one any more. See "Amendments".

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
- The AdMob **App ID** is the real Worst Gig Ever App ID in every build that
  initializes AdMob or UMP, development and friend builds included. It is
  never Google's sample App ID. See the 2026-09-09 correction under
  "Amendments".
- Development, friend and test builds use Google's official demo **ad unit**
  identifiers.
- A production build is blocked unless the real interstitial unit ID is
  configured and no Google demo identifier is present.
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

- Stage 2 success is the only eligible boundary, and Stage 4 success is
  provably never one;
- failure, first/third/fourth stages, ads-removed state, and an unready ad
  skip;
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

## Amendments

### 2026-09-09 — the App ID is never a test identifier

**Correction.** This document's Build configuration section previously read
"Development and friend builds use Google test app/ad-unit identifiers." That
is wrong for the consent architecture this milestone specifies, and it is wrong
in a way that would have passed a casual test pass.

**Accepted rule:**

| Identifier | Development / friend / test | Production |
|---|---|---|
| AdMob **App ID** (`~`) | the real Worst Gig Ever App ID | the real Worst Gig Ever App ID |
| **Ad unit ID** (`/`) | Google's official demo units | the real Worst Gig Ever units |

A production build must fail if a Google demo ad unit ID is configured.

**Why.** UMP resolves its Privacy & Messaging configuration from the AdMob
Application ID embedded in the app. Google's sample App ID belongs to a
Google-owned demo app, so a build carrying it asks Google for *that* app's
consent configuration. The consent flow would appear to work — a form appears,
choices are recorded — while testing a message this project did not write and
cannot change. The failure is silent, which is what makes it worth a rule.

The ad unit is the opposite case: it alone decides whether a real ad is served.
Google's demo units always return the "Test Ad" card, so a test build using one
cannot produce an impression, invalid traffic or revenue however it is
interacted with.

**No substitution.** There is deliberately no fallback that supplies the sample
App ID when the real one is missing. A build with no App ID fails and says so.
A fallback here would produce a build that looks configured and silently
exercises somebody else's consent message, which is the exact failure the rule
exists to prevent.

**Enforced by.** `game/config/monetization.ts` holds the rules;
`tests/monetizationConfig.test.ts` states them with fixture identifiers, so the
pure layer needs no real App ID; `scripts/check-monetization-config.mjs` is the
build boundary that reads `app.json`. The script's default mode enforces the
invariant that any configured App ID is real and well-formed, and
`--require-app-id` additionally demands its presence — the mode a native build
adopts once the AdMob/UMP adapters exist.

**Still open.** The real AdMob App ID and interstitial unit ID remain external
blockers. `PRODUCTION_INTERSTITIAL_UNIT_ID` is `null` rather than a
placeholder, because a placeholder that works is a placeholder that ships.

### 2026-09-09 — Stage 4 is no longer an ad break

**Decision.** The owner removed the Stage 4 interstitial opportunity. Stage 2
completion is the only eligible boundary for the initial monetization release.

**Why.** When this document was written on 2026-09-08, Stage 4 was an ordinary
stage boundary. It is not one any more. Stage 4 completion now runs directly
into the strongest sequence the game has: SHOW COMPLETE, the gig payout, NEXT
GIG BOOKED, and — on a first clear — the custom setlist unlock. That sequence
is the ending, and it arrived after this spec was written, in the pre-release
narrative polish work.

An interstitial placed there does not interrupt a stage boundary. It interrupts
the payoff, and the payoff is the part a player describes to someone else.

**Accepted placement, in full:**

| Moment | Interstitial |
|---|---|
| Stage 2 completion | eligible |
| Stage 4 completion | never — straight to the final results and payoff |
| Stage 1 / Stage 3 completion | never |
| Any retry after a ruined show | never |
| During gameplay | never |
| Once results or payoff are on screen | never |

**Cost, accepted knowingly.** One opportunity per show instead of two, so
roughly half the interstitial inventory of the original design. Paid on purpose
for the ending.

**What is unchanged.** The `StageId`-based implementation stays — the eligible
boundary is named by which song was finished, not by an array position — as
does the boolean, non-blocking contract, so an ad still cannot delay or block
the transition to the result.

**Enforced by.** `tests/adBreak.test.ts`, "M23 amendment: Stage 4 never breaks
for an ad, so the ending lands", which asserts that no combination of runtime
conditions reopens the boundary.

## External records

### Recorded

| | Value |
|---|---|
| Privacy policy URL | https://alessandrolorenz.github.io/worst-gig-ever/ |
| Public support contact | worstgigevergame@gmail.com |
| AdMob App ID | `ca-app-pub-2216849192122306~8216388558` |
| Production interstitial unit | `ca-app-pub-2216849192122306/7968976548` |

The App ID lives in `app.json`'s `react-native-google-mobile-ads` plugin
options and reaches the Android manifest as
`com.google.android.gms.ads.APPLICATION_ID`; the Google Mobile Ads SDK reads it
from there, so it is deliberately not duplicated into the JavaScript bundle.
The interstitial unit lives in `game/config/monetization.ts` and is requested
only by a build that declares itself production.

Neither is a secret — both are compiled into the APK and readable by anyone who
unzips it, which is why they are committed rather than injected. The values
that must never be committed are the signing key and the store credentials.

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
- The AdMob consent message (European regulations) is not yet published for
  this App ID. Piece 5 cannot honestly exercise the consent flow until it is.

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

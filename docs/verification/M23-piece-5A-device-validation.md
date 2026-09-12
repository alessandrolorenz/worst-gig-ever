# M23 piece 5A — ads and UMP, validated on hardware

**Date:** 2026-09-11
**Device:** physical Android handset (`RQCWC03RC0T`), not an emulator
**Build:** release APK, New Architecture on, compileSdk 36,
`react-native-google-mobile-ads@15.8.3`
**Identifiers:** real AdMob App ID `ca-app-pub-2216849192122306~8216388558`,
Google demo interstitial unit (non-production profile)

## What passed

### The full cold-start chain

```
[ads] start                   {"sdkLoaded":true}
[ads] consent info            {"status":"NOT_REQUIRED","canRequestAds":true,
                               "privacyOptions":"NOT_REQUIRED","formAvailable":false}
[ads] mobile ads initialized
[ads] requesting interstitial {"unit":"ca-app-pub-3940256099942544/1033173712"}
[ads] interstitial loaded
```

`canRequestAds` is UMP's own answer and is what authorised the request —
nothing here inferred permission from a country code. The unit requested is
Google's demo interstitial, so no impression, revenue or invalid traffic was
possible at any point.

The UMP SDK also wrote `IABTCF_CmpSdkID: 300` and `IABTCF_gdprApplies: 0`,
which is Google's CMP answering for this App ID and correctly deciding that
GDPR does not apply in Brazil.

### The placement, confirmed by playing

The owner played a show. The interstitial appeared **after Stage 2 completion**
and nowhere else.

### Closing, and the reload timing

```
22:24:35.985  [ads] requesting interstitial   ← reload fired
22:24:36.105  AdActivity ... Destroyed        ← ad dismissed
22:24:37.576  [ads] interstitial loaded       ← next one ready
```

The reload request went out **120 ms before** the ad activity finished being
destroyed: the `CLOSED` handler fires as the ad tears down, so the next
opportunity is already loading long before it could be needed. That is the M23
rule that an ad is never *requested* at the boundary — an ad requested there is
an ad that arrives late, over a result the player has started reading.

Progression was not blocked: the result screen followed the dismissal normally.

## Two defects that only real hardware exposed

**The privacy-options enum is upper case.** `AdsConsentPrivacyOptionsRequirementStatus.REQUIRED`
is the string `'REQUIRED'`. The adapter compared against `'required'`, so
`privacyOptionsRequired` was permanently `false`. Nothing would have failed a
test or looked wrong in Brazil, where the value is `NOT_REQUIRED` either way —
it would have silently hidden the privacy-options entry from every European
player entitled to one. Fixed.

**`debugGeography` is ignored on an unregistered device.** Google applies it
only to devices it already considers test devices. Emulators qualify
automatically from UMP 2.2.0; a handset does not, and the symptom is that the
flag appears to do nothing at all. The device's hashed id is printed by the SDK
itself on first run and must be passed back via `testDeviceIdentifiers`.

## What is still not validated

**The European regulations message has not been observed.** With the EEA forced
*and* the handset registered as a test device — confirmed by the SDK no longer
printing its "Use new ConsentDebugSettings" hint — UMP still answers:

```
status: NOT_REQUIRED · privacyOptions: NOT_REQUIRED · formAvailable: false
```

The call itself is correct: `AdsConsent.requestInfoUpdate` passes
`debugGeography` and `testDeviceIdentifiers` straight to the native module,
verified by reading the library source rather than assuming.

So the message is not resolving for this App ID yet. Candidates, in order of
likelihood: propagation delay after publishing; the message's "Select apps"
not including Worst Gig Ever; or the message not actually being in the
Published state.

This is recorded as **not validated** rather than worked around. UMP behaviour
must not be faked while the message cannot be observed.

## Repository state at validation

- 630 automated tests pass; `npm run verify` clean.
- `com.android.vending.BILLING` is absent from the merged manifest. It left
  with `expo-iap` when billing was deferred (ADR 0014) and a guard plus a test
  keep it out until piece 5B.
- Both validation flags — `EXPO_PUBLIC_UMP_DEBUG_EEA` and
  `EXPO_PUBLIC_UMP_TEST_DEVICE` — default to off, accept only an allow-listed
  value, and are asserted absent from the `production` and `preview` EAS
  profiles. A test also refuses any 32-hex device hash committed to
  `app.json`, `eas.json` or `package.json`.

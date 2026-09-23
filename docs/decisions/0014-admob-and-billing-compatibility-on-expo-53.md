# ADR 0014 — AdMob and Play Billing compatibility on Expo 53

**Date:** 2026-09-10
**Status:** accepted for the ads half. The billing half was blocked and is now
resolved by **ADR 0015**, which adopts `react-native-purchases` — the
`expo-iap` findings below stand and were not revisited.
**Context:** M23. Expo SDK 53, React Native 0.79.6, New Architecture enabled,
Android Gradle plugin 8.8.2.

## What was investigated

The Android release build failed. The first visible error blamed
`react-native-google-mobile-ads`, so the question was whether that library is
compatible with this React Native generation, and whether a version exists that
is — **without** upgrading Expo, disabling the New Architecture, patching
`node_modules`, or weakening any codegen or Gradle check.

## What the errors actually were, in order

Three distinct failures were hiding behind each other. Each had to be fixed to
see the next.

### 1. Codegen — real, and specific to the 16.x line

```
:react-native-google-mobile-ads:generateCodegenSchemaFromJavaScript
UnsupportedGenericParserError: Unrecognized generic type 'undefined'
```

Not `Promise<void>`, which was the first guess and is wrong: RN 0.79's
`emitPromise` handles a void element type. The cause is `CodegenTypes.UnsafeObject`
— a **qualified** type reference. RN 0.79's codegen reads `typeAnnotation.typeName.name`,
which is `undefined` for a `TSQualifiedName`, and reports that `undefined` as
the unrecognised type name.

16.2.3 and 16.4.0 carry the same qualified form, so this is the 16.x line and
not a 16.5.0 regression. **15.8.3 uses no qualified type references and passes
codegen.**

### 2. compileSdk — not a workaround, an M23 requirement already written down

With codegen passing, `androidx.core:1.18.0` required compiling against API 36.
M23 already requires API 36 for submissions on or after 2026-08-31, and
`expo-build-properties` was already a dependency with no options configured.
Setting `compileSdkVersion`/`targetSdkVersion` to 36 is implementing a
documented requirement, not evading an error.

### 3. Android Gradle plugin — the blocker that is not about ads at all

```
androidx.core:core:1.18.0 requires Android Gradle plugin 8.9.1 or higher.
This build currently uses Android Gradle plugin 8.8.2.
```

`dependencyInsight` attributes `androidx.core:1.18.0` to
`io.github.hyochan.openiap:openiap-google:3.5.0` — the native dependency of
**`expo-iap`**, not of the ads library.

Proven by removing `expo-iap` and building: **BUILD SUCCESSFUL in 1m 49s**, a
201 MB release APK, with `react-native-google-mobile-ads@15.8.3`, New
Architecture on, compileSdk 36.

## Decision

**Pin `react-native-google-mobile-ads` to exactly `15.8.3`** for M23. Not a
caret range: the 16.x line is known-incompatible with this RN generation, and a
range would silently re-adopt it on the next lockfile refresh.

**Configure API 36** through `expo-build-properties`, which M23 required anyway.

The API surface M23 needs was verified present in 15.8.3 before accepting it:

| M23 requirement | 15.8.3 |
|---|---|
| Mobile Ads initialization | `MobileAds` |
| Interstitial ads | `InterstitialAd`, `AdEventType` |
| UMP consent | `AdsConsent.requestInfoUpdate`, `gatherConsent`, `loadAndShowConsentFormIfRequired`, `getConsentInfo`, `reset` |
| Privacy options form | `AdsConsent.showPrivacyOptionsForm`, `privacyOptionsRequirementStatus` |
| Fail-closed ad requests | `canRequestAds` |
| Test devices / forced geography | `AdsConsentDebugGeography` |

Native SDKs resolved: `play-services-ads:24.6.0`, `user-messaging-platform:3.2.0`.

## What is still blocked

**`expo-iap` cannot build on Expo 53.** Every 5.x release tested pulls
`androidx.core:1.18.0` transitively through `openiap-google`, and that requires
AGP 8.9.1 while Expo 53 ships 8.8.2:

| expo-iap | openiap-google | result |
|---|---|---|
| 5.5.1 | 3.5.0 | AGP 8.9.1 required |
| 5.4.1 | 3.4.0 | AGP 8.9.1 required |
| 5.2.4 | 3.2.3 | AGP 8.9.1 required |

Downgrading further was not pursued: the constraint comes from `openiap-google`
itself rather than from the version pinned in `openiap-versions.json`, so older
pins do not move it.

`expo-iap` reads `openiap-versions.json` from three locations, and a
project-root override would be a supported, non-`node_modules` way to change
the pin — but the bundled copy is checked **first** and always exists, so the
override never wins. It is recorded here so nobody spends the afternoon
rediscovering it.

## Options for the billing half, not chosen here

1. **Expo 54.** Ships an AGP that satisfies the constraint. Touches the whole
   project and was explicitly not the first response.
2. **A different billing library** compatible with Expo 53.
3. **Ship the ads half first.** The interstitial, consent and privacy-options
   work builds today. `remove_ads` is the only part blocked, and M23's
   entitlement logic is already pure, tested, and independent of any SDK —
   `game/state/entitlement.ts` does not import a store.

Option 3 is the cheapest way to keep moving and does not foreclose the others.

## What this decision does not change

Every M23 product decision stands: Stage 2 is the only interstitial
opportunity, Stage 4 is protected for the narrative payoff, the entitlement is
monotonic, pending is distinct from purchased, an unacknowledged purchase does
not grant, the real AdMob App ID is canonical in every build, development and
friend builds use Google's demo ad unit, production rejects demo units, and the
generated-manifest permission gate stays mandatory.

The AdMob consent message remains an **external blocker**. UMP behaviour must
not be faked or bypassed while no Privacy & Messaging message exists for this
App ID.

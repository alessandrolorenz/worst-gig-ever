# ADR 0015 — RevenueCat as the Play Billing adapter on Expo 53

**Date:** 2026-09-11
**Status:** accepted for build compatibility and the adapter boundary;
**not yet validated on hardware** — no purchase has been made on a device.
**Context:** M23 piece 5B. Expo SDK 53, React Native 0.79.6, New Architecture
enabled, Android Gradle plugin 8.8.2, compileSdk/targetSdk 36.
**Supersedes:** the "what is still blocked" section of ADR 0014.

## What changed

The product decision changed: Remove Ads is back in the initial release scope.
ADR 0014 deferred it because `expo-iap` cannot build on Expo 53. That finding
stands and is not revisited here. The question this ADR answers is narrower:

> Is there a billing library that builds on **this** toolchain, without
> upgrading Expo, patching `node_modules`, disabling the New Architecture, or
> weakening a Gradle check?

Yes. `react-native-purchases` (RevenueCat core SDK), pinned to **10.9.1**.

## Why it builds where `expo-iap` does not

ADR 0014 established the exact blocker, and it is worth restating precisely
because it is the thing that had to be checked rather than hoped for:

> `androidx.core:1.18.0` requires Android Gradle plugin 8.9.1 or higher.
> This build currently uses Android Gradle plugin 8.8.2.

`expo-iap` pulled `androidx.core:1.18.0` transitively through
`io.github.hyochan.openiap:openiap-google`. Expo 53 ships AGP 8.8.2. That is
the whole of the incompatibility.

RevenueCat's native chain does not go near it. Resolved from the real build:

| | highest `androidx.core` requested |
|---|---|
| `openiap-google:3.5.0` (`expo-iap`) | **1.18.0** → requires AGP 8.9.1 |
| `purchases-hybrid-common:18.37.0` (RevenueCat) | **1.8.0** |

The project already resolves `androidx.core:core` to **1.13.1**, set by the
Expo/AdMob side of the graph. RevenueCat's highest ask is five minor versions
below that, so it does not move the floor at all — it is not merely compatible,
it is invisible to the constraint.

Confirmed independently in the AAR metadata, which is where a hard AGP floor is
actually declared:

```properties
# com.revenuecat.purchases:purchases:10.20.0
minAndroidGradlePluginVersion=1.0.0
minCompileSdk=1
```

There is no floor to violate.

**Second reason, less obvious and worth recording:** `react-native-purchases`
declares **no `codegenConfig`**. It ships a classic bridge module
(`RNPurchasesModule`), which the New Architecture runs through its interop
layer. So the codegen failure class that made `react-native-google-mobile-ads`
16.x unusable — `UnsupportedGenericParserError` on a qualified type reference,
ADR 0014 §1 — cannot occur here. There is no codegen step to fail.

## Evidence

Clean `expo prebuild --clean`, then a release build, on the unchanged
toolchain:

```
> Task :react-native-purchases:assembleRelease
BUILD SUCCESSFUL in 1m 36s
745 actionable tasks: 716 executed, 29 up-to-date
```

* AGP **8.8.2** — unchanged, and verified via `buildEnvironment`.
* `newArchEnabled=true` — unchanged.
* compileSdk / targetSdk **36** — unchanged.
* Real AdMob App ID still in the merged manifest with `tools:replace`.
* `PASS_ANDROID_PERMISSIONS`, `PASS_MONETIZATION_CONFIG`.
* Release APK 203 MB (was 201 MB before billing; **+2 MB**).

Linked, not merely compiled — from the shipped APK's dex:

```
com/revenuecat/purchases/react/RNPurchasesModule
com/revenuecat/purchases/react/RNPurchasesPackage
com/android/billingclient/api/BillingClient
```

Native versions resolved: `purchases-hybrid-common:18.37.0` →
`purchases:10.20.0` → **`com.android.billingclient:billing:8.3.0`**. Play's
own `billing.properties` in the APK reads `version=8.3.0`, comfortably above
the Billing Library 7+ minimum Play now enforces for new submissions.

## Decision

**Pin `react-native-purchases` to exactly `10.9.1`.** Not a caret, for the same
reason ADR 0014 pinned the ads library: the compatibility proven here is a
property of a resolved native graph, and a range re-resolves that graph on the
next lockfile refresh without anyone reading a build log.

## Product model

| | |
|---|---|
| Google Play product id | `remove_ads` |
| Play product type | **one-time, non-consumable** |
| RevenueCat entitlement id | `remove_ads` |

The entitlement id is deliberately the same string as the product id. The only
interesting way to misconfigure the RevenueCat dashboard is to attach the
product to an entitlement nothing queries, which produces a purchase that
succeeds and grants nothing — a player who paid and still sees ads. Identical
names make that misconfiguration visible.

**The purchase is never consumed.** Consuming it would let Play sell it again
and charge a player twice for something they already own. This repository
exposes no consume call, and RevenueCat acknowledges rather than consumes
unless a product is explicitly marked consumable in its dashboard. That
dashboard setting is the one remaining place the mistake can be made, which is
why it appears in the Play Console checklist below and not only in a comment.

## Adapter boundary

`game/state/entitlement.ts` is unchanged and remains the authority. It is pure,
store-agnostic, and still owns every rule about what grants ownership —
monotonicity, pending ≠ owned, unacknowledged ≠ granted.

Two new files sit between it and the SDK, matching the split already used for
ads (`game/state/adBreak.ts` decides, `game/ads/adService.ts` talks):

* **`game/config/billing.ts`** — pure. Identifiers, and the mapping from
  RevenueCat's vocabulary to the six `PurchaseOutcome` values `entitlement.ts`
  already understands. No SDK import, fully tested in Node.
* **`game/billing/billingService.ts`** — the only file importing
  `react-native-purchases`. Lazy `require` so the web bundle never resolves it;
  every method resolves rather than throws.

Gameplay continues to read the pure entitlement state. Nothing in the game
knows RevenueCat exists.

### Two findings from the mapping worth keeping

**RevenueCat's error codes are strings.** `PAYMENT_PENDING_ERROR` is `'20'`,
not `20`. A `===` against a number silently never matches, which would map
every pending purchase to a generic error and tell a player whose payment is
still clearing that it failed. Compared as strings, and asserted as strings in
`tests/billingMapping.test.ts`.

**`finished` is true whenever the entitlement is active.** With `expo-iap` the
app acknowledged transactions itself, so `finished` was a fact the adapter
tracked. RevenueCat's backend validates the purchase token with Play and
acknowledges it before the entitlement becomes active in `CustomerInfo` — so an
active entitlement *is* the acknowledgement signal. The check in
`entitlement.ts` is not thereby pointless: it remains the rule, and this is one
adapter's evidence for it.

## Anonymous App User IDs, reinstall, and restore

Worst Gig Ever has no accounts and is not adding any. RevenueCat is used
anonymously: on first launch the SDK mints a local `$RCAnonymousID:…` and that
is the identity the purchase attaches to.

What that means, stated honestly:

* **Google Play, not RevenueCat, is the durable record.** The purchase belongs
  to the buyer's Play account. That is what makes recovery possible at all
  without a login.
* **A reinstall or a data wipe mints a *new* anonymous ID.** The old one is
  gone, and the new one has no purchases attached to it.
* **`Restore Purchases` is therefore not optional.** It queries Play for what
  the signed-in account owns and associates it with the current App User ID.
  It is the supported and only reliable recovery path for an account-less app.
* **Consequently, a silent launch-time `getCustomerInfo()` on a fresh install
  may legitimately report "not owned" until the player taps Restore.** The
  cached `adsRemoved` in the save file covers the common case — same install,
  offline launch — but a wiped device is expected to need one tap.

Restore is never invoked automatically. `initialize()` and
`getEntitlementStatus()` use `getCustomerInfo()`, a silent read; only the
player's tap calls `restorePurchases()`. The reason is that restore is the
operation that can raise an OS-level account interaction — on iOS StoreKit it
can prompt for an Apple Account password — and M23 forbids triggering that
unasked.

**This section is reasoning from the SDK's documented model, not from
observation.** The destructive reinstall test in the hardware checklist exists
precisely to confirm it, and has not been run.

## What this does not change

Every M23 product decision stands. Stage 2 remains the only interstitial
opportunity and Stage 4 remains protected; the entitlement is monotonic;
pending is distinct from purchased; the real AdMob App ID is canonical in every
build; production rejects demo ad units; the merged-manifest permission gate
stays mandatory.

UMP is untouched. Billing does not replace consent, and the Privacy Options
entry point must keep working for a player who bought Remove Ads wherever it is
legally required — purchasing removes ads, not the right to change a privacy
choice.

`com.android.vending.BILLING` returns to the manifest, contributed by
`com.android.billingclient:billing:8.3.0`. ADR 0014 removed it because it had
outlived the dependency that justified it; it is justified again.
`scripts/check-android-permissions.mjs` now requires it, and a new test reads
the manifest-merger report to assert it comes from the Billing Library rather
than from a leftover entry — so removing billing and leaving the permission
behind fails a build rather than a Play review.

## Still open

1. **No hardware validation.** Nothing below has been executed:
   product loads with a Play-formatted price · purchase succeeds · ads
   disappear · survives restart · pending · cancellation · already-owned ·
   Restore · **the destructive reinstall-and-restore case**.
2. **No RevenueCat project exists.** There is no API key.
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` is unset, and the adapter reports
   `unavailable` without it — which is a correct, playable state with copy
   already written, not a crash.
3. **No Play Console product.** `remove_ads` must be created and activated.
4. **`purchases-store-amazon:10.20.0` is pulled in transitively.** Amazon
   Appstore support this product will never use. Harmless, and part of the
   +2 MB. Excluding it is a possible later tidy, not a blocker.
5. Client-side validation remains an accepted M23 limitation, unchanged by this
   ADR and still owed a mention in the release report.

### Play Console / RevenueCat checklist before any device test

1. Create the RevenueCat project and Android app; set
   `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` to the **public** `goog_…` key.
2. Create `remove_ads` in the Play Console as a **one-time product**, and
   activate it.
3. In RevenueCat, add product `remove_ads` and attach it to entitlement
   `remove_ads`. **Do not mark it consumable.**
4. Upload a build to an internal test track and add licence testers — a
   one-time product cannot be purchased from a locally-signed APK.

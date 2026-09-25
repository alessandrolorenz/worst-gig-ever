# M23 — the European consent message, observed at last

**Date:** 2026-09-25
**Device:** physical Android handset `RQCWC03RC0T`, the same one 5A used
**Build:** release APK, real AdMob App ID, Google demo interstitial unit,
`EXPO_PUBLIC_UMP_DEBUG_EEA=1` and `EXPO_PUBLIC_UMP_TEST_DEVICE` set
**Outcome:** the message resolves, the form displays, and the privacy-options
control inside the Remove Ads screen works.

This closes the one item the 5A report recorded as **not validated**, and with
it the last non-Play blocker in M23.

## What was wrong, and it was not the code

The 5A report on 2026-09-11 listed three candidates for why UMP kept answering
`NOT_REQUIRED` with the EEA forced: the message not published, the message not
targeting this app, or propagation delay.

None of them. The message was published and targeted correctly the whole time.

**`debugGeography` was being silently ignored, because the handset was not
registered as a UMP test device.** 5A had already identified this as the
mechanism and the flag existed for it; what had not happened was the two-build
sequence it requires. The first line of the log says it plainly once you know
to read it:

```
[ads] start  {"sdkLoaded":true,"forcedEea":true,"testDevice":false}
```

`forcedEea: true` and `testDevice: false` — the app asked for the override and
Google declined to apply it. Everything downstream was then correct behaviour,
which is exactly why it looked like nothing was happening.

## The sequence that worked

**Build one** carries `EXPO_PUBLIC_UMP_DEBUG_EEA=1` alone. The UMP SDK prints
its own hint naming the device's hashed id:

```
UserMessagingPlatform: Use new ConsentDebugSettings.Builder()
  .addTestDeviceHashedId("…") to set this as a debug device.
```

**Build two** passes that id back through `EXPO_PUBLIC_UMP_TEST_DEVICE`. The
hash is deliberately **not recorded here**: it identifies one person's handset
and belongs to whoever is validating, not to this repository — the same rule
`tests/adDebugFlags.test.ts` enforces against the config files.

Two signals confirm the registration took, and both are worth knowing because
neither is an error message:

- `testDevice: true` in the `[ads] start` line;
- the SDK **stops printing** its `addTestDeviceHashedId` hint.

## What was observed

```
[ads] start          {"sdkLoaded":true,"forcedEea":true,"testDevice":true}
UserMessagingPlatform: Wall html loaded.
[ads] consent info   {"status":"OBTAINED","canRequestAds":true,
                      "privacyOptions":"REQUIRED","formAvailable":true}
[ads] mobile ads initialized
[ads] requesting interstitial {"unit":"ca-app-pub-3940256099942544/1033173712"}
[ads] interstitial loaded
```

The consent form appeared at cold start and was answered on the device, which
is what `OBTAINED` records. `formAvailable: true` and
`privacyOptions: REQUIRED` are the two values that had never been anything but
`false` and `NOT_REQUIRED` before today.

The unit requested is still Google's demo interstitial, so no impression,
revenue or invalid traffic was possible at any point.

## The privacy-options control, rendered for the first time

`privacyOptions: REQUIRED` is what draws the **Privacy choices** button on the
Remove Ads screen. Until this run that value had never been true on any device,
so the control had never been rendered anywhere — piece 6 shipped it asserted
by tests and unseen.

Tapping it opened Google's privacy options form, carrying the app's own icon
and name:

> **Worst Gig Ever asks for your consent to use your personal data for the
> following purposes:** … *Manage options* · *Consent*

This matters beyond the feature. **Section 4 of the published privacy policy
promises that control lives inside the Remove Ads screen**, and M23 names that
promise a release blocker for the Play listing rather than a nicety: what the
page claims must be what the uploaded artifact does. As of this run it does.

## What this does not establish

The consent flow is validated; **monetization is not**. No purchase has been
made, there is still no RevenueCat project, key or Play product, and the
interstitial shown is a demo unit that cannot produce revenue. Those remain the
external gate, and ADR 0015 §"Still open" is unchanged.

The `EXPO_PUBLIC_UMP_DEBUG_EEA` and `EXPO_PUBLIC_UMP_TEST_DEVICE` flags default
to off, accept only allow-listed values, and are asserted absent from the
`production` and `preview` EAS profiles. Nothing about this validation reaches
a shipping build.

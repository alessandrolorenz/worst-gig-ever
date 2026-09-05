# ADR 0004 — App identity and landscape orientation

- Status: Accepted
- Date: 2026-08-30
- Milestone: M0–M2 fast track

## Context

The template's `app.json` declared `"orientation": "portrait"`, while M0, M1, and M3 all require landscape gameplay with a 1920×1080 reference canvas. It also carried the template author's identity: name and slug `react-native-game-engine-expo-typescript-template`, and both `ios.bundleIdentifier` and `android.package` set to `com.nightness.reactnativegameengineexpotypescripttemplate`.

## Decision

Set `orientation: "landscape"`, `name: "Worst Band Ever"`, `slug: "worst-band-ever"`, and `package.json` `name: "worst-band-ever"`.

Replace the identifiers with `com.worstbandever.app` on both platforms. Shipping under another author's reverse-domain namespace is wrong, and EAS submission would target the wrong application record.

## Consequences

- **`com.worstbandever.app` is a provisional placeholder.** The working title itself is provisional (`START-HERE.md`), and an application identifier cannot be changed after a store release. Confirm the final publisher domain before the first EAS submission, not before the playtest.
- Changing the Android package invalidates any previously installed development build of the old identifier; reinstall rather than upgrade.
- Landscape is now enforced at the OS level, so M4 graybox layout should be authored against the 16:9 reference canvas with safe-area-aware scaling.
- The app icons, splash image, and `README.md` still describe the template's Balloon Pop example. They are intentionally left alone: the baseline app must stay runnable and honestly described until M4 replaces the game.

---

> **Superseded by M18.5 (2026-09-04).** The identifiers this document reasons
> about were migrated before internationalization: the Expo slug is now
> `worst-gig-ever` and the application id is `com.worstgigever.app` on both
> platforms. The reasoning below is preserved as the record of why they were
> retained at the time, and is no longer the current state.
>
> Authoritative record: `docs/release/product-identity.md`.
> Migration: `docs/specs/M18.5-final-release-identity-report.md`.

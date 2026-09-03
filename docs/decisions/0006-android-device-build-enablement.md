# ADR 0006 — Changes required to run the M4 slice on Android

- Status: Accepted
- Date: 2026-08-30
- Milestone: M5 physical-playtest preparation
- Branch: `m5/physical-playtest`, from M4 commit `733fb15`

## Context

M5 preparation is explicitly not a gameplay milestone: no tuning, art, or scope change before the first observed playtest. But the M4 slice had never been compiled for Android — every check up to this point (type-check, lint, `node --test`, `expo export`) runs entirely in JavaScript and cannot see the native build graph.

The first native build surfaced a defect that had been latent since the template was cloned.

## The defect

The app installed and launched, then died on the JS side with:

```
Cannot find native module 'ExpoAsset'
No native ExponentConstants module found
"main" has not been registered
```

`expo-asset`, `expo-constants`, `expo-file-system`, `expo-font`, and `expo-keep-awake` are dependencies of `expo` itself. npm had installed them **nested** under `node_modules/expo/node_modules/` rather than hoisted to the top level, and the lockfile pinned that layout. Expo's Android autolinking searches `./node_modules` and therefore never found them: `expo-modules-autolinking resolve -p android` reported 10 modules where 15 were required.

This is invisible to every JavaScript-level check, because Metro resolves nested `node_modules` perfectly well. Only a native build fails.

## Decisions

1. **Declare the five modules as direct dependencies** at the versions `expo` already resolves (`npx expo install expo-asset expo-constants expo-file-system expo-font expo-keep-awake`). Direct dependencies are always installed at the top level, which makes them visible to autolinking. They are not new packages — they were already in the tree; only their position changed.

   Rejected: `expo.autolinking.searchPaths` in `package.json`, the documented escape hatch for nested layouts. It resolves all 15 modules, but it **breaks the Gradle build** — `node_modules/expo/android/build.gradle` can then no longer resolve `expo.modules.plugin.gradle.ExpoModuleExtension`. Verified by isolating the change: removing the field restored the build. Do not reintroduce it on SDK 53.

   Rejected: deleting the lockfile and reinstalling. Tried first; npm reproduced the same nested layout, so it fixes nothing and risks version drift.

2. **Ignore generated native directories.** `android/` and `ios/` are produced by `expo prebuild` from `app.json` on demand (continuous native generation) and must not be tracked. Added to `.gitignore`, and to eslint's `ignorePatterns` — without the latter, `npm run lint` fails with ~2000 errors from bundled JS inside `android/app/build/`.

3. **Local prebuild + Gradle is the build path for playtesting**, rather than the `development` profile in `eas.json`. The eas.json profile is correct and unchanged, but `eas build` requires linking a remote EAS project (there is no `extra.eas.projectId`), which registers a project on Expo's servers. That is not a decision to make on the way to a playtest. `npx expo run:android` — or prebuild plus `./gradlew :app:assembleDebug` — produces an equivalent development client entirely locally, because `expo-dev-client` is already a dependency.

## Explicitly not changed

No gameplay value was touched: scoring, spawn cadence, hitboxes, approach speed, vocalist behavior, Show Integrity, round duration, and audio levels are exactly as committed in `733fb15`. Nothing under `game/` was modified on this branch.

## Operational note, not a code change

Metro failed to resolve a file that demonstrably existed on disk (`whatwg-url-without-unicode/webidl2js-wrapper.js`) after `node_modules` was replaced. The cause was a stale **watchman** snapshot, not the project. `watchman watch-del <project>` plus clearing the Metro cache fixed it. Worth knowing: after any wholesale `node_modules` replacement on this machine, clear watchman before trusting a bundling error.

## Consequences

- The verification gate cannot catch native-linking regressions. A native build is the only check that can, and it is now known to work.
- Anyone reinstalling dependencies should re-run `npx expo-modules-autolinking resolve -p android` and confirm 15 modules before assuming a build problem is code.
- `RECORD_AUDIO` appears in the generated manifest, added by expo-audio's config plugin although the game never records. Acceptable for a playtest build; remove before any store submission.

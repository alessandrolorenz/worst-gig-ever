# Tablet friend-test build — 2026-09-10

Owner request: produce an EAS Android build with a download link after USB installation could not detect the tablet.

## Build input

- Source: approved final-results snapshot `fb83b0bdcfff60c824dd45593deff8311d7dc516`.
- Version 1.3.0, Android versionCode 8, package `com.worstgigever.app`.
- Display name remains `Worst Gig Ever`.
- Includes full-show payout artwork, scrollable results, next booking, four stages and eleven-song Custom Setlist.
- Excludes the incomplete M23 native dependency integration currently being developed in the working tree.
- Isolated export: `/private/tmp/wge-eas-tablet-3IhEGN`, created with `git archive`; no checkout/reset of the shared repository.
- Existing `preview:device` profile: internal distribution, standalone APK, no store submission.

## Temporary build configuration exception

The existing EAS project `ff27b73c-8d2e-46ba-8ee8-999034aa757c` is bound to `@alessandrolorenz/worst-band-ever`. EAS rejected the canonical local slug `worst-gig-ever`. Expo's official reference explicitly states that a project ID's slug cannot be changed: https://github.com/expo/fyi/blob/main/eas-project-id.md.

For this isolated friend-test build only, `expo.slug` matches the existing legacy EAS project, and `expo.scheme` is explicitly `exp+worst-gig-ever` to preserve the canonical deep-link scheme. The product name, Android package, icon, application version and repository configuration remain unchanged. No replacement EAS project was created. This is a documented test-build exception to the identity contract, not a production slug migration. The historical M23 expectation of a server-side rename is not actionable as written.

The temporary `.easignore` also stops excluding `package-lock.json` so the cloud builder uses the locked dependencies. `npm ci` and TypeScript checking succeeded in the isolated snapshot. No generated marketing assets were uploaded.

## EAS record

- Build ID: `bb7415fa-415b-4af5-a6d4-abfa47fd2e03`.
- Build page: https://expo.dev/accounts/alessandrolorenz/projects/worst-band-ever/builds/bb7415fa-415b-4af5-a6d4-abfa47fd2e03
- Submission succeeded; completion and artifact verification pending.
- EAS reported remote Android credentials and “Created keystore”. Treat this signature as potentially different from the local debug-signed friend APK until the resulting certificate is inspected. Do not uninstall an existing copy automatically; Android saves would be removed.

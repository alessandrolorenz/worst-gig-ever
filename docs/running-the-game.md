# Running the game

> **After changing app identity in `app.json`, re-run
> `npx expo prebuild --platform android`.** The generated `android/` directory
> caches the launcher label and version, so a stale one keeps installing the
> old app name even though `app.json` is correct. This bit the M13 phone
> install: the home screen still said "Worst Band Ever".
>
> **Installing a local debug build over an EAS-signed APK fails** with
> `INSTALL_FAILED_UPDATE_INCOMPATIBLE` — different signing keys. Uninstall the
> old one first (`adb uninstall com.worstgigever.app`, or
> `adb uninstall com.worstbandever.app` for anything built before M18.5).

> **Identifiers changed at M18.5.** The deep-link scheme is now
> `exp+worst-gig-ever://` and the Android package is `com.worstgigever.app`.
> Until M18.5 both carried the old working title, deliberately, because they
> held remote EAS and installed-app state (ADR 0010); the migration was done
> before internationalization, while the installed base was one phone.
>
> **Any build installed before M18.5 uses a different package id**, so it does
> not upgrade — Android treats it as a separate app. Uninstall it:
> `adb uninstall com.worstbandever.app`. See
> `docs/release/product-identity.md`.

Three ways to run the slice, in increasing order of fidelity and setup cost.
Pick by what you are trying to learn:

| Target | Setup | What it can answer | What it cannot |
|---|---|---|---|
| Web browser | seconds | motion, arcs, stage life, layout | native touch, touch feel, frame pacing |
| Android emulator | ~2 min first time | native touch mapping, round flow, audio | touch feel, latency, readability at phone size |
| Physical Android device | ~5 min first time | everything | — |

Only the physical device can close the subjective success criteria in
`docs/specs/M5A-first-tuning-pass.md`. An emulator cannot answer how something
feels in the hand — see the "Not validated" note in `project-status.md`.

---

## 1. Web

```sh
npm run web
```

Opens the game in a browser at `http://localhost:8081`. Fastest loop for
looking at throw arcs, performer reactions, crowd motion, and the hit-radius
halos.

Caveat: the browser exercises the **web** input path in
`game/systems/roundSystem.ts` (`onMouseDown` / `onTouchStart` with
`clientX`/`clientY`), not the native one. It cannot validate the native
coordinate mapping described in ADR 0007.

---

## 2. Android emulator, step by step

Two AVDs exist on this machine:

| AVD | Device | System image | Note |
|---|---|---|---|
| `Pixel_API34` | Pixel 6 | Android 14 (`google_apis`) | the image M4/M5 was validated against |
| `Pixel_9` | Pixel 9 | `android-37.1` (`google_apis_playstore`) | newer, less exercised |

List them yourself at any time:

```sh
$ANDROID_HOME/emulator/emulator -list-avds
```

### Step 1 — start the emulator

Run this in its **own terminal window** and leave it open. The emulator holds
the terminal for as long as it runs.

```sh
$ANDROID_HOME/emulator/emulator -avd Pixel_9
```

Or detach it and get your prompt back:

```sh
$ANDROID_HOME/emulator/emulator -avd Pixel_9 &
```

Wait for the Android home screen. First boot of a cold AVD takes a minute or
two; later boots restore from a snapshot and are much faster.

Confirm the emulator is attached before continuing:

```sh
adb devices
```

Expect a line like `emulator-5554   device`. If it says `offline`, the AVD is
still booting — wait and re-run.

> If `adb` is not on your PATH, use `$ANDROID_HOME/platform-tools/adb`.

### Step 2 — install the development client

Only needed once per AVD, or after a change to native config (a new native
dependency, or an edit to `app.json` / `plugins` / `jsEngine`).

If a debug APK already exists:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

If it does not, or native config changed, build and install in one step:

```sh
npx expo run:android
```

This runs `expo prebuild` and Gradle locally, then installs and launches. It
takes several minutes the first time. It is the path chosen in ADR 0006 —
deliberately **not** `eas build`, which would require registering a remote EAS
project.

### Step 3 — start Metro

```sh
npm start
```

This is `npx expo start --dev-client`. Leave it running; it serves the
JavaScript bundle to the app.

With the emulator running, press **`a`** in the Metro terminal to open the app
on it. If the app is already open, it connects on its own.

### Launching without pressing `a`

If Metro is already running in another window (or in a non-interactive shell),
you cannot press `a`. Launch the app straight into the dev server instead:

```sh
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW \
  -d "exp+worst-gig-ever://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

`adb reverse` makes the emulator's `localhost:8081` reach Metro on the host.
The scheme is `exp+<slug>` from `app.json` — `app.json` sets no explicit
`scheme`, so it is derived from `slug: "worst-gig-ever"`. It is declared in
the generated `android/app/src/main/AndroidManifest.xml`.

To restart the app from scratch:

```sh
adb shell am force-stop com.worstgigever.app
```

### Step 4 — play

The app is landscape-only (`app.json` sets `orientation: "landscape"`, and the
generated manifest sets `android:screenOrientation="landscape"`). The emulator
window rotates by itself.

Useful keys in the Metro terminal:

| Key | Effect |
|---|---|
| `a` | open on the connected Android device/emulator |
| `r` | reload the app |
| `j` | open the debugger |
| `m` | toggle the dev menu on the device |
| `Ctrl-C` | stop Metro |

### After editing code

**JavaScript and TypeScript changes need no rebuild.** The installed APK is a
*development client*: it fetches its bundle from Metro at runtime. Save a file
and it hot-reloads; press `r` to force a reload.

Rebuild with `npx expo run:android` only when native config changes — a new
native dependency, or an edit to `app.json`, its `plugins` list, or
`jsEngine`.

---

## 3. Physical Android device

1. Enable Developer options and USB debugging on the phone.
2. Connect it over USB and confirm it appears in `adb devices`.
3. Install the dev client: `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`, or `npx expo run:android --device`.
4. `npm start`, then press `a` — or scan the QR code from inside the dev client.

Phone and computer must be on the same network for the QR path.

---

## Verifying without running anything

The full gate, which needs no device and no emulator:

```sh
npm run verify     # type-check, then lint, then tests
```

Individually: `npm run type-check`, `npm run lint`, `npm test`.

Note that the gate runs entirely in JavaScript and **cannot** catch native
linking regressions — only a native build can. See ADR 0006.

---

## Troubleshooting

**Metro cannot resolve a file that exists on disk.**
A stale watchman snapshot, not a project problem. Documented in ADR 0006.

```sh
watchman watch-del "$PWD"
npm start -- --clear
```

**`Cannot find native module 'ExpoAsset'`, or `"main" has not been registered`.**
Autolinking is not seeing all the Expo modules. Check the count:

```sh
npx expo-modules-autolinking resolve -p android | grep -c packageName
```

It must report **15**. Fewer means dependencies have been hoisted differently
by npm — the exact failure ADR 0006 diagnoses and fixes. Read that ADR before
changing anything; do **not** add `expo.autolinking.searchPaths`, which breaks
the Gradle build on SDK 53.

**The emulator boots but `adb devices` shows nothing.**
Restart the bridge:

```sh
adb kill-server && adb start-server && adb devices
```

**The app opens on a white screen.**
Metro is not reachable. Confirm `npm start` is running, then press `r` in the
Metro terminal, or shake / press `m` for the dev menu and choose Reload.

**The app opens on the dev-client launcher instead of the game, with
`AbortError: Aborted` in the log.**
The launcher could not auto-discover a dev server. Use the deep link above, or
type the Metro URL into the launcher by hand.

**`Error: Activity not started, unable to resolve Intent`.**
Wrong URL scheme in the deep link. It is `exp+worst-gig-ever://`, not
`com.worstgigever.app://` — the package name and the scheme are different
things. Confirm against the generated manifest:

```sh
grep android:scheme android/app/src/main/AndroidManifest.xml
```

**Frame pacing looks poor.**
Do not conclude anything from it. The dev client is a **debug** build with
dev-mode overhead, and `app.json` still sets `jsEngine: "jsc"` rather than
Hermes. Re-check against a release build first — ADR 0001 and ADR 0006.

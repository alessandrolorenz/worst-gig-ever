/**
 * What this particular build is allowed to show, beyond what the code contains.
 *
 * Source of truth: docs/specs/M24-custom-setlist.md
 *
 * ## Why this exists
 *
 * M24B gates the audition tooling on `isDevelopmentBuild()` — that is,
 * `__DEV__` — which is exactly right for the property it protects: **eleven
 * unaudited third-party tracks must not reach a player.** It has one practical
 * cost, and the cost is the milestone's whole purpose. A `__DEV__` build loads
 * its JavaScript from a Metro server, so auditioning music means staying
 * tethered to the machine running it. Judging whether a song is fun on a phone
 * cabled to a laptop is not judging whether it is fun.
 *
 * So there is a second way in, and it is deliberately narrow:
 *
 *     EXPO_PUBLIC_AUDITION_BUILD=1
 *
 * set at bundle time, which produces a **standalone release-type build that
 * still shows the audition tooling**. No Metro, no cable, headphones, a room to
 * walk around in.
 *
 * ## Why this is not a hole
 *
 * The thing to be careful about is obvious: a flag that turns candidates back on
 * is a flag that could ship. Four things stand against that, and they are
 * independent:
 *
 *   1. **It is off unless something sets it.** Absent, empty, `0`, `false` and
 *      any unrecognised value all mean off. Only the literal `1` or `true`
 *      turns it on, so a stray empty string in a CI environment cannot.
 *   2. **No shipping profile sets it.** `eas.json`'s `production` and `preview`
 *      profiles have no `env` block at all, and `tests/audition.test.ts`
 *      asserts that — so adding it to one is a failing test, not a quiet
 *      change.
 *   3. **It cannot promote anything.** This decides whether a *development
 *      surface is drawn*, and nothing else. Every candidate is still
 *      `release: 'candidate'` with `ownerConfirmed: false`, and the rule that a
 *      conditioned track must have been listened to before it may ship is
 *      enforced in `tests/audioContract.test.ts`, which does not read this
 *      file.
 *   4. **The build is not distributable.** It is signed with the debug
 *      keystore, like every local build in this project, so Play would refuse
 *      it even if someone tried.
 *
 * The flag dies with M24C. Once the owner has named the keepers, the rejected
 * tracks are deleted and the survivors become `production` — at which point
 * there is no candidate pool to gate and this module goes with it.
 */
import { isDevelopmentBuild } from '../i18n/locales.ts';

/**
 * The one environment variable this project reads.
 *
 * Exported for `eas.json` inspection in `tests/audition.test.ts` and for error
 * messages. **Deliberately not used to read the variable** — see below.
 */
export const AUDITION_BUILD_FLAG = 'EXPO_PUBLIC_AUDITION_BUILD';

/**
 * Whether this bundle was built as an audition build.
 *
 * ## The access has to be written out, and that is not a style choice
 *
 * `process.env.EXPO_PUBLIC_AUDITION_BUILD` is spelled statically because Expo's
 * Babel transform substitutes the *literal member expression* at bundle time —
 * it is a find-and-replace over the syntax, not a runtime lookup. Writing
 * `process.env[AUDITION_BUILD_FLAG]` reads better and **silently does not
 * work**: the transform cannot see through the variable, the expression
 * survives into the bundle as a dynamic lookup, and a release build has no
 * `process.env` to find the answer in. The flag would then be off in exactly
 * the build it exists to serve.
 *
 * This was written the wrong way first and caught by decompiling the bundle
 * (`grep EXPO_PUBLIC_AUDITION_BUILD index.android.bundle` showed
 * `process.env[o]` rather than `'1'`), which is the only way to see it — every
 * test passes either way, because under `node --test` `process.env` is real and
 * both forms work.
 *
 * The `typeof` guard stays: `process` is a shim in React Native and absent in
 * some tool contexts, and a missing global must read as "no" rather than throw
 * on launch.
 *
 * ## Allow-list, not truthiness
 *
 * `EXPO_PUBLIC_AUDITION_BUILD=` (empty), `=0` and `=false` are all things a CI
 * environment produces by accident, and every one of them means no.
 */
export function isAuditionBuild(): boolean {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') return false;
  const value = process.env.EXPO_PUBLIC_AUDITION_BUILD;
  return value === '1' || value === 'true';
}

/**
 * May this build draw the audition tooling and offer candidate tracks?
 *
 * The single predicate both gates read, so "what a development build sees" and
 * "what an audition build sees" cannot drift apart. `availableTracks` uses it
 * for its default, and `GameEngine` uses it to decide whether the audition
 * controls exist at all.
 *
 * Note what it is *not* used for: nothing in gameplay, scoring, or the official
 * setlist reads this. A build with the flag set plays the authored show
 * identically — the flag adds a row to the title screen and a pool to choose
 * from, and changes nothing else.
 */
export function showsAuditionTools(): boolean {
  return isDevelopmentBuild() || isAuditionBuild();
}

/**
 * The flag that forces UMP to behave as though the device were in the EEA.
 *
 * M23 requires the European regulations message to be validated, and the
 * machine doing the validating is in Brazil — so UMP correctly decides no
 * form is due and shows nothing. `debugGeography` is Google's own supported
 * testing mechanism for exactly this: it makes the **real** published message
 * appear rather than simulating one, which is the difference between testing
 * consent and pretending to.
 *
 * Its own flag rather than a reuse of `EXPO_PUBLIC_AUDITION_BUILD`, because
 * they protect unrelated things and that flag is documented to die with M24C.
 */
export const UMP_DEBUG_EEA_FLAG = 'EXPO_PUBLIC_UMP_DEBUG_EEA';

/**
 * May this build ask UMP to pretend it is in the EEA?
 *
 * Off unless something sets it, and only the literal `1` or `true` turn it on
 * — an empty string, `0`, `false` and any typo all mean no, for the reason
 * `isAuditionBuild` spells out. A release that reached a player with this on
 * would show a European consent form to someone who is not in Europe: not a
 * privacy failure, but a confusing screen and a wrong signal to Google.
 *
 * Spelled out as a static member expression, like every other flag here,
 * because Expo's Babel transform substitutes the literal expression at bundle
 * time and cannot see through a variable.
 */
export function forcesUmpEeaGeography(): boolean {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') return false;
  const value = process.env.EXPO_PUBLIC_UMP_DEBUG_EEA;
  return value === '1' || value === 'true';
}

/**
 * A device registered with UMP as a debug device, if this build names one.
 *
 * `debugGeography` is ignored on any device Google does not already consider a
 * test device. Emulators qualify automatically from UMP 2.2.0; a physical
 * phone does not, and the symptom is silent — the forced geography is simply
 * not applied and the app behaves as though the flag were off.
 *
 * The hashed id is printed by the UMP SDK itself on first run:
 *
 *     Use new ConsentDebugSettings.Builder().addTestDeviceHashedId("…")
 *
 * Passed in rather than committed, because it identifies one person's handset
 * and belongs to whoever is doing the validating, not to the repository.
 */
export const UMP_TEST_DEVICE_FLAG = 'EXPO_PUBLIC_UMP_TEST_DEVICE';

export function umpTestDeviceHashedId(): string | null {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') return null;
  const value = process.env.EXPO_PUBLIC_UMP_TEST_DEVICE;
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

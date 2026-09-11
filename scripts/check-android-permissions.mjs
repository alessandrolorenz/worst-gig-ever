#!/usr/bin/env node
/**
 * What the app *actually* asks an Android device for (M23).
 *
 * Reads the **merged** manifest — the one Gradle produces after every library
 * has contributed to it — and not `app.json` or the source manifest.
 *
 * ## Why the merged manifest is the only one worth checking
 *
 * `blockedPermissions` in `app.json` does not delete a permission. It writes
 * `tools:node="remove"` into the source manifest, which is an *instruction to
 * the manifest merger*. So the source manifest still contains the line, and a
 * check that greps it would either falsely fail or — worse — falsely pass by
 * matching the removal instruction and calling it a declaration.
 *
 * The merged manifest is also the only place a dependency's own permissions
 * appear. The Google Mobile Ads SDK contributes the advertising-identifier and
 * Privacy Sandbox permissions, and none of them exist anywhere in this
 * repository's own configuration. A privacy policy written from `app.json`
 * would have described an app that does not exist, which is exactly the defect
 * this script was written after.
 *
 * Usage, after a build has produced a merged manifest:
 *   node scripts/check-android-permissions.mjs
 *   node scripts/check-android-permissions.mjs --variant debug
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const variantIndex = args.indexOf('--variant');
const variant = variantIndex === -1 ? 'release' : args[variantIndex + 1];

/**
 * Permissions that must never survive the merge.
 *
 * Each is blocked in `app.json`, and each was reaching the manifest before
 * 2026-09-10 — contributed by React Native and Expo autolinking rather than by
 * anything this game does. Nothing in the code vibrates, draws over other
 * apps, or reads external storage.
 */
const MUST_BE_ABSENT = [
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.VIBRATE',
];

/** Permissions the product genuinely needs. Losing one is also a regression. */
const MUST_BE_PRESENT = [
  // Ad requests and the UMP consent lookup.
  'android.permission.INTERNET',
  // Audio latency the rhythm game depends on.
  'android.permission.MODIFY_AUDIO_SETTINGS',
  // The remove_ads purchase.
  'com.android.vending.BILLING',
];

/** Candidate locations, newest first. AGP has moved this more than once. */
function mergedManifestPath() {
  const candidates = [
    join(repoRoot, `android/app/build/intermediates/merged_manifests/${variant}/process${cap(variant)}Manifest/AndroidManifest.xml`),
    join(repoRoot, `android/app/build/intermediates/merged_manifest/${variant}/process${cap(variant)}MainManifest/AndroidManifest.xml`),
    join(repoRoot, `android/app/build/intermediates/merged_manifests/${variant}/AndroidManifest.xml`),
  ].filter(existsSync);

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

function cap(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const manifestPath = mergedManifestPath();

if (manifestPath === null) {
  console.error(
    `No merged ${variant} manifest found. This check is meaningless without one:\n` +
      '  app.json and the source manifest both carry tools:node="remove"\n' +
      '  instructions rather than the final permission set.\n\n' +
      'Produce it with:\n' +
      `  cd android && ./gradlew :app:process${cap(variant)}Manifest`,
  );
  process.exit(1);
}

const manifest = readFileSync(manifestPath, 'utf8');
const declared = [...manifest.matchAll(/uses-permission[^>]*android:name="([^"]+)"/g)]
  .map(match => match[1])
  .sort();

const wronglyPresent = MUST_BE_ABSENT.filter(name => declared.includes(name));
const wronglyAbsent = MUST_BE_PRESENT.filter(name => !declared.includes(name));

console.log(`Merged ${variant} manifest: ${manifestPath.replace(`${repoRoot}/`, '')}`);
console.log('Permissions the installed app actually declares:');
for (const name of declared) console.log(`  ${name}`);
console.log('');

if (wronglyPresent.length > 0) {
  console.error('FAIL_ANDROID_PERMISSIONS — blocked permissions survived the merge:\n');
  for (const name of wronglyPresent) {
    console.error(
      `  ${name}\n` +
        '    A dependency reintroduced this. Add it to android.blockedPermissions\n' +
        '    in app.json, re-run prebuild, and update the privacy policy if the\n' +
        '    permission is genuinely needed after all.\n',
    );
  }
}

if (wronglyAbsent.length > 0) {
  console.error('FAIL_ANDROID_PERMISSIONS — required permissions are missing:\n');
  for (const name of wronglyAbsent) console.error(`  ${name}`);
  console.error('');
}

if (wronglyPresent.length > 0 || wronglyAbsent.length > 0) process.exit(1);

console.log(
  'PASS_ANDROID_PERMISSIONS\n' +
    '  Reminder: the list above is what the privacy policy and the Play Data\n' +
    '  safety form must describe. Permissions contributed by the Google Mobile\n' +
    '  Ads SDK appear here and nowhere in this repository\'s own configuration.',
);

/** M23: the permissions the app is allowed to reach a device with. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Blocked because nothing in this game uses them.
 *
 * They were reaching the manifest until 2026-09-10, contributed by React
 * Native and Expo autolinking rather than by any decision in this repository —
 * which is precisely why `app.json` alone was never evidence of anything.
 */
const BLOCKED = [
  'android.permission.RECORD_AUDIO',
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
  'android.permission.VIBRATE',
];

const appJson = JSON.parse(readFileSync(join(repoRoot, 'app.json'), 'utf8')) as {
  expo: { android: { permissions?: string[]; blockedPermissions?: string[] } };
};

test('M23: app.json blocks every permission the game does not use', () => {
  const blocked = appJson.expo.android.blockedPermissions ?? [];
  for (const permission of BLOCKED) {
    assert.ok(blocked.includes(permission), `${permission} must stay blocked`);
  }
});

test('M23: the app still asks for the audio permission it needs', () => {
  const permissions = appJson.expo.android.permissions ?? [];
  assert.ok(permissions.includes('android.permission.MODIFY_AUDIO_SETTINGS'));
});

/**
 * The check that actually matters, when the artifact exists to check.
 *
 * `android/` is generated and git-ignored, so the merged manifest is absent on
 * a fresh clone and in any environment that has not run a build. This test
 * therefore reports rather than fails when it is missing — the enforcing copy
 * is `scripts/check-android-permissions.mjs`, which a build runs and which
 * fails loudly when the manifest is absent.
 *
 * What it protects against is the thing app.json cannot see: a dependency
 * reintroducing a permission through manifest merging.
 */
test('M23: no blocked permission survives into the merged manifest', t => {
  const candidates = [
    'android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml',
    'android/app/build/intermediates/merged_manifest/release/processReleaseMainManifest/AndroidManifest.xml',
  ].map(relative => join(repoRoot, relative));

  const manifestPath = candidates.find(existsSync);
  if (manifestPath === undefined) {
    t.skip('no merged manifest built yet; run npm run check:permissions after a build');
    return;
  }

  const declared = [
    ...readFileSync(manifestPath, 'utf8').matchAll(/uses-permission[^>]*android:name="([^"]+)"/g),
  ].map(match => match[1]);

  for (const permission of BLOCKED) {
    assert.ok(
      !declared.includes(permission),
      `${permission} survived the merge — a dependency reintroduced it`,
    );
  }

  // Losing one of these is also a regression, and a silent one.
  for (const permission of [
    'android.permission.INTERNET',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'com.android.vending.BILLING',
  ]) {
    assert.ok(declared.includes(permission), `${permission} must reach the manifest`);
  }
});

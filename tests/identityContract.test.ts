/**
 * M18.5: the product identity contract.
 *
 * Source of truth: `docs/release/product-identity.md`.
 *
 * The old working title *Worst Band Ever* is still, correctly, all over this
 * repository's history — in ADRs, milestone specs, gate reports and build URLs
 * that still resolve under the old slug. Rewriting those would falsify the
 * record, so this test deliberately does **not** look at documentation.
 *
 * It guards the half that matters: nothing that configures the running app or
 * its build may carry the old identity again. An Android package id is
 * effectively permanent after a store release, so a regression here is not a
 * cosmetic problem.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const IDENTITY = {
  name: 'Worst Gig Ever',
  slug: 'worst-gig-ever',
  androidPackage: 'com.worstgigever.app',
  iosBundleIdentifier: 'com.worstgigever.app',
  npmName: 'worst-gig-ever',
} as const;

/** Files that configure the app or its build. Documentation is not here. */
const RUNTIME_CONFIG_FILES = ['app.json', 'eas.json', 'package.json'] as const;

const OLD_IDENTITY = [/worst-band-ever/i, /worstbandever/i, /worst_band_ever/i] as const;

const appJson = JSON.parse(readFileSync(join(repoRoot, 'app.json'), 'utf8')) as {
  expo: {
    name: string;
    slug: string;
    android: { package: string; permissions?: string[] };
    ios: { bundleIdentifier: string };
    extra?: { eas?: { projectId?: string } };
    plugins?: unknown[];
  };
};

test('M18.5: app.json carries the final identity', () => {
  const { expo } = appJson;
  assert.equal(expo.name, IDENTITY.name, 'the launcher label is the product name');
  assert.equal(expo.slug, IDENTITY.slug);
  assert.equal(expo.android.package, IDENTITY.androidPackage);
  assert.equal(expo.ios.bundleIdentifier, IDENTITY.iosBundleIdentifier);
});

test('M18.5: the npm package name matches the product', () => {
  const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8')) as { name: string };
  assert.equal(pkg.name, IDENTITY.npmName);
});

test('M18.5: no build or runtime configuration reintroduces the old identity', () => {
  for (const file of RUNTIME_CONFIG_FILES) {
    const contents = readFileSync(join(repoRoot, file), 'utf8');
    for (const pattern of OLD_IDENTITY) {
      assert.ok(
        !pattern.test(contents),
        `${file} matches ${String(pattern)} — an Android package id is permanent after ` +
          'a store release, so the old identity must never come back through configuration',
      );
    }
  }
});

test('M18.5: the EAS project link is preserved, not reinvented', () => {
  // The slug changed; the project id must not. A new id means new credentials
  // and a different application on Expo's side.
  assert.equal(
    appJson.expo.extra?.eas?.projectId,
    'ff27b73c-8d2e-46ba-8ee8-999034aa757c',
    'M18.5 renames the project, it does not recreate it',
  );
});

test('M18.5: the app does not ask for the microphone', () => {
  // The game plays audio and never records it: `createAudioPlayer` and
  // `setAudioModeAsync` are the whole surface. expo-audio's config plugin adds
  // RECORD_AUDIO by default, so it is switched off explicitly rather than
  // merely left out of the permissions array.
  const permissions = appJson.expo.android.permissions ?? [];
  assert.ok(
    !permissions.some((permission) => permission.includes('RECORD_AUDIO')),
    'RECORD_AUDIO must not be declared',
  );

  const audioPlugin = (appJson.expo.plugins ?? []).find(
    (plugin) => Array.isArray(plugin) && plugin[0] === 'expo-audio',
  ) as [string, { microphonePermission?: boolean }] | undefined;
  assert.ok(audioPlugin, 'expo-audio must be configured, not bare');
  assert.equal(
    audioPlugin[1]?.microphonePermission,
    false,
    'without this the plugin puts RECORD_AUDIO back at prebuild',
  );
});

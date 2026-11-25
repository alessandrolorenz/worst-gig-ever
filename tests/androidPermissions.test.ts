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
  ]) {
    assert.ok(declared.includes(permission), `${permission} must reach the manifest`);
  }

  /*
   * Billing is back in scope, so BILLING is now required rather than
   * forbidden (ADR 0015). The assertion flipped on 2026-09-11 and the reason
   * it is still an assertion is unchanged: a mismatch between the manifest and
   * the feature set is what makes Play ask questions, and it is a mismatch in
   * both directions. An app that declares billing and cannot sell anything is
   * the failure ADR 0014 guarded against; an app that sells something and does
   * not declare it cannot open the Play sheet at all.
   */
  assert.ok(
    declared.includes('com.android.vending.BILLING'),
    'BILLING must reach the manifest now that remove_ads is implemented',
  );
});

/**
 * Where BILLING comes from, which is the half `declared.includes` cannot see.
 *
 * ADR 0014 removed this permission because it had outlived the dependency that
 * contributed it. The guard against that recurring is not "is it present" —
 * it was present then too — but "is the Play Billing Library still in the
 * build". Reading the merger report ties the permission to the artifact that
 * justifies it, so removing the billing library and leaving the permission
 * behind fails here rather than in a Play review.
 */
test('M23: BILLING is contributed by the Play Billing Library, not left over', t => {
  const reportPath = join(
    repoRoot,
    'android/app/build/outputs/logs/manifest-merger-release-report.txt',
  );
  if (!existsSync(reportPath)) {
    t.skip('no merger report built yet; run a release build');
    return;
  }

  const report = readFileSync(reportPath, 'utf8');
  const line = report
    .split('\n')
    .find(entry => entry.includes('uses-permission#com.android.vending.BILLING'));
  assert.ok(line !== undefined, 'the merger report does not mention BILLING at all');

  const source = report
    .slice(report.indexOf(line as string))
    .split('\n')
    .slice(1, 3)
    .join('\n');
  assert.match(
    source,
    /com\.android\.billingclient:billing/,
    'BILLING must come from the Play Billing Library, not from a leftover manifest entry',
  );
});

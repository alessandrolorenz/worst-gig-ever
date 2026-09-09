/** M23: which AdMob identifiers a build may use, and which must stop it. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  ADMOB_PRODUCTION_FLAG,
  AD_PROFILES,
  GOOGLE_DEMO_INTERSTITIAL_ANDROID,
  GOOGLE_SAMPLE_APP_ID,
  MONETIZATION_PROBLEM_CODES,
  PRODUCTION_INTERSTITIAL_UNIT_ID,
  currentAdProfile,
  isGoogleDemoId,
  isValidAdMobAppId,
  isValidAdUnitId,
  resolveMonetizationConfig,
  validateMonetizationConfig,
  type MonetizationProblemCode,
} from '../game/config/monetization.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Fixture identifiers, deliberately not the real ones.
 *
 * The point of the pure layer is that every rule can be stated without the
 * real App ID, which is still an open external blocker.
 */
const FIXTURE_APP_ID = 'ca-app-pub-1234567890123456~1234567890';
const FIXTURE_UNIT_ID = 'ca-app-pub-1234567890123456/9876543210';

function codes(problems: readonly { code: MonetizationProblemCode }[]): MonetizationProblemCode[] {
  return problems.map(problem => problem.code);
}

test('M23: App ID and ad unit id are told apart by their separator', () => {
  assert.equal(isValidAdMobAppId(FIXTURE_APP_ID), true);
  assert.equal(isValidAdUnitId(FIXTURE_UNIT_ID), true);

  // The mistake this exists to catch: one pasted into the other's field.
  assert.equal(isValidAdMobAppId(FIXTURE_UNIT_ID), false, 'an ad unit is not an App ID');
  assert.equal(isValidAdUnitId(FIXTURE_APP_ID), false, 'an App ID is not an ad unit');
});

test('M23: malformed identifiers are rejected, whatever shape they arrive in', () => {
  for (const bad of ['', ' ', 'YOUR_APP_ID', 'ca-app-pub-123~456', 'ca-app-pub-1234567890123456~123456789', null, undefined, 42, {}]) {
    assert.equal(isValidAdMobAppId(bad), false, `${String(bad)} is not an App ID`);
    assert.equal(isValidAdUnitId(bad), false, `${String(bad)} is not an ad unit id`);
  }
});

test("M23: Google's demo publisher is recognised in every format", () => {
  assert.equal(isGoogleDemoId(GOOGLE_SAMPLE_APP_ID), true);
  assert.equal(isGoogleDemoId(GOOGLE_DEMO_INTERSTITIAL_ANDROID), true);
  assert.equal(isGoogleDemoId(FIXTURE_APP_ID), false);
  assert.equal(isGoogleDemoId(FIXTURE_UNIT_ID), false);
});

test('M23 correction: a valid real App ID is required in BOTH profiles', () => {
  // The 2026-09-09 correction. A development build that initializes UMP with
  // somebody else's App ID has not tested this app's consent message.
  for (const profile of AD_PROFILES) {
    const problems = validateMonetizationConfig({
      profile,
      appId: null,
      productionInterstitialUnitId: FIXTURE_UNIT_ID,
    });
    assert.ok(codes(problems).includes('app-id-missing'), `${profile} requires an App ID`);
  }
});

test("M23 correction: Google's sample App ID is refused in every profile", () => {
  for (const profile of AD_PROFILES) {
    const problems = validateMonetizationConfig({
      profile,
      appId: GOOGLE_SAMPLE_APP_ID,
      productionInterstitialUnitId: FIXTURE_UNIT_ID,
    });
    assert.ok(
      codes(problems).includes('app-id-is-google-sample'),
      `${profile} must not accept the sample App ID`,
    );
  }
});

test('M23: a malformed App ID is reported as malformed, not as missing', () => {
  const problems = validateMonetizationConfig({
    profile: 'test',
    appId: 'ca-app-pub-1234567890123456/1234567890',
    productionInterstitialUnitId: null,
  });
  assert.deepEqual(codes(problems), ['app-id-malformed']);
});

test('M23: a test build resolves to the official Google demo interstitial', () => {
  const config = resolveMonetizationConfig({
    profile: 'test',
    appId: FIXTURE_APP_ID,
    productionInterstitialUnitId: null,
  });

  assert.equal(config.interstitialUnitId, GOOGLE_DEMO_INTERSTITIAL_ANDROID);
  assert.equal(isGoogleDemoId(config.interstitialUnitId), true, 'so no real ad can be served');
});

test('M23: a test build ignores the production unit entirely', () => {
  // A half-filled production id must not leak into a development build.
  const config = resolveMonetizationConfig({
    profile: 'test',
    appId: FIXTURE_APP_ID,
    productionInterstitialUnitId: FIXTURE_UNIT_ID,
  });
  assert.equal(config.interstitialUnitId, GOOGLE_DEMO_INTERSTITIAL_ANDROID);
});

test('M23: production configuration rejects Google test IDs', () => {
  const problems = validateMonetizationConfig({
    profile: 'production',
    appId: FIXTURE_APP_ID,
    productionInterstitialUnitId: GOOGLE_DEMO_INTERSTITIAL_ANDROID,
  });

  assert.deepEqual(codes(problems), ['production-unit-is-google-demo']);
});

test('M23: production requires a real interstitial unit to exist at all', () => {
  const problems = validateMonetizationConfig({
    profile: 'production',
    appId: FIXTURE_APP_ID,
    productionInterstitialUnitId: null,
  });
  assert.deepEqual(codes(problems), ['production-unit-missing']);
});

test('M23: production resolves to the real unit when everything is filled in', () => {
  const config = resolveMonetizationConfig({
    profile: 'production',
    appId: FIXTURE_APP_ID,
    productionInterstitialUnitId: FIXTURE_UNIT_ID,
  });
  assert.equal(config.interstitialUnitId, FIXTURE_UNIT_ID);
});

test('M23: resolution throws rather than substituting anything', () => {
  assert.throws(
    () =>
      resolveMonetizationConfig({
        profile: 'production',
        appId: null,
        productionInterstitialUnitId: null,
      }),
    /app-id-missing[\s\S]*production-unit-missing/,
    'every reason is named at once, so one build reports all of them',
  );
});

test('M23: the profile defaults to test, and only an allow-listed value is production', () => {
  const original = process.env[ADMOB_PRODUCTION_FLAG];
  try {
    delete process.env[ADMOB_PRODUCTION_FLAG];
    assert.equal(currentAdProfile(), 'test', 'absent means test');

    // The values a CI environment produces by accident all mean test. Getting
    // this wrong sends real ad requests from a developer's own device, which
    // is invalid traffic — an account problem, not a revenue one.
    for (const value of ['', '0', 'false', 'no', 'TRUE', 'yes', 'production']) {
      process.env[ADMOB_PRODUCTION_FLAG] = value;
      assert.equal(currentAdProfile(), 'test', `"${value}" must not mean production`);
    }

    for (const value of ['1', 'true']) {
      process.env[ADMOB_PRODUCTION_FLAG] = value;
      assert.equal(currentAdProfile(), 'production', `"${value}" declares production`);
    }
  } finally {
    if (original === undefined) delete process.env[ADMOB_PRODUCTION_FLAG];
    else process.env[ADMOB_PRODUCTION_FLAG] = original;
  }
});

test('M23: every problem code is reachable, so none is decoration', () => {
  const seen = new Set<MonetizationProblemCode>();

  const cases = [
    { profile: 'test', appId: null, productionInterstitialUnitId: null },
    { profile: 'test', appId: GOOGLE_SAMPLE_APP_ID, productionInterstitialUnitId: null },
    { profile: 'test', appId: 'nonsense', productionInterstitialUnitId: null },
    { profile: 'production', appId: FIXTURE_APP_ID, productionInterstitialUnitId: null },
    { profile: 'production', appId: FIXTURE_APP_ID, productionInterstitialUnitId: 'nonsense' },
    {
      profile: 'production',
      appId: FIXTURE_APP_ID,
      productionInterstitialUnitId: GOOGLE_DEMO_INTERSTITIAL_ANDROID,
    },
  ] as const;

  for (const input of cases) {
    for (const problem of validateMonetizationConfig(input)) seen.add(problem.code);
  }

  assert.deepEqual([...seen].sort(), [...MONETIZATION_PROBLEM_CODES].sort());
});

test('M23: the repository never carries a fake App ID, even before it has a real one', () => {
  // The invariant that holds today and must keep holding. It deliberately does
  // NOT require the App ID to be present — that is the build boundary's job,
  // and demanding it here would fail a repository whose AdMob app does not
  // exist yet. What it forbids is a placeholder that looks configured.
  const appJson = JSON.parse(readFileSync(join(repoRoot, 'app.json'), 'utf8')) as {
    expo: { plugins?: unknown[] };
  };

  const plugin = (appJson.expo.plugins ?? []).find(
    entry =>
      entry === 'react-native-google-mobile-ads' ||
      (Array.isArray(entry) && entry[0] === 'react-native-google-mobile-ads'),
  );
  assert.ok(plugin, 'the ads plugin must stay registered');

  const appId = Array.isArray(plugin)
    ? ((plugin[1] as { androidAppId?: unknown } | undefined)?.androidAppId ?? null)
    : null;

  if (appId === null) return;

  assert.notEqual(appId, GOOGLE_SAMPLE_APP_ID, "app.json must never carry Google's sample App ID");
  assert.equal(isValidAdMobAppId(appId), true, `app.json carries a malformed App ID: ${String(appId)}`);
});

test('M23: no production ad unit is claimed before one exists', () => {
  // Guards against the placeholder that ships: filling this constant with the
  // demo unit to "make it work" would pass every other test in this file.
  if (PRODUCTION_INTERSTITIAL_UNIT_ID === null) return;

  assert.equal(isGoogleDemoId(PRODUCTION_INTERSTITIAL_UNIT_ID), false);
  assert.equal(isValidAdUnitId(PRODUCTION_INTERSTITIAL_UNIT_ID), true);
});

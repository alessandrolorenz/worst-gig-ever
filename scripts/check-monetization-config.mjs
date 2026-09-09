#!/usr/bin/env node
/**
 * The build boundary for AdMob configuration (M23).
 *
 * Reads the App ID out of `app.json` and judges it with the same pure rules
 * the unit tests use — `game/config/monetization.ts` is imported rather than
 * reimplemented, so the script and the tests cannot drift apart.
 *
 * ## Two modes, because "absent" and "wrong" are different failures
 *
 * By default this enforces the invariant that is true today and must stay true
 * forever: **if an App ID is configured at all, it is a real, well-formed one
 * and not Google's sample.** An absent App ID passes, because no build in this
 * repository initializes AdMob yet and failing on its absence would break
 * working local release builds for a dependency nothing consumes.
 *
 * With `--require-app-id`, absence is a failure too. That is the mode a native
 * build wires in once the AdMob/UMP adapters exist (M23 piece 5): from that
 * point a build without an App ID would initialize UMP against nothing, and
 * must not start.
 *
 * Usage:
 *   node scripts/check-monetization-config.mjs
 *   node scripts/check-monetization-config.mjs --require-app-id
 *   node scripts/check-monetization-config.mjs --profile production --require-app-id
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AD_PROFILES,
  PRODUCTION_INTERSTITIAL_UNIT_ID,
  validateMonetizationConfig,
} from '../game/config/monetization.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

const requireAppId = args.includes('--require-app-id');
const profileIndex = args.indexOf('--profile');
const profile = profileIndex === -1 ? 'test' : args[profileIndex + 1];

if (!AD_PROFILES.includes(profile)) {
  console.error(`Unknown profile "${profile}". Expected one of: ${AD_PROFILES.join(', ')}`);
  process.exit(2);
}

/**
 * The App ID as the native build will see it.
 *
 * The plugin is listed either as a bare string — no options, so no App ID
 * reaches the manifest — or as a `[name, options]` pair. Both shapes are
 * legal Expo config and the bare one is what this repository has today.
 */
function configuredAppId() {
  const appJson = JSON.parse(readFileSync(join(repoRoot, 'app.json'), 'utf8'));
  const plugins = appJson.expo?.plugins ?? [];

  for (const plugin of plugins) {
    if (plugin === 'react-native-google-mobile-ads') return null;
    if (Array.isArray(plugin) && plugin[0] === 'react-native-google-mobile-ads') {
      return plugin[1]?.androidAppId ?? null;
    }
  }

  console.error(
    'The react-native-google-mobile-ads plugin is not registered in app.json, so ' +
      'no AdMob configuration would reach the native build at all.',
  );
  process.exit(1);
}

const appId = configuredAppId();

if (appId === null && !requireAppId) {
  console.log(
    'PASS_MONETIZATION_CONFIG (no App ID configured yet; nothing initializes AdMob)\n' +
      '  Reminder: the real AdMob App ID is still an open external blocker in M23.\n' +
      '  Google\'s sample App ID is not a stand-in — UMP resolves the consent\n' +
      '  message from this value and would look up a Google-owned app.',
  );
  process.exit(0);
}

const problems = validateMonetizationConfig({
  profile,
  appId,
  productionInterstitialUnitId: PRODUCTION_INTERSTITIAL_UNIT_ID,
});

if (problems.length > 0) {
  console.error(`FAIL_MONETIZATION_CONFIG profile=${profile}\n`);
  for (const problem of problems) {
    console.error(`  [${problem.code}]\n  ${problem.message}\n`);
  }
  process.exit(1);
}

console.log(`PASS_MONETIZATION_CONFIG profile=${profile} appId=${appId}`);

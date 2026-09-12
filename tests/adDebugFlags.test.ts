/** M23: the UMP validation flags must never reach a player. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  UMP_DEBUG_EEA_FLAG,
  UMP_TEST_DEVICE_FLAG,
  forcesUmpEeaGeography,
  umpTestDeviceHashedId,
} from '../game/config/buildFlags.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('M23: forcing the EEA is off unless a build explicitly asks', () => {
  const original = process.env[UMP_DEBUG_EEA_FLAG];
  try {
    delete process.env[UMP_DEBUG_EEA_FLAG];
    assert.equal(forcesUmpEeaGeography(), false, 'absent means off');

    // The values a CI environment produces by accident all mean off. A release
    // with this on would show a European consent form to someone who is not in
    // Europe, and send Google a signal that is simply untrue.
    for (const value of ['', '0', 'false', 'no', 'TRUE', 'EEA']) {
      process.env[UMP_DEBUG_EEA_FLAG] = value;
      assert.equal(forcesUmpEeaGeography(), false, `"${value}" must not force the EEA`);
    }

    for (const value of ['1', 'true']) {
      process.env[UMP_DEBUG_EEA_FLAG] = value;
      assert.equal(forcesUmpEeaGeography(), true);
    }
  } finally {
    if (original === undefined) delete process.env[UMP_DEBUG_EEA_FLAG];
    else process.env[UMP_DEBUG_EEA_FLAG] = original;
  }
});

test('M23: no test device is registered unless one is named', () => {
  const original = process.env[UMP_TEST_DEVICE_FLAG];
  try {
    delete process.env[UMP_TEST_DEVICE_FLAG];
    assert.equal(umpTestDeviceHashedId(), null);

    process.env[UMP_TEST_DEVICE_FLAG] = '   ';
    assert.equal(umpTestDeviceHashedId(), null, 'whitespace is not a device id');

    process.env[UMP_TEST_DEVICE_FLAG] = ' ABC123 ';
    assert.equal(umpTestDeviceHashedId(), 'ABC123');
  } finally {
    if (original === undefined) delete process.env[UMP_TEST_DEVICE_FLAG];
    else process.env[UMP_TEST_DEVICE_FLAG] = original;
  }
});

test('M23: no shipping EAS profile sets either validation flag', () => {
  // Same guard `tests/audition.test.ts` puts on the audition flag, and for the
  // same reason: `production` and `preview` are the two profiles that can
  // reach a player. Adding one of these to either must be a failing test
  // rather than a quiet change.
  const easJson = JSON.parse(readFileSync(join(repoRoot, 'eas.json'), 'utf8')) as {
    build: Record<string, { env?: Record<string, string> }>;
  };

  for (const name of ['production', 'preview']) {
    const profile = easJson.build[name];
    assert.ok(profile, `eas.json has no ${name} profile`);

    for (const flag of [UMP_DEBUG_EEA_FLAG, UMP_TEST_DEVICE_FLAG]) {
      assert.equal(
        profile.env?.[flag],
        undefined,
        `the ${name} profile must not set ${flag}`,
      );
    }
  }
});

test('M23: no device hash is committed to the repository', () => {
  // The hashed id identifies one person's handset. It belongs to whoever is
  // validating, passed at build time, and not to this repository.
  for (const file of ['eas.json', 'app.json', 'package.json']) {
    const source = readFileSync(join(repoRoot, file), 'utf8');
    assert.ok(
      !new RegExp(UMP_TEST_DEVICE_FLAG).test(source),
      `${file} must not name ${UMP_TEST_DEVICE_FLAG}`,
    );
    assert.ok(
      !/\b[0-9A-F]{32}\b/.test(source),
      `${file} looks like it carries a UMP device hash`,
    );
  }
});

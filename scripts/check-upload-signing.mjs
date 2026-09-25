/**
 * Says who signed an artifact, and refuses to let a debug key pass as upload
 * signing (M23).
 *
 * ## The failure this exists for
 *
 * Since 2026-09-04 this project has built its own release APKs, signed with
 * the **debug** keystore through the React Native template's stock
 * `signingConfig`. That is correct for a friend build and for every
 * performance test the owner has run, and it is the thing Google Play rejects
 * at upload.
 *
 * The rejection is not the problem — a rejection is loud. The problem is the
 * twenty minutes before it, spent building and uploading an artifact that was
 * never going to work, and the wrong theory it invites ("the bundle is
 * corrupt", "the package name is wrong"). This reads the certificate and says
 * so in one second.
 *
 * ## Two formats, two tools, and the bug that proves why
 *
 * An **AAB** is a plain signed JAR, which `keytool -printcert -jarfile` reads.
 * A modern **APK** is not: it carries an APK Signature Scheme v2/v3 block and
 * usually no v1 JAR signature at all, so the same command prints
 *
 *     Not a signed jar file
 *
 * and — this is the part worth remembering — **exits 0**. The first version of
 * this script used `keytool` for both, wrapped it in a try/catch, and reported
 * `PASS_UPLOAD_SIGNING` for a debug-signed APK. A checker that fails open is
 * worse than no checker, because it is believed.
 *
 * So: `apksigner` for APKs, `keytool` for AABs, and no output that fails to
 * name a certificate is ever treated as success.
 *
 * Usage:
 *   node scripts/check-upload-signing.mjs <artifact.apk|artifact.aab> [--require-upload]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** The subject baked into every Android debug keystore, everywhere. */
const DEBUG_SUBJECT = 'CN=Android Debug';

function fail(message) {
  console.error(`FAIL_UPLOAD_SIGNING ${message}`);
  process.exit(1);
}

/** The newest `apksigner` in the local SDK, or null. */
function findApksigner() {
  const sdk =
    process.env.ANDROID_HOME ??
    process.env.ANDROID_SDK_ROOT ??
    join(homedir(), 'Library/Android/sdk');
  const buildTools = join(sdk, 'build-tools');
  if (!existsSync(buildTools)) return null;

  // Newest version wins; `apksigner`'s reading of a v2/v3 block is stable
  // across versions, so this is about having one at all rather than which.
  const versions = readdirSync(buildTools).sort().reverse();
  for (const version of versions) {
    const candidate = join(buildTools, version, 'apksigner');
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function run(command, args) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

const args = process.argv.slice(2);
const requireUpload = args.includes('--require-upload');
const artifact = args.find((arg) => !arg.startsWith('--'));

if (artifact === undefined) fail('no artifact given');
if (!existsSync(artifact)) fail(`no such artifact: ${artifact}`);

let output;

if (artifact.endsWith('.apk')) {
  const apksigner = findApksigner();
  if (apksigner === null) {
    fail(
      'no apksigner found in the Android SDK build-tools. Set ANDROID_HOME, or ' +
        'check an AAB instead — this cannot be answered from the file alone.',
    );
  }
  try {
    output = run(apksigner, ['verify', '--print-certs', artifact]);
  } catch (error) {
    fail(`apksigner could not verify ${artifact}: ${error.message}`);
  }
} else {
  try {
    output = run('keytool', ['-printcert', '-jarfile', artifact]);
  } catch (error) {
    fail(`keytool could not read ${artifact}: ${error.message}`);
  }
}

/*
 * The guard the first version of this script did not have.
 *
 * Both tools can print something that is not a certificate and still exit 0.
 * Requiring the words that only appear alongside a real subject line means
 * "no certificate" lands in the same branch as "bad certificate" rather than
 * sailing past the debug-key test on a string that was never there.
 */
const namesACertificate = /certificate DN:|^Owner:/m.test(output);
if (!namesACertificate) {
  fail(
    `no signing certificate found in ${artifact}.\n` +
      `  The tool said: ${output.trim().split('\n')[0] || '(nothing)'}\n` +
      '  An unsigned artifact is not uploadable either.',
  );
}

const subject =
  output.split('\n').find((line) => /certificate DN:|^Owner:/.test(line))?.trim() ?? '';
const digest =
  output.split('\n').find((line) => /SHA-?256/i.test(line))?.trim() ?? '';

console.log(`Artifact: ${artifact}`);
console.log(`  ${subject}`);
if (digest !== '') console.log(`  ${digest}`);

if (output.includes(DEBUG_SUBJECT)) {
  if (requireUpload) {
    fail(
      'signed with the Android debug keystore, which Google Play rejects.\n' +
        '  Configure an upload key in ~/.gradle/gradle.properties — the four property\n' +
        '  names are in plugins/withUploadSigning.js — then run `npx expo prebuild --clean`\n' +
        '  so the plugin re-applies, and build again.',
    );
  }
  console.log('DEBUG_SIGNED — fine for a friend build, rejected by Google Play.');
  process.exit(0);
}

console.log('PASS_UPLOAD_SIGNING — not the debug key.');

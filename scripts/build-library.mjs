/**
 * Rebuilds every production library track from its recorded source.
 *
 * Named `build-candidates.mjs` until M24C, when the owner kept all eleven and
 * they stopped being candidates. The job did not change: it is the executable
 * half of the provenance record, and it outlives the audition it was written
 * for.
 *
 * ## Why the sources are not in the repository
 *
 * The eleven originals are 129 MB of third-party audio. Committing them would
 * put a permanent 129 MB in git history — against AGENTS.md rule 22 — so what
 * is committed instead is everything needed to *get them back*: the direct URL,
 * the SHA-256 of the bytes as published, and the exact conditioning arguments.
 * `assets/audio/music/library/SOURCES.json` holds all three per track.
 *
 * That is the arrangement `docs/assets/AUDIO-SOURCES.md` already describes for
 * `stick_whoosh.wav` and `crowd_applause.wav`, whose packs are likewise absent.
 * The difference is that this one is executable:
 *
 *     npm run build:library -- --fetch     # download, hash-verify
 *     npm run build:library                # re-derive from what is here
 *     npm run build:library -- --verify    # check the tree matches
 *
 * ## What "reproducible" means here, exactly
 *
 * Every entry pins `ratio` and `startSample` rather than letting
 * `condition-track.mjs` re-choose them. The analysis in that script is a
 * heuristic; improving it later must not silently produce different audio from
 * the same manifest. Pinned, the derivation is a pure function of the source
 * bytes — which the SHA-256 fixes — so `--verify` can assert the committed WAV
 * is byte-for-byte what the manifest says it is.
 *
 * A source whose hash does not match is a **hard stop**, never a warning. That
 * is AGENTS.md rule 14 as code: an upstream file that changed under us is a
 * different work, and silently conditioning it would put unverified audio in
 * the tree under a verified track's name.
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { condition } from './condition-track.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'assets/audio/music/library/SOURCES.json';
/** Where a fetched original lands. Git-ignored; see `.gitignore`. */
const SOURCE_DIR = 'assets/audio/music/source';

const args = process.argv.slice(2);
const doFetch = args.includes('--fetch');
const verifyOnly = args.includes('--verify');
const only = (() => {
  const at = args.indexOf('--only');
  return at >= 0 && at + 1 < args.length ? args[at + 1] : null;
})();

function sha256(absolutePath) {
  return createHash('sha256').update(readFileSync(absolutePath)).digest('hex');
}

function fetchSource(entry, absolute) {
  mkdirSync(dirname(absolute), { recursive: true });
  execFileSync(
    'curl',
    ['-sSL', '--max-time', '300', '-A', 'worst-gig-ever/M24B (asset acquisition)', entry.sourceUrl, '-o', absolute],
    { stdio: ['ignore', 'ignore', 'inherit'] },
  );
}

const manifest = JSON.parse(readFileSync(join(repoRoot, MANIFEST), 'utf8'));
const entries = only === null ? manifest : manifest.filter((entry) => entry.id === only);
const problems = [];
let rebuilt = 0;
let verified = 0;

for (const entry of entries) {
  const sourcePath = join(SOURCE_DIR, entry.originalFilename);
  const absoluteSource = join(repoRoot, sourcePath);
  const absoluteOut = join(repoRoot, entry.derivative);

  if (verifyOnly) {
    /*
     * Verification deliberately reads the *derivative*, not the source. A
     * checkout has no sources and must still be able to prove the audio it
     * ships is the audio the manifest describes.
     */
    if (!existsSync(absoluteOut)) {
      problems.push(`${entry.id}: ${entry.derivative} is missing`);
      continue;
    }
    const actual = sha256(absoluteOut);
    const bytes = statSync(absoluteOut).size;
    if (actual !== entry.derivativeSha256) {
      problems.push(`${entry.id}: derivative SHA-256 is ${actual.slice(0, 16)}…, manifest says ${entry.derivativeSha256.slice(0, 16)}…`);
    } else if (bytes !== entry.derivativeBytes) {
      problems.push(`${entry.id}: derivative is ${String(bytes)} bytes, manifest says ${String(entry.derivativeBytes)}`);
    } else {
      verified += 1;
    }
    continue;
  }

  if (!existsSync(absoluteSource)) {
    if (!doFetch) {
      problems.push(`${entry.id}: ${sourcePath} is absent — run with --fetch to download it`);
      continue;
    }
    process.stdout.write(`fetching ${entry.originalFilename}\n`);
    fetchSource(entry, absoluteSource);
  }

  if (!existsSync(absoluteSource)) {
    problems.push(`${entry.id}: download produced no file`);
    continue;
  }

  const actual = sha256(absoluteSource);
  if (actual !== entry.sourceSha256) {
    problems.push(
      `${entry.id}: ${sourcePath} hashes ${actual.slice(0, 16)}…, manifest recorded ${entry.sourceSha256.slice(0, 16)}… — the upstream file is not the one this was built from`,
    );
    continue;
  }

  const result = condition(sourcePath, {
    bars: entry.bars,
    ratio: entry.ratio,
    startSample: entry.startSample,
    mono: entry.mono,
    out: entry.derivative,
  });
  const producedSha = sha256(absoluteOut);
  const matches = producedSha === entry.derivativeSha256;
  rebuilt += 1;
  process.stdout.write(
    `${entry.id.padEnd(18)} ${String(result.channels)}ch ${String(result.bytes).padStart(9)} bytes  ${matches ? 'matches manifest' : `DIFFERS (${producedSha.slice(0, 16)}…)`}\n`,
  );
  if (!matches) problems.push(`${entry.id}: rebuild does not reproduce the recorded SHA-256`);
}

for (const problem of problems) process.stdout.write(`PROBLEM ${problem}\n`);
process.stdout.write(
  `\nSUMMARY tracks=${String(entries.length)} rebuilt=${String(rebuilt)} verified=${String(verified)} problems=${String(problems.length)}\n`,
);
process.stdout.write(problems.length === 0 ? 'PASS_LIBRARY_SOURCES\n' : 'FAIL_LIBRARY_SOURCES\n');
if (problems.length > 0) process.exitCode = 1;

/**
 * Checks that every provenance record still describes the file it names.
 *
 * ## Why this exists
 *
 * On 2026-09-05 six documented claims were found to disagree with the
 * repository in a single day. One of them had cost real gameplay: the show's
 * music was recorded for three milestones as a 90 BPM track that slipped
 * 417 ms per loop, and it is a 120 BPM track. The others were smaller —
 * `crowd_applause.wav` described as an untrimmed 39 s source in three
 * documents after it had been trimmed to 5 s, a milestone listed as gated on a
 * retest that had closed, an audio footprint quoted before a file was added.
 *
 * None of them were lies. Each was true when written and nobody re-measured
 * it. That is the failure mode this guards, and the reason it is a gate rather
 * than a report: a stale provenance record is worse than an absent one,
 * because it is trusted.
 *
 * ## What it checks, and what it deliberately does not
 *
 * Only the **structured provenance blocks** — a `### `filename`` heading
 * followed by `- Format:` / `- SHA-256:` lines. Those are assertions about the
 * file as it is now, so they can be checked without judgement, and AGENTS.md
 * rules 13 and 14 are about exactly these records.
 *
 * Prose is not parsed, on purpose. "It was 39.15 s before the trim" and "it is
 * still 39.15 s" are the same sentence to a regex and opposite claims to a
 * reader. Guarding prose would mean failing the build on correct history,
 * which teaches people to delete history. The mitigation for prose is
 * editorial rather than mechanical: cite the command that reproduces a number
 * (`npm run measure:rounds`, `npm run measure:art`) instead of restating the
 * number, so a reader can re-measure instead of trusting.
 *
 * Usage:
 *   node scripts/audit-provenance.mjs
 *   node scripts/audit-provenance.mjs --require-clean   # non-zero on drift
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requireClean = process.argv.includes('--require-clean');

/** Every markdown file under docs/, plus the status page. */
function markdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

/** Where a bare filename in a heading might live. */
const SEARCH_ROOTS = [
  'assets/audio/music/runtime',
  /*
   * The production music library. Added the day the tracks arrived as M24B
   * candidates and repointed at `library/` when M24C promoted them, because a
   * provenance block whose file this cannot find is not checked at all — it
   * silently reports zero claims rather than a failure, which is the worst of
   * the three possible outcomes for exactly the assets rules 13 and 14 exist
   * for. A directory rename that this list does not follow is therefore how
   * eleven shipped tracks would stop being audited without anything going red.
   */
  'assets/audio/music/library',
  'assets/audio/sfx',
  'assets/art',
  'assets',
];

function locate(name) {
  if (name.includes('/')) return existsSync(join(repoRoot, name)) ? name : null;
  for (const root of SEARCH_ROOTS) {
    const direct = join(root, name);
    if (existsSync(join(repoRoot, direct))) return direct;
  }
  // one level of nesting under assets/art/*
  const artRoot = join(repoRoot, 'assets/art');
  if (existsSync(artRoot)) {
    for (const entry of readdirSync(artRoot, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const candidate = join('assets/art', entry.name, name);
      if (existsSync(join(repoRoot, candidate))) return candidate;
    }
  }
  return null;
}

/** Seconds of a 16-bit PCM WAVE, read from its own header. */
function wavSeconds(absolute) {
  const buffer = readFileSync(absolute);
  if (buffer.toString('ascii', 0, 4) !== 'RIFF') return null;
  const channels = buffer.readUInt16LE(22);
  const rate = buffer.readUInt32LE(24);
  const bits = buffer.readUInt16LE(34);
  // Walk the chunk list rather than assuming data begins at 44.
  let offset = 12;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    if (id === 'data') return size / (rate * channels * (bits / 8));
    offset += 8 + size + (size % 2);
  }
  return null;
}

const findings = [];
let checked = 0;

for (const file of [...markdownFiles(join(repoRoot, 'docs')), join(repoRoot, 'project-status.md')]) {
  const lines = readFileSync(file, 'utf8').split('\n');
  const shown = relative(repoRoot, file);
  let subject = null;

  for (let i = 0; i < lines.length; i += 1) {
    const heading = /^#{2,4}\s+`([A-Za-z0-9_./-]+\.[a-z0-9]+)`/.exec(lines[i]);
    if (heading) {
      subject = locate(heading[1]);
      continue;
    }
    if (/^#{1,4}\s/.test(lines[i])) {
      // Any other heading ends the block, so a claim can never be attributed
      // to a file from a previous section.
      subject = null;
      continue;
    }
    /*
     * Some records name their file on a line rather than in the heading —
     * "Local filename", "Intended local path", "Intended runtime local path".
     * A heading like "### Rock Theme Song" names a work, not a file, so
     * without this the third-party entries would go unchecked and they are
     * exactly the ones rules 13 and 14 exist for.
     */
    const named = /^-\s*(?:Local filename|Intended (?:runtime )?local path|Runtime local path):\s*`([A-Za-z0-9_./-]+\.[a-z0-9]+)`/.exec(lines[i]);
    if (named) {
      subject = locate(named[1]);
      continue;
    }
    if (!subject) continue;
    const absolute = join(repoRoot, subject);

    const sha = /^-\s*SHA-256:\s*`([0-9a-f]{40,64})`/.exec(lines[i]);
    if (sha) {
      checked += 1;
      const real = createHash('sha256').update(readFileSync(absolute)).digest('hex');
      if (!real.startsWith(sha[1])) {
        findings.push(`${shown}:${i + 1} ${subject} SHA-256 recorded ${sha[1].slice(0, 16)}…, file is ${real.slice(0, 16)}…`);
      }
    }

    const format = /^-\s*Format:.*$/.exec(lines[i]);
    if (format) {
      const bytes = /([\d,]{4,})\s*bytes/.exec(lines[i]);
      if (bytes) {
        checked += 1;
        const real = statSync(absolute).size;
        const claimed = Number(bytes[1].replace(/,/g, ''));
        if (real !== claimed) {
          findings.push(`${shown}:${i + 1} ${subject} recorded ${claimed} bytes, file is ${real}`);
        }
      }
      const seconds = /([\d.]+)\s*s\b/.exec(lines[i]);
      if (seconds && subject.endsWith('.wav')) {
        const real = wavSeconds(absolute);
        if (real !== null) {
          checked += 1;
          if (Math.abs(real - Number(seconds[1])) > 0.01) {
            findings.push(`${shown}:${i + 1} ${subject} recorded ${seconds[1]}s, file is ${real.toFixed(6)}s`);
          }
        }
      }
    }
  }
}

for (const finding of findings) console.log(`DRIFT ${finding}`);
console.log(`\nSUMMARY provenance claims checked=${String(checked)} drifted=${String(findings.length)}`);
if (findings.length === 0) {
  console.log('PASS_PROVENANCE_CURRENT');
} else {
  console.log('PROVENANCE_STALE');
  if (requireClean) process.exitCode = 1;
}

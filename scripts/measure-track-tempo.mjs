/**
 * Measures a track's **musical pulse**, and gates the catalogue on the result.
 *
 * ## Why this exists
 *
 * On 2026-09-05 the project discovered that `rock_theme_song_loop.wav` — used
 * for three milestones under two Groove-scored stages — is a **120 BPM** track.
 * It had been recorded as a 90 BPM track that slipped 417 ms per loop. Nobody
 * had measured its pulse; the number was arithmetic on the file's 21.75 s
 * length against a 90 BPM grid.
 *
 * The check that was supposed to catch it measured **duration divisibility**,
 * and a duration cannot see a pulse. Trimming that file to 21.333 s would have
 * turned every check in the repository green without changing a note a player
 * hears. Nothing below reads a file's duration for any purpose except iterating
 * over it.
 *
 * ## The question this tool actually answers
 *
 * Not "what tempo is this?" but:
 *
 *     Do this file's own onsets support the grid the game plays on?
 *
 * That is the narrower question, it is the one the project needs, and it is far
 * more robust than blind tempo estimation — because a track can have an
 * ambiguous tempo and still be unambiguously *wrong* for 90 BPM. `gridScore`
 * and `gridRank` are that answer and they are what `--require-locked` gates on.
 * `bpm` and `gridMargin` are reported alongside. The margin is advisory: a thin
 * one means this tool cannot separate the grid from a rival reading, and the
 * honest response to that is a human ear rather than a rounder number.
 *
 * ## How
 *
 *   1. **Onset envelope.** 1024-sample Hann frames, hop 256 (172.3 fps at
 *      44.1 kHz). Per frame, the summed positive change in linear magnitude
 *      since the previous frame — energy that *newly appears*, which rises on a
 *      stick or a pick and stays flat through a sustain. Then a 1 s local mean
 *      is subtracted and the result half-wave rectified, so a loud chorus does
 *      not outvote a quiet verse.
 *   2. **Autocorrelation** of that envelope, normalised to lag 0.
 *   3. **Metrical comb.** A candidate beat period is scored by the mean
 *      autocorrelation at 1, 2, 4 and 8 times that period — the beat, two
 *      beats, the bar and two bars of 4/4.
 *
 * The comb is what resolves the octave ambiguity that defeats a plain
 * autocorrelation peak. A bed with eighth-note hats has a huge peak at half its
 * beat period; that candidate is then forced to explain 2, 4 and 8 times *its*
 * period, which are the wrong places, and it loses. Both generated beds measure
 * 90.0 and not 180 for exactly this reason.
 *
 * ## What it cannot do, stated because it matters
 *
 * A metrical comb finds the strongest *periodicity*, and in some music that is
 * not the beat. `showTheme` is such a track and is documented in
 * `docs/decisions/0013-tempo-evidence-for-external-tracks.md`: its notated tempo
 * is 120 BPM (proved from the committed source MIDI — one tempo event,
 * 500 000 µs per quarter, 4/4) but its riff is a five-sixteenth cycle repeating
 * every 625 ms, and its autocorrelation at the notated 500 ms beat is **0.04**
 * against **0.30** at 625 ms. Every onset detector tried — magnitude flux, log
 * flux, band-limited flux, complex-domain — agrees. So this tool reports it at
 * ~96 BPM, which is the honest reading of the audio.
 *
 * That is not a failure of the gate. What the gate needs to know about
 * `showTheme` is that it is **not** 90 BPM, and the measurement says so
 * emphatically: its autocorrelation at the 90 BPM beat period is ~0, against
 * 0.5-0.8 for the beds. A tuned detector that reported 120 here would be a
 * detector fitted to one file, which is the class of mistake this whole
 * milestone exists to stop making.
 *
 * Usage:
 *   node scripts/measure-track-tempo.mjs                    # every catalogue track
 *   node scripts/measure-track-tempo.mjs <file.wav> ...     # ad hoc
 *   node scripts/measure-track-tempo.mjs --require-locked   # non-zero on drift
 *   node scripts/measure-track-tempo.mjs --json
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RHYTHM } from '../game/config/rhythm.ts';
import {
  MUSIC_TRACKS,
  TEMPO_GRID_FLOOR,
  TEMPO_MAX_CONDITIONING,
  TEMPO_MIN_MARGIN,
  TEMPO_TOLERANCE_BPM,
  conformingRatio,
  isGrooveQualified,
  trackIds,
} from '../game/audio/musicCatalogue.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const requireLocked = args.includes('--require-locked');
const asJson = args.includes('--json');
const explicitFiles = args.filter((argument) => !argument.startsWith('--'));

/* ------------------------------------------------------------------ *
 * WAVE reading
 * ------------------------------------------------------------------ */

/** Mono Float32 samples in [-1, 1], plus the sample rate. */
export function readWavMono(absolutePath) {
  const bytes = readFileSync(absolutePath);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }

  const channels = bytes.readUInt16LE(22);
  const sampleRate = bytes.readUInt32LE(24);
  const bits = bytes.readUInt16LE(34);
  if (bits !== 16 && bits !== 8) throw new Error(`unsupported bit depth ${String(bits)}`);

  // Walk the chunk list; encoders insert LIST and fact chunks, and a fixed
  // offset of 44 reads those as audio.
  let offset = 12;
  let dataStart = -1;
  let dataLength = 0;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === 'data') {
      dataStart = offset + 8;
      dataLength = Math.min(size, bytes.length - dataStart);
      break;
    }
    offset += 8 + size + (size % 2);
  }
  if (dataStart < 0) throw new Error('no data chunk');

  const bytesPerSample = bits / 8;
  const frames = Math.floor(dataLength / (bytesPerSample * channels));
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i += 1) {
    let sum = 0;
    for (let c = 0; c < channels; c += 1) {
      const at = dataStart + (i * channels + c) * bytesPerSample;
      sum += bits === 16 ? bytes.readInt16LE(at) / 32768 : (bytes.readUInt8(at) - 128) / 128;
    }
    mono[i] = sum / channels;
  }
  return { samples: mono, sampleRate };
}

/* ------------------------------------------------------------------ *
 * Onset envelope
 * ------------------------------------------------------------------ */

const FFT_SIZE = 1024;
const HOP = 256;
/** Seconds of local mean subtracted from the flux, either side. */
const NORMALISE_HALF_SECONDS = 0.5;

/** In-place iterative radix-2 FFT. */
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      let swap = re[i]; re[i] = re[j]; re[j] = swap;
      swap = im[i]; im[i] = im[j]; im[j] = swap;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wRe = Math.cos(angle);
    const wIm = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curRe = 1;
      let curIm = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const aRe = re[i + k];
        const aIm = im[i + k];
        const bRe = re[i + k + len / 2] * curRe - im[i + k + len / 2] * curIm;
        const bIm = re[i + k + len / 2] * curIm + im[i + k + len / 2] * curRe;
        re[i + k] = aRe + bRe;
        im[i + k] = aIm + bIm;
        re[i + k + len / 2] = aRe - bRe;
        im[i + k + len / 2] = aIm - bIm;
        const nextRe = curRe * wRe - curIm * wIm;
        curIm = curRe * wIm + curIm * wRe;
        curRe = nextRe;
      }
    }
  }
}

const HANN = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i += 1) {
  HANN[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FFT_SIZE - 1));
}

function onsetEnvelope(samples, sampleRate) {
  const fps = sampleRate / HOP;
  const frameCount = Math.max(0, Math.floor((samples.length - FFT_SIZE) / HOP) + 1);
  if (frameCount < 64) return { envelope: new Float32Array(0), fps };

  const bins = FFT_SIZE / 2;
  let previous = new Float32Array(bins);
  const flux = new Float32Array(frameCount);
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);

  for (let f = 0; f < frameCount; f += 1) {
    const start = f * HOP;
    for (let i = 0; i < FFT_SIZE; i += 1) {
      re[i] = samples[start + i] * HANN[i];
      im[i] = 0;
    }
    fft(re, im);

    const magnitude = new Float32Array(bins);
    let sum = 0;
    for (let k = 0; k < bins; k += 1) {
      magnitude[k] = Math.hypot(re[k], im[k]);
      const rise = magnitude[k] - previous[k];
      if (rise > 0) sum += rise;
    }
    flux[f] = sum;
    previous = magnitude;
  }

  const half = Math.max(1, Math.round(fps * NORMALISE_HALF_SECONDS));
  const envelope = new Float32Array(frameCount);
  let window = 0;
  for (let f = 0; f <= Math.min(frameCount - 1, half); f += 1) window += flux[f];
  for (let f = 0; f < frameCount; f += 1) {
    const lo = Math.max(0, f - half);
    const hi = Math.min(frameCount - 1, f + half);
    if (f > 0) {
      const entering = f + half;
      const leaving = f - half - 1;
      if (entering < frameCount) window += flux[entering];
      if (leaving >= 0) window -= flux[leaving];
    }
    envelope[f] = Math.max(0, flux[f] - window / (hi - lo + 1));
  }
  return { envelope, fps };
}

/* ------------------------------------------------------------------ *
 * Metrical comb over the autocorrelation
 * ------------------------------------------------------------------ */

const BPM_MIN = 60;
const BPM_MAX = 200;
const BPM_STEP = 0.2;
/**
 * The 4/4 metrical tree: the beat, two beats, the bar, and two bars.
 *
 * This is the whole octave-ambiguity fix. A candidate at twice the true tempo
 * has a strong peak at its own period — off-beat hats — but is then required to
 * explain 2, 4 and 8 times *that*, which are the half-bar and bar of a metre
 * the music does not have, and it fails there.
 *
 * Odd harmonics are deliberately absent. Including 3 and 6 lets a triplet or an
 * odd-grouping riff score as if it were the metre, which is precisely how a
 * five-sixteenth guitar figure outvotes the beat it is played over.
 */
const COMB_HARMONICS = [1, 2, 4, 8];
/** Peaks nearer than this are the same reading of the pulse, not rivals. */
const PEAK_SEPARATION_BPM = 3;

function autocorrelation(envelope, maxLag) {
  const n = envelope.length;
  let mean = 0;
  for (const value of envelope) mean += value;
  mean /= n;

  const out = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag += 1) {
    let sum = 0;
    for (let i = 0; i + lag < n; i += 1) sum += (envelope[i] - mean) * (envelope[i + lag] - mean);
    out[lag] = sum / (n - lag);
  }
  const zero = out[0] || 1;
  for (let i = 0; i <= maxLag; i += 1) out[i] /= zero;
  return out;
}

function interpolate(series, position) {
  if (position < 0 || position >= series.length - 1) return 0;
  const i = Math.floor(position);
  const t = position - i;
  return series[i] * (1 - t) + series[i + 1] * t;
}

/** Mean autocorrelation across the 4/4 tree for one candidate tempo. */
function combScore(acf, fps, maxLag, bpm) {
  const period = (60 * fps) / bpm;
  let sum = 0;
  let used = 0;
  for (const harmonic of COMB_HARMONICS) {
    const lag = period * harmonic;
    if (lag > maxLag) continue;
    sum += interpolate(acf, lag);
    used += 1;
  }
  return used === 0 ? null : sum / used;
}

/**
 * Where the first beat falls, by sliding a beat train over the envelope.
 *
 * Only ever run at one tempo, so it costs nothing, and M24B needs it: a
 * derivative has to be cut on the downbeat, not wherever the file happens to
 * start.
 */
function downbeatSeconds(envelope, fps, bpm) {
  const period = (60 * fps) / bpm;
  let best = { score: -Infinity, phase: 0 };
  for (let phase = 0; phase < period; phase += 0.5) {
    let sum = 0;
    let beats = 0;
    for (let position = phase; position < envelope.length - 1; position += period) {
      sum += interpolate(envelope, position);
      beats += 1;
    }
    if (beats < 4) continue;
    const score = sum / beats;
    if (score > best.score) best = { score, phase };
  }
  return best.score === -Infinity ? null : best.phase / fps;
}

/**
 * Is this tempo the game's grid, or the same metre read at another level?
 *
 * Half and double only. A track at 180 BPM lands a beat on every 90 BPM beat
 * and one in between; a track at 45 lands on every other one. Both lock to the
 * game clock. A track at 96 or 120 does not, and that is the distinction the
 * whole gate turns on.
 *
 * The tolerance scales with the multiple, because a 1.5 BPM error at 90 is the
 * same proportional error as 3 BPM at 180.
 */
export function isGridOctave(bpm, gridBpm = RHYTHM.bpm, tolerance = TEMPO_TOLERANCE_BPM) {
  return [0.5, 1, 2].some((multiple) => Math.abs(bpm - gridBpm * multiple) <= tolerance * multiple);
}

/**
 * The full measurement of one signal.
 *
 * `gridScore` and `gridRank` are about `RHYTHM.bpm` specifically and are what
 * the gate reads; `bpm` is the unconstrained best fit. See the header for why
 * those are different questions.
 */
export function measureSignal(samples, sampleRate, gridBpm = RHYTHM.bpm) {
  const unmeasurable = {
    bpm: null,
    gridScore: 0,
    gridRank: null,
    gridMargin: 0,
    gridOctave: false,
    downbeat: null,
    candidates: [],
  };
  const { envelope, fps } = onsetEnvelope(samples, sampleRate);
  if (envelope.length < 128) {
    return { ...unmeasurable, reason: 'too short to measure' };
  }

  let energy = 0;
  for (const value of envelope) energy += value;
  if (!(energy > 0)) {
    return { ...unmeasurable, reason: 'no onsets detected' };
  }

  const maxLag = Math.min(envelope.length - 2, Math.floor(Math.min(fps * 5, envelope.length / 2)));
  const acf = autocorrelation(envelope, maxLag);

  const scored = [];
  for (let bpm = BPM_MIN; bpm <= BPM_MAX + 1e-9; bpm += BPM_STEP) {
    const rounded = Math.round(bpm * 10) / 10;
    const score = combScore(acf, fps, maxLag, rounded);
    if (score !== null) scored.push({ bpm: rounded, score });
  }
  if (scored.length === 0) {
    return { ...unmeasurable, reason: 'no measurable candidates' };
  }

  scored.sort((a, b) => b.score - a.score);
  const peaks = [];
  for (const candidate of scored) {
    if (peaks.some((peak) => Math.abs(peak.bpm - candidate.bpm) < PEAK_SEPARATION_BPM)) continue;
    peaks.push(candidate);
    if (peaks.length === 8) break;
  }

  const best = peaks[0];

  /*
   * The game's own grid, scored on exactly the same scale as every rival.
   *
   * `rivals` is the load-bearing filter: a candidate at half or double the
   * grid is **not** a disagreement about the grid. A 180 BPM track played
   * against a 90 BPM clock puts a beat on every beat the player taps; it is the
   * same metre read at a different level, and counting it as a competitor would
   * penalise every correctly detected track — a bed with eighth-note hats
   * always has its own octave as its nearest rival. What matters is whether
   * some *incompatible* metre explains the file better.
   */
  const gridScore = combScore(acf, fps, maxLag, gridBpm) ?? 0;
  const rivals = peaks.filter((peak) => !isGridOctave(peak.bpm, gridBpm));
  let gridRank = 1;
  for (const rival of rivals) if (rival.score > gridScore) gridRank += 1;
  const bestRival = rivals.length === 0 ? null : rivals[0].score;

  /**
   * How far the grid is ahead of the best incompatible reading.
   *
   * Reported rather than folded into a pass/fail, because a thin margin does
   * not mean a track is wrong — it means this tool cannot tell, and the honest
   * response to that is a human ear rather than a rounder number.
   */
  const gridMargin = bestRival === null ? gridScore : gridScore - bestRival;

  return {
    bpm: best.bpm,
    gridScore,
    gridRank,
    gridMargin,
    gridOctave: isGridOctave(best.bpm, gridBpm),
    downbeat: downbeatSeconds(envelope, fps, best.bpm),
    candidates: peaks.map((peak) => ({ bpm: peak.bpm, score: peak.score })),
    reason: null,
  };
}

export function measureFile(absolutePath, gridBpm = RHYTHM.bpm) {
  const { samples, sampleRate } = readWavMono(absolutePath);
  return measureSignal(samples, sampleRate, gridBpm);
}

/* ------------------------------------------------------------------ *
 * The gate
 * ------------------------------------------------------------------ */

/**
 * Whether a file may back a slot whose beats are scored, and why not.
 *
 * Exported so `tests/audioContract.test.ts` asserts the same rule the command
 * line enforces, rather than a paraphrase of it.
 */
export function gradeAgainstGrid(measurement) {
  const problems = [];
  const advisories = [];

  if (measurement.bpm === null) {
    problems.push(measurement.reason ?? 'not measurable');
    return { ok: false, problems, advisories };
  }
  if (measurement.gridScore < TEMPO_GRID_FLOOR) {
    problems.push(
      `its onsets do not support a ${String(RHYTHM.bpm)} BPM grid (agreement ${measurement.gridScore.toFixed(3)}, floor ${String(TEMPO_GRID_FLOOR)})`,
    );
  }
  if (measurement.gridRank !== 1) {
    problems.push(
      `${String(measurement.gridRank - 1)} incompatible tempo(s) explain it better than ${String(RHYTHM.bpm)} BPM, best ${measurement.bpm.toFixed(1)}`,
    );
  }
  if (!measurement.gridOctave) {
    problems.push(
      `its pulse is ${measurement.bpm.toFixed(1)} BPM, which is neither ${String(RHYTHM.bpm)} nor an octave of it`,
    );
  }
  /*
   * Not a problem: an advisory. A thin margin means this tool cannot separate
   * the grid from a rival, which is a reason to ask a person, not a reason to
   * call the track wrong. `conditioned` evidence carries `ownerConfirmed` for
   * exactly this case.
   */
  if (measurement.gridMargin < TEMPO_MIN_MARGIN) {
    advisories.push(
      `the grid leads its best incompatible rival by only ${measurement.gridMargin.toFixed(3)} (floor ${String(TEMPO_MIN_MARGIN)}) — needs a human ear`,
    );
  }
  return { ok: problems.length === 0, problems, advisories };
}

function main() {
  const rows = [];
  const findings = [];

  const targets =
    explicitFiles.length > 0
      ? explicitFiles.map((file) => ({ id: null, file }))
      : trackIds().map((id) => ({ id, file: MUSIC_TRACKS[id].file }));

  for (const target of targets) {
    const absolute = resolve(repoRoot, target.file);
    if (!existsSync(absolute)) {
      findings.push(`${target.file} does not exist`);
      continue;
    }

    let measurement;
    try {
      measurement = measureFile(absolute);
    } catch (error) {
      findings.push(`${target.file} could not be measured: ${String(error)}`);
      continue;
    }

    const track = target.id === null ? null : MUSIC_TRACKS[target.id];
    const grade = gradeAgainstGrid(measurement);

    rows.push({
      id: target.id ?? relative(repoRoot, absolute),
      file: relative(repoRoot, absolute),
      evidence: track === null ? 'ad hoc' : track.evidence.kind,
      bpm: measurement.bpm,
      gridMargin: measurement.gridMargin,
      gridOctave: measurement.gridOctave,
      advisories: grade.advisories,
      gridScore: measurement.gridScore,
      gridRank: measurement.gridRank,
      downbeat: measurement.downbeat,
      qualifies: grade.ok,
      problems: grade.problems,
      grooveQualified: track === null ? null : isGrooveQualified(target.id),
      candidates: measurement.candidates.slice(0, 4),
    });

    if (track === null) continue;

    if (track.evidence.kind === 'unverified') {
      /*
       * The other direction, and it is not pedantry. A track parked as
       * unverified that in fact measures clean at RHYTHM.bpm is a track being
       * kept out of the library for no reason — and, more importantly, it means
       * the catalogue is carrying a claim nobody has revisited.
       */
      if (grade.ok) {
        findings.push(
          `${target.id} is recorded as unverified but measures ${measurement.bpm.toFixed(1)} BPM cleanly; the record is stale`,
        );
      }
      continue;
    }

    if (!grade.ok) {
      findings.push(`${target.id} claims ${track.evidence.kind} tempo evidence but ${grade.problems.join('; ')}`);
    }

    if (track.evidence.kind === 'conditioned' && measurement.bpm !== null) {
      /*
       * Corrected at M24B, on the first real conditioned tracks.
       *
       * This used to compare `measuredBpm` against *this file's* measurement
       * and flag a difference over `TEMPO_TOLERANCE_BPM`. That check could
       * only ever fail. `measuredBpm` is the **source's** pulse — 95 BPM for a
       * track conditioned to 90 — and the derivative measures 90 by
       * construction, because conditioning it to 90 is what conditioning is.
       * Run against M24B's eleven candidates the old check reported all eleven
       * as drift, which is the tool disagreeing with its own documented model
       * rather than the catalogue disagreeing with the tree.
       *
       * What is worth checking, and is checked here, is the claim the field
       * actually makes: that the recorded source pulse is one a conditioning
       * command could plausibly have brought to the grid. A catalogue entry
       * saying a 140 BPM source became this 90 BPM file is either a typo or a
       * transformation nobody should ship, and both are worth failing on.
       *
       * The derivative's own standing is not weakened by this: it still has to
       * pass `gradeAgainstGrid` above, exactly as before.
       */
      const recorded = track.evidence.measuredBpm;
      const ratio = conformingRatio(recorded, RHYTHM.bpm);
      if (Math.abs(ratio - 1) > TEMPO_MAX_CONDITIONING) {
        findings.push(
          `${target.id} records a source at ${recorded.toFixed(1)} BPM, which needs a x${ratio.toFixed(3)} change to reach ${String(RHYTHM.bpm)} — beyond the ${String(TEMPO_MAX_CONDITIONING * 100)}% conditioning ceiling`,
        );
      }
    }
  }

  if (asJson) {
    process.stdout.write(`${JSON.stringify({ gridBpm: RHYTHM.bpm, rows, findings }, null, 2)}\n`);
  } else {
    process.stdout.write(`\n## Measured pulse (game grid ${String(RHYTHM.bpm)} BPM)\n\n`);
    const header = 'track            evidence     best fit    margin   grid  rank  downbeat  groove';
    process.stdout.write(`${header}\n${'-'.repeat(header.length)}\n`);
    for (const row of rows) {
      process.stdout.write(
        [
          row.id.padEnd(16).slice(0, 16),
          row.evidence.padEnd(12),
          (row.bpm === null ? 'n/a' : `${row.bpm.toFixed(1)} BPM`).padStart(9),
          row.gridMargin.toFixed(3).padStart(8),
          row.gridScore.toFixed(3).padStart(7),
          String(row.gridRank ?? '-').padStart(6),
          (row.downbeat === null ? '-' : `${row.downbeat.toFixed(3)}s`).padStart(10),
          '  ',
          row.grooveQualified === null ? '-' : row.grooveQualified ? 'yes' : 'no',
        ].join(''),
      );
      process.stdout.write('\n');
      const rivals = row.candidates
        .slice(1)
        .map((candidate) => `${candidate.bpm.toFixed(1)} (${candidate.score.toFixed(3)})`)
        .join(', ');
      if (rivals) process.stdout.write(`                 rivals: ${rivals}\n`);
      for (const problem of row.problems) process.stdout.write(`                 REJECTED: ${problem}\n`);
      for (const advisory of row.advisories) process.stdout.write(`                 advisory: ${advisory}\n`);
    }

    process.stdout.write(`\nSUMMARY tracks=${String(rows.length)} findings=${String(findings.length)}\n`);
    for (const finding of findings) process.stdout.write(`DRIFT ${finding}\n`);
    process.stdout.write(findings.length === 0 ? 'PASS_TEMPO_EVIDENCE\n' : 'FAIL_TEMPO_EVIDENCE\n');
  }

  if (requireLocked && findings.length > 0) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();

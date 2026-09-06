/**
 * Turns an external recording into a gameplay derivative that sits on the grid.
 *
 * ## Why this is a script and not a note in a document
 *
 * M24A's rule for an external track is `conditioned` evidence: a source hash, a
 * **reproducible command**, and a measured pulse. A derivative nobody can
 * rebuild is a claim rather than evidence, and "I trimmed it in an editor until
 * it sounded right" is exactly the class of provenance that
 * `npm run audit:provenance` exists to stop trusting.
 *
 * This script *is* that command, in the same way `scripts/make-groove-bed.mjs`
 * is the groove bed's. Given the same source bytes and the same pinned
 * arguments it writes the same output bytes, and the invocation recorded in
 * `docs/assets/AUDIO-SOURCES.md` carries those arguments explicitly:
 *
 *   node scripts/condition-track.mjs <source> --out <path> \
 *     --ratio <r> --start-sample <n> --bars <n>
 *
 * **Pinned on purpose.** Without `--ratio` and `--start-sample` the tool
 * *chooses* them by analysing the audio, and a later improvement to that
 * analysis would silently produce a different file from the same command. The
 * recorded command therefore always states what was chosen, so re-running it
 * reproduces the committed bytes rather than today's best guess.
 *
 * ## What it decides, in order
 *
 *   1. **Rate.** A source at 95 BPM is conformed to `RHYTHM.bpm` by `atempo`,
 *      never by trimming to a length that happens to divide. Duration is not
 *      tempo — that mistake cost this project three milestones and is written
 *      up in `docs/decisions/0013-tempo-evidence-for-external-tracks.md`.
 *   2. **Phase.** The beat offset, then which of the four beats is the *bar*
 *      line. A cut on beat 3 gives a derivative that starts mid-bar and loops
 *      into a downbeat arriving a half-bar early.
 *   3. **Window.** Which whole bars to take. Not the first ones: an intro is
 *      usually the least representative part of a song and often the quietest.
 *   4. **Seam.** A sampler-style loop crossfade, described at `crossfadeWrap`.
 *   5. **Gain.** Peak-normalised to `PEAK_TARGET`, the level both generated beds
 *      already sit at, so the click stays the clearest thing in the mix.
 *
 * ## What it does not do
 *
 * It does not decide whether a track is any good. It cannot hear the seam it
 * measures, and a window that scores well can still cut a shout in half.
 * `ownerConfirmed` on `conditioned` evidence is the answer to that, and this
 * tool never sets it.
 *
 * Usage:
 *   node scripts/condition-track.mjs <source> --out <path> [--bars 16] [--mono]
 *   node scripts/condition-track.mjs <source> --ratio 0.947368 --start-sample 123456 --out <path>
 *   node scripts/condition-track.mjs <source> --dry-run --json
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { RHYTHM } from '../game/config/rhythm.ts';
import { measureSignal } from './measure-track-tempo.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * The level both generated beds peak at.
 *
 * Peak rather than integrated loudness, deliberately. A 43 s clip is too short
 * for a meaningful loudness reading and a tool that returns one anyway reports
 * confident nonsense, so the beds set a peak and every conditioned track
 * matches it. Whether the library then *sounds* level is an owner audition
 * question, which is the honest place for it.
 */
export const PEAK_TARGET = 0.72;

/** The runtime's sample rate. Fixed so every sample index means one thing. */
const SAMPLE_RATE = 44_100;

/** 4/4 throughout. The game's grid has no other metre. */
const BEATS_PER_BAR = 4;

/**
 * The loop crossfade, in samples (~34 ms).
 *
 * Long enough to bridge a cymbal or a guitar sustain across the wrap, short
 * enough that it replaces only a sliver of the final beat's decay. See
 * `crossfadeWrap`.
 */
const CROSSFADE = 1_500;

/** Analysis frame hop, matching `measure-track-tempo.mjs`. */
const FFT_HOP = 256;

/* ------------------------------------------------------------------ *
 * WAVE
 * ------------------------------------------------------------------ */

/** All channels, de-interleaved, as Float32 in [-1, 1]. */
function readWavChannels(absolutePath) {
  const bytes = readFileSync(absolutePath);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('not a RIFF/WAVE file');
  }
  const channels = bytes.readUInt16LE(22);
  const sampleRate = bytes.readUInt32LE(24);
  const bits = bytes.readUInt16LE(34);
  if (bits !== 16) throw new Error(`expected 16-bit intermediate, got ${String(bits)}`);

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

  const frames = Math.floor(dataLength / (2 * channels));
  const planes = Array.from({ length: channels }, () => new Float32Array(frames));
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      planes[c][i] = bytes.readInt16LE(dataStart + (i * channels + c) * 2) / 32768;
    }
  }
  return { planes, sampleRate, frames };
}

function writeWav(absolutePath, planes, sampleRate) {
  const channels = planes.length;
  const frames = planes[0].length;
  const dataBytes = frames * channels * 2;
  const buffer = Buffer.alloc(44 + dataBytes);
  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * channels * 2, 28);
  buffer.writeUInt16LE(channels * 2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataBytes, 40);
  for (let i = 0; i < frames; i += 1) {
    for (let c = 0; c < channels; c += 1) {
      const clamped = Math.max(-1, Math.min(1, planes[c][i]));
      // Round-half-away-from-zero, then clamp to the 16-bit range: 1.0 would
      // otherwise write 32768 and wrap to the largest negative sample.
      const value = Math.max(-32768, Math.min(32767, Math.round(clamped * 32767)));
      buffer.writeInt16LE(value, 44 + (i * channels + c) * 2);
    }
  }
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, buffer);
  return buffer.length;
}

/* ------------------------------------------------------------------ *
 * ffmpeg
 * ------------------------------------------------------------------ */

function ffmpeg(argv) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...argv]);
}

function ffprobeJson(file) {
  return JSON.parse(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'stream=codec_name,sample_rate,channels:format=duration', '-of', 'json', file],
      { encoding: 'utf8' },
    ),
  );
}

/* ------------------------------------------------------------------ *
 * Analysis
 * ------------------------------------------------------------------ */

/**
 * Rise-in-energy per frame, on the tempo tool's frame grid.
 *
 * Deliberately simpler than that tool's spectral flux. The tempo is already
 * established by `measureSignal` before this runs, and all this is used for is
 * comparing accent strength between beats and between windows of the *same*
 * file — a relative measurement, where a broadband energy rise is as good a
 * discriminator and far cheaper.
 */
function energyEnvelope(samples) {
  const frames = Math.max(0, Math.floor((samples.length - 1024) / FFT_HOP) + 1);
  const envelope = new Float32Array(frames);
  let previous = 0;
  for (let f = 0; f < frames; f += 1) {
    let sum = 0;
    for (let i = f * FFT_HOP; i < f * FFT_HOP + 1024; i += 1) sum += samples[i] * samples[i];
    const energy = Math.sqrt(sum / 1024);
    envelope[f] = Math.max(0, energy - previous);
    previous = energy;
  }
  return envelope;
}

function interpolate(series, position) {
  if (position < 0 || position >= series.length - 1) return 0;
  const i = Math.floor(position);
  const t = position - i;
  return series[i] * (1 - t) + series[i + 1] * t;
}

/**
 * Which of the four beats is the bar line.
 *
 * Summed over the whole file rather than sampled near the start, so an intro
 * with a different accent pattern cannot decide it. In 4/4 rock the downbeat
 * carries the kick and usually the chord change, so it wins in aggregate even
 * though individual bars vary — but the margin is often thin, which is why the
 * strengths are reported rather than just the winner.
 */
function barPhase(envelope, fps, beatPhaseFrames) {
  const period = (60 * fps) / RHYTHM.bpm;
  const sums = new Array(BEATS_PER_BAR).fill(0);
  let beat = 0;
  for (let position = beatPhaseFrames; position < envelope.length - 1; position += period) {
    sums[beat % BEATS_PER_BAR] += interpolate(envelope, position);
    beat += 1;
  }
  let best = 0;
  for (let i = 1; i < BEATS_PER_BAR; i += 1) if (sums[i] > sums[best]) best = i;
  return { phase: best, strengths: sums, beats: beat };
}

/**
 * How far the last sample sits from the first, against the local texture.
 *
 * Relative rather than absolute, because a step of 300 is nothing in a loud
 * passage and audible in a quiet one — the same measurement `show_bed_90.wav`
 * was held to (step 365 against a typical delta of 3 344).
 */
function seamStep(samples, start, end) {
  let sum = 0;
  let count = 0;
  for (const at of [start, end - 400]) {
    for (let i = Math.max(1, at); i < Math.min(samples.length, at + 400); i += 1) {
      sum += Math.abs(samples[i] - samples[i - 1]);
      count += 1;
    }
  }
  const typical = count === 0 ? 1e-9 : Math.max(sum / count, 1e-9);
  return Math.abs(samples[start] - samples[end - 1]) / typical;
}

function rms(samples, at, span) {
  let sum = 0;
  let count = 0;
  for (let i = Math.max(0, at); i < Math.min(samples.length, at + span); i += 1) {
    sum += samples[i] * samples[i];
    count += 1;
  }
  return count === 0 ? 0 : Math.sqrt(sum / count);
}

/**
 * The window this derivative should take.
 *
 * Candidates are bar-aligned only, so every result ends on a bar line by
 * construction rather than by checking afterwards, and start at bar 1 or later
 * so `crossfadeWrap` has real music to reach back into.
 *
 * Scored on **content** — mean onset energy against the loudest window, which
 * is what keeps the cut off a fade-in, a count-in or an outro — multiplied by a
 * **level match** between the window's head and tail. A section that begins
 * loud and ends quiet loops audibly even with a clean seam.
 */
function chooseWindow(samples, envelope, fps, beatPhaseFrames, barPhaseIndex, windowSamples) {
  const beatPeriodSamples = (60 / RHYTHM.bpm) * SAMPLE_RATE;
  const candidates = [];

  for (let bar = 1; ; bar += 1) {
    const beatIndex = barPhaseIndex + bar * BEATS_PER_BAR;
    const startSample = Math.round(beatPhaseFrames * FFT_HOP + beatIndex * beatPeriodSamples);
    const endSample = startSample + windowSamples;
    if (startSample < CROSSFADE) continue;
    if (endSample > samples.length) break;

    const startFrame = Math.floor(startSample / FFT_HOP);
    const endFrame = Math.min(envelope.length, Math.floor(endSample / FFT_HOP));
    let energy = 0;
    for (let f = startFrame; f < endFrame; f += 1) energy += envelope[f];
    energy /= Math.max(1, endFrame - startFrame);

    let peak = 0;
    for (let i = startSample; i < endSample; i += 1) {
      const magnitude = Math.abs(samples[i]);
      if (magnitude > peak) peak = magnitude;
    }

    const span = Math.round(SAMPLE_RATE * 0.25);
    const head = rms(samples, startSample, span);
    const tail = rms(samples, endSample - span, span);
    const levelRatio = head <= 1e-9 || tail <= 1e-9 ? 0 : Math.min(head, tail) / Math.max(head, tail);

    candidates.push({
      bar,
      startSample,
      endSample,
      energy,
      peak,
      levelRatio,
      rawStep: seamStep(samples, startSample, endSample),
    });
  }
  if (candidates.length === 0) return null;

  const loudest = Math.max(...candidates.map((candidate) => candidate.energy)) || 1;
  for (const candidate of candidates) {
    candidate.score = (candidate.energy / loudest) * (0.6 + 0.4 * candidate.levelRatio);
  }
  candidates.sort((a, b) => b.score - a.score);
  return candidates;
}

/**
 * Makes the wrap sample-continuous, the way a sampler loops a sustain.
 *
 * The problem: playback jumps from the window's last sample straight back to
 * its first, and nothing in the recording connects those two — the result is a
 * step, and a step is a click on every repeat.
 *
 * The fix is to end the window with the audio that **precedes** its own start.
 * Over the final `CROSSFADE` samples the window's own tail fades out while the
 * material immediately before `start` fades in, so the last sample written is
 * (almost exactly) `source[start - 1]`, and `source[start - 1]` flows into
 * `source[start]` — which is the first sample of the loop. The discontinuity
 * is gone because the two sides are genuinely adjacent in the source.
 *
 * Equal-power (`cos`/`sin`) rather than linear, so the crossfade does not dip
 * in level through the middle where the two sides are uncorrelated.
 *
 * The cost, stated: the last ~34 ms of the loop is the previous bar's tail
 * rather than this one's. It replaces a sliver of a decaying beat with the
 * equivalent sliver from one bar earlier, which is why the window must not
 * start at bar 0 — there would be nothing before it to reach into.
 */
function crossfadeWrap(plane, start, end) {
  const length = end - start;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) out[i] = plane[start + i];
  for (let i = 0; i < CROSSFADE; i += 1) {
    const t = (i + 1) / (CROSSFADE + 1);
    const fadeOut = Math.cos((t * Math.PI) / 2);
    const fadeIn = Math.sin((t * Math.PI) / 2);
    const at = length - CROSSFADE + i;
    out[at] = out[at] * fadeOut + plane[start - CROSSFADE + i] * fadeIn;
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * The pipeline
 * ------------------------------------------------------------------ */

export function condition(sourcePath, options = {}) {
  const bars = options.bars ?? 16;
  const absoluteSource = resolve(repoRoot, sourcePath);
  if (!existsSync(absoluteSource)) throw new Error(`no such source: ${sourcePath}`);

  const probe = ffprobeJson(absoluteSource);
  const stream = probe.streams[0];
  const sourceChannels = Number(stream.channels);
  const sourceDuration = Number(probe.format.duration);
  const scratch = mkdtempSync(join(tmpdir(), 'condition-'));

  try {
    /*
     * The source's own pulse, on an untouched decode. This is the number that
     * goes into `conditioned` evidence as `measuredBpm`: what the *source* is,
     * not what the derivative was made to be.
     */
    const probeWav = join(scratch, 'probe.wav');
    ffmpeg(['-i', absoluteSource, '-ac', '1', '-ar', String(SAMPLE_RATE), '-c:a', 'pcm_s16le', probeWav]);
    const probePlanes = readWavChannels(probeWav);
    const sourceMeasurement = measureSignal(probePlanes.planes[0], probePlanes.sampleRate);
    const measured = sourceMeasurement.bpm;
    if (measured === null && options.ratio === undefined) {
      throw new Error('source pulse is not measurable, and no --ratio was pinned');
    }

    /*
     * The rate that puts the source's pulse on the game's grid.
     *
     * Half and double are conformable: a 185 BPM track and a 92.5 BPM track are
     * the same music read at two levels, so the multiple nearest 1 is chosen
     * and the transformation stays as small as the metre allows.
     */
    let ratio = options.ratio;
    if (ratio === undefined) {
      ratio = null;
      for (const multiple of [1, 2, 0.5]) {
        const candidate = RHYTHM.bpm / (measured * multiple);
        if (ratio === null || Math.abs(candidate - 1) < Math.abs(ratio - 1)) ratio = candidate;
      }
    }

    const channels = options.mono ? 1 : sourceChannels;
    const stretched = join(scratch, 'stretched.wav');
    ffmpeg([
      '-i', absoluteSource,
      '-af', `aresample=${String(SAMPLE_RATE)},atempo=${ratio.toFixed(9)}`,
      '-ac', String(channels),
      '-c:a', 'pcm_s16le',
      stretched,
    ]);

    const { planes, frames } = readWavChannels(stretched);
    const mixdown = channels === 1
      ? planes[0]
      : (() => {
          const sum = new Float32Array(frames);
          for (let i = 0; i < frames; i += 1) {
            let total = 0;
            for (const plane of planes) total += plane[i];
            sum[i] = total / channels;
          }
          return sum;
        })();

    const measurement = measureSignal(mixdown, SAMPLE_RATE);
    const fps = SAMPLE_RATE / FFT_HOP;
    const envelope = energyEnvelope(mixdown);
    const beatPhaseFrames = ((measurement.downbeat ?? 0) * SAMPLE_RATE) / FFT_HOP;
    const bar = barPhase(envelope, fps, beatPhaseFrames);

    const beats = bars * BEATS_PER_BAR;
    const windowSamples = (beats * 60 * SAMPLE_RATE) / RHYTHM.bpm;
    if (!Number.isInteger(windowSamples)) {
      throw new Error(`${String(bars)} bars at ${String(RHYTHM.bpm)} BPM is not a whole number of samples`);
    }

    const ranked = chooseWindow(mixdown, envelope, fps, beatPhaseFrames, bar.phase, windowSamples);
    if (!ranked) {
      throw new Error(
        `source is too short: ${sourceDuration.toFixed(1)} s leaves no ${String(bars)}-bar window after conditioning`,
      );
    }
    const startSample = options.startSample ?? ranked[0].startSample;
    const endSample = startSample + windowSamples;
    if (startSample < CROSSFADE || endSample > frames) {
      throw new Error(`pinned --start-sample ${String(startSample)} does not fit the conditioned source`);
    }
    const chosen = ranked.find((candidate) => candidate.startSample === startSample) ?? {
      ...ranked[0],
      startSample,
      endSample,
      peak: (() => {
        let peak = 0;
        for (let i = startSample; i < endSample; i += 1) peak = Math.max(peak, Math.abs(mixdown[i]));
        return peak;
      })(),
    };

    const cut = planes.map((plane) => crossfadeWrap(plane, startSample, endSample));

    let peak = 0;
    for (const plane of cut) for (const value of plane) peak = Math.max(peak, Math.abs(value));
    const gain = peak > 0 ? PEAK_TARGET / peak : 1;
    for (const plane of cut) for (let i = 0; i < plane.length; i += 1) plane[i] *= gain;

    const wrapped = channels === 1
      ? cut[0]
      : (() => {
          const sum = new Float32Array(cut[0].length);
          for (let i = 0; i < sum.length; i += 1) {
            let total = 0;
            for (const plane of cut) total += plane[i];
            sum[i] = total / channels;
          }
          return sum;
        })();
    const seamAfter = seamStep(wrapped, 0, wrapped.length);

    const command = [
      'node scripts/condition-track.mjs',
      sourcePath,
      `--out ${options.out ?? '<out>'}`,
      `--ratio ${ratio.toFixed(9)}`,
      `--start-sample ${String(startSample)}`,
      `--bars ${String(bars)}`,
      ...(options.mono ? ['--mono'] : []),
    ].join(' ');

    let bytes = null;
    if (options.out && !options.dryRun) {
      bytes = writeWav(resolve(repoRoot, options.out), cut, SAMPLE_RATE);
    }

    return {
      source: sourcePath,
      sourceDuration,
      sourceChannels,
      sourceSampleRate: Number(stream.sample_rate),
      sourceCodec: stream.codec_name,
      sourceBpm: measured,
      sourceGridMargin: sourceMeasurement.gridMargin,
      ratio,
      conditionedBpm: measurement.bpm,
      barPhase: bar.phase,
      barStrengths: bar.strengths.map((value) => Number(value.toFixed(4))),
      bars,
      beats,
      startSample,
      startSeconds: startSample / SAMPLE_RATE,
      seconds: windowSamples / SAMPLE_RATE,
      channels,
      peak,
      gain,
      seamBefore: chosen.rawStep ?? null,
      seamAfter,
      levelRatio: chosen.levelRatio ?? null,
      windowsConsidered: ranked.length,
      command,
      out: options.out ?? null,
      bytes,
    };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/* ------------------------------------------------------------------ *
 * CLI
 * ------------------------------------------------------------------ */

function main() {
  const args = process.argv.slice(2);
  const flag = (name) => {
    const at = args.indexOf(name);
    return at >= 0 && at + 1 < args.length ? args[at + 1] : null;
  };
  const consumed = new Set();
  for (const name of ['--out', '--bars', '--ratio', '--start-sample']) {
    const at = args.indexOf(name);
    if (at >= 0) consumed.add(at + 1);
  }
  const source = args.find((argument, at) => !argument.startsWith('--') && !consumed.has(at)) ?? null;

  if (!source) {
    process.stderr.write('usage: condition-track.mjs <source> --out <path> [--bars 16] [--mono]\n');
    process.exitCode = 1;
    return;
  }

  const result = condition(source, {
    bars: flag('--bars') === null ? 16 : Number(flag('--bars')),
    out: flag('--out'),
    ratio: flag('--ratio') === null ? undefined : Number(flag('--ratio')),
    startSample: flag('--start-sample') === null ? undefined : Number(flag('--start-sample')),
    mono: args.includes('--mono'),
    dryRun: args.includes('--dry-run'),
  });

  if (args.includes('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  process.stdout.write(`\n${relative(repoRoot, resolve(repoRoot, source))}\n`);
  process.stdout.write(`  source          ${result.sourceBpm === null ? 'unmeasurable' : `${result.sourceBpm.toFixed(1)} BPM`}, ${result.sourceDuration.toFixed(1)} s, ${String(result.sourceChannels)} ch ${result.sourceCodec}\n`);
  process.stdout.write(`  rate            x${result.ratio.toFixed(6)} -> ${String(result.conditionedBpm)} BPM\n`);
  process.stdout.write(`  bar phase       beat ${String(result.barPhase)} of 4 (strengths ${result.barStrengths.join(', ')})\n`);
  process.stdout.write(`  window          ${result.startSeconds.toFixed(3)} s + ${result.seconds.toFixed(6)} s = ${String(result.bars)} bars, ${String(result.beats)} beats (${String(result.windowsConsidered)} considered)\n`);
  process.stdout.write(`  seam            ${result.seamBefore === null ? '-' : `${result.seamBefore.toFixed(2)}x`} -> ${result.seamAfter.toFixed(2)}x local delta after wrap\n`);
  process.stdout.write(`  gain            x${result.gain.toFixed(4)} to peak ${String(PEAK_TARGET)}\n`);
  process.stdout.write(`  command         ${result.command}\n`);
  if (result.bytes !== null) process.stdout.write(`  wrote           ${result.out} (${String(result.bytes)} bytes, ${String(result.channels)} ch)\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();

/**
 * Generates the Groove beat click.
 *
 * The click is **synthesized here rather than downloaded**, and that is a
 * deliberate choice rather than a convenience. AGENTS.md rule 12 prefers
 * original assets and rule 13 requires provenance for every third-party one;
 * a file this repository generates from a committed script has perfect
 * provenance, no licence to verify, and no source page that can go dead. It is
 * also 8 KB, which matters when it plays ninety times a round.
 *
 * The sound is a drumstick on a rim: a noise transient for the impact, two
 * decaying partials for the wood, and a short low body so it survives a phone
 * speaker. Deterministic — the noise runs off a fixed seed — so regenerating
 * it produces the same bytes and the checked-in file can be verified.
 *
 * Usage:
 *   node scripts/make-beat-click.mjs
 *   node scripts/make-beat-click.mjs --out assets/audio/sfx/beat_click.wav
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SAMPLE_RATE = 44_100;
const DURATION_S = 0.09;
/** 16-bit linear PCM: the only WAVE format Android guarantees (ADR 0002). */
const BITS = 16;

/**
 * Seeded generator, so the noise burst is the same on every machine and the
 * committed file can be reproduced byte for byte.
 */
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

function synthesize() {
  const count = Math.round(SAMPLE_RATE * DURATION_S);
  const random = createRandom(0x5eed_1eaf);
  const samples = new Float64Array(count);

  for (let i = 0; i < count; i += 1) {
    const t = i / SAMPLE_RATE;

    // The impact itself. Very short, or the click turns into a "tss".
    const noise = random() * Math.exp(-t / 0.0040) * 0.55;

    // Two partials give it wood rather than beep. The upper one dies first,
    // which is what a stick on a rim actually does.
    const woodLow = Math.sin(2 * Math.PI * 1850 * t) * Math.exp(-t / 0.014) * 0.42;
    const woodHigh = Math.sin(2 * Math.PI * 3100 * t) * Math.exp(-t / 0.007) * 0.26;

    // A little body, so it reads as a drum rather than a mouse click on a
    // small speaker. Quiet on purpose: it must never mask the music.
    const body = Math.sin(2 * Math.PI * 220 * t) * Math.exp(-t / 0.025) * 0.16;

    // 0.6 ms of attack ramp. Starting a waveform at full amplitude is a step
    // discontinuity, and a step is a pop.
    const attack = Math.min(1, t / 0.0006);

    samples[i] = (noise + woodLow + woodHigh + body) * attack;
  }

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  // Headroom rather than the ceiling: the click is mixed over music and four
  // other effects, and a file that clips on its own has nowhere left to go.
  const gain = peak > 0 ? 0.85 / peak : 1;
  for (let i = 0; i < count; i += 1) samples[i] *= gain;

  return samples;
}

function encodeWav(samples) {
  const bytesPerSample = BITS / 8;
  const dataLength = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write('RIFF', 0, 'ascii');
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8, 'ascii');
  buffer.write('fmt ', 12, 'ascii');
  buffer.writeUInt32LE(16, 16); // PCM chunk size
  buffer.writeUInt16LE(1, 20); // linear PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(BITS, 34);
  buffer.write('data', 36, 'ascii');
  buffer.writeUInt32LE(dataLength, 40);

  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(clamped * 32_767), 44 + i * bytesPerSample);
  }

  return buffer;
}

function parseOut(argv) {
  const index = argv.indexOf('--out');
  if (index >= 0 && argv[index + 1]) return argv[index + 1];
  return 'assets/audio/sfx/beat_click.wav';
}

const outPath = resolve(process.cwd(), parseOut(process.argv.slice(2)));
const wav = encodeWav(synthesize());
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, wav);
console.log(
  `WROTE ${outPath} | ${String(wav.length)} bytes | ${String(SAMPLE_RATE)} Hz mono ${String(BITS)}-bit | ${(DURATION_S * 1000).toFixed(0)} ms`,
);

/**
 * Generates the M18 mug drink gulp.
 *
 * **Synthesized here rather than downloaded**, for the same reason as the beat
 * click: AGENTS.md rule 12 prefers original assets and rule 13 requires
 * provenance for every third-party one, and a file this repository generates
 * from a committed script has perfect provenance, no licence to verify, and no
 * source page that can go dead.
 *
 * The sound is three swallows. Each one is a short resonant blip whose pitch
 * sweeps *upward* — the cavity a mouthful leaves behind gets smaller as it
 * empties, and its resonance climbs with it, which is why a real gulp rises
 * rather than falls. A little filtered noise on the front of each gives it
 * liquid instead of a synth bloop, and the three are spaced unevenly because
 * evenly spaced ones read as a machine.
 *
 * It fits inside the 480 ms drink animation on purpose (M18): the arm is gone
 * by the time the last swallow decays.
 *
 * Deterministic — the noise runs off a fixed seed — so regenerating it produces
 * the same bytes and the checked-in file can be verified.
 *
 * Usage:
 *   node scripts/make-mug-gulp.mjs
 *   node scripts/make-mug-gulp.mjs --out assets/audio/sfx/mug_drink.wav
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SAMPLE_RATE = 44_100;
const DURATION_S = 0.42;
/** 16-bit linear PCM: the only WAVE format Android guarantees (ADR 0002). */
const BITS = 16;

/** Start time, pitch floor, pitch ceiling and level of each swallow. */
const SWALLOWS = [
  { atS: 0.0, fromHz: 165, toHz: 395, gain: 1.0 },
  { atS: 0.132, fromHz: 150, toHz: 360, gain: 0.86 },
  { atS: 0.279, fromHz: 138, toHz: 330, gain: 0.66 },
];

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

/** How long the pitch takes to climb, in seconds. */
const SWEEP_S = 0.055;

/**
 * Cycles elapsed by `local` seconds into a swallow.
 *
 * The pitch is integrated rather than fed straight into `sin(2*pi*f*t)`.
 * The naive form re-evaluates phase against a frequency that is itself
 * changing, so every sample lands somewhere the previous one did not predict —
 * and a phase discontinuity is an audible click. Frequency rises as
 * `from + (to - from) * s^2` over the sweep and holds at `to` afterwards, so
 * the integral is a cubic followed by a straight line.
 */
function sweptPhase(local, fromHz, toHz) {
  const span = toHz - fromHz;
  if (local <= SWEEP_S) {
    return fromHz * local + (span * local ** 3) / (3 * SWEEP_S ** 2);
  }
  const atSweepEnd = fromHz * SWEEP_S + (span * SWEEP_S) / 3;
  return atSweepEnd + toHz * (local - SWEEP_S);
}

function synthesize() {
  const count = Math.round(SAMPLE_RATE * DURATION_S);
  const random = createRandom(0x9117_5eed);
  const samples = new Float64Array(count);

  // One-pole lowpass state, so the noise reads as liquid rather than hiss.
  let lowpass = 0;

  for (let i = 0; i < count; i += 1) {
    const t = i / SAMPLE_RATE;
    let value = 0;

    for (const swallow of SWALLOWS) {
      const local = t - swallow.atS;
      if (local < 0 || local > 0.16) continue;

      const phase = 2 * Math.PI * sweptPhase(local, swallow.fromHz, swallow.toHz);
      const decay = Math.exp(-local / 0.038);
      const attack = Math.min(1, local / 0.004);
      const body = Math.sin(phase) * decay * 0.62;
      // A quiet octave gives the blip a throat rather than a test tone.
      const upper = Math.sin(phase * 2) * decay * 0.13;

      // Liquid transient, only on the first few ms of each swallow.
      const wet = random() * Math.exp(-local / 0.010) * 0.5;
      lowpass += (wet - lowpass) * 0.06;

      value += (body + upper + lowpass * 0.9) * attack * swallow.gain;
    }

    samples[i] = value;
  }

  let peak = 0;
  for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  // Headroom, not the ceiling: this plays over music, the burst and the
  // whoosh, and a file that clips alone has nowhere left to go.
  const gain = peak > 0 ? 0.8 / peak : 1;
  for (let i = 0; i < count; i += 1) samples[i] *= gain;

  // 5 ms fade at the tail, so the file cannot end on a step.
  const fade = Math.round(SAMPLE_RATE * 0.005);
  for (let i = 0; i < fade; i += 1) {
    samples[count - 1 - i] *= i / fade;
  }

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
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
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
  return 'assets/audio/sfx/mug_drink.wav';
}

const outPath = resolve(process.cwd(), parseOut(process.argv.slice(2)));
const wav = encodeWav(synthesize());
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, wav);
console.log(
  `WROTE ${outPath} | ${String(wav.length)} bytes | ${String(SAMPLE_RATE)} Hz mono ${String(BITS)}-bit | ${(DURATION_S * 1000).toFixed(0)} ms | ${String(SWALLOWS.length)} swallows`,
);

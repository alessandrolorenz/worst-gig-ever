/**
 * Generates the Stage 2 groove bed: a 90 BPM loop that cannot drift.
 *
 * ## Why this file is generated
 *
 * The requirement M16 puts on a bed for a stage that scores beats is exact:
 * its loop length must be a whole number of 90 BPM beats. The shipped rock
 * loop is 21.75 s, which is 32.625 beats — it slips 0.625 of a beat, about
 * 417 ms, *every loop*, and after two loops it is in antiphase with the pad.
 * That is more than twice the GOOD window, so a player who does the natural
 * thing and listens for the beat is being handed a clock that is wrong.
 *
 * Searching CC0 libraries for a track that happens to be at exactly 90 BPM and
 * happens to loop on a bar line is slow and uncertain. Synthesizing one makes
 * the property true by construction: this renders exactly `BARS * 4` beats and
 * wraps every tail back to the head, so the loop is seamless and the tempo is
 * the tempo by definition.
 *
 * It is deliberately a **bed**, not a song — kick, hat, backbeat, root notes.
 * Stage 2 exists to teach the beat, and a full arrangement buries the thing
 * being taught. The show's own music is a separate, and much more musical,
 * decision that belongs to the owner.
 *
 * Deterministic: the noise runs off a fixed seed, so the committed file can be
 * reproduced and verified byte for byte.
 *
 * Usage:
 *   node scripts/make-groove-bed.mjs
 *   node scripts/make-groove-bed.mjs --out assets/audio/music/runtime/groove_bed_90.wav
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SAMPLE_RATE = 44_100;
const BITS = 16;

/** Must equal `RHYTHM.bpm`. `tests/audioContract.test.ts` measures the result. */
const BPM = 90;
const BEATS_PER_BAR = 4;
const BARS = 4;

const BEAT_S = 60 / BPM;
const TOTAL_BEATS = BARS * BEATS_PER_BAR;

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    return (state / 0xffffffff) * 2 - 1;
  };
}

/**
 * Adds a voice into the buffer, wrapping anything past the end back to the
 * start.
 *
 * The wrap is what makes the loop seamless: a kick on the last beat has a
 * 180 ms tail, and a loop that simply truncates it clicks audibly every time
 * it repeats — which on a stage whose entire job is teaching a steady pulse
 * would be a tick in the wrong place.
 */
function mix(buffer, startSample, render, lengthSamples) {
  for (let i = 0; i < lengthSamples; i += 1) {
    const value = render(i / SAMPLE_RATE);
    if (value === 0) continue;
    buffer[(startSample + i) % buffer.length] += value;
  }
}

function kick(buffer, atSample) {
  // Pitch drops from 110 Hz to 45 Hz in 60 ms: the standard way a kick reads
  // as a kick rather than as a low beep.
  let phase = 0;
  mix(
    buffer,
    atSample,
    (t) => {
      const frequency = 45 + 65 * Math.exp(-t / 0.022);
      phase += (2 * Math.PI * frequency) / SAMPLE_RATE;
      const attack = Math.min(1, t / 0.002);
      return Math.sin(phase) * Math.exp(-t / 0.10) * 0.9 * attack;
    },
    Math.round(SAMPLE_RATE * 0.28),
  );
}

function snare(buffer, atSample, random) {
  mix(
    buffer,
    atSample,
    (t) => {
      const noise = random() * Math.exp(-t / 0.055);
      const body = Math.sin(2 * Math.PI * 190 * t) * Math.exp(-t / 0.045) * 0.5;
      const attack = Math.min(1, t / 0.001);
      return (noise * 0.45 + body * 0.35) * attack;
    },
    Math.round(SAMPLE_RATE * 0.20),
  );
}

function hat(buffer, atSample, random, accent) {
  // High-passed noise, crudely: a difference of successive noise samples is a
  // one-pole high pass, which is all a closed hat needs.
  let previous = 0;
  mix(
    buffer,
    atSample,
    (t) => {
      const raw = random();
      const highPassed = raw - previous;
      previous = raw;
      return highPassed * Math.exp(-t / 0.012) * (accent ? 0.22 : 0.11);
    },
    Math.round(SAMPLE_RATE * 0.06),
  );
}

function bass(buffer, atSample, frequency, lengthS) {
  // A soft saw, folded down. Two partials is enough weight under a bed and
  // leaves headroom for the click, which has to stay the loudest thing.
  mix(
    buffer,
    atSample,
    (t) => {
      const envelope = Math.min(1, t / 0.006) * Math.exp(-t / (lengthS * 0.75));
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const octave = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.28;
      return (fundamental + octave) * envelope * 0.32;
    },
    Math.round(SAMPLE_RATE * lengthS),
  );
}

function synthesize() {
  const totalSamples = Math.round(SAMPLE_RATE * BEAT_S * TOTAL_BEATS);
  const buffer = new Float64Array(totalSamples);
  const random = createRandom(0x9_0bea_7);
  const at = (beat) => Math.round(beat * BEAT_S * SAMPLE_RATE);

  /*
   * A plain rock figure, one root per bar: A - A - G - D. Nothing here is
   * trying to be interesting; it is trying to be a floor the beat stands on,
   * and a bass line the player starts humming is a bass line competing with
   * the thing being taught.
   */
  const roots = [55.0, 55.0, 49.0, 73.42];

  for (let beat = 0; beat < TOTAL_BEATS; beat += 1) {
    const bar = Math.floor(beat / BEATS_PER_BAR);
    const inBar = beat % BEATS_PER_BAR;

    // Kick on 1 and 3, snare on 2 and 4: the backbeat that makes a bar a bar.
    if (inBar === 0 || inBar === 2) kick(buffer, at(beat));
    if (inBar === 1 || inBar === 3) snare(buffer, at(beat), random);

    // Eighth-note hats, accented on the beat, so the pulse subdivides visibly
    // without the player having to tap the subdivision.
    hat(buffer, at(beat), random, true);
    hat(buffer, at(beat + 0.5), random, false);

    // Root on 1 and a push on the "and" of 3, which is what stops four bars of
    // whole notes reading as a drone.
    if (inBar === 0) bass(buffer, at(beat), roots[bar], BEAT_S * 1.6);
    if (inBar === 2) bass(buffer, at(beat + 0.5), roots[bar], BEAT_S * 1.2);
  }

  let peak = 0;
  for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
  // Headroom: this plays *under* the click, which must stay the clearest thing
  // in the mix. `MIX.music` scales it again at runtime.
  const gain = peak > 0 ? 0.72 / peak : 1;
  for (let i = 0; i < buffer.length; i += 1) buffer[i] *= gain;

  return buffer;
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
  return 'assets/audio/music/runtime/groove_bed_90.wav';
}

const outPath = resolve(process.cwd(), parseOut(process.argv.slice(2)));
const samples = synthesize();
const wav = encodeWav(samples);
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, wav);
console.log(
  `WROTE ${outPath} | ${String(wav.length)} bytes | ${String(BPM)} BPM | ` +
    `${String(BARS)} bars = ${String(TOTAL_BEATS)} beats = ${(samples.length / SAMPLE_RATE).toFixed(4)} s`,
);

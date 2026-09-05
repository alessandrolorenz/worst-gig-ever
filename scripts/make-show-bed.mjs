/**
 * Generates the show's bed: a full 90 BPM rock loop that cannot drift.
 *
 * ## Why this file exists
 *
 * The show and the encore score beats, and until now they played
 * `rock_theme_song_loop.wav` — a CC0 track whose **source MIDI is 120 BPM**.
 * That is not the 417 ms-per-loop slip the project had recorded against it.
 * The slip is arithmetic on the file's length against a 90 BPM grid; the real
 * defect is the pulse. At 90 BPM a beat falls every 667 ms and at 120 every
 * 500 ms, so the two agree once every two seconds — three game beats to four
 * musical ones — and on the other two beats of every three the music sits
 * 167 ms from where the player is being asked to tap. `RHYTHM.perfectWindowMs`
 * is 90. A player who trusts the music therefore *cannot* score PERFECT on two
 * beats out of three, however well they play.
 *
 * Measured, not assumed: the source MIDI's note-onset train was aligned
 * against the audio across 100-160 BPM and every one of the ten best fits
 * landed between 119.6 and 120.0 BPM, with 77 of its 83 onsets inside the
 * window. Recorded in `docs/assets/AUDIO-SOURCES.md`.
 *
 * ## Why it is generated rather than found
 *
 * The same reason Stage 2's bed is (`make-groove-bed.mjs`), and now a stronger
 * one: a foreign file's tempo is a claim someone has to verify, and the gate
 * that was supposed to catch this measured the file's duration instead of its
 * pulse — so it would have called a trimmed 120 BPM loop tempo-locked.
 * Synthesizing the bed makes the tempo true by construction, which is the only
 * form of the claim a test can actually check.
 *
 * ## What it is
 *
 * A full bed rather than the teaching bed's floor: driven eighth-note power
 * chords, a kick that pushes off the backbeat, crashes on the phrase heads and
 * a fill into the loop point. Eight bars, so the show does not repeat every
 * ten seconds the way a four-bar figure would, in the same A-rooted key as
 * Stage 2's bed so the two stages sound like the same band.
 *
 * It still plays under `MIX.music` (0.38) and under a click that must stay the
 * clearest thing in the mix, so it is arranged to be felt rather than followed.
 *
 * Deterministic: the noise runs off a fixed seed, so the committed file can be
 * reproduced and verified byte for byte.
 *
 * Usage:
 *   node scripts/make-show-bed.mjs
 *   node scripts/make-show-bed.mjs --out assets/audio/music/runtime/show_bed_90.wav
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const SAMPLE_RATE = 44_100;
const BITS = 16;

/** Must equal `RHYTHM.bpm`. `tests/audioContract.test.ts` measures the result. */
const BPM = 90;
const BEATS_PER_BAR = 4;
/**
 * Eight, not four. The teaching bed repeats every four bars because Stage 2 is
 * twelve seconds of nothing but the beat and a longer figure would be
 * something else to listen to. The show runs for minutes, and a four-bar loop
 * announces itself as a loop about ninety seconds in.
 */
const BARS = 8;

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
 * start — the same trick `make-groove-bed.mjs` uses, and it matters more here.
 * The loop point falls in the middle of a crash cymbal's decay, and a truncated
 * crash does not merely click: it chops the loudest voice in the arrangement.
 */
function mix(buffer, startSample, render, lengthSamples) {
  for (let i = 0; i < lengthSamples; i += 1) {
    const value = render(i / SAMPLE_RATE);
    if (value === 0) continue;
    buffer[(startSample + i) % buffer.length] += value;
  }
}

function kick(buffer, atSample, gain = 1) {
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
      return Math.sin(phase) * Math.exp(-t / 0.1) * 0.95 * gain * attack;
    },
    Math.round(SAMPLE_RATE * 0.28),
  );
}

function snare(buffer, atSample, random, gain = 1) {
  mix(
    buffer,
    atSample,
    (t) => {
      const noise = random() * Math.exp(-t / 0.06);
      const body = Math.sin(2 * Math.PI * 185 * t) * Math.exp(-t / 0.05) * 0.5;
      const attack = Math.min(1, t / 0.001);
      return (noise * 0.62 + body * 0.42) * gain * attack;
    },
    Math.round(SAMPLE_RATE * 0.22),
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
      // The 1 ms ramp is not shaping, it is the loop seam: without it the
      // voice's first sample is raw noise, which steps against whatever the
      // wrap left at the end of the buffer.
      const attack = Math.min(1, t / 0.001);
      return highPassed * Math.exp(-t / 0.012) * (accent ? 0.2 : 0.09) * attack;
    },
    Math.round(SAMPLE_RATE * 0.06),
  );
}

/**
 * A crash, as a long noise decay with a little metallic ring under it.
 *
 * Two seconds of tail, which is three beats — this is the voice the wrap in
 * `mix` exists for.
 */
function crash(buffer, atSample, random) {
  let previous = 0;
  mix(
    buffer,
    atSample,
    (t) => {
      const raw = random();
      const highPassed = raw - previous;
      previous = raw;
      const ring =
        Math.sin(2 * Math.PI * 3_140 * t) * 0.18 + Math.sin(2 * Math.PI * 5_290 * t) * 0.12;
      const attack = Math.min(1, t / 0.001);
      return (highPassed * 0.5 + ring) * Math.exp(-t / 0.7) * 0.55 * attack;
    },
    Math.round(SAMPLE_RATE * 2.0),
  );
}

/**
 * A power chord: root, fifth and octave through a soft clipper.
 *
 * The clipping is the whole point. Three clean sines read as an organ; the
 * same three driven into `tanh` generate the intermodulation products that the
 * ear hears as a distorted guitar, which is what makes this a rock bed rather
 * than a chiptune.
 */
function powerChord(buffer, atSample, frequencies, lengthS, drive, gain) {
  const phases = frequencies.map(() => 0);
  mix(
    buffer,
    atSample,
    (t) => {
      let raw = 0;
      for (let i = 0; i < frequencies.length; i += 1) {
        phases[i] += (2 * Math.PI * frequencies[i]) / SAMPLE_RATE;
        raw +=
          Math.sin(phases[i]) + 0.5 * Math.sin(2 * phases[i]) + 0.33 * Math.sin(3 * phases[i]);
      }
      const envelope = Math.min(1, t / 0.003) * Math.exp(-t / (lengthS * 0.55));
      return Math.tanh(raw * drive) * envelope * gain;
    },
    Math.round(SAMPLE_RATE * lengthS),
  );
}

function bass(buffer, atSample, frequency, lengthS, gain = 1) {
  mix(
    buffer,
    atSample,
    (t) => {
      const envelope = Math.min(1, t / 0.006) * Math.exp(-t / (lengthS * 0.8));
      const fundamental = Math.sin(2 * Math.PI * frequency * t);
      const octave = Math.sin(2 * Math.PI * frequency * 2 * t) * 0.3;
      return (fundamental + octave) * envelope * 0.34 * gain;
    },
    Math.round(SAMPLE_RATE * lengthS),
  );
}

function synthesize() {
  const totalSamples = Math.round(SAMPLE_RATE * BEAT_S * TOTAL_BEATS);
  const buffer = new Float64Array(totalSamples);
  const random = createRandom(0x5_0bed_5);
  const at = (beat) => Math.round(beat * BEAT_S * SAMPLE_RATE);

  /*
   * A - A - G - D | A - A - G - E. The first four bars are Stage 2's figure,
   * so the show sounds like the same band as the stage that taught it; the
   * second four turn around on E instead of D, which is what stops eight bars
   * reading as the same four bars twice.
   */
  const chords = [
    [110.0, 164.81, 220.0], // A5
    [110.0, 164.81, 220.0], // A5
    [98.0, 146.83, 196.0], // G5
    [146.83, 220.0, 293.66], // D5
    [110.0, 164.81, 220.0], // A5
    [110.0, 164.81, 220.0], // A5
    [98.0, 146.83, 196.0], // G5
    [164.81, 246.94, 329.63], // E5
  ];
  const roots = [55.0, 55.0, 49.0, 73.42, 55.0, 55.0, 49.0, 82.41];

  for (let beat = 0; beat < TOTAL_BEATS; beat += 1) {
    const bar = Math.floor(beat / BEATS_PER_BAR);
    const inBar = beat % BEATS_PER_BAR;
    const lastBar = bar === BARS - 1;

    // Kick on 1 and 3, with a push on the "and" of 3 in the odd bars. A kick
    // that is only ever on 1 and 3 is a metronome; the push is what makes it a
    // drummer.
    if (inBar === 0 || inBar === 2) kick(buffer, at(beat));
    if (inBar === 2 && bar % 2 === 1) kick(buffer, at(beat + 0.5), 0.7);

    // Backbeat on 2 and 4, always. It is the thing the player is tapping.
    if (inBar === 1 || inBar === 3) snare(buffer, at(beat), random);

    // Eighth-note hats, accented on the beat — except under the fill, where
    // they would fight the snares.
    if (!(lastBar && inBar === 3)) {
      hat(buffer, at(beat), random, true);
      hat(buffer, at(beat + 0.5), random, false);
    }

    // Crash on the head of each four-bar phrase.
    if (inBar === 0 && bar % 4 === 0) crash(buffer, at(beat), random);

    /*
     * Driven eighths on the guitar. Palm-muted length (0.42 of a beat) rather
     * than sustained, because a sustained chord under a click and forty
     * glass-break samples is mud, and the eighths carry the drive on their own.
     */
    for (let eighth = 0; eighth < 2; eighth += 1) {
      if (lastBar && inBar === 3) continue; // the fill owns the last beat
      powerChord(buffer, at(beat + eighth * 0.5), chords[bar], BEAT_S * 0.42, 1.35, 0.2);
    }

    // Root on 1, push on the "and" of 3: the same shape as the teaching bed's
    // bass, so the two beds sit in the same pocket.
    if (inBar === 0) bass(buffer, at(beat), roots[bar], BEAT_S * 1.6);
    if (inBar === 2) bass(buffer, at(beat + 0.5), roots[bar], BEAT_S * 1.2);

    /*
     * A four-stroke fill on the last beat of the loop, rising in level into
     * the wrap. Its job is to say "here comes the top" so the repeat reads as
     * an arrangement rather than as a file starting again.
     */
    if (lastBar && inBar === 3) {
      for (let stroke = 0; stroke < 4; stroke += 1) {
        snare(buffer, at(beat + stroke * 0.25), random, 0.6 + stroke * 0.16);
      }
    }
  }

  let peak = 0;
  for (const sample of buffer) peak = Math.max(peak, Math.abs(sample));
  // Same headroom as the teaching bed: this plays *under* the click, which
  // must stay the clearest thing in the mix. `MIX.music` scales it again at
  // runtime.
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
  return 'assets/audio/music/runtime/show_bed_90.wav';
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

/**
 * Audio contract (M16).
 *
 * The rhythm domain is deliberately free of every audio import, and these
 * tests do not change that: they read the *files* and the stage table, not a
 * player. Nothing here needs an audio device, which is the same rule the rest
 * of the suite runs under (rhythm-pivot test matrix, "No audio coupling").
 *
 * What they are here to hold is the one property M16 exists for: a stage that
 * scores beats must not play music that disagrees with the beat clock.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MIX,
  MUSIC_GENERATOR,
  MUSIC_TEMPO_LOCKED,
  SFX_POOL_SIZE,
  type MusicKey,
} from '../game/audio/audioMix.ts';
import { beatIntervalMs } from '../game/config/rhythm.ts';
import { level01 } from '../game/levels/level01.ts';
import { STAGES } from '../game/levels/stages.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

interface WavInfo {
  readonly channels: number;
  readonly sampleRate: number;
  readonly bits: number;
  readonly seconds: number;
  readonly bytes: number;
}

/**
 * Reads a WAVE header, walking the chunk list rather than assuming the data
 * chunk begins at byte 44. Encoders insert `LIST` and `fact` chunks, and a
 * fixed offset reads those as audio.
 */
function readWav(relativePath: string): WavInfo {
  const bytes = readFileSync(join(ROOT, relativePath));
  assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', `${relativePath} is not a RIFF file`);
  assert.equal(bytes.toString('ascii', 8, 12), 'WAVE', `${relativePath} is not a WAVE file`);

  const channels = bytes.readUInt16LE(22);
  const sampleRate = bytes.readUInt32LE(24);
  const bits = bytes.readUInt16LE(34);

  let offset = 12;
  let dataLength = 0;
  while (offset < bytes.length - 8) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === 'data') {
      dataLength = size;
      break;
    }
    offset += 8 + size + (size % 2);
  }
  assert.ok(dataLength > 0, `${relativePath} has no data chunk`);

  return {
    channels,
    sampleRate,
    bits,
    seconds: dataLength / (sampleRate * channels * (bits / 8)),
    bytes: bytes.length,
  };
}

test('the generated bed is a whole number of Groove beats, measured on disk', () => {
  /*
   * The whole reason it is generated. The shipped rock loop is 21.75 s, which
   * at 90 BPM is 32.625 beats — it slips about 417 ms every loop, more than
   * twice the GOOD window, and is in antiphase with the pad after two. A bed
   * under a scored beat has to be exact, and the only way to be sure is to
   * measure the file rather than trust the tempo it was rendered at.
   */
  const beds: Record<string, { path: string; beats: number }> = {
    grooveBed: { path: 'assets/audio/music/runtime/groove_bed_90.wav', beats: 16 },
    showBed: { path: 'assets/audio/music/runtime/show_bed_90.wav', beats: 32 },
  };

  for (const [key, expected] of Object.entries(beds)) {
    assert.equal(MUSIC_TEMPO_LOCKED[key as MusicKey], true, `${key} is not marked tempo-locked`);
    const bed = readWav(expected.path);
    const beats = (bed.seconds * 1000) / beatIntervalMs();

    assert.ok(
      Math.abs(beats - Math.round(beats)) < 1e-6,
      `${key} is ${beats.toFixed(4)} beats long, so it drifts`,
    );
    assert.equal(Math.round(beats), expected.beats, `${key} changed length`);
    assert.equal(
      Math.round(beats) % 4,
      0,
      `${key} must land on a bar line, not just a beat`,
    );
  }
});

test('every audio file is a format Android actually guarantees', () => {
  // 8- and 16-bit linear PCM is the guaranteed set; a 24-bit source is what
  // forced the rock loop's derivative in the first place (see AUDIO-SOURCES).
  for (const path of [
    'assets/audio/music/runtime/rock_theme_song_loop.wav',
    'assets/audio/music/runtime/groove_bed_90.wav',
    'assets/audio/music/runtime/show_bed_90.wav',
    'assets/audio/sfx/beat_click.wav',
    'assets/audio/sfx/crowd_applause.wav',
    'assets/audio/sfx/glass_breaking.wav',
    'assets/audio/sfx/impact_thwack.wav',
    'assets/audio/sfx/stick_whoosh.wav',
  ]) {
    const info = readWav(path);
    assert.ok(info.bits === 8 || info.bits === 16, `${path} is ${String(info.bits)}-bit`);
    assert.ok(info.channels === 1 || info.channels === 2, `${path} has odd channel count`);
    assert.ok(info.sampleRate === 44_100 || info.sampleRate === 22_050, `${path} sample rate`);
  }
});

test('the click is short enough to be a click', () => {
  /*
   * It fires every 667 ms. A sound with a tail longer than the gap between
   * beats stops being a metronome and becomes a drone, and the player loses
   * the edge that tells them where the beat actually was.
   */
  const click = readWav('assets/audio/sfx/beat_click.wav');
  assert.ok(click.seconds < 0.15, `the click is ${click.seconds.toFixed(3)} s long`);
  assert.ok(
    click.seconds * 1000 < beatIntervalMs() / 4,
    'the click runs into the next beat',
  );
  assert.equal(click.channels, 1, 'a point event in the middle of the mix needs no stereo');
});

test('the applause no longer ships thirty-nine seconds of room tone', () => {
  /*
   * Open item 2, closed here. It played once at SHOW_COMPLETE, over a results
   * screen the player reads in a few seconds, and it was the single largest
   * asset in the app at 6.6 MB.
   */
  const applause = readWav('assets/audio/sfx/crowd_applause.wav');
  assert.ok(applause.seconds <= 6, `the applause is still ${applause.seconds.toFixed(1)} s`);
  assert.ok(applause.seconds >= 3, 'trimmed so hard it no longer reads as a crowd');
  assert.ok(
    applause.bytes < 1_500_000,
    `the applause is still ${String(Math.round(applause.bytes / 1024))} kB`,
  );
});

test('the beat is mixed above the bed it plays over', () => {
  // If the music is louder than the cue, the cue is not a cue.
  assert.ok(MIX.beatClick > MIX.music, 'the music drowns the beat');
  assert.equal(SFX_POOL_SIZE.beatClick >= 2, true, 'the click would cut itself off');
});

test('the stage that teaches the beat plays a bed that cannot drift', () => {
  const teaching = STAGES.find((stage) => stage.groove && stage.level !== level01);
  assert.ok(teaching, 'no beat-teaching stage exists any more');
  assert.equal(
    MUSIC_TEMPO_LOCKED[teaching.music],
    true,
    `stage ${String(teaching.number)} teaches the beat over music that drifts away from it`,
  );
});

test('no stage that scores beats plays music that disagrees with them', () => {
  /*
   * This was the last open piece of M16, and for a long time it read the other
   * way round: the show was *allowed* to drift and the test merely named it so
   * a fourth stage could not quietly join the exception. The show now has a
   * generated bed, so the exception is gone and the rule is the plain one.
   */
  const offenders = STAGES.filter((stage) => stage.groove && !MUSIC_TEMPO_LOCKED[stage.music]);
  assert.deepEqual(
    offenders.map((stage) => stage.id),
    [],
    'a scored stage is playing music that is not locked to the beat clock',
  );
});

test('a bed can only claim to be tempo-locked if this repository generated it', () => {
  /*
   * The defect this exists to prevent, stated plainly, because the project
   * already made it once: `showTheme` was recorded as a 90 BPM track that
   * slipped 417 ms per loop. It is a 120 BPM track. The claim was arithmetic
   * on the file's *duration* against a 90 BPM grid, which cannot see a pulse —
   * and trimming the file to 21.333 s would have satisfied every check here
   * while changing nothing a player hears.
   *
   * A found file's tempo is somebody's word. A generated file's tempo is a
   * constant in a committed script, and that is checkable, so it is the only
   * evidence this contract accepts.
   */
  for (const key of Object.keys(MUSIC_TEMPO_LOCKED) as MusicKey[]) {
    if (!MUSIC_TEMPO_LOCKED[key]) continue;
    const generator = MUSIC_GENERATOR[key];
    assert.ok(
      generator,
      `${key} claims to be tempo-locked but names no generator, so nothing can verify it`,
    );
    assert.ok(
      statSync(join(ROOT, generator)).isFile(),
      `${key} names a generator that is missing: ${generator}`,
    );
  }
});

test('every stage names a bed that exists', () => {
  for (const stage of STAGES) {
    assert.ok(
      stage.music in MUSIC_TEMPO_LOCKED,
      `stage ${String(stage.number)} asks for a bed that is not registered`,
    );
  }
});

test('the generated audio is reproducible from its script', () => {
  // Both generators are committed and deterministic, so the files in the tree
  // are verifiable rather than merely present. This checks the scripts are
  // still there to regenerate from; the byte-for-byte hashes are recorded in
  // docs/assets/AUDIO-SOURCES.md.
  for (const script of [
    'scripts/make-beat-click.mjs',
    'scripts/make-groove-bed.mjs',
    'scripts/make-show-bed.mjs',
  ]) {
    assert.ok(statSync(join(ROOT, script)).isFile(), `${script} is missing`);
  }
});

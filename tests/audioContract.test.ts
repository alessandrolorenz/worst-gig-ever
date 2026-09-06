/**
 * Audio contract (M16, extended at M24A).
 *
 * The rhythm domain is deliberately free of every audio import, and these
 * tests do not change that: they read the *files*, the catalogue and the stage
 * table, not a player. Nothing here needs an audio device, which is the same
 * rule the rest of the suite runs under (rhythm-pivot test matrix, "No audio
 * coupling").
 *
 * The property they exist for is unchanged since M16 — a slot that scores beats
 * must not play music that disagrees with the beat clock — and M24A widens both
 * halves of it. "A stage" became "a setlist slot", and "tempo-locked" became
 * `TempoEvidence`, which has room for an external track whose pulse has been
 * measured. See `docs/decisions/0013-tempo-evidence-for-external-tracks.md`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MIX, SFX_POOL_SIZE } from '../game/audio/audioMix.ts';
import {
  MUSIC_TRACKS,
  TEMPO_GRID_FLOOR,
  TEMPO_MAX_CONDITIONING,
  TEMPO_MIN_MARGIN,
  availableTracks,
  conformingRatio,
  isGrooveQualified,
  libraryTracks,
  trackIds,
} from '../game/audio/musicCatalogue.ts';
import { OFFICIAL_SETLIST, SETLIST_SLOTS } from '../game/audio/setlist.ts';
import { RHYTHM, beatIntervalMs } from '../game/config/rhythm.ts';
import { level01 } from '../game/levels/level01.ts';
import { STAGES } from '../game/levels/stages.ts';
import { allCatalogues } from '../game/i18n/catalogue.ts';
import { gradeAgainstGrid, measureFile, measureSignal } from '../scripts/measure-track-tempo.mjs';

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

test('every track that claims a beat contract keeps it, measured on disk', () => {
  /*
   * The whole reason the beds are generated, and now the whole reason an
   * external track has to be conditioned rather than merely downloaded. The
   * shipped rock loop is 21.75 s, which at 90 BPM is 32.625 beats — it cannot
   * sit on the grid at any offset.
   *
   * Driven off the catalogue rather than a list written here: a track added
   * without a beat contract is caught by the *next* test, and one added with a
   * wrong one is caught by this.
   */
  let checked = 0;
  for (const id of trackIds()) {
    const track = MUSIC_TRACKS[id];
    if (track.beats === null) continue;

    const file = readWav(track.file);
    const beats = (file.seconds * 1000) / beatIntervalMs();

    assert.ok(
      Math.abs(beats - Math.round(beats)) < 1e-6,
      `${id} is ${beats.toFixed(4)} beats long, so it drifts`,
    );
    assert.equal(Math.round(beats), track.beats, `${id} changed length`);
    assert.equal(Math.round(beats) % 4, 0, `${id} must land on a bar line, not just a beat`);
    checked += 1;
  }
  assert.ok(checked >= 2, 'no track carries a beat contract any more');
});

test('a beat contract and tempo evidence are the same claim', () => {
  /*
   * `beats` is not "how long the file is"; it is "this file sits on the grid".
   * A track with a beat count and no evidence would be the old defect wearing
   * new clothes — a number that looks like proof and is only arithmetic.
   */
  for (const id of trackIds()) {
    const track = MUSIC_TRACKS[id];
    const verified = track.evidence.kind !== 'unverified';
    assert.equal(
      track.beats !== null,
      verified,
      `${id} has beats=${String(track.beats)} but ${track.evidence.kind} evidence`,
    );
  }
});

test('every audio file is a format Android actually guarantees', () => {
  // 8- and 16-bit linear PCM is the guaranteed set; a 24-bit source is what
  // forced the rock loop's derivative in the first place (see AUDIO-SOURCES).
  for (const path of [
    ...trackIds().map((id) => MUSIC_TRACKS[id].file),
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
    isGrooveQualified(teaching.music),
    true,
    `stage ${String(teaching.number)} teaches the beat over music that is not on the grid`,
  );
});

test('no slot that scores beats plays music that disagrees with them', () => {
  /*
   * This was the last open piece of M16, and at M24A it moved from the stage
   * table to the **setlist**, which is where music now comes from. Same rule,
   * one level of indirection later — and the indirection is why the rule has to
   * move: a stage's authored track is no longer the only thing that can reach a
   * scored round.
   */
  const offenders = STAGES.filter(
    (stage, index) => stage.groove && !isGrooveQualified(OFFICIAL_SETLIST[index]),
  );
  assert.deepEqual(
    offenders.map((stage) => stage.id),
    [],
    'a scored stage is playing music that is not on the beat clock',
  );
});

test('a track can only claim to be on the grid if something can check it', () => {
  /*
   * The defect this exists to prevent, stated plainly, because the project
   * already made it once: `showTheme` was recorded as a 90 BPM track that
   * slipped 417 ms per loop. It is a 120 BPM track. The claim was arithmetic on
   * the file's *duration* against a 90 BPM grid, which cannot see a pulse — and
   * trimming the file to 21.333 s would have satisfied every check the project
   * had while changing nothing a player hears.
   *
   * So each evidence kind names something a machine goes and looks at: a
   * generated track names its script, a conditioned one names the bytes it came
   * from and the command that made it.
   */
  for (const id of trackIds()) {
    const { evidence } = MUSIC_TRACKS[id];
    if (evidence.kind === 'generated') {
      assert.ok(
        statSync(join(ROOT, evidence.script)).isFile(),
        `${id} names a generator that is missing: ${evidence.script}`,
      );
      continue;
    }
    if (evidence.kind === 'conditioned') {
      assert.match(evidence.sourceSha256, /^[0-9a-f]{64}$/, `${id} has no usable source hash`);
      assert.ok(evidence.command.trim().length > 0, `${id} records no conditioning command`);
      assert.ok(
        Number.isFinite(evidence.measuredBpm) && evidence.measuredBpm > 0,
        `${id} records no measured tempo`,
      );
      assert.ok(
        evidence.measurementConfidence >= 0 && evidence.measurementConfidence <= 1,
        `${id} records an impossible measurement confidence`,
      );
    }
  }
});

test('every track a player could choose carries provenance and a title', () => {
  /*
   * Vacuous while the library is empty, and that is deliberate: this is the
   * half that has to already exist on the day the first song lands, because a
   * track shipped without a provenance record breaks AGENTS.md rule 13 and
   * nobody finds it by playing.
   */
  for (const id of libraryTracks()) {
    const track = MUSIC_TRACKS[id];
    const library = track.library;
    assert.ok(library, `${id} is in the library list without a library entry`);
    assert.ok(track.provenanceId, `${id} is player-selectable with no provenance record`);
    for (const [locale, catalogue] of allCatalogues()) {
      const titles = (catalogue as { music?: Record<string, string> }).music ?? {};
      assert.ok(
        typeof titles[library.titleKey] === 'string',
        `${id} has no title in ${locale}`,
      );
    }
  }
});

test('a production track is on the grid, and a candidate cannot ship', () => {
  /*
   * The invariant that makes any custom setlist safe without enumerating
   * setlists: if every production track is grid-qualified, every arrangement of
   * them is too. Checked against the catalogue rather than against a list of
   * setlists, because there are 360 of the latter and one of the former.
   */
  for (const id of libraryTracks()) {
    const library = MUSIC_TRACKS[id].library;
    if (library?.release !== 'production') continue;
    assert.equal(isGrooveQualified(id), true, `${id} ships but is not on the beat clock`);
    if (MUSIC_TRACKS[id].evidence.kind === 'conditioned') {
      assert.equal(
        MUSIC_TRACKS[id].evidence.ownerConfirmed,
        true,
        `${id} is an external track that shipped without anybody listening to it`,
      );
    }
  }

  const shipping = availableTracks(false);
  for (const id of shipping) {
    assert.equal(
      MUSIC_TRACKS[id].library?.release,
      'production',
      `${id} is a candidate and a release build can select it`,
    );
  }
  assert.equal(
    shipping.some((id) => MUSIC_TRACKS[id].library?.release === 'candidate'),
    false,
    'a development-only candidate is reachable in a production build',
  );
});

test('the catalogue holds the only copy of every music path', () => {
  /*
   * `audioAssets.ts` cannot be imported here — it reaches for files through
   * Metro's `require` — so its source is read instead. Metro resolves `require`
   * statically, which is why the literal has to be written out there at all;
   * this is what stops the two drifting apart in opposite directions.
   */
  const registry = readFileSync(join(ROOT, 'game/audio/audioAssets.ts'), 'utf8');
  for (const id of trackIds()) {
    const { file } = MUSIC_TRACKS[id];
    assert.ok(
      registry.includes(file),
      `${id} is catalogued at ${file}, which audioAssets.ts never requires`,
    );
    assert.ok(
      registry.includes(`${id}:`),
      `${id} is in the catalogue but not in MUSIC_SOURCES`,
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

/* ------------------------------------------------------------------ *
 * The measurement itself (M24A)
 * ------------------------------------------------------------------ */

/**
 * A rock-shaped test signal at a known tempo.
 *
 * Kick on 1 and 3, snare on 2 and 4, eighth-note hats accented on the beat —
 * the same shape as `groove_bed_90.wav`, and specifically the shape that makes
 * a naive detector answer twice the true tempo.
 *
 * Synthetic on purpose. Asserting against the files in the tree would only
 * prove the tool agrees with itself about three files; a signal built here has
 * a tempo that is **known by construction**, so these tests measure the
 * algorithm rather than the repository.
 */
function rockSignal(bpm: number, seconds: number, sampleRate = 44_100): Float32Array {
  const out = new Float32Array(Math.round(sampleRate * seconds));
  const beat = 60 / bpm;
  // A fixed sequence, so the test cannot pass or fail on the day's noise.
  let seed = 12_345;
  const noise = () => {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    return (seed / 2_147_483_648) * 2 - 1;
  };
  const hit = (at: number, amplitude: number, decay: number, frequency: number) => {
    const start = Math.round(at * sampleRate);
    for (let i = 0; i < sampleRate * 0.25 && start + i < out.length; i += 1) {
      const t = i / sampleRate;
      out[start + i] +=
        amplitude * Math.exp(-t * decay) * (Math.sin(2 * Math.PI * frequency * t) + noise() * 0.6);
    }
  };
  let index = 0;
  for (let t = 0; t < seconds; t += beat, index += 1) {
    const inBar = index % 4;
    if (inBar === 0 || inBar === 2) hit(t, 0.9, 40, 60);
    else hit(t, 0.8, 30, 200);
    hit(t, 0.35, 120, 6000);
    hit(t + beat / 2, 0.18, 120, 6000);
  }
  let peak = 0;
  for (const value of out) peak = Math.max(peak, Math.abs(value));
  if (peak > 0) for (let i = 0; i < out.length; i += 1) out[i] /= peak;
  return out;
}

test('the tempo tool reads a known pulse, not a convenient duration', () => {
  /*
   * The acceptance test for the measurement, and the reason it is synthetic.
   *
   * Every one of these signals is a whole number of beats long at 90 BPM as
   * well as at its own tempo, so **duration divisibility cannot tell them
   * apart** — which is exactly the check that blessed a 120 BPM track as 90 and
   * is the mistake this tool exists to make impossible.
   */
  for (const bpm of [72, 90, 100, 120, 140]) {
    // 240 s is a whole number of beats at 90 and at every tempo below.
    const measured = measureSignal(rockSignal(bpm, 24), 44_100, RHYTHM.bpm);
    assert.ok(measured.bpm !== null, `${String(bpm)} BPM was not measurable at all`);
    assert.ok(
      Math.abs(measured.bpm - bpm) <= 1.5,
      `a ${String(bpm)} BPM signal measured ${measured.bpm.toFixed(1)} BPM`,
    );
  }
});

test('the tempo tool accepts the game grid and rejects a near neighbour', () => {
  const onGrid = measureSignal(rockSignal(RHYTHM.bpm, 24), 44_100, RHYTHM.bpm);
  assert.equal(gradeAgainstGrid(onGrid).ok, true, 'a 90 BPM signal was not accepted');
  assert.ok(onGrid.gridScore > TEMPO_GRID_FLOOR, 'a 90 BPM signal scored under the floor');
  assert.equal(onGrid.gridRank, 1, 'something explained a 90 BPM signal better than 90 BPM');

  /*
   * 96 and 120 are the two readings that actually threaten this project: 96 is
   * what `rock_theme_song_loop.wav` measures, and 120 is what it is. Neither is
   * an octave of 90, so neither may pass.
   */
  for (const bpm of [96, 120]) {
    const offGrid = measureSignal(rockSignal(bpm, 24), 44_100, RHYTHM.bpm);
    const grade = gradeAgainstGrid(offGrid);
    assert.equal(grade.ok, false, `a ${String(bpm)} BPM signal was accepted onto a 90 BPM grid`);
    assert.ok(
      offGrid.gridScore < TEMPO_GRID_FLOOR,
      `a ${String(bpm)} BPM signal scored ${offGrid.gridScore.toFixed(3)} against a 90 BPM grid`,
    );
  }
});

test('a track at double tempo still locks to the grid', () => {
  /*
   * Not pedantry — it is why the gate ignores octaves when it looks for rivals.
   * A 180 BPM track puts a beat on every beat the player taps. Counting its own
   * octave as a competitor would penalise every correctly detected track,
   * because a bed with eighth-note hats always has one.
   */
  const doubled = measureSignal(rockSignal(RHYTHM.bpm * 2, 24), 44_100, RHYTHM.bpm);
  assert.ok(
    doubled.gridScore > TEMPO_GRID_FLOOR,
    `a ${String(RHYTHM.bpm * 2)} BPM signal scored ${doubled.gridScore.toFixed(3)} against the grid`,
  );
});

test('every track in the tree measures what the catalogue says it does', () => {
  /*
   * The same gate `npm run measure:tempo -- --require-locked` runs, asserted
   * here so a plain `npm test` cannot go green while the beds have drifted.
   *
   * `showTheme` is the interesting row and it is not special-cased: it is
   * rejected because its onsets say so. Its measured agreement with a 90 BPM
   * grid is ~0.0 against 0.84 and 0.73 for the generated beds, which is the
   * musical difference this whole milestone turns on.
   */
  for (const id of trackIds()) {
    const track = MUSIC_TRACKS[id];
    const measured = measureFile(join(ROOT, track.file));
    const grade = gradeAgainstGrid(measured);

    if (track.evidence.kind === 'unverified') {
      assert.equal(
        grade.ok,
        false,
        `${id} is filed as unverified but measures cleanly at ${String(RHYTHM.bpm)} BPM`,
      );
      assert.ok(
        measured.gridScore < TEMPO_GRID_FLOOR,
        `${id} is filed as unverified but agrees with the grid at ${measured.gridScore.toFixed(3)}`,
      );
      continue;
    }

    assert.equal(grade.ok, true, `${id} claims ${track.evidence.kind}: ${grade.problems.join('; ')}`);

    /*
     * The margin gates **shipping**, not existing — corrected at M24B, when the
     * first external tracks arrived and showed the difference matters.
     *
     * M24A asserted this of every non-`unverified` track, which was right while
     * the only two were generated beds leading by ~0.20. Real music does not
     * behave like a bed: 7 of M24B's 11 candidates lead their best incompatible
     * rival by less than 0.05, because a rock arrangement puts real energy on
     * the half-bar and the bar, so 120 and 60 score close behind 90. Those
     * tracks are not wrong — `gridScore` and `gridRank` say emphatically that
     * they are on the grid — the *tool* simply cannot separate the readings.
     *
     * That is exactly what `TEMPO_MIN_MARGIN`'s own comment says it means: "a
     * flag, not a rejection… which calls for a listen rather than a rounder
     * number", and what `gradeAgainstGrid` already does by returning it as an
     * advisory. The threshold is unchanged; what changed is that the assertion
     * now matches the model, by demanding a human ear exactly where the model
     * says one is needed.
     *
     * So: a thin margin is fine for a candidate, and disqualifying for anything
     * a player can select unless a person has confirmed it locks.
     */
    if (measured.gridMargin >= TEMPO_MIN_MARGIN) continue;

    const library = track.library;
    if (library === null || library.release !== 'production') continue;
    assert.equal(
      track.evidence.kind === 'conditioned' && track.evidence.ownerConfirmed,
      true,
      `${id} ships, leads its best incompatible rival by only ${measured.gridMargin.toFixed(3)}, ` +
        'and nobody has confirmed by ear that it locks to the click',
    );
  }
});

test('M24B: an ambiguous pulse is a reason to listen, not a reason to ship', () => {
  /*
   * The rule above, asserted as a property rather than as a walk over today's
   * catalogue — so it holds for the tracks the owner promotes at M24C, which do
   * not exist yet and are the ones it is actually for.
   *
   * Stated: for every track a *player* can select, either the measurement
   * separates the game's grid from every incompatible rival, or a person has
   * listened. There is no third way to become selectable.
   */
  for (const id of availableTracks(true)) {
    const track = MUSIC_TRACKS[id];
    if (track.library?.release !== 'production') continue;

    const measured = measureFile(join(ROOT, track.file));
    const separated = measured.gridMargin >= TEMPO_MIN_MARGIN;
    const heard = track.evidence.kind === 'conditioned' && track.evidence.ownerConfirmed;
    assert.ok(
      separated || heard,
      `${id} is selectable with a ${measured.gridMargin.toFixed(3)} margin and no owner confirmation`,
    );
  }
});

test('M24B: no track was conditioned further than the corpus justifies', () => {
  /*
   * `measuredBpm` records the **source's** pulse, so the obvious check — does
   * this file measure what the evidence says — is the one check that must never
   * pass: a track conditioned from 95 BPM measures 90 on disk by construction.
   * M24A's tooling did exactly that comparison and would have called all eleven
   * of M24B's candidates drift.
   *
   * What is checkable is the claim the field really makes: that the recorded
   * source pulse is one a conditioning command could plausibly have brought to
   * the grid. See `TEMPO_MAX_CONDITIONING`, which is set from the corpus.
   *
   * Half and double are free — a 185 BPM source is a 2.7% change, not a 51% one.
   */
  let checked = 0;
  for (const id of trackIds()) {
    const { evidence } = MUSIC_TRACKS[id];
    if (evidence.kind !== 'conditioned') continue;
    const ratio = conformingRatio(evidence.measuredBpm, RHYTHM.bpm);
    assert.ok(
      Math.abs(ratio - 1) <= TEMPO_MAX_CONDITIONING,
      `${id} claims a ${evidence.measuredBpm.toFixed(1)} BPM source, which needs x${ratio.toFixed(3)} to reach ${String(RHYTHM.bpm)}`,
    );
    assert.ok(evidence.command.length > 0, `${id} has no conditioning command`);
    assert.match(evidence.sourceSha256, /^[0-9a-f]{64}$/, `${id} has no usable source hash`);
    assert.ok(
      evidence.measurementConfidence > 0,
      `${id} records a confidence of ${String(evidence.measurementConfidence)}`,
    );
    checked += 1;
  }
  assert.ok(checked > 0, 'no conditioned track exists to check');
});

test('the official setlist is exactly what the stage table authored', () => {
  assert.equal(OFFICIAL_SETLIST.length, SETLIST_SLOTS);
  for (const [index, stage] of STAGES.entries()) {
    assert.equal(OFFICIAL_SETLIST[index], stage.music, `slot ${String(index)} left the stage table`);
  }
});

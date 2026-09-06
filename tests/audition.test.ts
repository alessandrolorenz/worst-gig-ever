/**
 * The music library and the audition tooling (M24B, M24C).
 *
 * Source of truth: docs/specs/M24-custom-setlist.md
 *                  docs/specs/M24C-custom-setlist.md
 *                  docs/assets/M24-MUSIC-ACQUISITION-SPEC.md
 *
 * M24B put eleven external tracks in the tree and a way to listen to them.
 * M24C is the owner's answer — **11 KEEP, 0 MAYBE, 0 REJECT** — so all eleven
 * are production music now, and half of what this file used to assert changed
 * sides with them.
 *
 * What did **not** change is what the file is for. Three things are still
 * dangerous and are still checked here:
 *
 *   - **third-party audio must stay what it says it is.** Every track is CC0,
 *     conditioned from a hashed source by a committed command, and exactly
 *     sixteen bars of it. Those checks now run over the production library
 *     rather than over a candidate pool, which is the *stronger* place for
 *     them: these files ship;
 *   - **the authored show must not quietly change.** The audition path writes
 *     `flow.setlist`, the same field a real run reads. If a stage card could
 *     pick that up, a first run would come up on music nobody chose;
 *   - **the audition flag must stay a development door.** It opens tooling. It
 *     has never been able to promote a track and it still cannot, which is why
 *     the promotion at M24C is recorded in the catalogue and in a document
 *     rather than implied by a build.
 *
 * Nothing here needs an audio device. The files are read as bytes and the
 * audition module is pure.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  AUDITION_MODES,
  auditionSetlist,
  auditionTracks,
  nextMode,
  stepCursor,
  trackAtCursor,
  type AuditionMode,
} from '../game/audio/audition.ts';
import {
  MUSIC_TRACKS,
  availableTracks,
  isGrooveQualified,
  trackIds,
} from '../game/audio/musicCatalogue.ts';
import { OFFICIAL_SETLIST, SETLIST_SLOTS, trackForStage } from '../game/audio/setlist.ts';
import { RHYTHM, beatIntervalMs } from '../game/config/rhythm.ts';
import { STAGES } from '../game/levels/stages.ts';
import {
  createAppFlow,
  returnToTitle,
  startStage,
  startStageWithSetlist,
} from '../game/state/appFlow.ts';
import {
  AUDITION_BUILD_FLAG,
  isAuditionBuild,
  showsAuditionTools,
} from '../game/config/buildFlags.ts';
import { allCatalogues } from '../game/i18n/catalogue.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Every conditioned library track, from the catalogue rather than from a list.
 *
 * Was "every candidate" until M24C. The filter is `library !== null` now
 * because `release` no longer separates anything — all eleven are production —
 * and the property these tests are about was never the release state anyway: it
 * is *this file came from outside and has to keep proving it*.
 */
const library = trackIds().filter(
  (id) => MUSIC_TRACKS[id].library !== null && MUSIC_TRACKS[id].evidence.kind === 'conditioned',
);

const manifest = JSON.parse(
  readFileSync(join(repoRoot, 'assets/audio/music/library/SOURCES.json'), 'utf8'),
) as ReadonlyArray<Record<string, string | number | boolean>>;

// ---------------------------------------------------------------------------
// The library in the tree
// ---------------------------------------------------------------------------

test('M24B: every library track is a real file of the length it claims', () => {
  assert.ok(library.length >= 8, `only ${String(library.length)} library tracks exist`);

  for (const id of library) {
    const track = MUSIC_TRACKS[id];
    const absolute = join(repoRoot, track.file);
    const bytes = statSync(absolute).size;
    assert.ok(bytes > 0, `${id} is an empty file`);

    /*
     * The whole-bar contract, read off the header rather than off the manifest,
     * so a file replaced by hand fails here even if the manifest still agrees
     * with itself.
     */
    const header = readFileSync(absolute);
    const channels = header.readUInt16LE(22);
    const sampleRate = header.readUInt32LE(24);
    const bits = header.readUInt16LE(34);
    let offset = 12;
    let dataLength = 0;
    while (offset < header.length - 8) {
      const chunk = header.toString('ascii', offset, offset + 4);
      const size = header.readUInt32LE(offset + 4);
      if (chunk === 'data') {
        dataLength = size;
        break;
      }
      offset += 8 + size + (size % 2);
    }
    const seconds = dataLength / (sampleRate * channels * (bits / 8));
    const beats = (seconds * 1000) / beatIntervalMs();

    assert.equal(Math.round(beats), track.beats, `${id} is not the length the catalogue records`);
    assert.equal(Math.round(beats) % 4, 0, `${id} does not end on a bar line`);
    assert.ok(Math.abs(beats - Math.round(beats)) < 1e-6, `${id} drifts by a fraction of a beat`);
  }
});

test('M24B: no library track is silent, and none is a wall of clipping', () => {
  /*
   * Two failures a tempo measurement cannot see, because both can produce a
   * perfectly gridded file: a derivative cut from a gap in the arrangement, and
   * one whose gain was computed against a stray sample so the music sits far
   * under everything else in the mix.
   *
   * Peak is asserted against the project's own conditioning target rather than
   * against a general idea of loudness — every candidate is normalised to
   * `PEAK_TARGET`, so a file that is not near it did not come out of the
   * pipeline.
   */
  for (const id of library) {
    const bytes = readFileSync(join(repoRoot, MUSIC_TRACKS[id].file));
    const channels = bytes.readUInt16LE(22);
    let offset = 12;
    let dataStart = -1;
    let dataLength = 0;
    while (offset < bytes.length - 8) {
      const chunk = bytes.toString('ascii', offset, offset + 4);
      const size = bytes.readUInt32LE(offset + 4);
      if (chunk === 'data') {
        dataStart = offset + 8;
        dataLength = Math.min(size, bytes.length - dataStart);
        break;
      }
      offset += 8 + size + (size % 2);
    }
    assert.ok(dataStart > 0, `${id} has no data chunk`);

    let peak = 0;
    let sum = 0;
    let count = 0;
    // Every 16th frame: enough for a peak and an RMS, and keeps the suite fast.
    for (let at = dataStart; at + 1 < dataStart + dataLength; at += 2 * channels * 16) {
      const value = bytes.readInt16LE(at) / 32768;
      peak = Math.max(peak, Math.abs(value));
      sum += value * value;
      count += 1;
    }
    const rms = Math.sqrt(sum / Math.max(1, count));

    assert.ok(peak > 0.5, `${id} peaks at ${peak.toFixed(3)} — it is far quieter than the beds`);
    assert.ok(peak <= 1, `${id} peaks above full scale`);
    assert.ok(rms > 0.02, `${id} has an RMS of ${rms.toFixed(4)} — it is close to silent`);
  }
});

test('M24B: the manifest and the catalogue describe the same eleven tracks', () => {
  /*
   * The manifest is what makes the derivatives reproducible without committing
   * 129 MB of sources, so it is load-bearing provenance rather than a note. Two
   * copies of a fact can disagree; this is what stops them.
   */
  assert.equal(manifest.length, library.length, 'the manifest and the catalogue differ in size');

  for (const entry of manifest) {
    const id = entry.id as string;
    const track = MUSIC_TRACKS[id as keyof typeof MUSIC_TRACKS];
    assert.ok(track, `the manifest names ${id}, which is not in the catalogue`);
    assert.equal(track.file, entry.derivative, `${id} is bundled from a different path than it is built to`);
    assert.equal(track.beats, Number(entry.bars) * 4, `${id} disagrees on its length`);

    assert.equal(track.evidence.kind, 'conditioned');
    if (track.evidence.kind !== 'conditioned') continue;
    assert.equal(track.evidence.sourceSha256, entry.sourceSha256, `${id} was built from other bytes`);
    assert.equal(track.evidence.measuredBpm, entry.measuredBpm, `${id} disagrees on its source tempo`);

    // The licence is the reason this may be in the tree at all.
    assert.equal(entry.licence, 'CC0', `${id} is not CC0`);
    assert.match(String(entry.sourcePage), /^https:\/\//, `${id} has no source page`);
    assert.match(String(entry.sourceSha256), /^[0-9a-f]{64}$/, `${id} has no source hash`);
    assert.ok(String(entry.author).length > 0, `${id} names no author`);

    const bytes = statSync(join(repoRoot, String(entry.derivative))).size;
    assert.equal(bytes, entry.derivativeBytes, `${id} is not the size the manifest records`);
  }
});

test('M24B: every library track keeps its real authorship, whatever it is called in game', () => {
  /*
   * AGENTS.md rule 13, as a test. The fictional title is presentation; renaming
   * a third-party work away from its author is a provenance failure, and the
   * failure mode is silent — the game looks fine either way.
   */
  const provenance = readFileSync(join(repoRoot, 'docs/assets/AUDIO-SOURCES.md'), 'utf8');

  for (const entry of manifest) {
    const id = entry.id as string;
    assert.ok(
      provenance.includes(String(entry.originalFilename)),
      `${id} does not record the original filename it was built from`,
    );
    assert.ok(provenance.includes(String(entry.author)), `${id} does not record its author`);
    assert.ok(provenance.includes(String(entry.sourcePage)), `${id} does not record its source page`);
    assert.ok(
      provenance.includes(String(entry.sourceSha256)),
      `${id} does not record the hash of the bytes it was built from`,
    );
  }
});

// ---------------------------------------------------------------------------
// The audition module
// ---------------------------------------------------------------------------

test('M24B: the cursor wraps in both directions and never leaves the pool', () => {
  const tracks = auditionTracks();
  assert.ok(tracks.length > 0);

  assert.equal(stepCursor(tracks, 0, -1), tracks.length - 1, 'stepping back from the first wrapped wrong');
  assert.equal(stepCursor(tracks, tracks.length - 1, 1), 0, 'stepping past the last wrapped wrong');
  assert.equal(stepCursor(tracks, 0, tracks.length), 0, 'a full lap did not return to the start');

  // Nothing a control can do produces an index that cannot be read.
  for (let delta = -40; delta <= 40; delta += 1) {
    const cursor = stepCursor(tracks, 3, delta);
    assert.ok(cursor >= 0 && cursor < tracks.length, `cursor left the pool at delta ${String(delta)}`);
    assert.ok(trackAtCursor(tracks, cursor) !== null);
  }

  // An empty pool — a release build, or M24C after the owner's cull.
  assert.equal(stepCursor([], 0, 1), 0);
  assert.equal(trackAtCursor([], 0), null);
});

test('M24B: an audition setlist always fills every slot', () => {
  const tracks = auditionTracks();

  for (const mode of AUDITION_MODES) {
    for (let cursor = 0; cursor < tracks.length; cursor += 1) {
      const setlist = auditionSetlist(tracks, cursor, mode);
      assert.ok(setlist, `${mode} produced no setlist at cursor ${String(cursor)}`);
      assert.equal(setlist.length, SETLIST_SLOTS, `${mode} left a slot empty`);
      for (const id of setlist) {
        assert.ok(tracks.includes(id), `${mode} put ${id} in a setlist, which is not auditionable`);
      }
    }
  }

  assert.equal(auditionSetlist([], 0, 'solo'), null, 'an empty pool produced a setlist');
});

test('M24B: solo auditions one track everywhere, rotate auditions four', () => {
  const tracks = auditionTracks();

  const solo = auditionSetlist(tracks, 2, 'solo');
  assert.ok(solo);
  assert.equal(new Set(solo).size, 1, 'solo mode played more than one track');
  assert.equal(solo[0], tracks[2], 'solo mode played a track other than the selected one');

  /*
   * The point of solo mode: whichever stage the owner starts, they hear the
   * track the cursor is on. Without that the answer to "is this fun during
   * defense?" would depend on which slot they happened to start.
   */
  for (let stage = 0; stage < STAGES.length; stage += 1) {
    assert.equal(trackForStage(solo, stage), tracks[2], `stage ${String(stage)} played something else`);
  }

  const rotate = auditionSetlist(tracks, 2, 'rotate');
  assert.ok(rotate);
  assert.equal(new Set(rotate).size, SETLIST_SLOTS, 'rotate mode repeated a track');
  assert.equal(rotate[0], tracks[2], 'rotate mode did not start on the selected track');
  assert.equal(rotate[1], tracks[3], 'rotate mode did not continue through the pool');

  assert.equal(nextMode('solo'), 'rotate');
  assert.equal(nextMode('rotate'), 'solo');
});

// ---------------------------------------------------------------------------
// The official show is untouched
// ---------------------------------------------------------------------------

test('M24B: picking a stage still starts the show the owner approved', () => {
  /*
   * The property the whole milestone rests on. `startStageWithSetlist` exists
   * and writes `flow.setlist`; every *production* path must be unable to reach
   * it. Asserted after an audition has run, because the interesting failure is
   * a leftover — not "does a fresh flow work" but "does the audition wash out".
   */
  const tracks = auditionTracks();
  const flow = createAppFlow();
  const audition = auditionSetlist(tracks, 0, 'solo');
  assert.ok(audition);

  startStageWithSetlist(flow, 1, audition);
  assert.deepEqual([...flow.setlist], [...audition], 'the audition run did not take its setlist');
  assert.equal(trackForStage(flow.setlist, 1), tracks[0], 'Stage 2 did not play the audition track');

  // The owner backs out, and the show is the authored one again.
  returnToTitle(flow);
  assert.deepEqual([...flow.setlist], [...OFFICIAL_SETLIST], 'an audition outlived the run it started');

  // And a stage picked from the title is authored, whatever came before it.
  startStage(flow, 1);
  assert.deepEqual([...flow.setlist], [...OFFICIAL_SETLIST], 'a stage button started a custom setlist');
  assert.equal(trackForStage(flow.setlist, 1), 'grooveBed', 'Stage 2 stopped teaching the beat over its bed');
});

test('M24B: Stage 2 can be auditioned on a song without the official run changing', () => {
  /*
   * The owner's specific question — can a real song replace the teaching bed on
   * a replay? — made testable before it is answerable. Both facts at once: the
   * audition path can put a candidate under Stage 2, and the authored show
   * still teaches the beat over `grooveBed`.
   */
  const tracks = auditionTracks();
  const stageTwo = 1;
  assert.equal(STAGES[stageTwo].groove, true, 'Stage 2 stopped scoring the beat');
  assert.equal(OFFICIAL_SETLIST[stageTwo], 'grooveBed', 'the official Stage 2 bed changed');

  for (const id of tracks) {
    const setlist = auditionSetlist(tracks, tracks.indexOf(id), 'solo');
    assert.ok(setlist);
    assert.equal(trackForStage(setlist, stageTwo), id);
    /*
     * And it is safe to do so. Stage 2 scores beats, so anything under it has to
     * be on the grid — which is true of every candidate by construction, and is
     * the reason an audition cannot teach the player a wrong beat.
     */
    assert.equal(isGrooveQualified(id), true, `${id} could back Stage 2 without being on the grid`);
  }
});

test('M24C: a release build reaches only music somebody has listened to', () => {
  /*
   * M24B's version of this test asserted that a release build could select
   * *nothing* — the only safe answer while eleven unaudited tracks sat in the
   * tree. The owner has since listened to all eleven and kept all eleven, so
   * the empty assertion would now be asserting that the milestone failed.
   *
   * The property underneath it is the one that mattered and it is unchanged:
   * **no track reaches a player unheard.** That was true by the pool being
   * empty; it is true now by every track in it carrying a record of having been
   * played to a person. Stated over the release-build answer, so it holds for
   * whatever the library becomes.
   */
  const shipping = availableTracks(false);
  assert.ok(shipping.length > 0, 'the promotion did not land — a release build has no music');

  for (const id of shipping) {
    const track = MUSIC_TRACKS[id];
    assert.equal(track.library?.release, 'production', `${id} ships as a candidate`);
    assert.equal(
      isGrooveQualified(id),
      true,
      `${id} is selectable and is not on the beat clock`,
    );
    if (track.evidence.kind === 'conditioned') {
      assert.equal(
        track.evidence.ownerConfirmed,
        true,
        `${id} is an external track a player can choose that nobody has heard`,
      );
    }
    assert.equal(
      OFFICIAL_SETLIST.includes(id),
      false,
      `${id} is in the authored show as well as the library`,
    );
  }

  /*
   * And the other direction, which is the one that would go wrong quietly: a
   * conditioned track that has *not* been confirmed must not be reachable. There
   * are none today, so this asserts the rule rather than an instance of it —
   * which is exactly what it is for, since the next acquisition arrives as one.
   */
  for (const id of trackIds()) {
    const track = MUSIC_TRACKS[id];
    if (track.evidence.kind !== 'conditioned' || track.evidence.ownerConfirmed) continue;
    assert.equal(
      shipping.includes(id),
      false,
      `${id} has not been listened to and a release build can select it`,
    );
  }
});

test('M24B: every library track has a title in every language', () => {
  for (const id of library) {
    const titleKey = MUSIC_TRACKS[id].library?.titleKey;
    assert.ok(titleKey, `${id} is selectable with no title key`);
    for (const [locale, catalogue] of allCatalogues()) {
      const title: string | undefined = (catalogue.music as Record<string, string>)[titleKey];
      assert.equal(typeof title, 'string', `${id} has no title in ${locale}`);
      assert.ok((title ?? '').trim().length > 0, `${id} has an empty title in ${locale}`);
    }
  }
});

test('M24B: the pool size is data, not a number written in the code', () => {
  /*
   * The owner's standing instruction: the library is 8-12 tracks, maybe more,
   * and the number is a product decision made from auditions. Adding or
   * removing one must be a change to the catalogue and to nothing else.
   *
   * `Overlays.tsx` joined the list at M24C, because the builder is where a
   * "there are eleven songs" would now be most tempting to write — the screen
   * draws every one of them.
   */
  for (const file of [
    'game/audio/audition.ts',
    'game/audio/musicCatalogue.ts',
    'game/rendering/DevAudition.tsx',
    'game/rendering/Overlays.tsx',
  ]) {
    /*
     * Comments go, and so does everything from `StyleSheet.create(` onwards —
     * the same cut `tests/localization.test.ts` makes on the same files, for
     * the same reason. A stylesheet is hundreds of dimensions and none of them
     * is a count of anything: `fontSize: 11` in the builder's results line is
     * not a claim about how many songs there are, and a test that reads it as
     * one would push the next person to pick a font size to keep it quiet.
     */
    const source = readFileSync(join(repoRoot, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');
    const styles = source.indexOf('StyleSheet.create(');
    const body = styles < 0 ? source : source.slice(0, styles);
    assert.equal(
      new RegExp(`\\b${String(library.length)}\\b`).test(body),
      false,
      `${file} hardcodes the number of songs in the library`,
    );
  }

  // And the grid the audition runs on is still the game's own.
  assert.equal(RHYTHM.bpm, 90);
});

/** Exercised so the mode type cannot silently gain a member nothing handles. */
test('M24B: there are exactly two audition modes and both are reachable', () => {
  assert.deepEqual([...AUDITION_MODES], ['solo', 'rotate']);
  let mode: AuditionMode = 'solo';
  const seen = new Set<AuditionMode>();
  for (let i = 0; i < AUDITION_MODES.length * 2; i += 1) {
    seen.add(mode);
    mode = nextMode(mode);
  }
  assert.equal(seen.size, AUDITION_MODES.length, 'a mode cannot be reached by cycling');
});

// ---------------------------------------------------------------------------
// The audition build flag
// ---------------------------------------------------------------------------

test('M24B: the audition flag is off unless something deliberately sets it', () => {
  /*
   * `EXPO_PUBLIC_AUDITION_BUILD` turns a standalone release-type build into one
   * that can still show the audition row, so the owner can judge music on a
   * phone that is not cabled to a laptop. The danger is obvious and it is why
   * this reads an allow-list rather than a truthiness check: an empty string, a
   * `0`, a `false` and a typo are all things a CI environment produces by
   * accident, and every one of them has to mean no.
   */
  const original = process.env[AUDITION_BUILD_FLAG];
  try {
    for (const value of [undefined, '', '0', 'false', 'no', 'yes', 'TRUE', '2', 'on']) {
      if (value === undefined) delete process.env[AUDITION_BUILD_FLAG];
      else process.env[AUDITION_BUILD_FLAG] = value;
      assert.equal(
        isAuditionBuild(),
        false,
        `${JSON.stringify(value)} switched the audition build on`,
      );
    }
    for (const value of ['1', 'true']) {
      process.env[AUDITION_BUILD_FLAG] = value;
      assert.equal(isAuditionBuild(), true, `${value} did not switch the audition build on`);
      assert.equal(showsAuditionTools(), true, `${value} did not open the audition tooling`);
    }
  } finally {
    if (original === undefined) delete process.env[AUDITION_BUILD_FLAG];
    else process.env[AUDITION_BUILD_FLAG] = original;
  }
});

test('M24B: no shipping build profile turns the audition flag on', () => {
  /*
   * The flag's real guard, and the reason it is not a hole. A build profile that
   * sets it is a **failing test**, not a quiet change — so the way candidates
   * reach a store is a deliberate edit somebody has to justify here.
   *
   * `production` and `preview` are the two that can reach a player: `production`
   * goes to the Play track and `preview` is submitted as a draft
   * (`eas.json`, submit.preview.android.releaseStatus). Internal-distribution
   * profiles are excluded on purpose — those are for exactly this kind of
   * testing and cannot be submitted.
   */
  const eas = JSON.parse(readFileSync(join(repoRoot, 'eas.json'), 'utf8')) as {
    build: Record<string, { env?: Record<string, string>; distribution?: string }>;
  };

  for (const name of ['production', 'preview']) {
    const profile = eas.build[name];
    assert.ok(profile, `eas.json lost its ${name} profile`);
    assert.equal(
      profile.env?.[AUDITION_BUILD_FLAG],
      undefined,
      `the ${name} profile sets ${AUDITION_BUILD_FLAG}, so unaudited music could ship`,
    );
  }

  /*
   * And any profile that *does* set it must be internal-distribution only, so a
   * future audition profile cannot be pointed at a store by accident.
   */
  for (const [name, profile] of Object.entries(eas.build)) {
    if (profile.env?.[AUDITION_BUILD_FLAG] === undefined) continue;
    assert.equal(
      profile.distribution,
      'internal',
      `the ${name} profile enables the audition flag without being internal-distribution`,
    );
  }
});

test('M24B: the flag opens a door, it cannot promote a track through it', () => {
  /*
   * The separation that makes the flag safe to exist at all, and the reason
   * M24C's promotion is a recorded decision rather than a build configuration.
   *
   * The flag decides whether a *development surface is drawn*. It has no
   * bearing on whether a track has been listened to, and the two questions are
   * answered in different modules — `tests/audioContract.test.ts` enforces the
   * listening rule and does not read `buildFlags.ts` at all.
   *
   * Demonstrated by taking a full census of the catalogue with the flag off,
   * turning it on, and taking the census again. Nothing may move. That works
   * whatever the library happens to contain, which is why it survived the
   * candidate pool emptying.
   */
  const census = () =>
    trackIds().map((id) => {
      const track = MUSIC_TRACKS[id];
      const confirmed =
        track.evidence.kind === 'conditioned' ? track.evidence.ownerConfirmed : null;
      return `${id}:${String(track.library?.release ?? 'none')}:${String(confirmed)}`;
    });

  const original = process.env[AUDITION_BUILD_FLAG];
  try {
    delete process.env[AUDITION_BUILD_FLAG];
    assert.equal(isAuditionBuild(), false, 'the flag is on before the test set it');
    const closed = census();
    const shippingWithFlagOff = [...availableTracks(false)];

    process.env[AUDITION_BUILD_FLAG] = '1';
    assert.equal(showsAuditionTools(), true, 'the audition build did not open the tooling');

    // The tooling opens...
    assert.ok(availableTracks().length > 0, 'an audition build sees no music to audition');
    // ...and nothing about any track's standing moved.
    assert.deepEqual(census(), closed, 'a build flag changed a track’s standing');
    // And the explicit question a release build asks still answers the same way.
    assert.deepEqual(
      [...availableTracks(false)],
      shippingWithFlagOff,
      'the flag leaked into the shipping answer',
    );
  } finally {
    if (original === undefined) delete process.env[AUDITION_BUILD_FLAG];
    else process.env[AUDITION_BUILD_FLAG] = original;
  }
});

test('M24B: an audition build still plays the authored show by default', () => {
  /*
   * The flag adds a row and a pool. It must not touch a single note of the game
   * as authored — otherwise the thing being auditioned is not the thing that
   * ships.
   */
  const original = process.env[AUDITION_BUILD_FLAG];
  try {
    process.env[AUDITION_BUILD_FLAG] = '1';
    const flow = createAppFlow();
    assert.deepEqual([...flow.setlist], [...OFFICIAL_SETLIST], 'a fresh run left the authored show');
    startStage(flow, 1);
    assert.deepEqual([...flow.setlist], [...OFFICIAL_SETLIST], 'a stage button started something else');
    assert.equal(trackForStage(flow.setlist, 1), 'grooveBed', 'Stage 2 stopped teaching over its bed');
  } finally {
    if (original === undefined) delete process.env[AUDITION_BUILD_FLAG];
    else process.env[AUDITION_BUILD_FLAG] = original;
  }
});

test('M24B: the build flag is read in the form Expo can actually inline', () => {
  /*
   * The one thing about this flag that **no runtime test can check**, and the
   * reason it is checked by reading the source instead.
   *
   * Expo's Babel transform replaces the literal member expression
   * `process.env.EXPO_PUBLIC_AUDITION_BUILD` with its value at bundle time. It
   * is a substitution over syntax, so the equally correct-looking
   * `process.env[AUDITION_BUILD_FLAG]` is invisible to it: the lookup survives
   * into the bundle and a release build, which has no populated `process.env`,
   * answers `false`. The flag would be off in precisely the build it exists for.
   *
   * Every other test here passes either way, because `node --test` has a real
   * `process.env` and both forms work in it. This one fails, which is the point.
   * It was written after the dynamic form reached a bundle and had to be found
   * by decompiling it.
   */
  const source = readFileSync(join(repoRoot, 'game/config/buildFlags.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  assert.ok(
    source.includes(`process.env.${AUDITION_BUILD_FLAG}`),
    `buildFlags.ts must read process.env.${AUDITION_BUILD_FLAG} literally, or Expo cannot inline it`,
  );
  assert.equal(
    /process\.env\s*\[/.test(source),
    false,
    'buildFlags.ts reads process.env through a computed key, which a release bundle cannot resolve',
  );
});

/**
 * Every track the game can play, and the evidence that it may play it.
 *
 * Source of truth: docs/specs/M24-custom-setlist.md
 *                  docs/decisions/0013-tempo-evidence-for-external-tracks.md
 *
 * ## Why this module exists, and why it is not in `audioMix.ts`
 *
 * Until M24 the tempo claim was a boolean — `MUSIC_TEMPO_LOCKED` — and a
 * boolean can express exactly two things: *this repository generated the file
 * at `RHYTHM.bpm`*, and *nobody knows*. That was enough while every bed was
 * generated. It has no room at all for the case M24 is built around: a track
 * that came from outside and can nonetheless be **shown** to match the game's
 * pulse.
 *
 * So the claim became evidence, and evidence needs a shape. `TempoEvidence`
 * below is that shape and this module is its home, because a catalogue of
 * tracks is a different thing from a mixing desk and `audioMix.ts` was
 * becoming both.
 *
 * ## Pure data, deliberately
 *
 * No `require`, no React, no clock — for the reason `audioMix.ts` was split out
 * of `audioAssets.ts` at M16. Metro's `require` does not exist under
 * `node --test`, so anything that touches it cannot be asserted at all. Every
 * rule that matters about music lives here and is therefore checkable by
 * `tests/audioContract.test.ts` and by `scripts/measure-track-tempo.mjs`, which
 * imports this file directly.
 *
 * `file` is a path, which reads like a violation of `audioAssets.ts`'s claim to
 * be "the only place in the codebase that names a concrete audio file". It is
 * the opposite. The path was already in three places — the `require`, the
 * contract test's literals, and `assets/manifest/asset-manifest.json` — and a
 * mirrored constant is a constant that drifts. It is data here; the *static*
 * `require` Metro needs stays in `audioAssets.ts` and
 * `tests/audioContract.test.ts` reads that file's source to prove the two
 * agree.
 */
import type { Catalogue } from '../i18n/catalogue.ts';
import { showsAuditionTools } from '../config/buildFlags.ts';

/**
 * Every track, as a literal union.
 *
 * A union rather than `string` for the same reason `StageId` is one: it is a
 * key into `MUSIC_SOURCES`, into the string catalogue, and into a setlist, so a
 * track added without a file is a type error rather than a silent gap
 * discovered when a stage comes up quiet.
 *
 * M24A shipped the three tracks the game already had. M24B adds eleven audition
 * candidates, and **nothing here caps how many** — see `libraryTracks()`. The
 * count is not a constant anywhere; `tests/audioContract.test.ts` holds it to
 * that so a twelfth is a data change and not a code change.
 *
 * The three beds are listed first and the candidates after, so every tool that
 * iterates the catalogue reports the game's own music before the pool that is
 * still being auditioned.
 */
export type MusicTrackId =
  | 'showTheme'
  | 'grooveBed'
  | 'showBed'
  | 'noRefunds'
  | 'brokenAmp'
  | 'lastCall'
  | 'stageDive'
  | 'cheapBeerRiot'
  | 'wrongChord'
  | 'badSoundcheck'
  | 'loadOut'
  | 'fireExit'
  | 'noEncore'
  | 'wrongVenue';

/**
 * Styles a library track can be. Presentation and selection only; nothing in
 * gameplay reads a genre.
 *
 * Declared ahead of the library it describes because the shape is what M24A
 * owes M24B. An unused member is not dead code here — it is the vocabulary the
 * acquisition milestone selects against
 * (`docs/assets/M24-MUSIC-ACQUISITION-SPEC.md`).
 */
export type MusicGenre =
  | 'garageRock'
  | 'punk'
  | 'hardRock'
  | 'altRock'
  | 'bluesRock'
  | 'grooveMetal'
  | 'surfRock';

/**
 * The catalogue key a library track's player-facing title lives under.
 *
 * `keyof Catalogue['music']` since M24B, exactly as M24A said it would be: it
 * was a plain `string` only because there were no song titles to key into yet.
 * The narrowing is the point — a track whose `titleKey` names a string no
 * locale defines is now a `tsc` error rather than a blank row discovered on a
 * phone, and every locale is complete by construction because `Catalogue` is
 * typed off the English one.
 *
 * A type-only import, so this module stays free of any runtime dependency on
 * the i18n layer.
 */
export type MusicTitleKey = keyof Catalogue['music'];

/**
 * **Why we are allowed to believe this file matches the game's pulse.**
 *
 * A discriminated union rather than a boolean, because the three answers are
 * genuinely different claims backed by genuinely different proof, and the old
 * boolean flattened two of them into "false".
 *
 * The thing this type exists to make impossible is stated in ADR 0013 and is
 * worth repeating where the code is: **duration is not tempo.**
 * `rock_theme_song_loop.wav` was recorded for three milestones as a 90 BPM
 * track slipping 417 ms per loop. It is a 120 BPM track. The check that blessed
 * it measured the file's *length* against a 90 BPM grid, and trimming the file
 * to 21.333 s would have turned every check in the repository green without
 * changing a note anyone hears.
 *
 * So no variant here can be satisfied by a filename, a website's tempo label,
 * a metadata field, a duration that happens to divide, or a hand-set boolean.
 * Each one names something a machine can go and check.
 */
export type TempoEvidence =
  /**
   * Rendered at `RHYTHM.bpm` by a committed, deterministic script in this
   * repository. The strongest form: there is no source page to go dead, no
   * licence to re-verify, and the tempo is a constant in a file under version
   * control.
   *
   * Checked by: the script exists; the file measures a whole number of beats at
   * `RHYTHM.bpm` on a bar line; and its measured *pulse* is `RHYTHM.bpm`.
   */
  | { readonly kind: 'generated'; readonly script: string }
  /**
   * External in origin, and conformed onto the grid by a reproducible command
   * from a source whose hash is recorded — the standing that
   * `stick_whoosh.wav` and the trimmed `crowd_applause.wav` already have.
   *
   * This is the variant M24B exists to use, and every field is load-bearing:
   *
   *   - `sourceSha256` — which bytes this was made from, so the derivation can
   *     be repeated and a silent substitution is visible (AGENTS.md rule 14);
   *   - `command` — how, exactly. A derivative nobody can reproduce is a claim,
   *     not evidence;
   *   - `measuredBpm` — what the **source's own pulse** measured, by
   *     `npm run measure:tempo`. Not what a website said;
   *   - `measurementConfidence` — how separable that reading was from its
   *     rivals. A track whose pulse is ambiguous is rejected rather than
   *     rounded into confidence.
   */
  | {
      readonly kind: 'conditioned';
      readonly sourceSha256: string;
      readonly command: string;
      readonly measuredBpm: number;
      readonly measurementConfidence: number;
      /**
       * A person listened to it against the click and confirmed it locks.
       *
       * Measurement is necessary and not always sufficient. A metrical comb
       * finds the strongest *periodicity*, and in some music that is not the
       * beat — `showTheme` is such a track, and the evidence is in ADR 0013.
       * So when `npm run measure:tempo` reports a thin margin it says the pulse
       * is ambiguous rather than guessing, and this is how that gets resolved:
       * a human ear, recorded as a fact about the track.
       *
       * Required before a conditioned track may be `release: 'production'`.
       * `generated` evidence needs no equivalent — its tempo is a constant in a
       * committed script, not a reading of a waveform.
       */
      readonly ownerConfirmed: boolean;
    }
  /**
   * Nobody has shown this file's pulse matches the game's.
   *
   * Not a failure state — `showTheme` lives here and has always played Stage 1
   * perfectly well, because Stage 1 scores no beat and there is therefore no
   * clock for the music to disagree with. It is a *usage* restriction: a track
   * with this evidence may never back a Groove-scored slot, and may never be
   * player-selectable.
   */
  | { readonly kind: 'unverified' };

/** What makes a track choosable by a player, or `null` for a bed that is not. */
export interface MusicLibraryEntry {
  readonly titleKey: MusicTitleKey;
  readonly genre: MusicGenre;
  /**
   * `'candidate'` is visible only in a development build, exactly as `pseudo`
   * is in `DEV_LOCALES` and for the same reason: a track a build cannot reach
   * is a track nobody checks, and a track a *player* can reach is a track that
   * has shipped. See `availableTracks`.
   */
  readonly release: 'production' | 'candidate';
}

export interface MusicTrack {
  readonly id: MusicTrackId;
  /** Repo-relative path. The one place tooling and tests read it from. */
  readonly file: string;
  /**
   * Beats the file contains at `RHYTHM.bpm`, or `null` for a track that is not
   * on the grid at all.
   *
   * `null` is not "unknown" — it is "this file makes no beat claim", and it is
   * exactly the set of tracks whose evidence is `unverified`.
   * `tests/audioContract.test.ts` holds those two facts to each other, so a
   * beat count can never be quietly attached to a track nothing has measured.
   */
  readonly beats: number | null;
  readonly evidence: TempoEvidence;
  /**
   * The heading its record lives under in `docs/assets/AUDIO-SOURCES.md`, or
   * `null` for a generated file whose provenance is its script.
   *
   * A reference rather than a copy: source page, author, licence and hashes
   * belong in the provenance document, which `npm run audit:provenance` already
   * verifies against the files themselves. Restating them here would create a
   * second copy to go stale.
   */
  readonly provenanceId: string | null;
  readonly library: MusicLibraryEntry | null;
}

/**
 * How far a measured pulse may sit from `RHYTHM.bpm` and still be the same
 * tempo.
 *
 * 1.5 BPM at 90 is a beat interval of 656-678 ms against the nominal 667 — up
 * to 11 ms of drift per beat. Over a 16-bar loop that is at worst 0.7 s of
 * accumulated phase, which would be audible, so this is not a licence to ship a
 * sloppy track: it is measurement slack. `scripts/measure-track-tempo.mjs`
 * resolves to 0.2 BPM and its onset frames are 11.6 ms wide, so a tolerance
 * below about 1 BPM would start rejecting correct files for being measured on a
 * grid. The real protection against drift is the beat/bar contract on the
 * file's length, which is exact.
 */
export const TEMPO_TOLERANCE_BPM = 1.5;

/**
 * How well a file's own onsets must support the game's grid before it may back
 * a scored beat.
 *
 * This is the gate, and it is a deliberately different question from "what
 * tempo is this track?". A track can have an ambiguous tempo and still be
 * unambiguously *wrong* for 90 BPM, which is the only thing the game needs to
 * know. `scripts/measure-track-tempo.mjs` scores the mean autocorrelation of
 * the onset envelope across the 4/4 metrical tree at `RHYTHM.bpm`.
 *
 * 0.30 sits in a gap the measurements make obvious rather than on a number
 * somebody liked: the two generated beds score 0.83 and 0.67, and
 * `rock_theme_song_loop.wav` — a 120 BPM track — scores 0.02. There is nothing
 * between 0.02 and 0.67 to be careful about, and a floor in the middle of that
 * gap rejects the 120 BPM case by a factor of fifteen.
 */
export const TEMPO_GRID_FLOOR = 0.3;

/**
 * How far the game's grid must lead the best **incompatible** rival reading
 * before the measurement is trusted without a human ear.
 *
 * Incompatible excludes half and double: a 180 BPM track lands a beat on every
 * 90 BPM beat, so it is the same metre read at another level rather than a
 * competing one. Counting octaves as rivals would penalise every correctly
 * detected track, because a bed with eighth-note hats always has its own octave
 * as its nearest peak.
 *
 * Measured on the tree: both generated beds lead by ~0.20, and
 * `rock_theme_song_loop.wav` trails by 0.24. 0.05 sits inside that gap with
 * four times the headroom below the beds, and it is a **flag, not a rejection**
 * — a thin margin means this tool cannot tell, which calls for a listen rather
 * than a rounder number. See `ownerConfirmed` on `conditioned` evidence.
 */
export const TEMPO_MIN_MARGIN = 0.05;

/**
 * How far a source's own tempo may be dragged before the result stops being a
 * recording of that performance.
 *
 * New at M24B, and it exists because M24A had no way to check `measuredBpm` at
 * all. That field records the **source's** pulse — 95 BPM for a track
 * conditioned to 90 — so the obvious check, "does this file measure what the
 * evidence says", is the one check that must never pass: the derivative
 * measures 90 by construction. M24A's tooling did exactly that comparison and
 * would have flagged every conditioned track in this milestone as drift. What
 * *can* be verified, and is, is that the recorded source pulse is one some
 * conditioning command could plausibly have brought to the grid.
 *
 * 15% is set from the corpus rather than from taste. 130 external tracks were
 * measured; the eleven retained span x0.900 to x1.059, and the first genuinely
 * unusable stretch below them is x1.125 (an 80 BPM track), where `atempo`
 * starts smearing the transients this game's whole beat rests on. 15% admits
 * everything retained with headroom and still rejects the failure mode §11 of
 * the brief names — treating a 120 BPM song as a 90 BPM song with a slider.
 *
 * Half and double do not count against it: a 185 BPM track conditioned to 180
 * is a 2.7% change, not a 51% one. `conformingRatio` does that arithmetic.
 */
export const TEMPO_MAX_CONDITIONING = 0.15;

/**
 * The smallest rate change that puts `bpm` on `gridBpm`, counting half and
 * double as free.
 *
 * Returns the ratio, so 1 means the source was already there and 0.947 means it
 * was slowed by 5.3%. `Math.abs(ratio - 1)` is the size of the transformation.
 *
 * `gridBpm` is a required parameter rather than a default of 90, so this module
 * keeps its independence from the rhythm config and no second copy of the
 * game's tempo can drift into the audio layer. Callers pass `RHYTHM.bpm`.
 */
export function conformingRatio(bpm: number, gridBpm: number): number {
  let best = Infinity;
  for (const multiple of [0.5, 1, 2]) {
    const ratio = gridBpm / (bpm * multiple);
    if (Math.abs(ratio - 1) < Math.abs(best - 1)) best = ratio;
  }
  return best;
}

export const MUSIC_TRACKS: Record<MusicTrackId, MusicTrack> = {
  /**
   * The CC0 rock loop the game has always opened on, and the reason this whole
   * evidence model exists.
   *
   * It is **at 120 BPM**, measured by aligning its own source MIDI's onset
   * train against the audio, and independently re-measured by
   * `npm run measure:tempo`. Against a 90 BPM clock that is not drift but a
   * cross-rhythm: four musical beats to every three of the player's, coinciding
   * once every two seconds and 167 ms apart the rest of the time.
   *
   * It stays exactly where it is. Stage 1 scores no beat, so there is no clock
   * for it to disagree with, and it is the track the game has always opened on.
   */
  showTheme: {
    id: 'showTheme',
    file: 'assets/audio/music/runtime/rock_theme_song_loop.wav',
    beats: null,
    evidence: { kind: 'unverified' },
    provenanceId: 'rock_theme_song_loop.wav',
    library: null,
  },
  /**
   * Stage 2's teaching bed: kick on 1 and 3, snare on 2 and 4, eighth-note hats
   * accented on the beat, every tail wrapped back to the head so the loop is
   * seamless.
   *
   * Deliberately a bed and not a song — Stage 2 teaches the beat, and an
   * arrangement worth listening to buries the thing being taught.
   */
  grooveBed: {
    id: 'grooveBed',
    file: 'assets/audio/music/runtime/groove_bed_90.wav',
    beats: 16,
    evidence: { kind: 'generated', script: 'scripts/make-groove-bed.mjs' },
    provenanceId: 'groove_bed_90.wav',
    library: null,
  },
  /**
   * The show's bed, and the encore's: driven power chords, crashes on the
   * phrase heads, a fill into the loop point. Eight bars rather than four,
   * because the show runs for minutes and a four-bar figure announces itself as
   * a loop.
   */
  showBed: {
    id: 'showBed',
    file: 'assets/audio/music/runtime/show_bed_90.wav',
    beats: 32,
    evidence: { kind: 'generated', script: 'scripts/make-show-bed.mjs' },
    provenanceId: 'show_bed_90.wav',
    library: null,
  },

  /* ---------------------------------------------------------------- *
   * M24B audition candidates.
   *
   * Eleven external tracks, every one CC0, every one conditioned onto the
   * grid by `scripts/build-candidates.mjs` from a source whose SHA-256 is
   * recorded above and in `assets/audio/music/candidates/SOURCES.json`.
   *
   * All are `release: 'candidate'`, so `availableTracks(false)` cannot return
   * one and a release build cannot reach one. All carry
   * `ownerConfirmed: false`, which is what stops any of them being promoted to
   * `production` by editing one field: `tests/audioContract.test.ts` requires a
   * conditioned track to have been listened to before it may ship.
   *
   * `measuredBpm` is the **source's** pulse, not this file's. A track recorded
   * here as 95 measures 90 on disk, by construction — that is the whole point
   * of conditioning, and it is why the check on that field is
   * `TEMPO_MAX_CONDITIONING` rather than a comparison with the file.
   *
   * `genre` is provisional presentation metadata taken from each source page's
   * own tags, refined by the measured subdivision — nothing in gameplay reads
   * it, and the owner's audition is what settles it.
   * ---------------------------------------------------------------- */

  /**
   * **NO REFUNDS** — Ragnar Random, CC0, `01_-_rock_city_ransom.ogg`.
   *
   * The opener of a 32-song CC0 pack, and one of only two tracks in it
   * that were already exactly on the grid.
   */
  noRefunds: {
    id: 'noRefunds',
    file: 'assets/audio/music/candidates/noRefunds_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: 'd152ec4b79418b38e8c7ee25a9ff7455fe2334df0dfef35a407b276dc3920c43',
      command: 'node scripts/build-candidates.mjs --only noRefunds',
      measuredBpm: 90,
      measurementConfidence: 0.0534,
      ownerConfirmed: false,
    },
    provenanceId: 'noRefunds_90.wav',
    library: { titleKey: 'noRefunds', genre: 'garageRock', release: 'candidate' },
  },
  /**
   * **BROKEN AMP** — johndekale, CC0, `loop_7.ogg`.
   *
   * Written as a loop for the author's own FPS, which is why it gives
   * the cleanest 90 BPM reading in the pool (0.750) off the shortest source.
   */
  brokenAmp: {
    id: 'brokenAmp',
    file: 'assets/audio/music/candidates/brokenAmp_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: '6a3efa756b4ab6d7864c2c6d35edb9ebeef4315d280d91fe7d9dd22e64a333a2',
      command: 'node scripts/build-candidates.mjs --only brokenAmp',
      measuredBpm: 90,
      measurementConfidence: 0.0209,
      ownerConfirmed: false,
    },
    provenanceId: 'brokenAmp_90.wav',
    library: { titleKey: 'brokenAmp', genre: 'hardRock', release: 'candidate' },
  },
  /**
   * **LAST CALL** — kbar1982, CC0, `g42_end.flac`.
   *
   * The one source that **declared** its tempo and was telling the truth
   * — "the song keeps a steady 90 bmp" — and the only candidate whose grid
   * reading is unambiguous, leading its nearest incompatible rival by 0.203.
   * Every other retained track needs an ear.
   */
  lastCall: {
    id: 'lastCall',
    file: 'assets/audio/music/candidates/lastCall_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: 'cc72af06efa28797021bb69d39f314f566fe2bd91459982ead285cff76988c61',
      command: 'node scripts/build-candidates.mjs --only lastCall',
      measuredBpm: 90,
      measurementConfidence: 0.2042,
      ownerConfirmed: false,
    },
    provenanceId: 'lastCall_90.wav',
    library: { titleKey: 'lastCall', genre: 'altRock', release: 'candidate' },
  },
  /**
   * **STAGE DIVE DISASTER** — Ragnar Random, CC0, `09_-_chick_with_weapon.ogg`.
   *
   * Stereo in the file and mono in the music: its side channel sits
   * 26.5 dB under its mid, so the derivative is downmixed and loses nothing.
   */
  stageDive: {
    id: 'stageDive',
    file: 'assets/audio/music/candidates/stageDive_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: 'add3bd23d7ed79510ed892d37da3fb0afa984025c4e4f867cd8566b69c9da435',
      command: 'node scripts/build-candidates.mjs --only stageDive',
      measuredBpm: 90,
      measurementConfidence: 0.0926,
      ownerConfirmed: false,
    },
    provenanceId: 'stageDive_90.wav',
    library: { titleKey: 'stageDive', genre: 'garageRock', release: 'candidate' },
  },
  /**
   * **CHEAP BEER RIOT** — Ragnar Random, CC0, `15_-_we_got_the_crud.ogg`.
   */
  cheapBeerRiot: {
    id: 'cheapBeerRiot',
    file: 'assets/audio/music/candidates/cheapBeerRiot_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: 'aed6b64875dc7a65447cdc081a7c1c124d4aa0f329947cfff9c037bf36c32845',
      command: 'node scripts/build-candidates.mjs --only cheapBeerRiot',
      measuredBpm: 95,
      measurementConfidence: 0.0349,
      ownerConfirmed: false,
    },
    provenanceId: 'cheapBeerRiot_90.wav',
    library: { titleKey: 'cheapBeerRiot', genre: 'punk', release: 'candidate' },
  },
  /**
   * **WRONG CHORD** — Ragnar Random, CC0, `14_-_here_a_captive_heart_busted.ogg`.
   */
  wrongChord: {
    id: 'wrongChord',
    file: 'assets/audio/music/candidates/wrongChord_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: '48b2396411db2567d1841fe30ec26a1c45067df8ecf469d9105bbdb59b9d9c1d',
      command: 'node scripts/build-candidates.mjs --only wrongChord',
      measuredBpm: 95,
      measurementConfidence: 0.0216,
      ownerConfirmed: false,
    },
    provenanceId: 'wrongChord_90.wav',
    library: { titleKey: 'wrongChord', genre: 'altRock', release: 'candidate' },
  },
  /**
   * **BAD SOUNDCHECK** — Ragnar Random, CC0, `17_-_digestive_malady.ogg`.
   *
   * Reads best at 179.8 BPM rather than 90 — the same metre counted
   * in eighths. It clears the gate because 179.8 is a grid octave, and it is the
   * thinnest pass in the pool at 0.305 against a floor of 0.30.
   */
  badSoundcheck: {
    id: 'badSoundcheck',
    file: 'assets/audio/music/candidates/badSoundcheck_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: 'fb1ee1453315e7663c1f3d317837c29790d07d3566de3f4588a798442893b365',
      command: 'node scripts/build-candidates.mjs --only badSoundcheck',
      measuredBpm: 95,
      measurementConfidence: 0.0653,
      ownerConfirmed: false,
    },
    provenanceId: 'badSoundcheck_90.wav',
    library: { titleKey: 'badSoundcheck', genre: 'punk', release: 'candidate' },
  },
  /**
   * **LOAD-OUT** — Ragnar Random, CC0, `20_-_it_is_dangerous_to_be_lonely_without_a_sword.ogg`.
   *
   * The only candidate conditioned *upward*, 85 BPM to 90.
   */
  loadOut: {
    id: 'loadOut',
    file: 'assets/audio/music/candidates/loadOut_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: '25ee782032e7561781727c6116699866fb1f3ff014c19356829ee94afb8b80fb',
      command: 'node scripts/build-candidates.mjs --only loadOut',
      measuredBpm: 85,
      measurementConfidence: 0.0317,
      ownerConfirmed: false,
    },
    provenanceId: 'loadOut_90.wav',
    library: { titleKey: 'loadOut', genre: 'hardRock', release: 'candidate' },
  },
  /**
   * **FIRE EXIT** — obscure music, CC0, `B.M.I. (tales of Christ).flac`.
   *
   * Tagged "Acid, electronic, Rock, distorted" by its author, and the
   * one candidate that is not from a game-music pack.
   */
  fireExit: {
    id: 'fireExit',
    file: 'assets/audio/music/candidates/fireExit_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: 'c2b0b4bc7bdfd64997dfbd51dedeedd5bb0e4c570080c9c3809e7c69d0c298a1',
      command: 'node scripts/build-candidates.mjs --only fireExit',
      measuredBpm: 95,
      measurementConfidence: 0.0971,
      ownerConfirmed: false,
    },
    provenanceId: 'fireExit_90.wav',
    library: { titleKey: 'fireExit', genre: 'bluesRock', release: 'candidate' },
  },
  /**
   * **NO ENCORE** — MintoDog, CC0, `heavy_battle_2_bpm185.ogg`.
   *
   * Declares 185 BPM in its own filename and measures 185.0. Conditioned
   * as a half-time relative, which is a 2.7% change rather than the 51% a naive
   * reading of "185 against 90" would demand.
   */
  noEncore: {
    id: 'noEncore',
    file: 'assets/audio/music/candidates/noEncore_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: '01d3d505139161a04b3f225ad9cdc0acb52a8e21c997e658c916173def647df8',
      command: 'node scripts/build-candidates.mjs --only noEncore',
      measuredBpm: 185,
      measurementConfidence: 0.1028,
      ownerConfirmed: false,
    },
    provenanceId: 'noEncore_90.wav',
    library: { titleKey: 'noEncore', genre: 'grooveMetal', release: 'candidate' },
  },
  /**
   * **WRONG VENUE** — Umplix, CC0, `super_wreck_roadway.wav`.
   *
   * The largest transformation retained at 10%, and by the same author
   * as `showTheme`. Both facts are why its verdict is RISKY rather than STRONG.
   */
  wrongVenue: {
    id: 'wrongVenue',
    file: 'assets/audio/music/candidates/wrongVenue_90.wav',
    beats: 64,
    evidence: {
      kind: 'conditioned',
      sourceSha256: 'c879ab828cff3ab60ebbd035f8654ea53e95a0c171c46a94d1a0ff1a6cb8f19d',
      command: 'node scripts/build-candidates.mjs --only wrongVenue',
      measuredBpm: 100,
      measurementConfidence: 0.16,
      ownerConfirmed: false,
    },
    provenanceId: 'wrongVenue_90.wav',
    library: { titleKey: 'wrongVenue', genre: 'hardRock', release: 'candidate' },
  },
};

/** Every registered track. Ordered, so tools and tests report consistently. */
export function trackIds(): readonly MusicTrackId[] {
  return Object.keys(MUSIC_TRACKS) as MusicTrackId[];
}

export function trackFor(id: MusicTrackId): MusicTrack {
  return MUSIC_TRACKS[id];
}

/** True if `value` names a track this build knows about. */
export function isMusicTrackId(value: unknown): value is MusicTrackId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(MUSIC_TRACKS, value);
}

/**
 * May this track back a slot whose beats are scored?
 *
 * The single predicate the Groove safety rule is written in terms of. It reads
 * the *evidence*, never a boolean somebody set: `unverified` is the only answer
 * that disqualifies, and it is the only answer nothing can check.
 */
export function isGrooveQualified(id: MusicTrackId): boolean {
  return MUSIC_TRACKS[id].evidence.kind !== 'unverified';
}

/** Every track a player could ever choose, regardless of release state. */
export function libraryTracks(): readonly MusicTrackId[] {
  return trackIds().filter((id) => MUSIC_TRACKS[id].library !== null);
}

/**
 * The tracks a player can actually choose from, here, now.
 *
 * Deliberately the same shape as `availableLocales(includeDev)` in
 * `game/i18n/locales.ts`, down to the build check being a *parameter* default
 * rather than a read inside the function — so a test can ask both questions,
 * what ships and what a developer sees, without pretending to be a bundler.
 *
 * The default is `showsAuditionTools()` rather than `isDevelopmentBuild()`
 * since M24B: a standalone audition build has no Metro and therefore no
 * `__DEV__`, and the owner still has to be able to hear these. See
 * `game/config/buildFlags.ts` for why that is not a way for a candidate to
 * reach a player.
 *
 * Empty in M24A: no track has a `library` entry yet. That is the correct
 * answer, not a stub — the custom setlist is not player-visible until M24C, and
 * a catalogue that answered otherwise would be lying.
 */
export function availableTracks(
  includeCandidates: boolean = showsAuditionTools(),
): readonly MusicTrackId[] {
  return libraryTracks().filter((id) => {
    const library = MUSIC_TRACKS[id].library;
    if (library === null) return false;
    return includeCandidates || library.release === 'production';
  });
}

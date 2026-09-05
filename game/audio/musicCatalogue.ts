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
import { isDevelopmentBuild } from '../i18n/locales.ts';

/**
 * Every track, as a literal union.
 *
 * A union rather than `string` for the same reason `StageId` is one: it is a
 * key into `MUSIC_SOURCES`, into the string catalogue, and into a setlist, so a
 * track added without a file is a type error rather than a silent gap
 * discovered when a stage comes up quiet.
 *
 * M24A ships the three tracks the game already had. The library the player will
 * choose from arrives at M24B, and **nothing here caps how many** — see
 * `libraryTracks()`.
 */
export type MusicTrackId = 'showTheme' | 'grooveBed' | 'showBed';

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
 * A plain `string` in M24A because the string catalogue has no `music` section
 * yet and M24A is explicitly forbidden from adding song titles. It becomes
 * `keyof Catalogue['music']` at M24B, when the first title exists — which is a
 * *narrowing*, so no existing value can quietly survive it.
 */
export type MusicTitleKey = string;

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
 * `game/i18n/locales.ts`, down to the `__DEV__` default being a *parameter*
 * rather than a read inside the function — so a test can ask both questions,
 * what ships and what a developer sees, without pretending to be a bundler.
 *
 * Empty in M24A: no track has a `library` entry yet. That is the correct
 * answer, not a stub — the custom setlist is not player-visible until M24C, and
 * a catalogue that answered otherwise would be lying.
 */
export function availableTracks(
  includeCandidates: boolean = isDevelopmentBuild(),
): readonly MusicTrackId[] {
  return libraryTracks().filter((id) => {
    const library = MUSIC_TRACKS[id].library;
    if (library === null) return false;
    return includeCandidates || library.release === 'production';
  });
}

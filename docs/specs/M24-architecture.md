# M24 — Proposed architecture

**Status:** proposed, 2026-09-05. **Nothing here is implemented.**
**Depends on:** `M24-discovery.md` for every fact this builds on.
**Principle:** the feature is successful only if it makes the game feel
substantially larger without making the codebase substantially larger.

---

## 0. The whole change, in one picture

Today one line turns a stage into a sound:

```ts
audio.playMusic(scene.stage.music);          // GameEngine.tsx:309
```

The proposal replaces the *source of that value* and nothing else.

```
BEFORE                              AFTER
flow.stageIndex                     flow.stageIndex
   │                                   │
   ▼                                   ▼
STAGES[i].music  ──► playMusic      OFFICIAL_SETLIST[i]  ─┐
                                    flow.setlist[i]  ─────┴─► scene.music ──► playMusic
```

`scene.music` is resolved in `resetScene()`, beside `scene.stage`, because
that is where the round and the stage it came from are already paired. So
`handleBeginRound` changes from `scene.stage.music` to `scene.music` — **one
identifier**.

Nothing in `roundState.ts`, `rhythmState.ts`, `roundSystem.ts`,
`levelDefinition.ts` or any level file is touched. The Groove, Defense,
difficulty, bottle schedules, mug behaviour, beat windows, stage length,
integrity, controls and beat clock are all untouched **by construction**, not
by care — none of them can reach the setlist, and §27 of the test plan asserts
that no import path exists.

---

## 1. The music catalogue

New module `game/audio/musicCatalogue.ts` — **pure data, no `require`**, so
`node --test` can import it. This is the same split that made the mix
assertable at M16 (`audioMix.ts` vs `audioAssets.ts`), and it is why the
catalogue does not go inside `audioAssets.ts`.

```ts
/** Every track the game can play, bed or song. */
export type MusicTrackId =
  // What ships today. These ids do not change.
  | 'showTheme' | 'grooveBed' | 'showBed'
  // The library (M24B). Names illustrative until the owner approves tracks.
  | 'noRefunds' | 'cheapBeerRiot' | 'brokenAmp' | 'lastCall' | ...;

export type MusicGenre =
  | 'garageRock' | 'punk' | 'hardRock' | 'altRock'
  | 'bluesRock' | 'grooveMetal' | 'surfRock';

/**
 * How this file's pulse is known to be RHYTHM.bpm.
 *
 * A discriminated union rather than a boolean, because the boolean could only
 * ever say "generated here" or "unknown" — and that is exactly why an
 * externally sourced track has no honest place in the game today.
 */
export type TempoEvidence =
  /** Rendered at RHYTHM.bpm by a committed, deterministic script. */
  | { readonly kind: 'generated'; readonly script: string }
  /**
   * A found file, measured and then conformed onto the grid by a committed
   * command from a source whose hash is recorded. See §3.
   */
  | {
      readonly kind: 'conditioned';
      readonly sourceSha256: string;
      readonly command: string;
      /** Onset-aligned measurement of the SOURCE, not of the derivative. */
      readonly measuredBpm: number;
      readonly measurementConfidence: number;
    }
  /** Not verified. Playable only where no beat is scored. */
  | { readonly kind: 'unverified' };

/** Only tracks with this are choosable in a setlist. Beds have null. */
export interface LibraryEntry {
  readonly titleKey: MusicTitleKey;      // key into the string catalogue
  readonly genre: MusicGenre;
  /** 'production' ships; 'candidate' is visible in dev builds only. */
  readonly release: 'production' | 'candidate';
}

export interface MusicTrack {
  readonly id: MusicTrackId;
  /** Beats the file contains. Verified on disk against its WAVE header. */
  readonly beats: number;
  readonly evidence: TempoEvidence;
  /** Heading in docs/assets/AUDIO-SOURCES.md, or null for generated files. */
  readonly provenanceId: string | null;
  readonly library: LibraryEntry | null;
}

export const MUSIC_TRACKS: Record<MusicTrackId, MusicTrack> = { /* … */ };

/** Tracks a player can put in a setlist, here, now. */
export function availableTracks(
  includeCandidates: boolean = isDevelopmentBuild(),
): readonly MusicTrackId[];

/** True when this track may play under a scored beat. */
export function isTempoLocked(id: MusicTrackId): boolean;   // evidence.kind !== 'unverified'
```

`availableTracks(includeCandidates)` is a deliberate copy of
`availableLocales(includeDev)` in `game/i18n/locales.ts` — same shape, same
`__DEV__` guard, same reason: **the dev thing is registered so it is checked,
and kept out of the shipping list so it cannot be selected.** A test asserts
`availableTracks(false)` contains no `candidate`.

### What this replaces

`MUSIC_TEMPO_LOCKED` and `MUSIC_GENERATOR` in `audioMix.ts` become derived
views of `MUSIC_TRACKS` and are deleted. Keeping them as shims would create a
second copy of the truth, which is the failure mode the whole audio-contract
work exists to prevent. Four assertions in `tests/audioContract.test.ts`
migrate mechanically; the rules they hold do not change and are strengthened.

`MusicKey` becomes an alias of `MusicTrackId` during migration and is then
removed. `MUSIC_SOURCES: Record<MusicTrackId, number>` in `audioAssets.ts`
keeps its exhaustive-record type, so **a catalogue entry without a file is a
`tsc` error.**

---

## 2. The setlist

New module `game/levels/setlist.ts` — pure data and pure functions.

```ts
export type Setlist = readonly MusicTrackId[];

/** One slot per stage. Derived, never a literal, so it cannot fall out of step. */
export const SETLIST_SLOTS = STAGES.length;              // 4 today

/**
 * The authored show, derived from the stage table so it IS today's behaviour.
 * tests/ pins it to a literal so a change to stage data is loud, not silent.
 */
export const OFFICIAL_SETLIST: Setlist = STAGES.map((s) => s.music);
//  → ['showTheme', 'grooveBed', 'showBed', 'showBed']

/** The track for a stage index. Clamped, so a bad index cannot crash a round. */
export function trackForStage(setlist: Setlist, stageIndex: number): MusicTrackId;

/** Whatever came off disk, or null. Never throws. */
export function parseSetlist(value: unknown): Setlist | null;

/** Slot-by-slot validity, for the builder's UI. */
export function isCompleteSetlist(setlist: readonly (MusicTrackId | null)[]): boolean;
```

`StageDefinition.music` **stays exactly as it is.** It is not moved, not
renamed, not deprecated. It remains the authored answer to "what does this
stage play in the official show", and `OFFICIAL_SETLIST` is derived from it.
That is what makes the change zero-risk: on the official path the resolved
track is provably the same value the code reads today.

### Why a positional list rather than a per-stage map

`readonly MusicTrackId[]` beats `Record<StageId, MusicTrackId>` here for three
concrete reasons:

1. the player's mental model is an ordered setlist — "01, 02, 03, 04" — and the
   builder UI is a list;
2. a future share card (§18 of the brief) wants the songs *in play order*, which
   a positional list already is;
3. a saved list of ids degrades safely: an unknown id, a wrong length, or a
   duplicate all reduce to "fall back to `OFFICIAL_SETLIST`", whereas a partial
   map invites a half-custom, half-official run nobody designed.

The tradeoff, stated: a positional list is coupled to stage *order*. If a stage
is ever inserted, a saved custom setlist becomes the wrong length and is
discarded. `parseSetlist` returning `null` handles that correctly and a test
covers it.

---

## 3. How an external track proves 90 BPM — the `conditioned` evidence

This is the load-bearing part of M24 and the reason the milestone is worth
planning rather than just doing.

The current contract accepts one kind of evidence — *this repository generated
it at `RHYTHM.bpm`* — because that is the only kind it can check. A downloaded
song has no such proof, and the project has already been burned once by the
weaker alternative: `showTheme` was blessed as tempo-locked by arithmetic on
its **duration**, which cannot see a pulse, and it is a 120 BPM track.

The proposal is not to relax that. It is to add a second kind of evidence that
is **also checkable**, built from three independent facts:

### (a) Measure the source's actual pulse

New tool `scripts/measure-track-tempo.mjs`, `npm run measure:tempo`. It does
what was done by hand on 2026-09-05 to catch the 120 BPM defect: compute the
audio's energy-flux onset envelope, correlate it against a beat train over
60–200 BPM at 0.2 BPM resolution and all plausible phases, and report the best
fits with a confidence and the phase offset of beat one.

The measurement is of **the audio's own pulse**, not of its length. A file that
is 21.333 s long but beating at 120 BPM fails this, which is exactly the case
the old check waved through.

### (b) Conform it, by a committed command, from a hashed source

The derivative that actually ships is produced by a recorded, reproducible
command from a source whose SHA-256 is in `AUDIO-SOURCES.md` — the same
standing `stick_whoosh.wav` and the trimmed `crowd_applause.wav` already have.
Trim to the measured downbeat, cut an exact whole number of bars, and where the
source is a fraction off grid, resample by the measured ratio (`atempo`) so the
result is *exactly* 90 BPM rather than nearly.

### (c) Verify the result, three ways, in `npm run verify`

| Check | Where | Catches |
|---|---|---|
| File is a whole number of beats at `RHYTHM.bpm`, on a bar line, read from its own WAVE header | `tests/audioContract.test.ts` (existing check, extended to library tracks) | wrong length |
| **Measured pulse of the shipped file is within tolerance of 90 BPM** | `npm run measure:tempo --require-locked`, added to `verify` | wrong *tempo* — the 120 BPM case |
| Recorded SHA-256 / bytes / duration still describe the file | `npm run audit:provenance` (existing, automatic once the record exists) | silent substitution (rule 14) |

And the rule that ties it to gameplay, unchanged in meaning and widened in
reach:

> **No setlist slot that scores beats may hold a track whose evidence is
> `unverified`.**

Today that is `STAGES.filter(groove && !locked)` and is empty. Tomorrow it is
the same predicate over `OFFICIAL_SETLIST` **and** over every setlist a player
can build — which is a property of the *catalogue*, so it is checkable without
enumerating setlists: every `release: 'production'` library track must be
tempo-locked. A candidate that cannot prove its tempo never becomes production.

`showTheme` keeps `{ kind: 'unverified' }` and `library: null`. It stays on
official slot 1, where nothing is scored, and is **not choosable**.

**An ADR is owed when this lands** — it supersedes the M16 meaning of
`MUSIC_TEMPO_LOCKED` recorded in `audioMix.ts`. `docs/decisions/0013-…` at
M24A, per AGENTS.md rule 23.

---

## 4. Persistence

No second persistence architecture. Two changes to `game/state/persistence.ts`,
both in its existing idiom.

```ts
export interface SavedState {
  readonly schemaVersion: number;
  readonly records: Records;
  readonly bestStageCleared: number;
  readonly clickEnabled: boolean;
  readonly locale: Locale | null;
  /** The player's setlist, or null if they have never built one. */
  readonly customSetlist: Setlist | null;      // ← new
}
```

- `KNOWN_FIELDS` gains `'customSetlist'`.
- `parseSetlist` sits beside `parseRecords` and follows its rule exactly:
  **drop rather than keep.** Not an array, wrong length, an id this build does
  not know, or (under Policy A) a duplicate → `null` → the official setlist.
- `serializeSave` writes it after `locale`.
- **`SCHEMA_VERSION` stays 1.** The module's own rule is "bumped only when the
  shape changes in a way a reader must know about"; an added optional field is
  absorbed by field-by-field tolerance, and an older build preserves it through
  the unknown-field passthrough. Bumping would be a change without a reader.

### The unlock adds no state at all

```ts
// game/state/appFlow.ts
export function isCustomSetlistUnlocked(flow: AppFlowState): boolean {
  return flow.bestStageCleared >= STAGES.length - 1;
}
```

`bestStageCleared` already means "highest stage index finished", is already set
only by `SHOW_COMPLETE`, is already persisted, and already survives a cold
start under test. A separate `customSetlistUnlocked` boolean would be a second
copy of a fact the save already holds, and two copies can disagree.

This satisfies §14's "reuse the existing final-completion state" literally: the
canonical event stays `SHOW_COMPLETED` on Stage 4, and there is no second
victory definition.

**The nuance, and why it is accepted.** Because no stage is locked, a player
can select Stage 4 from the title and clear it without playing 1–3, which
unlocks the feature. Requiring all four *in order* would need a set of cleared
stages instead of a high-water mark — new state, a schema change, and a second
definition of "completed the show". Not worth it, and contrary to the
project's own standing decision that nothing is gated.

### One thing persistence must NOT do

`isCustomSetlistUnlocked` gates a **screen**, not a stage. Every stage stays
selectable on a fresh install, a corrupt save, and a save from the future. The
M15 rule survives intact.

---

## 5. Flow

`AppFlowState` gains one field and `APP_SCREENS` gains one member.

```ts
export const APP_SCREENS = ['STORY','TITLE','SETLIST','BRIEFING','ROUND'] as const;

export interface AppFlowState {
  /* … unchanged … */
  /** The setlist the current run is playing. OFFICIAL_SETLIST unless the
   *  player started a custom run from the setlist screen. */
  setlist: Setlist;
  /** The setlist under construction, per slot, null where unfilled. */
  draftSetlist: readonly (MusicTrackId | null)[];
}
```

Transitions:

| Entry point | `flow.setlist` becomes |
|---|---|
| `startStage()` — any stage card on the title | `OFFICIAL_SETLIST` |
| `startCustomGig()` — START THE GIG on the setlist screen | the completed draft |
| `advanceToNextStage()` — "Next stage" on results | unchanged, so a custom run stays custom for the whole show |
| `returnToTitle()` / quit | `OFFICIAL_SETLIST` |

That table is the whole of §17: **the player's custom setlist can never
overwrite the official one**, because the official one is a `const` derived
from stage data and the custom one is a separate field that the title always
resets.

For §18 (a future share card), `flow.setlist` is live at `SHOW_COMPLETE` and
the draft is persisted, so the completed run's songs are retrievable. **No code
for sharing is added now.**

---

## 6. Preloading — the one place that does not scale for free

`createAudioService()` currently creates one `expo-audio` player per
`MusicKey`, eagerly, for a documented reason: swapping a source is async and a
stage transition would otherwise start a round before its bed had loaded.

With 3 tracks that is fine. With 9–11 it is 9–11 decoder instances alive for
the whole session, holding native memory the game never uses more than one of
at a time.

**Proposal: preload the current setlist, not the catalogue.**

```ts
/** Creates players for exactly these tracks, releasing any others. */
preloadSetlist(ids: readonly MusicTrackId[]): void;
```

Called once from `handleSelectStage` / `startCustomGig` — i.e. at the *title or
setlist screen*, before any briefing — so a player is still created well ahead
of the round that needs it and the async-load race the eager preload exists to
prevent stays prevented.

Today there are exactly **3** music players alive. Under eager preloading a
nine-track catalogue would make **9**; under this proposal the ceiling is
`SETLIST_SLOTS` — **4**, and only 3 distinct on the official setlist. The
library grows without the resident cost growing with it.

Fallback if a device shows a hitch: preload the whole shipping catalogue
anyway, and accept ~11 players. Measure before choosing; do not optimise
speculatively. Either way the API above is the seam.

---

## 7. The setlist builder screen

One new screen, no new primitives. `Modal` is deliberately not used: it is a
React Native surface class this project has never used, and
`tests/layoutBudget.test.ts` reads `Overlays.tsx` and reasons about fixed vs
scrollable surfaces — a modal would need a third rule for no benefit.

Landscape, 1920×1080 reference. Two columns.

```
  BUILD THE WORST SETLIST                    You survived ours. Now make it worse.
  ┌──────────────────────────┐   ┌──────────────────────────────────────┐
  │ 01  NO REFUNDS         ▸ │   │  NO REFUNDS          garage rock  ✓  │
  │ 02  ——— tap to choose  ◂ │   │  CHEAP BEER RIOT     punk            │
  │ 03  ——— tap to choose    │   │  BROKEN AMP          blues rock      │
  │ 04  ——— tap to choose    │   │  LAST CALL           surf            │
  └──────────────────────────┘   │  SOUND GUY'S REVENGE groove metal    │
                                 │  LOAD-OUT            hard rock       │
       [ START THE GIG ]         └──────────────────────────────────────┘
       [ Back ]
```

Interaction, in full:

- one slot is *active* (`◂`), starting at slot 1;
- tapping a slot makes it active;
- tapping a song assigns it to the active slot and **advances the active slot
  to the next empty one** — so the fastest path to a full setlist is four taps
  in the right-hand list, in order, which is the interaction the screen is
  named after;
- an already-used song is drawn with `✓` and is deaf (Policy A, §16);
- `START THE GIG` is `disabled` until every slot is filled — the `Button`
  component already supports `disabled` ("drawn, readable, and deaf").

Why not the alternatives:

| Option | Verdict |
|---|---|
| A — slot list + **modal** picker | The picker is right; the modal is not. Adopted without the modal. |
| B — horizontal per-slot selector | Cheapest to build, but with 6 songs the player must tap blind through a carousel to find one. Choosing a repertoire should let you see the repertoire. |
| C — drag / reorder | Rejected. Needs a gesture dependency (rule 18), and reorder is a *second* way to do what re-tapping a slot already does. |
| D — reuse existing components | **This is D.** `Pressable` rows in the `StageButton` visual language, the existing `Button`, a `ScrollView` if the library outgrows the column. |

New layout constants go in `game/rendering/overlayLayout.ts` (`SETLIST_SLOT`,
`SETLIST_TRACK_ROW`, and their text widths), because that module is read twice
— once by the StyleSheet and once by `layoutBudget.test.ts` — and a mirrored
constant is a constant that drifts.

---

## 8. Localization

Song titles are **fictional presentation names** and go in the catalogues,
keyed exactly the way stage prose already is:

```ts
// game/i18n/catalogues/en.ts
music: {
  noRefunds:     'NO REFUNDS',
  cheapBeerRiot: 'CHEAP BEER RIOT',
  /* … */
},
setlist: {
  title:     'BUILD THE WORST SETLIST',
  tagline:   'You survived ours. Now make it worse.',
  unlocked:  'CUSTOM SETLIST UNLOCKED',
  slot:      '{number}',
  empty:     'Tap to choose',
  start:     'START THE GIG',
  genre: { garageRock: 'garage rock', punk: 'punk', /* … */ },
},
```

`Catalogue = typeof en` means pt-BR and pseudo must supply every one of these
or `tsc` fails. **No strings are added in this milestone** — the block above is
a shape, not a change.

Open question for the owner, recorded rather than decided: **should the song
titles be translated at all?** A song title is a name, like the product title,
which `docs/release/product-identity.md` forbids translating. "NO REFUNDS" as a
band's song is arguably a proper noun. Recommendation: **keep them
untranslated, in the catalogue anyway** — so a locale *may* translate one if a
joke does not survive, and `layoutBudget.test.ts` still measures them in pseudo.
Decide at M24B with the owner.

---

## 9. Development-only audition

Two mechanisms, staged, both `__DEV__`-gated by the existing
`isDevelopmentBuild()` pattern.

**Triage (M24B, ~20 lines).** A row on the title screen, drawn only when
`isDevelopmentBuild()`, cycling candidate tracks through
`audio.playMusic(id)` / `stopMusic()`. Answers: does it loop cleanly, is the
level sane, is it the right length. Requires nothing else to exist.

**The real audition (free, once M24C lands).** Candidate tracks appear in the
setlist builder in dev builds, so the owner builds a setlist of candidates and
plays the actual show. That is the only way to answer the questions that matter
— does the click still read over it at `MIX.beatClick` 0.85 against
`MIX.music` 0.38, and is it fun — and it costs **zero additional UI**, because
`availableTracks(includeCandidates)` already does the work.

Release safety is one test: `availableTracks(false)` contains no track whose
`release` is `'candidate'`, mirroring the existing pseudo-locale test.

---

## 10. What this architecture deliberately does not add

No backend, no streaming, no remote catalogue, no downloads at runtime, no
accounts, no unlock currency, no shop, no new game mode, no second gameplay
engine, no new dependency of any kind. The library is bundled assets; the
setlist is four ids in an existing save file; the replay is the existing stages.

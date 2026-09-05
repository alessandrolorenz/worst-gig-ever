# M24 — Custom Setlist

**Status:** planning complete, 2026-09-05. **No implementation.**
**Baseline:** `main` at `0794111`, clean worktree, `npm run verify` green at
430 tests.
**Companions:** `M24-discovery.md` (repository truth), `M24-architecture.md`
(proposed code shape), `M24-implementation-plan.md` (sequence),
`M24-test-plan.md` (tests), `../assets/M24-MUSIC-ACQUISITION-SPEC.md`
(how the music is obtained).

---

## What it is

After the player completes the whole show for the first time, they unlock
**Build the Worst Setlist**: they choose the songs for a replay of the same
four stages from a small bundled library.

> You survived our setlist. Now make it worse.

The first run stays authored. The stages, the difficulty, the scoring and the
beat clock stay identical. **Only which file plays changes.**

## What it is not

Not a new game mode, not a backend, not streaming, not accounts, not an unlock
tree, not a store, not a playlist manager, not a gameplay rewrite. The scope
guard in the brief (§32) is adopted verbatim and nothing on it is touched.

---

## The ten decisions

### Q1 — What is the smallest architectural change?

**One new data module, one new flow field, one changed identifier.**

`GameEngine.tsx:309` reads `scene.stage.music`. It becomes `scene.music`,
resolved in `resetScene()` from `trackForStage(flow.setlist, flow.stageIndex)`.
`OFFICIAL_SETLIST` is *derived* from the stage table
(`STAGES.map((s) => s.music)`), so on the official path the value is provably
the one the game plays today.

Supporting work: a typed catalogue (`game/audio/musicCatalogue.ts`), a setlist
module (`game/levels/setlist.ts`), one saved field, one new screen. Full shape
in `M24-architecture.md` §§1–2, 5.

`StageDefinition.music` is **not** removed. It stays the authored answer to
"what does this stage play in the official show".

### Q2 — Can existing stages consume selected music without duplicating logic?

**Yes, and no stage file changes at all.**

Nothing in the round or rhythm domains can reach the setlist: `roundState.ts`,
`rhythmState.ts`, `roundSystem.ts` and every level file have no import path to
it, and the test plan asserts that. Music selection happens in the host
component that already owns the audio lifecycle. Mechanical equivalence (§26 of
the brief) is therefore a property of the module graph, not of discipline.

### Q3 — Should Stage 2's teaching track stay fixed during a custom replay?

**NO.** Stage 2 takes a chosen song like every other slot.

Reasons:

1. The teaching rationale is spent. `grooveBed` is "deliberately a bed and not
   a song — Stage 2 teaches the beat, and an arrangement worth listening to
   buries the thing being taught." The custom setlist is reached **only after
   the player has already completed the show**, so there is nothing left to
   teach.
2. The property that actually protects the player is *the bed agrees with the
   beat clock*, and that is enforced by the catalogue contract for every
   production track, not by that one file.
3. Stage 2's first twelve seconds are nothing but the beat and the pad. That is
   the best showcase in the game for a song the player chose — an exposed
   intro, no bottles, nothing competing.
4. A pinned slot is a dead row in a four-row builder, which reads as a bug.

The counter, stated honestly: a busy arrangement in that window could make the
beat harder to read than `grooveBed` does. **Mitigation is one line** — the
architecture can express a pinned slot without needing one now — and the
question is answerable only by the owner playing it, which is what M24D is for.
`grooveBed` remains slot 2 of `OFFICIAL_SETLIST` and is unchanged.

### Q4 — 6 or 8 songs?

**Six production tracks. Audition eight to ten candidates to get there.**

With 4 slots and no duplicates, 6 tracks give 360 ordered setlists and 8 give
1 680. Both are far past what anyone explores; the replay value is in *choosing*
and in variety of feel, not in combinatorics.

What actually costs: every track needs licence evidence, a tempo measurement, a
conditioning command, a provenance record, a catalogue entry, localized title
and — the scarce resource — **the owner listening to it and saying yes**.
Tracks 7 and 8 add ~7 MiB and two more full provenance records for a difference
no player will name.

Six also lets the library span six distinct styles with no two neighbours
(garage rock / punk / dirty blues rock / surf-trash / groove metal / hard rock),
which is what makes a setlist feel like a repertoire.

Auditioning more than six is deliberate: attrition is real, and a track can be
legally clean and musically wrong.

### Q5 — Duplicate songs in one setlist?

**Policy A — no duplicates, for the first version.**

Variety is the entire point ("stylistic variety while keeping gameplay timing
simple"), the builder becomes self-explanatory (a used song greys out), and it
removes a class of dull outcome — four slots of the same song — that no player
would enjoy but many would try once.

It imposes one invariant: **the production library must have at least
`SETLIST_SLOTS` tracks.** That is a test, not a runtime surprise.

Policy B remains a one-line change if the owner later wants it.

### Q6 — Full tracks or gameplay-specific derivatives?

**Derivatives: 16-bar segments (64 beats, 42.667 s) at 90 BPM, 16-bit mono
44.1 kHz WAV.**

Measured against real stage lengths (music runs through the 2 s pre-roll, so
playtime is duration + 2 s):

| Segment | Stage 1 (42 s) | Stage 2 (37 s) | Stage 3 (62 s) | Stage 4 (47 s) |
|---|--:|--:|--:|--:|
| 8 bars (21.333 s) | 1.97× | 1.73× | **2.91×** | 2.20× |
| **16 bars (42.667 s)** | 0.98× | 0.87× | 1.45× | 1.10× |

At 16 bars a player hears **no repeat at all** on Stages 1, 2 and 4, and hears
the first 45% twice on Stage 3. At 8 bars the show loops nearly three times.
This is the project's own reasoning about `show_bed_90.wav` — eight bars rather
than four, "because the show runs for minutes and a four-bar figure announces
itself as a loop" — applied one step further, and it matters more here because
a replay feature means these loops get heard many times more than `showBed`
ever was.

Full tracks are rejected outright: a 2.5-minute stereo WAV is ~26 MiB each, and
a full track's arrangement (intro, verse, bridge, outro) does not loop and
would not survive being cut off mid-phrase at the final whistle.

**Format stays WAV, deliberately.** The whole tempo-verification chain reads
WAVE headers — the contract test measures beat count from the header, and
`audit:provenance` re-derives duration from it. A compressed format would
require a decode step in both, and AAC/MP3 encoder padding introduces a gap at
the loop point, which is a defect this project has twice gone out of its way to
avoid. Compression is a **later, measured** optimisation with a stated trigger,
not a starting position — see Q7.

### Q7 — App size impact?

Measured, not estimated. `app-release.apk` on 2026-09-05 is **124 470 891 bytes
(118.7 MiB)**; its nine runtime `.wav` files total **7 894 132 bytes
(7.53 MiB)**, 6% of the app. Native libraries for **four ABIs** are 86.8 MB,
73% of it.

16-bit mono 44.1 kHz WAV is 88 200 bytes/second:

| | per track | 6 tracks | 8 tracks |
|---|--:|--:|--:|
| 8 bars (21.333 s) | 1.79 MiB | 10.8 MiB | 14.4 MiB |
| **16 bars (42.667 s)** | **3.59 MiB** | **21.5 MiB** | 28.7 MiB |

**Recommended configuration — 6 tracks × 16 bars = +21.5 MiB.**

| Package | Today | After | Delta |
|---|--:|--:|--:|
| Universal APK (4 ABIs) | 118.7 MiB | ~140.2 MiB | **+18.1%** |
| Play AAB, one ABI delivered (est.) | ~55.1 MiB | ~76.6 MiB | **+39.0%** |
| Audio as a share of the AAB | 13.7% | 37.9% | |

The honest reading: **against the universal APK this is a rounding error next
to four ABIs; against a real Play delivery it triples the audio share.** If the
owner sets a download-size target, the escape hatch is 96 kbps mono AAC of the
same 16-bar derivative — ~500 KiB per track, ~2.9 MiB for six, a 7.4x saving — at
the cost of a decode step in the tempo audit and a loop-seam risk that must be
measured on the device. Do not take it pre-emptively.

Also worth knowing: `rock_theme_song_loop.wav` is 3.66 MiB of stereo for one
un-scored stage and is the largest audio file in the app. It is not touched by
this milestone, but it is the obvious first saving if size ever becomes real.

### Q8 — Where does `customSetlistUnlocked` live?

**Nowhere. It is derived, and adds no state.**

```ts
isCustomSetlistUnlocked(flow) === flow.bestStageCleared >= STAGES.length - 1
```

`bestStageCleared` already means "highest stage index finished", is already set
only on `SHOW_COMPLETE`, is already persisted in `SavedState`, and already
survives a cold start under test. A separate boolean would be a second copy of
a fact the save already holds, and two copies can disagree.

`selectedCustomSetlist` **does** need storage: `SavedState.customSetlist:
Setlist | null`, parsed with the same drop-rather-than-keep tolerance as
`records`. `SCHEMA_VERSION` stays 1 (see `M24-architecture.md` §4).

Accepted nuance: because no stage is locked, clearing Stage 4 directly from the
title also unlocks the feature. Requiring all four in order means a set instead
of a high-water mark — new state, a schema change and a second victory
definition, all forbidden by §14 of the brief.

### Q9 — How does an external track prove 90 BPM compatibility?

By three independent, checkable facts, added as a new `TempoEvidence` variant
called `conditioned`. Full design in `M24-architecture.md` §3.

1. **Its pulse is measured** — onset-envelope correlation against a beat train
   over 60–200 BPM, `npm run measure:tempo`. This is the method that caught the
   `showTheme` 120 BPM defect. It measures the pulse, not the duration.
2. **It is conformed by a committed command from a hashed source** — trimmed to
   the measured downbeat and cut to a whole number of bars, recorded in
   `AUDIO-SOURCES.md` exactly as `stick_whoosh.wav` and the trimmed
   `crowd_applause.wav` already are.
3. **The shipped file is re-verified in `npm run verify`** — whole number of
   beats on a bar line from its own WAVE header, measured pulse within
   tolerance of 90 BPM, and SHA-256/bytes/duration still matching the record.

The existing guarantee is not weakened. `filename says 90` and `metadata says
bpm: 90` remain worth nothing: the catalogue's `bpm` field is not evidence and
is not trusted; the measurement and the reproducible command are. A candidate
that cannot satisfy all three never becomes a production track, and
`release: 'production'` implies tempo-locked as a contract test.

### Q10 — Can Claude acquire the music itself next milestone?

**Yes, in this environment.** Verified 2026-09-05: `curl` to
`https://opengameart.org/` returned **HTTP 200**, and web search/fetch tooling
is available to the session.

Two caveats that do not change the answer but shape the plan:

- Network availability is a property of *this* session, not of the repository.
  The acquisition spec therefore specifies the offline fallback anyway —
  authoritative URLs, exact filenames, licence evidence, destination paths and
  the exact import commands — so the milestone is executable either way.
- Claude can determine licensing evidence, file integrity, tempo evidence, loop
  suitability and technical compatibility. Claude **cannot** determine whether a
  song is fun. That is an owner playtest decision and the workflow is built
  around it.

---

## First-run vs replay — the exact recommended flow

```
FIRST RUN                                REPLAY (after the first SHOW_COMPLETE on Stage 4)

STORY                                    TITLE
  ↓ (skip / finish)                        ↓  ── "CUSTOM SETLIST" appears
TITLE                                    SETLIST
  ↓ stage card 1                           │  slot 01 ◂  tap a song
BRIEFING (Stage 1)                         │  slot 02 ◂  tap a song
  ↓ Start the show                         │  slot 03 ◂  tap a song
ROUND  — music: OFFICIAL_SETLIST[0]        │  slot 04 ◂  tap a song
  ↓ SHOW_COMPLETE → "Next stage"           ↓ START THE GIG
BRIEFING (Stage 2) → ROUND [1]           BRIEFING (Stage 1)
  ↓                                        ↓ Start the show
BRIEFING (Stage 3) → ROUND [2]           ROUND — music: flow.setlist[0]
  ↓                                        ↓ Next stage … through Stage 4
BRIEFING (Stage 4) → ROUND [3]           RESULTS
  ↓ SHOW_COMPLETE on Stage 4
  bestStageCleared = 3, persisted        Back to TITLE → flow.setlist = OFFICIAL_SETLIST
  ↓
RESULTS  +  "CUSTOM SETLIST UNLOCKED"
```

The player is never asked to configure music before learning the game: the
`SETLIST` screen is unreachable until `isCustomSetlistUnlocked(flow)`, and the
title's stage cards always start the official setlist.

## The official setlist stays canonical

`OFFICIAL_SETLIST` is a `const` derived from `STAGES` and pinned to a literal
by a test:

```
['showTheme', 'grooveBed', 'showBed', 'showBed']
```

Nothing a player does can write to it. Every entry point except `START THE GIG`
sets `flow.setlist = OFFICIAL_SETLIST`. The authored first run therefore stays
reproducible for testing, balancing, screenshots, QA and bug reports.

## Deferred, deliberately

- **Sharing the setlist** (§18). Not implemented, not designed, no dependency
  added. `flow.setlist` is live at `SHOW_COMPLETE` and the draft is persisted,
  so a future results card can retrieve the run's songs. That is the entire
  obligation this milestone accepts.
- **Translating song titles.** Recommendation is to keep them untranslated but
  hold them in the catalogue anyway. Owner decision at M24B.
- **Compressing the library.** Trigger-based, see Q7.

# M24 — Discovery: what the repository actually does today

**Status:** discovery complete, 2026-09-05. **No code changed.**
**Baseline:** `main` at `0794111`, clean worktree, `npm run verify` green —
430 tests, 0 failures, `PASS_ART_READY`, `PASS_AMBIENT_LOOP_READY`,
`PASS_PROVENANCE_CURRENT` (10 provenance claims checked, 0 drifted).

This document holds **repository truth only**. Nothing here is a proposal —
proposals live in `M24-architecture.md` and the decisions in
`M24-custom-setlist.md`. Every number below was measured on 2026-09-05 by
running the command named beside it, not copied from an existing document.

---

## 1. The music execution path, traced

The prompt asked for the real path rather than a filename search. It is
short, and it has exactly **one** decision point.

```
Player taps "Start the show" on the briefing
   │
   ▼
GameEngine.handleBeginRound()            game/systems/GameEngine.tsx:304
   │  beginRound(flow)      → screen = ROUND
   │  startRound(round)     → state = COUNTDOWN, round clock at 0
   │  audio.playMusic(scene.stage.music)   ◄── THE ONLY MUSIC DECISION
   ▼
AudioService.playMusic(key)              game/audio/audioService.ts
   │  pause + seekTo(0) the outgoing player
   │  music = tracks.get(key)            ◄── preloaded at construction
   │  seekTo(0); play()                     loop = true, volume = MIX.music
   ▼
Round runs. The beat clock never consults the player.
   │  roundSystem builds a BeatContext from round-elapsed gameplay time
   │  BEAT_PULSE → audio.playSfx('beatClick') when flow.clickEnabled
   ▼
SHOW_COMPLETED / SHOW_RUINED             game/systems/roundSystem.ts:206,211
      audio.stopMusic(); playSfx('crowdApplause') on completion
```

Where `scene.stage` comes from:

```
GameEngine.resetScene()  (GameEngine.tsx:208)  called on stage select, restart, quit,
   scene.stage = stageAt(flow.stageIndex)          and "Next stage"
   scene.round = createRound(stage.level)
```

So the chain is `flow.stageIndex → STAGES[i] → stage.music → MUSIC_SOURCES[key]
→ preloaded expo-audio player`. **A stage permanently owns one track**, and the
only line in the codebase that turns a stage into a sound is
`audio.playMusic(scene.stage.music)`.

### Loading and unloading lifecycle

| Moment | Behaviour |
|---|---|
| Construction | **All three music files are created as players eagerly**, in `createAudioService()`, one player per `MusicKey`. Deliberate: swapping a source is async, so a stage transition would start a round before its bed had loaded. Documented in `audioService.ts`. |
| Missing native module | `require('expo-audio')` is lazy and wrapped; failure returns `createSilentService()` and the game runs silently (ADR 0002). |
| Pause / app backgrounded | `pauseMusic()`; `AppState` listener also pauses. A backgrounded **countdown** is cancelled and the music **stopped**, returning to the briefing. |
| Restart | `restartMusic()` — seek 0 and play, same player. |
| Next stage | `stopMusic()`, then the next stage's `playMusic` at its briefing's Start. |
| Quit | `stopMusic()` then `returnToTitle`. |
| Unmount | `dispose()` — every music and SFX player paused and `remove()`d. |

**Consequence for M24, stated plainly:** eager preloading is per-`MusicKey`. A
library of 6–8 additional tracks would, unchanged, create 9–11 decoder
instances at startup. This is the one place the current architecture does not
scale linearly for free, and `M24-architecture.md` addresses it.

### Loop behaviour

`player.loop = true` on every music player, set once at construction. Nothing
seeks a loop point, and nothing measures playback position. There is no
crossfade and no loop-point logic — the file's own end is its loop point, which
is why the generated beds are whole numbers of bars.

### The beat clock has no relationship to audio

`game/config/rhythm.ts`, stated in its own header: the beat clock is *visual*,
derived from gameplay elapsed time, and "has no relationship to the music
track's playback position — nothing here is measured from, seeked to, or
corrected against audio". The rhythm domain has **no audio import at all**.

This is the single most important fact for M24: **changing which file plays
cannot move a judgement.** The music is a bed the clock plays over, not a
clock.

---

## 2. Current audio inventory

Sizes are `ls -la` on 2026-09-05; durations are computed from each file's own
WAVE header (`44100 Hz × channels × 2 bytes`).

| Asset | Purpose | Source | BPM | Duration | Bytes | Looping | Used by |
|---|---|---|--:|--:|--:|---|---|
| `rock_theme_song_loop.wav` | music | CC0, OpenGameArt (Umplix), 16-bit derivative | **120** (measured) | 21.750 s | 3 836 818 | yes | Stage 1 only |
| `groove_bed_90.wav` | teaching bed | **generated**, `scripts/make-groove-bed.mjs` | 90 | 10.667 s (16 beats) | 940 844 | yes | Stage 2 |
| `show_bed_90.wav` | music | **generated**, `scripts/make-show-bed.mjs` | 90 | 21.333 s (32 beats) | 1 881 644 | yes | Stages 3 and 4 |
| `beat_click.wav` | click/metronome | **generated**, `scripts/make-beat-click.mjs` | n/a | 0.090 s | 7 982 | no (pool 2) | every beat, when `flow.clickEnabled` |
| `crowd_applause.wav` | SFX (ambience sting) | CC0, OpenGameArt (eXpl0it3r), trimmed derivative | n/a | 5.000 s | 882 078 | no | `SHOW_COMPLETED` |
| `glass_breaking.wav` | SFX | CC0, OpenGameArt (Till Behrend) | n/a | 1.31 s | 230 924 | no (pool 3) | bottle/mug break |
| `stick_whoosh.wav` | SFX | CC0, OpenGameArt (qubodup), WAV derivative | n/a | 0.28 s | 48 996 | no (pool 3) | swing, beat hit |
| `impact_thwack.wav` | SFX | CC0, OpenGameArt (AntumDeluge) | n/a | 0.31 s | 27 758 | no (pool 2) | vocalist impact |
| `mug_drink.wav` | SFX | **generated**, `scripts/make-mug-gulp.mjs` | n/a | 0.420 s | 37 088 | no (pool 1) | mug drunk |
| `rock_theme_song.mid` | provenance only | CC0 source MIDI | 120 | — | 2 337 | — | **nothing** — never `require`d (rule 10) |

**Runtime audio total: 7 894 132 bytes (7.53 MiB)**, confirmed against the
release APK, whose nine `res/*.wav` entries sum to the same figure byte for
byte.

Three categories that M24 must not conflate:

- **Music / beds** — looped, mixed at `MIX.music` 0.38, one per stage. Only
  these are in scope for a setlist.
- **SFX** — one-shots from fixed pools with individual `MIX` levels. Out of
  scope entirely.
- **Ambience / applause** — `crowd_applause` is an SFX by mechanism (a pooled
  one-shot at `SHOW_COMPLETED`), not a music bed. Out of scope.

---

## 3. Stage / music mapping, as it is

| Stage | id | Level | Duration | Groove scored? | Music | Tempo-locked? |
|--:|---|---|--:|---|---|---|
| 1 | `stage-1-defense` | `defenseDrill` | 40 000 ms | **no** | `showTheme` | no (120 BPM) |
| 2 | `stage-2-beat` | `findTheBeat` | 35 000 ms | yes | `grooveBed` | yes |
| 3 | `stage-3-groove` | `level01` | 60 000 ms | yes | `showBed` | yes |
| 4 | `stage-4-encore` | `encore` | 45 000 ms | yes | `showBed` | yes |

Four stages, four music slots, **three distinct tracks** — Stages 3 and 4 share
`showBed`. There is no fifth "encore" concept: the encore *is* Stage 4, an
ordinary `StageDefinition` with its own `LevelDefinition`.

Music plays from the briefing's Start, i.e. through the 2 000 ms
`3 → 2 → 1 → GO` pre-roll (`COUNTDOWN.leadBeats` = 3 beats at 90 BPM = exactly
2000 ms). Total music playtime per stage is therefore duration + 2 s:
**42 s, 37 s, 62 s, 47 s.**

Loop repeats at each candidate segment length:

| Segment | Length | Stage 1 (42 s) | Stage 2 (37 s) | Stage 3 (62 s) | Stage 4 (47 s) |
|---|--:|--:|--:|--:|--:|
| 8 bars | 21.333 s | 1.97× | 1.73× | 2.91× | 2.20× |
| 16 bars | 42.667 s | 0.98× | 0.87× | 1.45× | 1.10× |

Verified beat arithmetic at `RHYTHM.bpm` = 90: one beat = 0.6̄ s; four beats =
2.6̄ s; 8 bars = 32 beats = 21.3̄ s; 16 bars = 64 beats = 42.6̄ s. `show_bed_90.wav`
is 21.333333 s and is asserted to be exactly 32 beats on disk, which confirms
the arithmetic against a real file.

---

## 4. The 90 BPM contract, as it exists

This is the project's most valuable audio property and M24 must not weaken it.
It is **three mechanisms**, not one.

### (a) The claim is typed and per-track

`game/audio/audioMix.ts` — pure data, no `require`, therefore importable by
`node --test`. That split exists precisely so the mix is assertable.

```ts
MUSIC_TEMPO_LOCKED: Record<MusicKey, boolean>   // showTheme false, beds true
MUSIC_GENERATOR:    Record<MusicKey, string|null>  // the committed script, or null
```

### (b) `true` means *generated by a committed script*, not *the length divides*

The comment in `audioMix.ts` records why, and it is the lesson M24 inherits.
`showTheme` was documented for three milestones as a 90 BPM track slipping
417 ms per loop. It is a **120 BPM** track. The old check was arithmetic on
file duration against a 90 BPM grid, so **trimming the file to 21.333 s would
have turned every check green without changing a note anyone hears.**

`tests/audioContract.test.ts` therefore holds:

- a bed claiming `MUSIC_TEMPO_LOCKED === true` must name a `MUSIC_GENERATOR`
  script, and that script must exist on disk;
- the generated beds must measure a whole number of beats **from their own
  WAVE header** (`< 1e-6` beats of error) and land on a bar line;
- **no stage with `groove: true` may play a track that is not tempo-locked** —
  currently zero offenders;
- the stage that teaches the beat specifically must play a locked bed;
- every stage names a bed that is registered;
- every audio file is 8- or 16-bit PCM at 44.1/22.05 kHz (Android's guaranteed
  WAVE support).

### (c) Provenance records verify themselves

`npm run audit:provenance --require-clean`, in `npm run verify`, re-derives
every structured claim in `docs/**/*.md` and `project-status.md` — recorded
SHA-256 against the file's hash, recorded byte count against its size, recorded
duration against its WAVE header. 10 claims checked, 0 drifted. Prose is
deliberately not parsed.

**The gap M24 must close.** The contract can currently express only two states:
*generated here* (verifiable) and *unverified* (usable only on a stage that
scores nothing). There is **no honest state for an external track**, and a
downloaded song dropped onto Stage 3 would — correctly — fail the build.
`M24-architecture.md` §3 proposes the third state.

---

## 5. Persistence, as it exists

Two modules, deliberately split:

- `game/state/persistence.ts` — **pure**. Schema, parsing, serialisation.
  Never throws, never returns null, every branch ends in a playable state.
- `game/state/storage.ts` — the only file importing `expo-file-system`. One
  JSON file, `worst-gig-ever.save.json`, in `documentDirectory`, read once at
  startup, written on discrete events.

```ts
interface SavedState {
  schemaVersion: number;     // SCHEMA_VERSION = 1, written from the first save
  records: Records;          // per-StageId best defense / groove
  bestStageCleared: number;  // high-water mark, or -1
  clickEnabled: boolean;
  locale: Locale | null;     // null = follow the device
}
```

Properties that matter to M24, each already covered by a test in
`tests/persistence.test.ts` (21 tests):

- **unknown fields are preserved and written back**, so a newer build's data
  survives a round trip through an older one;
- fields are parsed **individually and tolerantly** — a corrupt value falls
  back without taking the rest of the save with it;
- a stage id this build does not know is **dropped**, not kept;
- an unreadable file is reported and **never overwritten**;
- `__proto__` / `constructor` / `prototype` are never carried forward;
- the load is **not awaited before the first render** — the game opens on
  defaults and applies the save a few frames later.

The rule stated in both modules, from M15 and restated in the V2 plan:
> **Session progress must never gate a cold start. Persistence records what
> happened; it does not lock anything.**

`game/state/appFlow.ts` honours it literally — `startStage()` carries the
comment "**No stage is locked**". Every stage is selectable on a fresh install.

**Adding a field does not require a schema bump.** `SCHEMA_VERSION` is
documented as "bumped only when the shape changes in a way a reader must know
about"; a new optional field is absorbed by the field-by-field tolerance and by
the unknown-field passthrough in older builds.

---

## 6. The completion event, as it exists

There is exactly one victory definition and M24 must reuse it.

```
roundState.ts:667   state.state = 'SHOW_COMPLETE'; events.push({type:'SHOW_COMPLETED'})
   │
   ▼
GameEngine effect on uiState                    (game/systems/GameEngine.tsx)
   if (uiState === 'SHOW_COMPLETE') recordStageCleared(scene.flow)
   │
   ▼
appFlow.recordStageCleared()
   flow.bestStageCleared = max(bestStageCleared, stageIndex)
   │
   ▼
persist() → writeSave({ ..., bestStageCleared })
```

So **"the player completed Stage 4 successfully" is already recorded and
already persisted** as `bestStageCleared === STAGES.length - 1` (3). No new
state is needed to express it. A ruined show is explicitly not progress.

The one nuance, stated because it changes a product decision: **no stage is
locked**, so a player can select Stage 4 from the title and clear it without
playing 1–3, and that also sets `bestStageCleared` to 3.

---

## 7. Localization, as it exists

- `Catalogue = typeof en`. A locale missing a key, or misspelling one, is a
  **`tsc` error**, not a runtime blank.
- `SUPPORTED_LOCALES = ['en','pt-BR']`; `DEV_LOCALES = ['pseudo']` — English,
  accented and 1.4× longer, generated from `en`.
- `availableLocales(includeDev = isDevelopmentBuild())` is the exact pattern a
  dev-only music audition should copy: **the dev thing is registered so it is
  checked, and kept out of the shipping list so it cannot be selected.**
- `PRODUCT_TITLE` in `game/config/product.ts` is a constant, deliberately not a
  catalogue string.
- Stage prose is keyed by `StageId` in `game/i18n/catalogues/en.ts`. Song titles
  should follow that shape exactly.
- `tests/layoutBudget.test.ts` enforces, **in every locale including pseudo**:
  a fixed box's text must fit; a scrollable surface may overflow but must show
  its indicator. Any new screen must supply its dimensions to
  `game/rendering/overlayLayout.ts`, which is read twice — once by the
  StyleSheet and once by the test.

---

## 8. UI architecture, as it exists

`game/rendering/Overlays.tsx` (907 lines) is one component that branches on
`flow.screen`. It uses `View`, `Text`, `Pressable`, `ScrollView`, `Image` —
**no `Modal`, no navigation library, no gesture handler, no drag.** Reusable
pieces already present: `Button` (primary/secondary, compact, disabled),
`StageButton` (the title's stage cards), `ClickToggle`, `LanguageToggle`,
`BriefingCard`, `Summary`.

`APP_SCREENS = ['STORY','TITLE','BRIEFING','ROUND']`; adding a screen is adding
a member to that union and a branch to `Overlays`.

---

## 9. Size, measured

`android/app/build/outputs/apk/release/app-release.apk` — 124 470 891 bytes
(118.7 MiB), built 2026-09-05.

| Component | Size | Share |
|---|--:|--:|
| Native libs, **four ABIs** | 86.8 MB | 73% |
| — of which `arm64-v8a` alone | 23.2 MB | |
| Runtime audio (9 `.wav`) | 7.53 MiB | 6% |
| Everything else (art, bundle, resources) | ~24 MB | 20% |

The universal APK is dominated by carrying four ABIs. A Play Store AAB
delivering one ABI per device removes roughly **63.6 MB**, putting the base
around **55.1 MiB** — at which point audio is 13.7% of the app rather than 6%.
Any size conversation about a music library should be held against the AAB
figure, not the 118.7 MiB universal APK.

---

## 10. Governance, as it exists

| Artefact | Location | Convention |
|---|---|---|
| Milestone spec | `docs/specs/M<n>-<slug>.md` | Multiple docs per milestone is established (`M13-…-candidate` + `M13-…-checklist`, `M18.5-…-plan` + `M18.5-…-report`) |
| Gate / evidence | `docs/verification/M<n>-gate.md` + `m<n>-evidence/` | Names the branch and commit, records exact `npm run verify` totals, states an outcome token e.g. `M18_DRINK_APPROVED` |
| Architecture decision | `docs/decisions/NNNN-<slug>.md` | Numbered, currently through 0012 |
| Asset provenance / plans | `docs/assets/` | `AUDIO-SOURCES.md` is the authoritative audio provenance file (rule 13) |
| Branch | `m<n>/<slug>` | e.g. `m22/local-memory-and-sharing`, `m19/locale-foundation` |
| Commit | `feat:` / `fix:` / `docs:` / `chore:` / `build:` / `merge:` + a sentence | Descriptive, lower case, states the effect |
| Verification | `npm run verify` | type-check → lint → `node --test` → art validate → art measure → provenance audit |

`AGENTS.md` rules that bind M24 directly: **4** (gameplay logic independent of
rendering), **10** (no MIDI runtime), **11** (explicit audio lifecycle), **12**
(no copyrighted commercial music), **13** (every third-party asset needs
provenance in `AUDIO-SOURCES.md`), **14** (never silently substitute an asset),
**18** (minimise dependencies), **19** (no weakening TypeScript), **21**
(validate every milestone), **23** (record deviations).

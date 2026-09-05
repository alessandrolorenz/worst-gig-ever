# M24 — Implementation plan

**Status:** M24A **implemented** 2026-09-05 on `m24/setlist-foundation`.
M24B-D proposed.
**Reads:** `M24-custom-setlist.md` (decisions), `M24-architecture.md` (shapes),
`M24-test-plan.md` (tests), `../assets/M24-MUSIC-ACQUISITION-SPEC.md`.

---

## The decomposition, refined

The brief proposed M24A = acquire music, M24B = foundation, M24C = unlock,
M24D = device. **The first two should swap**, for one concrete reason:

> The setlist foundation does not depend on any new music existing. It can be
> built and verified entirely against the three tracks already in the tree,
> because `OFFICIAL_SETLIST` is *derived* from the stage table and is therefore
> definitionally today's behaviour.

Building it first means the acquisition milestone arrives at a repository that
**already has a test suite waiting for it**: the tempo-evidence contract, the
`measure:tempo` gate and the catalogue's exhaustive record types all exist
before the first foreign byte is downloaded. That is the difference between
"add tracks and then decide how to check them" and "add tracks that cannot land
unless they are checkable". Given that this project has already shipped a
120 BPM track under a check that could not see tempo, the order matters.

Everything else in the brief's sequence stands.

| | Milestone | Depends on | Ships music? | Player-visible? |
|---|---|---|---|---|
| **M24A** | Setlist foundation and tempo evidence | nothing | no | **no** |
| **M24B** | Music library and audition | M24A | candidates only, dev-gated | no |
| **M24C** | Custom setlist unlock and builder | M24A, M24B | yes | yes |
| **M24D** | Physical replay validation | M24C | — | — |

---

## M24A — Setlist foundation and tempo evidence — **DONE (2026-09-05)**

**Goal:** the game plays `OFFICIAL_SETLIST` instead of `stage.music`, and the
audio contract can express an honest claim about a found file. **The player
must not be able to tell anything changed.**

Branch: `m24/setlist-foundation`. `npm run verify` green at **464 tests**
(430 before), plus the new `PASS_TEMPO_EVIDENCE` gate.

### What changed against this plan

Three deviations, each with a reason found during implementation:

1. **`setlist.ts` went to `game/audio/`, not `game/levels/`** — the owner's
   stated preference, and it groups the setlist with the catalogue it is made
   of. It imports `STAGES` for the slot count and the official derivation; the
   dependency runs one way and no level imports it back.
2. **`parseSetlist` requires *selectable* tracks, not merely registered ones.**
   Discovered by a test: `grooveBed` is a teaching floor and `showTheme` is a
   120 BPM loop, and "is this a track?" would have let a save name either one.
   `availableTracks()` is the gate, as a parameter with a default, mirroring
   `availableLocales(includeDev)`. In M24A the library is empty, so every custom
   setlist parses to `null` — the honest answer, and the fallback is the show.
3. **The tempo tool gates on *grid agreement* rather than on best-fit tempo.**
   "Do this file's onsets support 90 BPM?" is a narrower and far more robust
   question than "what tempo is this?", and it is the one the project needs. The
   best-fit tempo is still reported, and is advisory. See ADR 0013, including
   the measured limitation on `rock_theme_song_loop.wav`.

### Work

| # | File | Change |
|--:|---|---|
| 1 | `game/audio/musicCatalogue.ts` | **new.** `MusicTrackId`, `MusicGenre`, `TempoEvidence`, `MusicTrack`, `MUSIC_TRACKS`, `availableTracks()`, `isTempoLocked()`. Pure data, no `require`. |
| 2 | `game/audio/audioMix.ts` | Delete `MUSIC_TEMPO_LOCKED` and `MUSIC_GENERATOR`; re-export `MusicTrackId`. `MIX` and `SFX_POOL_SIZE` untouched. |
| 3 | `game/audio/audioAssets.ts` | `MUSIC_SOURCES: Record<MusicTrackId, number>` — exhaustive, so a catalogue entry without a file is a `tsc` error. |
| 4 | `game/levels/setlist.ts` | **new.** `Setlist`, `SETLIST_SLOTS`, `OFFICIAL_SETLIST`, `trackForStage()`, `parseSetlist()`. |
| 5 | `game/state/appFlow.ts` | Add `setlist: Setlist` (defaults to `OFFICIAL_SETLIST`); `startStage()` and `returnToTitle()` reset it. Add `isCustomSetlistUnlocked()`. |
| 6 | `game/entities/sceneEntities.ts` | Add `music: MusicTrackId` beside `stage`, set together. |
| 7 | `game/systems/GameEngine.tsx` | `resetScene()` sets `scene.music = trackForStage(flow.setlist, flow.stageIndex)`. Line 309 becomes `audio.playMusic(scene.music)`. |
| 8 | `scripts/measure-track-tempo.mjs` | **new.** Onset-envelope pulse measurement; `--require-locked` exits non-zero if any tempo-locked track's measured pulse is outside tolerance. |
| 9 | `package.json` | `"measure:tempo"` script; add `npm run measure:tempo -- --require-locked` to `verify`. |
| 10 | `docs/decisions/0013-tempo-evidence-for-external-tracks.md` | **new ADR.** Supersedes the M16 meaning of `MUSIC_TEMPO_LOCKED`; AGENTS.md rule 23. |
| 11 | `tests/audioContract.test.ts` | Migrate four assertions to `MUSIC_TRACKS`; add the setlist rules. |
| 12 | `tests/setlist.test.ts` | **new.** See test plan §2. |

### Definition of done — met

- `npm run verify` green, 464 tests, none removed. ✅
- `OFFICIAL_SETLIST` deep-equals `['showTheme','grooveBed','showBed','showBed']`
  by a pinned literal in a test. ✅
- The measurement reproduces the known defect. ✅ **with a correction to what
  the defect measures as.** `showTheme` reads ~96 BPM rather than ~120: its
  notated tempo is 120 (proved from the committed MIDI) but its riff is a
  five-sixteenth cycle at 625 ms and its onsets barely mark the beat. It is
  rejected from the 90 BPM grid on four independent grounds, which is what the
  gate needs. The algorithm is verified against synthetic signals at 72, 90,
  100, 120 and 140 BPM — each recovered within 1.5 BPM, and each a whole number
  of beats long at 90 as well as at its own tempo, so duration divisibility
  cannot tell them apart. Full evidence in ADR 0013.
- Emulator run: **still owed.** Automated equivalence is proved; a device
  confirmation that Stages 1-4 sound identical is an M24D line item.

### Risk, in hindsight

Low, as expected. The one surprise was the tempo tool, and it was a surprise
about a *file* rather than about the design.

---

## M24B — Music library and audition

**Goal:** 8–10 auditioned candidates in the tree, dev-gated, with full
provenance and tempo evidence; the owner picks six.

Branch: `m24/music-library`.

### Work

1. **Acquire** per `../assets/M24-MUSIC-ACQUISITION-SPEC.md` — discovery,
   licence evidence, download, SHA-256 of every source before anything is
   touched.
2. **Measure** each source with `npm run measure:tempo`. Record BPM, confidence
   and downbeat offset. Reject anything the tool cannot fit confidently.
3. **Condition** each into a 16-bar / 64-beat 16-bit mono 44.1 kHz WAV by a
   recorded `ffmpeg` command, from the hashed source.
4. **Record provenance** in `docs/assets/AUDIO-SOURCES.md` in the existing
   structured form — the `### \`file.wav\`` heading plus `- Format:` /
   `- SHA-256:` lines — so `audit:provenance` picks it up automatically.
   Third-party authorship is never renamed away; the fictional title is
   presentation only and lives in the string catalogue.
5. **Register** each as `release: 'candidate'` in `MUSIC_TRACKS`.
6. **Dev audition row** on the title screen behind `isDevelopmentBuild()`,
   ~20 lines in `Overlays.tsx`: cycle candidate, play, stop.
7. Local release build → **owner listens** → owner names six.
8. Promote the six to `release: 'production'`; delete the rest along with their
   provenance entries and files.

### Definition of done

- `npm run verify` green, including `measure:tempo --require-locked` and
  `audit:provenance --require-clean` over the new records.
- `availableTracks(false)` contains no candidate — asserted.
- Owner has named the production six. **This milestone does not close without
  that**; it is the one thing Claude cannot decide.

### Risk

Medium, and all of it is external. Finding six permissively-licensed rock
tracks at or conformable to 90 BPM with a clean loopable 16-bar section is the
real work. Mitigation: audition 8–10, and prefer sources that publish stems or
loops over full songs.

---

## M24C — Custom setlist unlock and builder

**Goal:** the feature, player-visible.

Branch: `m24/custom-setlist`.

### Work

| # | File | Change |
|--:|---|---|
| 1 | `game/state/appFlow.ts` | `'SETLIST'` in `APP_SCREENS`; `draftSetlist`; `openSetlist()`, `assignSlot()`, `startCustomGig()`. |
| 2 | `game/state/persistence.ts` | `customSetlist` in `SavedState` + `KNOWN_FIELDS`; `parseSetlist` applied; `serializeSave` writes it. `SCHEMA_VERSION` unchanged. |
| 3 | `game/systems/GameEngine.tsx` | Load `customSetlist` into `draftSetlist`; persist on `START THE GIG`; handlers for the new screen. |
| 4 | `game/audio/audioService.ts` | `preloadSetlist(ids)` — see `M24-architecture.md` §6. |
| 5 | `game/rendering/Overlays.tsx` | The `SETLIST` branch; a `CUSTOM SETLIST` button on the title, drawn only when unlocked; `CUSTOM SETLIST UNLOCKED` on the Stage 4 results. |
| 6 | `game/rendering/overlayLayout.ts` | `SETLIST_SLOT`, `SETLIST_TRACK_ROW` and their text widths. |
| 7 | `game/i18n/catalogues/{en,pt-BR,pseudo}.ts` | Song titles, screen copy, genre labels. `pseudo` is generated. |
| 8 | `tests/setlist.test.ts`, `tests/persistence.test.ts`, `tests/layoutBudget.test.ts`, `tests/localization.test.ts` | Extended per the test plan. |

### Definition of done

- `npm run verify` green.
- A save with a custom setlist round-trips; a corrupt one falls back to official
  and still starts.
- Emulator: complete Stage 4, see the unlock, build a setlist, replay, cold
  start, setlist still there.

### Risk

Low-to-medium. The layout budget in three locales is the most likely thing to
need a second pass, which is exactly what M20's machinery is for.

---

## M24D — Physical replay validation

Branch: none — a checklist and a gate document.

Local release build (`./android/gradlew -p android assembleRelease`, ~45 s,
debug-keystore signed; **not** `npx expo run:android --variant release`, which
dies on `lintVitalAnalyze`). Bump the app version so it cannot be confused with
1.0.7 or 1.2.0.

Checklist — `docs/specs/M24-physical-retest-checklist.md`, written at M24C:

1. Fresh install: no `CUSTOM SETLIST` button on the title.
2. Official run, Stages 1→4, complete. Music matches the pre-M24 build.
3. `CUSTOM SETLIST UNLOCKED` appears on the Stage 4 results.
4. Build a setlist. Every song assignable; used songs deaf; `START THE GIG` deaf
   until full.
5. Custom run, all four stages. **The click still reads over every track** —
   the one question the audition cannot fully answer.
6. Stage 2 with a full song in the exposed 12-second intro: is the beat still
   legible? (Q3's open risk.)
7. Reorder, replay, confirm different music in the same stages.
8. Force-stop, cold start: setlist still there, still unlocked.
9. Second custom run.
10. Title → stage card: **official** music, not the custom setlist.
11. pt-BR and pseudo: the builder screen fits.

Gate: `docs/verification/M24-gate.md`, naming branch, commit, exact
`npm run verify` totals and an outcome token.

---

## Governance

- Branches `m24/<slug>`, per the existing `m22/…`, `m19/…` convention.
- Commits `feat:` / `docs:` / `fix:` plus a sentence stating the effect.
- Each of M24A–C ends with `npm run verify` and a gate section; M24D produces
  the gate document.
- This milestone produces **documentation only**. No implementation is merged
  from it.

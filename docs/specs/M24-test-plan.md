# M24 — Test plan

**Status:** proposed, 2026-09-05. **No tests written.**
**Baseline to beat:** 430 tests, 0 failures, on `main` at `0794111`.

Every test below runs under `node --test` with no device, no audio hardware and
no bundler — the rule the whole suite already runs under. Files are read from
disk where a claim is about a file; nothing mocks `expo-audio`.

Existing suites this extends: `tests/audioContract.test.ts`,
`tests/persistence.test.ts`, `tests/localization.test.ts`,
`tests/layoutBudget.test.ts`, `tests/stageFlow.test.ts`,
`tests/assetsContract.test.ts`. One new suite: `tests/setlist.test.ts`.

---

## 1. Catalogue — `tests/audioContract.test.ts`

| # | Assertion | Why |
|--:|---|---|
| 1.1 | Every `MusicTrackId` appears exactly once in `MUSIC_TRACKS`, and its `id` field matches its key | A record keyed by a union cannot be sparse, but it can be mislabelled |
| 1.2 | Every catalogue entry has a file in `MUSIC_SOURCES` | Already a `tsc` property; asserted so a widened type cannot lose it |
| 1.3 | Every track with `evidence.kind === 'generated'` names a script that exists on disk | The existing M16 rule, carried forward |
| 1.4 | Every track with `evidence.kind === 'conditioned'` records a non-empty `sourceSha256`, a `command`, and a `measuredBpm` | Evidence with a hole is not evidence |
| 1.5 | Every `conditioned` track has a `provenanceId` that appears as a structured heading in `docs/assets/AUDIO-SOURCES.md` | AGENTS.md rule 13, mechanically |
| 1.6 | Every tempo-locked track measures a whole number of beats at `RHYTHM.bpm` **from its own WAVE header**, within `1e-6`, and lands on a bar line | The existing check, widened to the library |
| 1.7 | Every library track is 8- or 16-bit PCM at 44.1/22.05 kHz | Android's guaranteed WAVE support |
| 1.8 | Every `release: 'production'` library track is tempo-locked | The rule that makes any custom setlist safe without enumerating setlists |
| 1.9 | Every library track has a `titleKey` present in **every** catalogue | A song with no name in pt-BR is a blank row |
| 1.10 | `availableTracks(false)` contains no `release: 'candidate'` track | Release safety — mirrors the existing pseudo-locale test verbatim |
| 1.11 | The production library has at least `SETLIST_SLOTS` tracks | Policy A is unsatisfiable below that |
| 1.12 | `MIX.beatClick > MIX.music` | Existing. The cue must stay above every bed, including new ones |

**Deliberately not tested:** that a track *sounds* good, that its arrangement
suits a stage, or that the click is audible over it in a real mix. Those are
owner judgements and M24D asks them.

## 2. Setlist — `tests/setlist.test.ts` (new)

| # | Assertion |
|--:|---|
| 2.1 | `OFFICIAL_SETLIST` deep-equals the pinned literal `['showTheme','grooveBed','showBed','showBed']` — a change to stage data is loud, not silent |
| 2.2 | `OFFICIAL_SETLIST.length === STAGES.length === SETLIST_SLOTS` |
| 2.3 | `OFFICIAL_SETLIST[i] === STAGES[i].music` for every i — the derivation is the definition |
| 2.4 | Every id in `OFFICIAL_SETLIST` exists in `MUSIC_TRACKS` |
| 2.5 | Every **groove-scored** slot of `OFFICIAL_SETLIST` is tempo-locked (slot 1 is exempt because Stage 1 scores no beat) |
| 2.6 | `trackForStage` clamps: −1, 99, NaN, 1.5 all return a valid id and never throw |
| 2.7 | `OFFICIAL_SETLIST` is frozen / cannot be mutated by a caller |
| 2.8 | `parseSetlist` rejects: not an array, wrong length, an unknown id, a non-string entry, `null`, a duplicate (Policy A) — each returns `null` |
| 2.9 | `parseSetlist` accepts a valid list and returns it unchanged |
| 2.10 | A custom setlist of any valid shape leaves `OFFICIAL_SETLIST` untouched |

## 3. Persistence — `tests/persistence.test.ts`

| # | Assertion |
|--:|---|
| 3.1 | A save with a valid `customSetlist` round-trips unchanged |
| 3.2 | A save with a corrupt `customSetlist` parses to `null` **and the rest of the save survives** — the existing field-by-field rule |
| 3.3 | A `customSetlist` naming a track this build no longer has parses to `null` |
| 3.4 | A save with **no** `customSetlist` (every existing save on every device) parses to `null` and is playable |
| 3.5 | `customSetlist` is in `KNOWN_FIELDS`, so it is not duplicated into the unknown-field passthrough |
| 3.6 | An older build's unknown fields still survive a round trip alongside it |
| 3.7 | `SCHEMA_VERSION` is unchanged at 1 |
| 3.8 | **No save, however broken, can stop a stage being played** — the existing test, re-run with setlist fields |

## 4. Unlock — `tests/stageFlow.test.ts` / `tests/setlist.test.ts`

| # | Assertion |
|--:|---|
| 4.1 | A fresh flow is locked: `isCustomSetlistUnlocked(createAppFlow()) === false` |
| 4.2 | Clearing Stages 1–3 leaves it locked |
| 4.3 | `recordStageCleared` on the last stage index unlocks it |
| 4.4 | A **ruined** show on the last stage does not unlock it |
| 4.5 | Once unlocked it stays unlocked — `bestStageCleared` only rises |
| 4.6 | The unlock survives a save/load round trip (a cold start) |
| 4.7 | The unlock gates the **screen** only: every stage is still selectable while locked |

## 5. Stage mapping and mechanical equivalence

| # | Assertion |
|--:|---|
| 5.1 | Each music-enabled stage receives `flow.setlist[stageIndex]` — asserted through `trackForStage`, not through the renderer |
| 5.2 | **No module in `game/state/` or `game/levels/` (other than `setlist.ts`) imports the catalogue or the setlist.** Source-scanned, the way `tests/localization.test.ts` already scans for stray literals. This is what makes §26 structural |
| 5.3 | `tests/stageFlow.test.ts`'s existing spawn-by-spawn replays of `level01` and `defenseDrill` still pass unchanged — the validated rounds are byte-for-byte |
| 5.4 | Replaying a level under two different setlists produces an identical spawn trace and identical beat schedule |
| 5.5 | `GameEngine.tsx` contains exactly one `playMusic(` call site |

## 6. Localization and layout

| # | Assertion |
|--:|---|
| 6.1 | Every song title and every setlist string exists in `en`, `pt-BR` and `pseudo` — a `tsc` property, asserted anyway |
| 6.2 | No literal player-visible string in the setlist branch of `Overlays.tsx` — the existing `renderableSource` scan |
| 6.3 | A slot row's text fits its fixed box **in every locale including pseudo** |
| 6.4 | A track row's title + genre fits its column in every locale |
| 6.5 | If the library column scrolls, it shows its indicator — M20's fixed-vs-scrollable rule |
| 6.6 | `START THE GIG` fits `BUTTON.maxWidth` in every locale |

## 7. Release safety

| # | Assertion |
|--:|---|
| 7.1 | `availableTracks(false)` excludes every candidate (= 1.10) |
| 7.2 | The dev audition row in `Overlays.tsx` is guarded by `isDevelopmentBuild()` — source-scanned, like the dev-locale guard |
| 7.3 | No candidate id appears in `OFFICIAL_SETLIST` |
| 7.4 | Candidate files removed at the end of M24B leave no orphan catalogue entry — covered by 1.2 as a `tsc` error |

## 8. Gates in `npm run verify`

| Command | Adds |
|---|---|
| `npm run measure:tempo -- --require-locked` | **new.** Fails if any tempo-locked track's *measured pulse* is outside tolerance of `RHYTHM.bpm`. Its own acceptance test: run against `showTheme` and it must report ~120 BPM |
| `npm run audit:provenance -- --require-clean` | existing; picks up the new records automatically once they are written in the structured form |
| `npm test` | existing |

## 9. What is deliberately not automated

- Whether a track is fun, or suits a stage.
- Whether the click reads over a given bed on a phone speaker.
- Whether Stage 2's exposed twelve seconds stay legible under a full song.
- Whether the loop seam is audible on device.

All four are M24D device questions. Automating a proxy for any of them would
repeat the M18.1 mistake: *a model with a dishonest budget is worse than no
model, because it is mistaken for a guarantee.*

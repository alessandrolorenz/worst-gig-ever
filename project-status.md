# Project Status

## Project

Worst Band Ever — working title

## Current phase

**M4 graybox vertical slice implemented (2026-08-30). Ready for the first physical playtest.**

M3 (art) is drafted but unfilled: no art asset has been produced. The slice runs on graybox shapes, as M4 requires.

## Product hypothesis

A compact, absurd drummer-POV arcade game can be fun with very little content if object impacts, music, visual reactions, and escalating stage chaos feel satisfying.

## Selected prototype base

`nightness/react-native-game-engine-expo-typescript-template`, MIT (Copyright (c) 2025 Josh Guyette), tracked as the `upstream` remote.

Status: **retained** for the vertical slice. No engine-feasibility failure was found at bootstrap, so AGENTS.md rule 7's replacement clause has not been triggered. Final judgement belongs to the M5 feasibility gate.

## Recorded baseline versions

Measured 2026-08-30 at commit `fb2170978eae4b3bb59e0232e7cc421741c78b32`.

| Component | Version |
|---|---|
| Node | v24.18.0 |
| npm | 11.16.0 |
| Expo SDK | 53.0.22 |
| React | 19.0.0 |
| React Native | 0.79.6 |
| react-native-game-engine | 1.2.0 |
| react-game-engine (web) | 1.2.0 |
| matter-js | 0.18.0 |
| expo-audio | 0.4.9 (added at bootstrap) |
| TypeScript | 5.8.3 (`strict: true`) |

## Validation commands

| Command | Purpose |
|---|---|
| `npm run type-check` | `tsc --noEmit` |
| `npm run lint` | eslint over `.ts`, `.tsx`, `.js` |
| `npm test` | `node --test` (native TypeScript type stripping) |
| `npm run verify` | all three, in order |

Last run 2026-08-30: type-check clean, lint clean, 59/59 tests passing. `npx expo export` succeeds for android and web.

## Current scope

One 60-second show with:

- two throwable target types;
- one vocalist event;
- score and combo;
- three-point Show Integrity;
- one CC0 rock music source;
- core impact/break/crowd sound effects;
- graybox first, art integration second.

## Immediate next action

Build a development client and play the slice on Android hardware. The question the playtest has to answer is the one in `START-HERE.md`: is hitting objects and surviving the show fun enough that someone immediately wants another round?

`prompts/03-m5-playtest-polish.md` follows the playtest, not before it.

## Gates

- M0–M2 Fast Track: **COMPLETE** (2026-08-30)
- M3 Asset Contract: DRAFTED — audio acquired, verified, and integrated; art not yet produced
- M4 Vertical Slice: **COMPLETE — graybox, awaiting device validation** (2026-08-30)
- M5 Physical Playtest: NOT STARTED
- M6 Expand / Pivot / Stop: NOT STARTED

## Open items carried into the playtest

1. **Nothing in the slice has run on a device.** Bundling and the logic are verified; touch feel, frame pacing, audio latency, and readability are not.
2. `expo-audio` ships native code, so a development client built before ADR 0002 will run the game silently. Rebuild before judging audio.
3. `crowd_applause.wav` is still the full 39 s / 6.9 MB source, and volume normalization across the five files has not been done. Both are M5 polish, and both are audible in the current build.
4. Tuning values in `game/config/` and `game/levels/level01.ts` are first guesses. Approach duration, hitbox radius, and spawn cadence are the levers if the slice feels wrong.
5. `com.worstbandever.app` is a provisional application identifier (ADR 0004). Confirm before any store submission.
6. `package-lock.json` is git-ignored by the template, so dependency resolution is not reproducible across machines.

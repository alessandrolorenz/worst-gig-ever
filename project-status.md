# Project Status

## Project

Worst Band Ever — working title

## Current phase

**M0–M2 fast track executed (2026-08-30). Ready for M4 graybox vertical slice.**

M3 (art) is drafted but unfilled: no art asset has been produced. The M4 prompt builds the graybox with placeholder shapes, so art is not a blocker.

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

Last run 2026-08-30: type-check clean, lint clean, 11/11 tests passing.

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

Run `prompts/01-m4-graybox-vertical-slice.md`.

## Gates

- M0–M2 Fast Track: **COMPLETE** (2026-08-30)
- M3 Asset Contract: DRAFTED — audio acquired and verified; art not yet produced
- M4 Vertical Slice: NOT STARTED
- M5 Physical Playtest: NOT STARTED
- M6 Expand / Pivot / Stop: NOT STARTED

## Open items carried into M4

1. `crowd_applause.wav` is the full 39 s / 6.9 MB source. Trim to the Show Complete sting once the end screen exists.
2. Runtime volume normalization across the five SFX/music files is deferred to M4 slice 6.
3. `expo-audio` needs a fresh development client build before audio is exercised on device.
4. `com.worstbandever.app` is a provisional application identifier (ADR 0004). Confirm before any store submission.
5. `package-lock.json` is git-ignored by the template, so dependency resolution is not reproducible across machines.

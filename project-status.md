# Project Status

## Project

Worst Band Ever — working title

## Current phase

**M5A first tuning pass complete (2026-08-30). Awaiting a re-run of the physical playtest against the tuned build.**

The first observation pass produced four actionable complaints — unreliable hits, straight-line object travel, a static band, and a stage that reads as a diagram. All four have been addressed in `docs/decisions/0007-m5a-first-tuning-pass.md`. No gameplay rule, event family, or scoring value changed.

M3 (art) is drafted but unfilled: no art asset has been produced. The slice still runs on graybox shapes, as M4 and M5A both require.

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

Last run 2026-08-30 (post-M5A): type-check clean, lint clean, 116/116 tests passing. `npx expo export` succeeds for android and web.

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

Rebuild the development client and re-run `docs/specs/M5-physical-playtest-checklist.md` against the tuned slice. Three of M5A's five success criteria are subjective and cannot be closed without a device and a person:

1. can the player reliably hit incoming objects (checklist B3, B4, G2);
2. is the vocalist event still readable and chaotic (section E);
3. does the stage feel more alive (sections A3, B1, I).

The underlying question is still the one in `START-HERE.md`: is hitting objects and surviving the show fun enough that someone immediately wants another round?

## Gates

- M0–M2 Fast Track: **COMPLETE** (2026-08-30)
- M3 Asset Contract: DRAFTED — audio acquired, verified, and integrated; art not yet produced
- M4 Vertical Slice: **COMPLETE** (2026-08-30), commit `733fb15`
- M5 Physical Playtest: **FIRST OBSERVATION DONE** (2026-08-30) — outcome: TUNE
- M5A First Tuning Pass: **COMPLETE** (2026-08-30) — awaiting a second playtest
- M6 Art Direction & Asset Pack 1: NOT STARTED

## Device validation performed (2026-08-30)

Smoke validation only. No subjective judgement was made and no gameplay value was changed.

| Check | Result |
|---|---|
| Android development client builds | Yes — `./gradlew :app:assembleDebug`, 186 MB debug APK |
| Installs and launches | Yes — `com.worstbandever.app` on emulator `Pixel_API34` (Android 14, arm64) |
| Runs in landscape | Yes — generated manifest sets `android:screenOrientation="landscape"`; display reported ROTATION_90 |
| JS bundle loads | Yes — 1057 modules, New Architecture (`fabric: true`), no fatal exceptions |
| expo-audio native module loads | Yes — autolinked as `expo.modules.audio`; the READY screen's "audio unavailable" warning did not appear |
| Music reaches the audio device | Yes — `AudioTrack`/`AudioFlinger` activity in logcat after the round starts |
| Round runs on device | Yes — clock counts down, targets approach, Show Integrity decrements when targets are ignored |

**Not validated:** touch feel, frame pacing, audio latency, readability at phone size, and everything else that requires a human holding a real phone. An emulator cannot answer any of it.

## Physical playtest instrument

`docs/specs/M5-physical-playtest-checklist.md` — fill in during the session, then decide via `docs/specs/M5-playtest-and-decision.md`. The build under test is now the M5A slice, not commit `733fb15`.

## What M5A changed

Full reasoning in ADR 0007. In summary:

| Priority | Change | Where |
|---|---|---|
| 1 Input | Native taps map through `pageX`/`pageY` and the surface offset, not `locationX` — the engine's bubbling touch handler made the old path report coordinates relative to whatever nested view was under the finger | `game/systems/roundSystem.ts` |
| 1 Input | The scaled canvas is `pointerEvents="none"`, so nothing inside it can become a touch target | `game/rendering/SceneRenderer.tsx` |
| 1 Input | Hitboxes enlarged 1.25x with a 64 px floor, plus a 110 px near-miss assist measured from the hitbox edge; direct hits still win | `game/config/targets.ts` |
| 1 Input | Near-coincident taps in one frame count as one swing (a browser reports one finger twice) | `game/systems/roundSystem.ts` |
| 2 Arcs | Objects are thrown from across the crowd on an authored arc with lift, drift, and spin; endpoints and determinism unchanged | `game/systems/approach.ts` |
| 3 Reactions | Five performer poses, flinches on nearby impacts, dodges derived from targets in flight | `game/systems/stageMotion.ts` |
| 4 Ambience | Two-frame band and crowd loops on a 132 bpm cadence, stage glow pulsing on the beat | `game/systems/stageMotion.ts` |

## Open items carried into the next playtest

1. **The tuned build has not been played by a human.** M5A's three subjective success criteria are unverified.
2. `crowd_applause.wav` is still the full 39 s / 6.9 MB source, and volume normalization across the five files has not been done. Both are audible in the current build and are deliberately left alone until after observation.
3. Tuning values in `game/config/` and `game/levels/level01.ts` remain first guesses. M5A moved hitbox radius, arc shape, and stage cadence; approach duration and spawn cadence are untouched. If the game now plays too easily, `HIT_FORGIVENESS.minRadiusPx` is the first dial to turn, then `assistRadiusPx`.
4. The hit-radius halo drawn around active targets is a graybox affordance for observing whether the widened hitbox is enough. It is not intended to survive art integration.
5. The development client is a **debug** build and `jsEngine` is still `jsc`, not Hermes. Both add overhead; do not judge frame pacing without re-checking a release build (ADR 0006).
6. The generated manifest requests `RECORD_AUDIO`, pulled in by expo-audio's config plugin even though the game never records. Harmless for a playtest; must be removed before any store submission.
7. `com.worstbandever.app` is a provisional application identifier (ADR 0004). Confirm before any store submission.
8. `package-lock.json` is git-ignored by the template, so dependency resolution is not reproducible across machines — this directly caused the autolinking failure documented in ADR 0006.

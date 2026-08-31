# Project Status

## Project

Worst Band Ever — working title

## Current phase

**M6B asset integration complete (2026-08-30). Art gate is `PASS_ART_READY`; the automated M6B gate is green.**

All 33 required Pack 1 PNGs are produced and integrated. The scene runs
entirely on final art: background, light overlay, rear crowd, three-frame front
crowd, three performers across five poses, projectiles, hit burst, six debris
sprites, drum-kit foreground, and the drumstick strike. Graybox shapes and
labels are gone.

Two verification passes were run. The first composited the layers at their
authored rects and found three defects (ADR 0008). The second ran the actual
build in a browser and found four more that the first could not see, because
it drew every layer where the code *said* it went rather than where React
Native actually put it (ADR 0009): three layers never positioned at all, a
scene root that collapsed to zero height on web, a strobing light overlay, and
image-source swaps that blank a frame. All are fixed.

No gameplay rule, hitbox, trajectory, scoring value, or timing value changed.

**Known shortfall:** the Pack 1 ambient frames are not a loop — `idle`,
`loopA`, and `loopB` are three separate drawings of each character, differing
by 60–87% of the drawn subject, against M6's frozen continuity rule. The scene
holds a single ambient frame (`AMBIENT_LOOP_ART_READY = false`) until they are
regenerated. The band is quieter than M5A intended; nothing was substituted.

**Emulator smoke (2026-08-30, `Pixel_9`, `npx expo run:android`):** builds,
installs, launches, and plays. The scene composes correctly in landscape —
drum kit in the foreground, band readable beside the corridor, crowd behind,
projectiles visible in the near field in front of the toms, no clipping and no
missing-image blocks. A control run of one tap to start and no further input
ended SHOW_RUINED with 3 misses, as the rules require.

**Still not judged:** frame pacing, touch feel, audio latency, reaction
anchoring in motion, and readability at real phone size — all of which need a
human holding a device. The ambient loop is held, so the three-frame check does
not apply yet.

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

Last run 2026-08-31 (post-playtest tweaks): type-check clean, lint clean, 141/141 tests passing. `npx expo export` succeeds for android and web. `npm run validate:art -- --require-ready` reports `PASS_ART_READY`.

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

Build the tweaked `preview:device` APK and confirm the three adjustments on the
phone. After that:

**Regenerate the ambient loop art.** For each of the bassist, guitarist,
vocalist, and front crowd, `idle`, `loopA`, and `loopB` must be one drawing in
three slightly different poses — same outline weight, palette, proportions,
silhouette, camera, and foot anchor, with only body/head/instrument movement
between them. Generating each frame independently is what produced the current
set. Then set `AMBIENT_LOOP_ART_READY = true` in
`game/rendering/SceneRenderer.tsx`.

Then run the M6B visual smoke on the Android emulator or a device: landscape
composition, drum-kit foreground, band readable beside the projectile corridor,
projectiles visible through the whole arc including arrival, loops that read as
animation rather than as cuts, reaction frames anchored, no clipping. Everything
automated in `docs/verification/M6B-gate.md` already passes, and the web build
has been inspected running.

Then continue to M7 (`prompts/08-m7-stage-chaos-interactions.md`).

## Gates

- M0–M2 Fast Track: **COMPLETE** (2026-08-30)
- M3 Asset Contract: RECONCILED WITH M6 — audio acquired, verified, and integrated; art not yet produced
- M4 Vertical Slice: **COMPLETE** (2026-08-30), commit `733fb15`
- M5 Physical Playtest: **FIRST OBSERVATION DONE** (2026-08-30) — outcome: TUNE
- M5A First Tuning Pass: **COMPLETE** (2026-08-30) — awaiting a second playtest
- M6 Art Direction Lock: **COMPLETE** (2026-08-30), commit `6506698` — Pack 1 frozen; no gameplay change
- M6A Asset Pack 1 Production Contract: **COMPLETE** (2026-08-30) — gate outcome `PASS_CONTRACT_ART_MISSING`
- Art Gate: **PASS_ART_READY** — 33/33 required files present, 0 missing, 0 invalid; the two optional files are intentionally absent
- M6B Asset Integration: **GATE GREEN** (2026-08-30) — verified on the web build and the `Pixel_9` emulator
- First phone playtest: **DONE** (2026-08-31) — owner approved the direction; three presentation tweaks requested and applied
- M7 Stage Chaos Interactions: not started

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

## Running the game

`docs/running-the-game.md` — step by step for web, the Android emulator, and a
physical device, plus the troubleshooting for the failure modes recorded in
ADR 0006.

Verified 2026-08-30 on the `Pixel_9` AVD: dev client installs, connects to
Metro, and plays the M5A slice. A control run of one tap to start and no
further input ended SHOW_RUINED with 0 destroyed and 3 misses.

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
| 4 Ambience | Fixed a pre-M5A defect: the crowd was rendered ~380 px below its authored position, hidden behind the drum kit, and had never been visible | `game/rendering/SceneRenderer.tsx` |

## What M6B changed

Full reasoning in ADR 0008. Presentation only — no rule, hitbox, trajectory,
scoring value, or timing value moved.

| Area | Change | Where |
|---|---|---|
| Assets | One static registry for all 33 required Pack 1 PNGs; Metro resolves every path at build time | `game/rendering/artAssets.ts` |
| Scene | Every graybox block replaced by layered art: background, light overlay, rear crowd, three-frame front crowd, performers, projectiles, burst, debris, kit, strike | `game/rendering/SceneRenderer.tsx` |
| Ambience | The ambient loop runs the locked three-frame `idle → loopA → loopB` cycle instead of two frames | `game/config/stage.ts`, `game/systems/stageMotion.ts` |
| Depth | Targets, bursts, and debris past `STAGE.drumkitNearY` draw *in front of* the drum kit. Behind it, the kit hid 44% of a target's area on average through the last tenth of its flight | `game/rendering/composition.ts` |
| Anchors | All three performers share one frame and one floor line off `PERFORMER_ANCHORS`; the stale `VOCALIST_IDLE_RECT` is gone. The blocking tap region is unchanged | `game/rendering/composition.ts`, `game/config/stage.ts` |
| Debug | The tap-radius ring and the danger line are gated behind `SHOW_GRAYBOX_DEBUG`, off by default | `game/rendering/SceneRenderer.tsx` |
| Layout | The rear crowd, front crowd, and drum kit were handed bare `x`/`y` rects as styles, which React Native ignores — all three fell into flow layout and stacked down the screen. Every rect now goes through `absolute()` | `game/rendering/composition.ts` |
| Layout | The scene root used `flex: 1` inside the engine's non-flex web container, so it had zero height and `overflow: hidden` clipped the whole scene. It now fills its parent explicitly | `game/rendering/SceneRenderer.tsx` |
| Flicker | `beatPulse` snapped from 0 back to 1 on every beat; on a full-canvas overlay that strobed the stage. It is now a continuous raised cosine, and the overlay swings 0.58–0.72 instead of 0.36–0.78 | `game/systems/stageMotion.ts` |
| Flicker | Pose changes swapped an `Image`'s `source`, which blanks it while the new bitmap loads. Every frame is now mounted once and switched by opacity | `game/rendering/SceneRenderer.tsx` |
| Flicker | The ambient loop holds one frame while the Pack 1 loop art is not a loop | `game/rendering/SceneRenderer.tsx` |

## Playtest tweaks after the first phone build (2026-08-31)

Owner played the `preview:device` APK and approved the direction. Three
adjustments and the app identity, all presentation:

| Change | Detail | Where |
|---|---|---|
| Drum kit lower | Dropped 120 px so the venue reads: the stage floor, the full crowd, and the band's whole bodies are visible. It also cut the kit's occlusion of an arriving target from 44% of its area to 13%, and cases hidden by more than 60% from 37.7% to 0.8% | `DRUM_KIT_DROP` in `game/rendering/composition.ts` |
| Bottles and mugs larger | Bottle +18%, mug +41%. The mug is now drawn bigger than the bottle, which its 120 px tap radius against the bottle's 90 already said and the art contradicted | `TARGET_DRAW_SIZE` |
| Drumstick clearer | 28 px to 72 px. The stick art is mostly padding — only 40 of 96 source rows are wood — so the old band drew a 12 px sliver | `STICK_THICKNESS` in `SceneRenderer.tsx` |
| App identity | Icon, Android adaptive foreground, favicon, and splash composed from the Pack 1 bottle and drumstick over the venue purple. The Expo template placeholders are gone | `scripts/make-app-icon.mjs` |

No hitbox, trajectory, scoring value, or timing value changed. The enlargement
is bounded by a test: visible artwork must stay inside the tap circle, or the
player aims at pixels that are not tappable.

`STAGE.drumkitNearY` moved with the kit, from 740 to 800. It has to sit at or
above where the kit's solid mass begins, or an arriving object is hidden inside
the drums, and high enough to be crossed while the object is still in flight —
`y` climbs steeply at the end of an arc, so a line flush with the drums is only
reached in the last one percent of the throw and the swap never reads.

## Second tweak pass (2026-08-31)

| Change | Detail | Where |
|---|---|---|
| Throws are faster and varied | `approachDurationMs` became a seeded range per target instead of one constant per kind. Bottle 1600–2150 ms (was 2200 fixed), mug 1950–2550 ms (was 2600). Measured over a full round: bottle averages 1863 ms, mug 2295 ms | `approachMs` in `game/config/targets.ts` |
| Depth order of ground lines | Band 862, front crowd 860, rear crowd 802. They ran the other way — the band's feet sat above both crowd rows and the front row's above the rear row's, so the nearest figures read as standing on the heads of the ones behind them | `PERFORMER_BASELINE_Y`, `CROWD_*_RECT` |
| The band stands on the stage | The wooden stage in the background art starts at y≈828; the band's floor line was at 800, which put them in the pit with the audience | `PERFORMER_BASELINE_Y` |

The speed change is the first deliberate difficulty increase since M5A and is a
tuning value, not a rule: M1 specifies only "standard speed" for the bottle and
"slightly slower" for the mug, and the mug stays slower at both ends of its
range. The draw is from the round's seeded generator, so a seed still replays a
round exactly (AGENTS.md rule 6).

`tests/roundState.test.ts` "gameplay speed does not depend on frame rate" was
rewritten. It had been comparing the live target list at a fixed instant, which
only matched because fixed durations happened to land on both step grids. It
now plays the round perfectly so the clock never stops, and compares the spawn
stream. When a landed target is *noticed* is inherently tick-bound and capped
by `MAX_TICK_DELTA_MS`; that is detection latency, not speed.

## Open items carried into the next playtest

1. **The tuned build has not been played by a human.** M5A's three subjective success criteria are unverified.
2. `crowd_applause.wav` is still the full 39 s / 6.9 MB source, and volume normalization across the five files has not been done. Both are audible in the current build and are deliberately left alone until after observation.
3. Tuning values in `game/config/` and `game/levels/level01.ts` remain first guesses. M5A moved hitbox radius, arc shape, and stage cadence; approach duration and spawn cadence are untouched. If the game now plays too easily, `HIT_FORGIVENESS.minRadiusPx` is the first dial to turn, then `assistRadiusPx`.
4. The hit-radius halo and the danger line are tuning affordances, now behind `SHOW_GRAYBOX_DEBUG` in `game/rendering/SceneRenderer.tsx`. Turn the flag on if the next playtest needs to see what the player was aiming at.
5. The development client is a **debug** build and `jsEngine` is still `jsc`, not Hermes. Both add overhead; do not judge frame pacing without re-checking a release build (ADR 0006).
6. The generated manifest requests `RECORD_AUDIO`, pulled in by expo-audio's config plugin even though the game never records. Harmless for a playtest; must be removed before any store submission.
7. `com.worstbandever.app` is a provisional application identifier (ADR 0004). Confirm before any store submission.
8. `package-lock.json` is git-ignored by the template, so dependency resolution is not reproducible across machines — this directly caused the autolinking failure documented in ADR 0006.
9. **The M6B scene has been inspected running in a browser, but not on a device.** Frame pacing, touch, and readability at phone size are all still unverified.
10. **The Pack 1 ambient loop art must be regenerated** as one drawing in three poses per set. Until then `AMBIENT_LOOP_ART_READY` is `false` and the band and crowd hold a single frame. `loopA`, `loopB`, `crowd_front_02` and `crowd_front_03` are bundled but unused; they are the frames to replace.
11. `npm run validate:art` checks PNG signature, dimensions, and alpha, so it passed art that is not a usable loop. A frame-to-frame continuity check belongs in that script and does not exist yet.

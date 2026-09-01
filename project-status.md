# Project Status

## Project

**Worst Gig Ever** — *Keep the beat. Survive the gig.*

Renamed from the working title *Worst Band Ever* at M9 (2026-08-31). The
GitHub repository, the Expo slug (`worst-band-ever`), the EAS project, and the
native application identifiers (`com.worstbandever.app`) deliberately still
carry the old name; they are technical identifiers with remote state attached
and their migration is pre-release debt tracked in ADR 0010.

## Current phase

**M9 product rename and rhythm-pivot freeze complete (2026-08-31).** The
product is Worst Gig Ever, the pivot contract is frozen, and no gameplay
behavior changed. The rhythm mechanic itself starts at M10.

The core loop is being pivoted from *break incoming objects and survive the
song* to:

> Keep a simple visual groove while breaking incoming objects and surviving
> the gig.

The player gets two independent jobs — **Groove** (tap the pulsing hi-hat on
the visual beat) and **Defense** (break bottles and mugs before they reach the
kit) — scored as two separate dimensions, with no combined total. The beat
clock is visual and deterministic; it is deliberately **not** synchronized to
the music (`docs/architecture/rhythm-pivot-architecture.md`).

### Previously: M6B asset integration (2026-08-30)

Art gate is `PASS_ART_READY`; the automated M6B gate is green.

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

**Rhythm pivot hypothesis (M9):** doing two simple things at once — keeping a
slow visual groove while defending the kit — is more fun than doing either
alone. The difficulty is meant to come from switching attention, not from fast
tapping, which is why the first Groove system is deliberately easy (90 BPM,
one pad, generous windows) and why neither side is retuned before the
combination has been played.

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

Last run 2026-08-31 (third tweak pass): type-check clean, lint clean, 145/145 tests passing. `npx expo export` succeeds for android and web. `npm run validate:art -- --require-ready` reports `PASS_ART_READY`.

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

Execute M10 (`prompts/12-m10-groove-pad-foundation.md`) — the visual beat clock
and Groove Pad foundation.

Still outstanding from before the pivot, and deliberately not blocking it:

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

M7 and M8 (`prompts/08`, `prompts/09`) are **superseded for now** by the
rhythm pivot: the owner chose to test whether Groove + Defense is fun before
adding more stage chaos. They are not cancelled, just not next.

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
- M7 Stage Chaos Interactions: **DEFERRED** — superseded in sequence by the rhythm pivot
- M8 Visual MVP Candidate: **DEFERRED** — same
- M9 Product Rename & Rhythm Pivot Freeze: **COMPLETE** (2026-08-31) — ADR 0010; no gameplay change

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

## Third tweak pass (2026-08-31)

Owner asked for bigger, more visible projectiles and faster throws — "some
really fast" — harder without being impossible.

| Change | Detail | Where |
|---|---|---|
| Targets drawn bigger | Bottle +19% (108x220 to 128x260), mug +29% (186x180 to 240x232). Visible artwork at full approach: bottle 55x247, mug 186x205 | `TARGET_DRAW_SIZE` in `game/rendering/composition.ts` |
| Bottle tap radius raised | 90 to 104 px. Forced by the enlargement, not by the art file: a bottle is tall, thin and spins hard, so its half-diagonal is nearly its half-height and it left only 5% of headroom inside a 90 px circle. The mug had 40% and did not need one | `hitRadiusAtDangerLine` in `game/config/targets.ts` |
| Throws faster again | Bottle 1450–1950 ms (was 1600–2150), mug 1800–2350 ms (was 1950–2550) | `approachMs` |
| Some throws much faster | A new `fastApproachMs` window, drawn instead of the normal one on a `FASTBALL_CHANCE` = 0.2 roll: bottle 1050–1250 ms, mug 1350–1550 ms | `fastApproachMs`, `FASTBALL_CHANCE` |

Measured over a full 60 s round (37 spawns): the bottle averages 1618 ms
against 1863 before, the mug 1880 ms against 2295, and 8 of 37 throws came
from the fast window. The fastest throw a player can face is a 1050 ms bottle.

The two windows are deliberately separated rather than one widened range. A
uniform draw spends most of its time near the middle, so simply widening it
makes every throw slightly faster and none of them alarming; a gap means a
fastball reads as a different object to react to rather than an ordinary one
arriving early. The roll comes from the round's seeded generator before the
duration is drawn, and is always rolled, so the call sequence per spawn is
fixed and a seed still replays a round exactly (AGENTS.md rule 6).

**This pass moves a hitbox**, which the previous two did not. It is a config
value in `game/config/targets.ts`, not a dimension read off the art (AGENTS.md
rule 17), and M1 specifies only a "standard hitbox" for the bottle against a
"wider" one for the mug — still true at 104 against 120. The direction is worth
naming: the bottle is now easier to *land* and harder to *reach*, and the two
have not been judged together on a device. If the next playtest finds the game
too forgiving, this is the first value to hand back.

Two tests were added: `tests/contracts.test.ts` holds the fast window separate
from the normal one, slower for the mug in both, and no faster than 1000 ms in
either; `tests/roundState.test.ts` plays a full round and asserts that both
windows are actually used and that no throw lands between them. The existing
"a target is never drawn larger than the circle that can be tapped" test is
what caught the bottle's enlargement in the first place.

## Open items carried into the next playtest

1. **The tuned build has not been played by a human.** M5A's three subjective success criteria are unverified.
2. `crowd_applause.wav` is still the full 39 s / 6.9 MB source, and volume normalization across the five files has not been done. Both are audible in the current build and are deliberately left alone until after observation.
3. Tuning values in `game/config/` and `game/levels/level01.ts` remain first guesses. M5A moved hitbox radius, arc shape, and stage cadence; approach duration and spawn cadence are untouched. If the game now plays too easily, `HIT_FORGIVENESS.minRadiusPx` is the first dial to turn, then `assistRadiusPx`.
4. The hit-radius halo and the danger line are tuning affordances, now behind `SHOW_GRAYBOX_DEBUG` in `game/rendering/SceneRenderer.tsx`. Turn the flag on if the next playtest needs to see what the player was aiming at.
5. The development client is a **debug** build and `jsEngine` is still `jsc`, not Hermes. Both add overhead; do not judge frame pacing without re-checking a release build (ADR 0006).
6. The generated manifest requests `RECORD_AUDIO`, pulled in by expo-audio's config plugin even though the game never records. Harmless for a playtest; must be removed before any store submission.
7. `com.worstbandever.app` is a provisional application identifier (ADR 0004). Confirm before any store submission.
   - **Technical identifiers still carry the old product name** (ADR 0010).
     The launcher says Worst Gig Ever; the Expo slug (`worst-band-ever`), the
     linked EAS project, the GitHub repository, and `com.worstbandever.app` do
     not. Harmless for a playtest, not acceptable for a release. A dedicated
     identity milestone must migrate the slug and the remote EAS project
     together, rename the repository, and re-create signing credentials against
     the final package name — while there is still no installed base, because
     that last step invalidates every installed build.
8. `package-lock.json` is git-ignored by the template, so dependency resolution is not reproducible across machines — this directly caused the autolinking failure documented in ADR 0006.
9. **The M6B scene has been inspected running in a browser, but not on a device.** Frame pacing, touch, and readability at phone size are all still unverified.
10. **The Pack 1 ambient loop art must be regenerated** as one drawing in three poses per set. Until then `AMBIENT_LOOP_ART_READY` is `false` and the band and crowd hold a single frame. `loopA`, `loopB`, `crowd_front_02` and `crowd_front_03` are bundled but unused; they are the frames to replace.
11. `npm run validate:art` checks PNG signature, dimensions, and alpha, so it passed art that is not a usable loop. A frame-to-frame continuity check belongs in that script and does not exist yet.

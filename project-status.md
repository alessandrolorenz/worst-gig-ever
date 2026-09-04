# Project Status

## Project

**Worst Gig Ever** — *Keep the beat. Survive the gig.*

Renamed from the working title *Worst Band Ever* at M9 (2026-08-31). The
GitHub repository, the Expo slug (`worst-band-ever`), the EAS project, and the
native application identifiers (`com.worstbandever.app`) deliberately still
carry the old name; they are technical identifiers with remote state attached
and their migration is pre-release debt tracked in ADR 0010.

## Current phase

**M18 mug drink reaction — `M18_DRINK_APPROVED`.** The owner played 1.0.7 on
the Galaxy S23 FE and approved it on 2026-09-04. See
`docs/verification/M18-gate.md`.

The approval covers the milestone as built. It does not cover the two pieces
left undone on purpose: the drink has no gulp SFX and no visible `+25` award,
and both were open when the verdict was given (open item 20). The second one
matters more now than it did when it was deferred — the drink is easy to see at
0.35, so the player watches the joke land and is told nothing about the prize.

**Four milestones are now approved and none of them are on `main`.** Merging
`feat/m16-beat-clarity` is the outstanding structural step.

A mug caught near the drummer is caught and drunk for a flat 25; a mug swatted
while it is still far away breaks with the stick for exactly what it always
paid. The bottle breaks at every distance, and that contrast is the joke. The
break path was not deleted — it is the default and the drink is the branch — so
nothing already validated changed shape.

The gate is `closenessAt(progress) >= DRINK_MIN_CLOSENESS`, and the axis is the
feature. `progress` is linear in time, but depth runs from `farDepth` 4.2 down
to 1, so at progress 0.60 a mug has crossed only 26% of the visible distance. A
time gate would have put the drummer's forearm on screen to catch an object
still near the vanishing point. A test taps a mug at progress 0.60 and asserts
it *breaks*, so moving the comparison onto time fails loudly.

The owner played 1.0.6 and returned five items, all answered in 1.0.7: the
threshold dropped from 0.5 to 0.35 because the drink was gated behind a patience
most players do not have; the arm grew 15% and moved 68 px further into frame;
the mug rule is now taught on stage 1 in words and in pictures; and the results
screen stopped stealing the last beat — see open item 17.

`npm run verify` passes **360 tests** plus both art gates.

### Approved and stacked, not merged

M15, M16, M17 and M18 all live on `feat/m16-beat-clarity`, **20 commits ahead
of `main`**, and all four now have owner device approval. Merging is the next
structural step and has not been done. Until it is, every approved milestone in
this project exists on exactly one branch.

### M15, M16 and M17 — approved on device

**M15 story, briefings, and two stages** was approved, as were **M16 beat
clarity** and **M17 difficulty curve and throw patterns** (owner device session,
2026-09-04: the click helps and stays on by default, the bar counter is
countable rather than merely visible, and the Encore reads as challenging).
Gates: `docs/verification/M15-gate.md`, `docs/verification/M16-M17-gate.md`.

The game opens on a five-panel story — the poster, the arrival in the storm, the
load-in, the show working, and the beer that hits the mixing desk — which is the
only place the game ever explains why a crowd is throwing glass at the drummer.
It auto-advances, takes a tap to skip ahead, has a Skip button, runs once per
launch, and is replayable from the title.

There are four stages: **1 "Hold the line"** (defense only), **2 "Keep the
beat"** (the beat alone for twelve seconds, then bottles), **3** the validated
`level01` show, and **4** the Encore. `level01` keeps every number it had.

### M14.1 performance correction — answered, pending confirmation

**Reported OK on 2026-09-04, not yet formally closed.** The owner played the
1.0.5 local release build and said *"a performance me pareceu ok"*. That is the
answer this item has been waiting for since 2026-09-03 — but it is recorded as
reported rather than as closed, because the verdict is only meaningful if the
build in hand was the release APK and not the development client, and that has
not been confirmed. Ask once, then close it or re-run it.

`PERFORMANCE_DEVICE_RETEST`. The owner approved the M14 APK visually but
reported slow taps on the Galaxy S23 FE. The fix preserves every art file and
gameplay setting. It reduces the pad SVG surface from 1920x1080 to 664x234,
memoizes unchanged scenery/poses, uses fixed sprite layout with transforms, and
prevents a slow tick from consuming newly created hit feedback. The controlled
browser comparison reduced JavaScript time by 36.3%; this is not a measured
Galaxy FPS improvement. See `docs/verification/M14.1-gate.md`. It is now
committed as `4571f30`, which is M15's baseline. The owner requested EAS build
`9d1dd65c-8c08-411b-80d4-aa89098df279`, confirmed queued on 2026-09-03 (Android
`preview:device`, app 1.0.3); that build predates this branch and does not
contain M15. The retest is unaffected by M15 — Stage 2 is the same round on the
same art.

### M14 integration baseline

**M14 V2 production integrated (2026-09-03).** Outcome: `V2_DEVICE_REVIEW`.
The owner approved the direction and continued past the vocalist checkpoint.
All 33 canonical assets and four derived app-identity images now use V2 art.

The three performers have distinct builds and face the audience from the
drummer's viewpoint. A front-facing guitarist draft was rejected before
integration. The crowd has an independent cast; the kit has no resting sticks.
A live-smoke correction replaced opaque-looking light patches with genuine
partial-alpha beams.

All four ambient triplets pass with 0 px anchor drift. Changes across
idle→A / A→B / B→idle are vocalist 13/15/10%, bassist 7/18/15%, guitarist
7/20/17%, crowd 13/23/19% (limit 25%). Ambient animation is enabled.
Runtime changes are limited to that flag and measured prop-content bounds.
No hitbox, timing, scoring, input, spawn, or difficulty change.

`npm run verify` passes 241 tests plus strict art/continuity checks.
A full browser round finished with 37 objects destroyed, none missed, 43/89
beats hit and integrity 3/3; no page errors. Physical-device visual approval
is still required. See `docs/verification/M14-gate.md` and
`docs/assets/M14-V2-PRODUCTION-PROVENANCE.md`.

## M13.1 validated result

The owner completed a physical test on 2026-09-01, reported that the build is
"very good", requested no tuning, chose `M13_1_VALIDATED`, and authorized M14
planning. Detailed round count, finger split, and checklist answers were not
provided and are not inferred. The recorded result is in
`docs/specs/M13.1-physical-retest-checklist.md`.

M13.1 answers the first physical playtest, which found the dual-task loop fun
and hard and the difficulty worth keeping — but found two things that were
friction rather than challenge. **No difficulty value was changed**, and that
is checked below.

**The Groove Pad moved to the lower centre and got bigger.** It was a 150 px
circle on the hi-hat at (218, 928); it is now an ellipse at (960, 970) with
half-extents 320 x 105 — 49% more tappable area, sitting on the kick and snare
faces the player is already looking past. The pulse and the corridor the
bottles arrive down are now one visual field.

The shape changed because the position did. The band available in the centre
is pinned by `VOCALIST_BLOCKING_RECT` at y 860 above and the canvas at y 1080
below, and M11 requires the singer never to interfere with the pad — so a
*circle* centred at x 960 could have had a radius of at most 110, smaller than
the 150 it already had. A wide ellipse is the only way that band holds a bigger
pad, and it is also what a drum head looks like from the drummer's seat. Drawn
with `react-native-svg`, already in the bundle, because a circular `View`
stretched 3:1 stretches its border with it.

The drawn mark and the tap area are now one promise: the ring rests at
`1 / (1 + peakScale)` of the tap ellipse, so the swell peaks exactly on the tap
boundary and the hit flash expands out to it and stops. Nothing the pad draws
reaches past what a tap resolves.

**A `3 -> 2 -> 1 -> GO` pre-roll replaces the two-beat count-in.** Start now
enters a new `COUNTDOWN` state; the round begins on the `GO` beat. It runs on
the existing visual beat clock — no timer, no wall clock, no audio position —
through `pulseClockMs`, which is negative through the pre-roll and zero at
`GO`, so the four steps are four consecutive beats of the round's own schedule
rather than an animation bolted onto the front.

Before `GO` nothing happens at all: no spawn, no target resolution, no Show
Integrity, no vocalist progression, no Groove score, miss or streak.
Backgrounding during the pre-roll cancels it back to `READY` rather than
pausing — three seconds of preparation resumed from the middle teaches nothing.

**One consequence worth naming: a 60-second round now has 89 scored beats
rather than 88.** M10 held beats 0 and 1 unscored so the player could find the
tempo; the pre-roll does that job now, and keeping the old count-in would have
stacked a fourth silent beat behind `GO`, which M13.1 forbids. So
`RHYTHM.countInBeats: 2` became `RHYTHM.unscoredLeadBeats: 1` — beat 0 is `GO`,
it pulses, it does not score, and the first scored beat is beat 1. Groove
scores are therefore **not comparable across the M13/M13.1 boundary**.

One defect was found by running the build and fixed: **the countdown numerals
were barely legible.** Drawn straight onto the scene they sat over the singer,
the crowd and the lights — the busiest, brightest part of the canvas — and read
as part of the artwork. They now ride on a dark plate that breathes and fades
with the pulse.

Difficulty freeze, read from source after the change: BPM 90, PERFECT +/-90 ms,
GOOD +/-180 ms, Groove 100/70/0, bottle approach 1450-1950 (fast 1050-1250),
mug 1800-2350 (fast 1350-1550), fastball chance 0.2, hit radii 104/120,
forgiveness 1.25x / 64 / 110 / 28, integrity 3, round 60 s, vocalist at 41 s,
bonus 500, spawn cadence 1800/1300/850. All `UNCHANGED`, and
`game/config/targets.ts`, `game/config/scoring.ts`, `game/config/stage.ts`,
`game/levels/level01.ts` and `game/systems/approach.ts` have **no diff** in this
milestone.

There is still **one** Groove Pad. A second is a future difficulty idea and is
documented, not built.

Full reasoning in `docs/decisions/0012-m13-1-pre-roll-and-centred-groove-pad.md`.

**M13 rhythm MVP candidate played on a physical phone (2026-08-31).**
Owner decision: the rhythm pivot is **promising and worth continuing** —
Groove + Defense is challenging but fun, keeping the beat while breaking
bottles is meaningfully difficult, and *that difficulty is not the problem*.
What the owner asked for instead was readability and entry: a larger
lower-centre pad, and a visible countdown before the round. A second Groove
area was named as a good future difficulty idea and explicitly deferred. That
is the brief M13.1 above implements.

The candidate itself reached `READY_FOR_RHYTHM_PLAYTEST` with the automated
gate green and native validation done on the `Pixel_9` emulator; the session
instrument was `docs/specs/M13-rhythm-playtest-checklist.md`.

The candidate is one 60-second round of Worst Gig Ever: visual Groove Pad at
90 BPM with a two-beat count-in — replaced by the M13.1 pre-roll — PERFECT/GOOD
windows, Groove score and
streak, the existing bottles, mugs, throw arcs, Defense score and combo, Show
Integrity, the vocalist event, the existing music and SFX, and a two-column
end summary. No subjective value was chosen by Claude.

One objective defect was found by running it and fixed: **the results overlay
was clipped**. A 1080p phone in landscape at 420 dpi is 923 x 411 *dp*, and
M12's richer summary overflowed that, cutting the outcome title off the top
and the Quit button off the bottom — the player could not see whether they had
won. The overlay is now sized against that budget and the buttons sit side by
side. The in-canvas HUD is also hidden while an overlay is up, where it had
been showing a dimmed second copy of both scores behind the summary.

**M12 dual score, HUD and results complete (2026-08-31).**

The game now reads as two challenges. `DEFENSE` keeps the top-left corner with
its score and combo, the timer stays centred, Show Integrity stays top-right,
and a new `GROOVE` column sits directly above the pad with the Groove score,
the beat streak, and a transient PERFECT/GOOD — above rather than beside,
because to the right of the hi-hat is where lane 430 and lane 700 targets
arrive. The end-of-round summary reports both performances in two columns,
including beats hit over beats judged and the average timing error.

**There is no combined total and no overall grade**, by design: the pivot
exists to find out whether the player is good at one job, the other, or both,
and a blended number would hide exactly that.

`game/rendering/hudLayout.ts` holds the geometry as pure data, so
`tests/hudContract.test.ts` can assert it without a renderer. It immediately
caught the Groove panel overlapping the projectile corridor by six pixels.

**M11 dual-task gameplay integration complete (2026-08-31).**

Groove and Defense now run at the same time. Every unique tap is offered to
both resolvers with no priority between them, so a tap that legitimately lands
on both the pad and a bottle scores the beat *and* breaks the bottle — once
each. One finger and two fingers both work; multitouch is never required.

The two systems cannot corrupt each other: a missed beat costs no Show
Integrity and does not reset the Defense combo, and a bottle getting through
does not touch the Groove streak. `tests/dualTask.test.ts` asserts each row of
that table through the real input pipeline, including a full round in which
every bottle is broken and every beat ignored.

One input defect was fixed on the way: the **web** path read `touches[0]`, so
two fingers in one frame collapsed to one tap and a second finger landing while
the first was held re-reported the held finger — a phantom tap. It now reads
`changedTouches`. Native was already correct and is untouched, as is the M5A
page-coordinate mapping.

Full reasoning for M10 and M11 in ADR 0011.

**M10 visual beat clock and Groove Pad foundation complete (2026-08-31).**

The hi-hat in the existing kit art is now a Groove Pad: a code-drawn ring that
swells into each beat, peaks on it, and falls away, at 90 BPM with a two-beat
count-in. (Both the hi-hat placement and the count-in were superseded by M13.1
— see the current phase above.) Tapping it inside +/-90 ms is PERFECT, inside +/-180 ms is GOOD, and
a beat can be scored once. Missed beats cost nothing but the streak.

The Groove domain (`game/state/rhythmState.ts`) imports no React, no React
Native, no audio, and not even the round state — it is handed gameplay elapsed
time and judges against it. That is what makes pause free: the round clock
already freezes in READY, PAUSED, and terminal states and already runs through
`VOCALIST_EVENT`, so the beat clock inherits the exact semantics M10 specifies
without a rule of its own.

No new art. No bottle, arc, hitbox, spawn, integrity, or scoring value moved.

**M9 product rename and rhythm-pivot freeze complete (2026-08-31).** The
product is Worst Gig Ever, the pivot contract is frozen, and no gameplay
behavior changed.

The core loop is being pivoted from *break incoming objects and survive the
song* to:

> Keep a simple visual groove while breaking incoming objects and surviving
> the gig.

The player gets two independent jobs — **Groove** (tap the pulsing Groove Pad on
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

**Historical shortfall (resolved by M14 V2):** the Pack 1 ambient frames were not a loop — `idle`,
`loopA`, and `loopB` are three separate drawings of each character, differing
by 60–87% of the drawn subject, against M6's frozen continuity rule. The scene
held one ambient frame until M14 replaced all four triplets and enabled the
validated loops. The original hold changed presentation only.

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
| `npm run verify` | type-check, lint, tests, strict art contract and continuity |

Last run 2026-09-03 after M14.1: type-check clean, lint clean,
**248/248 tests passing**, `PASS_ART_READY` (33/33), and
`PASS_AMBIENT_LOOP_READY` (4/4, including wrap). Android export, full browser
round and native visual smoke passed. See `docs/verification/M14.1-gate.md`
for the comparative render probe and remaining physical-device retest.

## Current scope

One 60-second show with:

- one deterministic 90 BPM Groove Pad;
- a beat-aligned `3 → 2 → 1 → GO` pre-roll;
- independent Groove and Defense scoring;
- two throwable target types;
- one vocalist event;
- Defense score/combo and Groove score/streak;
- three-point Show Integrity;
- one CC0 rock music source;
- core impact/break/crowd sound effects;
- V2 art with all four continuous ambient loops enabled.

## Immediate next action

**Retest tap responsiveness on the same Galaxy S23 FE when the requested
M14.1 EAS APK is ready.** The owner approved the visuals; preserve them. Confirm first
hit and repeated-hit feedback, Groove taps and full-round smoothness.
No gameplay expansion is implied by the performance correction.

The prior Pack 1 ambient-loop defect is resolved. The regular verification
command now enforces dimensions, alpha, and pixel continuity in addition to
code contracts. See `docs/handoff/CURRENT-STATE.md`.

M7 and M8 (`prompts/08`, `prompts/09`) are **superseded for now** by the
rhythm pivot: the owner chose to test whether Groove + Defense is fun before
adding more stage chaos. They are not cancelled, just not next.

## Planned next — M16, M17, M18 (owner playtest 2026-09-04)

The owner played the M15 build and asked for four things. They are specified as
three milestones, sequenced so that nothing is judged before the thing it
depends on is readable.

| # | Milestone | Owner's request | Spec |
|---|---|---|---|
| M16 | Beat Clarity and Progressive Teaching | *"a representação das batidas… não estão claras"*; teach beats progressively, clearer visual, few objects | `docs/specs/M16-beat-clarity-and-progressive-teaching.md` |
| M17 | Difficulty Curve and Throw Patterns | gradual speed and frequency; authored combos — three bottles in one lane, side to side | `docs/specs/M17-difficulty-curve-and-throw-patterns.md` |
| M18 | Mug Drink Reaction | the drummer drinks a mug caught *near* him, three frames, and it scores; a mug hit far away still breaks | `docs/specs/M18-mug-drink-reaction.md` |

Execution prompts: `prompts/18-m16-beat-clarity-and-progressive-teaching.md`
and `prompts/19-m18-mug-drink-reaction.md`. M17's is written after M16 is
judged on a device, because the shape of a difficulty ramp depends on whether
the beat became readable.

### M16 in progress — `feat/m16-beat-clarity`

Started 2026-09-04, off `feat/m15-story-and-stages`. Five of the six work items
are implemented and the gate is green at **322 tests**.

| Item | State |
|---|---|
| A converging cue on the pad | done — **two markers, not a ring**; see the deviation note in the spec |
| B bar counter | done — four marks, `beatIndex % 4`, downbeat accented |
| C audible click, with a switch | done — generated asset, toggle on title and pause |
| D one tempo in the venue | done — `STAGE_MOTION.bpm` 132 to 90 |
| E music re-acquired at 90 BPM | **partly done** — routed per stage; the teaching stage has a generated, provably 90 BPM bed; the *show's* bed is still the drifting loop |
| F new Stage 2, "Find the beat" | done — the show is Stage 3, unchanged |

Two decisions worth carrying forward:

1. **The converging ring in the spec was not built, and the spec records why.**
   The pad's bottom edge is at y 1075 on a 1080 px canvas, so any concentric
   ring over 1.03x is cut off by the screen; and a 1.45x ring needs roughly
   twice the SVG surface M14.1 just recovered, on the device whose tap
   responsiveness is still under an open retest. The cue converges *inside* the
   pad instead — two markers meeting at its centre exactly on the beat — and
   `PAD_SURFACE` is unchanged, held there by a test.
2. **The click is generated, not downloaded.** `scripts/make-beat-click.mjs`
   synthesizes it deterministically: 90 ms, 8 kB, reproducible to the committed
   SHA-256. No licence to verify and no source page to rot, which is the
   cleanest answer available to AGENTS.md rules 12-14.

3. **Open item 2 is closed, and its two halves went different ways.**
   `crowd_applause.wav` was the largest asset in the app — 39.15 s / 6.59 MB
   for a sound that plays once over a results screen — and is now 5.00 s /
   0.84 MB, cut from the natural swell rather than from a hard onset mid-clap.
   The "volume normalization" half was **measured and found not to be the
   problem**: all four one-shots already peak at 0.97-1.00, and EBU R128
   integrated loudness cannot be measured on them at all, because the gate
   needs 400 ms of content and three of them are shorter than that. No file was
   re-levelled; relative loudness is the `MIX` table's job and is now testable.
4. **The audio mix became assertable.** `audioAssets.ts` reaches for files
   through Metro's `require`, so nothing in a `node --test` run could import it
   and no rule about the mix was checkable. Levels, pool sizes and the new
   tempo-lock table moved to `game/audio/audioMix.ts`; the registry keeps only
   the filenames it was always documented to own.

Audio footprint: **5.7 MB**, down from 10.7 MB, with two new files in it.

### M17 implemented too — same branch

Built on 2026-09-04 after M16's audio landed, and **before** the M16 device
review on purpose: M17 as specified is a no-op on every existing level, so it
cannot disturb the M14.1 performance retest or M16's own. What waits for a
device is *judging* the encore, not building it.

| Item | State |
|---|---|
| A cadence ramps inside a phase | done — `SpawnPhase.spawnEveryToMs`, absent means constant |
| B approach speed ramps across the round | done — `LevelDefinition.speedCurve`, floored at 1000 ms |
| C fastball chance ramps | done — `LevelDefinition.fastballCurve` |
| D volleys — the authored figures | done — four templates, arrival-time authored, whole or nothing |
| E Stage 4 "Encore" | done — where the ramp and the figures are actually played |
| **M17.1 retune of `level01`** | **not started, still gated** on the M14.1 retest and an explicit go-ahead |

**The no-op is proven, not asserted.** `tests/difficultyCurve.test.ts` replays
`level01`, `defenseDrill` and `findTheBeat` and hashes each one's *entire*
spawn stream — time, kind, duration to six decimals, lane — against signatures
recorded from the tree immediately before the scheduler was rewritten. It also
pins each level's final RNG state, which is a fingerprint of every draw taken.
The mechanism: the volley roll happens only when a phase declares volleys, so a
phase without them consumes exactly the generator run it always did.

Measured over a full round, encore against the show:

| | Show (`level01`) | Encore |
|---|---|---|
| spawns | 37 | 55 |
| mean gap, thirds | 1700 / 1300 / 850 | 1508 / 769 / 564 |
| mean approach, thirds | 1641 / 1640 / 1898 | 1691 / 1633 / 1388 |
| fastest throw | 1115 ms | 1000 ms *(the floor)* |
| volleys | — | 8 |

The show's row is identical to the August figures recorded further down this
document, which is the point.

One deviation from the M17 spec, recorded there under rule 23: volley members
draw **their own** approach duration and have their spawn time solved backwards
from the arrival they owe, rather than sharing one duration. Sharing would have
made a mug fly at bottle speed, and the mug being the slow wide object is
something the player spends three stages learning. Arrival spacing is exact
either way — held by a test at 16, 33 and 97 ms steps.

### Local release builds work — the M14.1 retest no longer needs EAS

**Corrected 2026-09-04.** The project has carried a note since 2026-08-31 that
a local release build fails. That note is about
`npx expo run:android --variant release`, which dies on the `lintVitalAnalyze`
tasks. **`./android/gradlew -p android assembleRelease` succeeds in 45 seconds**
— it does not run those tasks — and produces a standalone APK:
`android/app/build/outputs/apk/release/app-release.apk`, 115 MB, all four ABIs,
`assets/index.android.bundle` embedded, JSC, signed with the debug keystore
through the stock `signingConfig signingConfigs.debug`.

Before blaming any native build, run
`npx expo-modules-autolinking resolve -p android` and confirm **15** modules
(ADR 0006). It reports 15 today.

**This unblocks the oldest open item in the project.** The M14.1 tap
responsiveness retest has been waiting since 2026-09-03 for a release build,
and every device session since has run the development client — a debug build
on JSC, which open item 5 says not to judge frame pacing on. No EAS build is
needed for it, so no cost and no queue.

Built and installed on the Galaxy S23 FE as **version 1.0.5, versionCode 2** —
deliberately distinct from 1.0.3 (EAS `9d1dd65c`, M14.1 without M15) and 1.0.4
(EAS `62edf299`, M15). `app.json` carries 1.0.5 now; the matching edit to
`android/app/build.gradle` is temporary, since `android/` is generated and
git-ignored.

It replaced the development client on the device, so JS changes no longer
hot-reload. Going back is one command:
`adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.

The retest is scripted in `docs/specs/M14.1-release-retest-checklist.md`.

### Device review passed — owner approved 2026-09-04

**"Ficou muito legal."** Played on the Galaxy S23 FE (SM-S711B, Android 16),
the same handset as the M13/M14 playtests, installed as the local development
client over USB with Metro reached through `adb reverse tcp:8081`. The device
had no previous build on it, so nothing was uninstalled. Zero errors in logcat.
Stage 1 cleared first attempt: 5300 defense, 29 destroyed, 1 through, combo 19.

`M16_M17_DEVICE_REVIEW` is therefore satisfied *for direction*. Read the scope
of that carefully: it was a **debug build on JSC**, which is fine for judging
reading, audio and the new stages and is explicitly not fine for judging frame
pacing or tap latency (open item 5). **The M14.1 performance retest is still
open and still needs a release build.**

**All three follow-ups answered by the owner, same session:**

1. **The click helps.** It stays on by default; the toggle stays for the player
   who disagrees.
2. **The bar counter is countable**, not merely visible — which is the whole
   distinction the browser round could not settle and the reason the unlit
   marks were raised from 0.22 to 0.5.
3. **The Encore reads as challenging**, which is what it was for.

The owner also flagged M18 ahead of time: *"pode ficar estranho quando ele for
beber a cerveja."* Measured, and the risk sits somewhere other than where it
looks — see `docs/specs/M18-mug-drink-reaction.md`. The **Encore is safe**: no
two mugs ever arrive closer than 746 ms, comfortably outside the 480 ms drink.
It is the **show** that lands two mugs 163 ms apart, twice a round. So M18 now
specifies that a second mug mid-drink **cuts to the payoff frame** rather than
restarting from the catch — restarting would show two beginnings and no
punchline in exactly the two cases per round that matter.

At one mug every 3.5 s in both rounds, the animation occupies at most about
14% of a round. A running gag, not a takeover.

**The owner then narrowed M18 further, on 2026-09-04 and before any code:** the
drink happens only when the mug is caught near the drummer — *"se estiver longe
dai quebra com a baqueta"* — first proposed at 60% of the path and settled at
**50%** once measured. Two consequences worth recording here.

First, the axis. `progress` is linear in time but the stage is a perspective,
`STAGE.farDepth` 4.2, so at `progress` 0.60 a mug has crossed only **26% of
the visible distance** — still small and near the vanishing point. Gating on
time would have put the drummer's forearm on screen to catch a distant object,
which is a worse version of the very oddness the owner flagged. The gate is
therefore `closenessAt()`, not `progress`, and `DRINK_MIN_CLOSENESS = 0.5`
resolves to `progress` 0.808: the mug at 62% of full size, y 655, leaving
346–452 ms to land the drink on a normal mug and 260–298 ms on a fastball.

Second, the shape of the milestone. The break path is no longer deleted — it
becomes the default and the drink becomes a branch, so M18 now *adds* a case
instead of removing behaviour. It also fixes the risk/reward inversion the flat
bonus was already guarding against: the mug is the easier target, and now
smashing it early is the safe play at base points while drinking is a
deliberate choice to let it come deep for `+25`. And it can only lower the 14%
above, since a mug smashed early never animates.

### Browser round run, one defect found

Driven headless at 923 x 411 against the real web export, the same rig M15
used. **Zero page errors.** Gate written up in
`docs/verification/M16-M17-gate.md`, evidence in
`docs/verification/m16-evidence/`.

It answered the one M16 item no test could: **the four-stage picker and the
click toggle fit the smallest real target viewport** — `scrollWidth` 923
against `innerWidth` 923, `scrollHeight` 411 against `innerHeight` 411, no
scrolling in either axis. The picker wraps 3 + 1 with Stage 4 centred on a
second row.

And it caught a real defect. **The bar counter was invisible.** At that
viewport each mark is about four pixels across, and the unlit ones were drawn
at 0.22 opacity over the kit art — the lit mark read, the other three did not,
so the row showed a single dot drifting sideways rather than a position within
a bar. Raised to 0.5 with a dark contour on every mark, because the row crosses
the snare's cream head, the black kick head and the red shell inside its own
width and no single fill survives that. Before and after crops are in the
evidence directory.

Nothing in the suite could have caught it: the geometry was correct, asserted,
and never the problem.

Still open before the stop checkpoint:

- **the show's bed.** Every stage that scores beats should play music whose
  loop is a whole number of 90 BPM beats. Stage 2 does; Stage 3 does not, and
  the click carries the beat there in the meantime. Picking its replacement is
  a taste decision, not an engineering one. `tests/audioContract.test.ts` names
  the show as the sole permitted exception, so a fourth stage cannot quietly
  join it. Open item 13 is narrowed to this one stage rather than closed.
- **the physical device review itself.**

**Sequence, and why.**

1. Close the two open device reviews first — M15 and the M14.1 tap
   responsiveness retest. Both APKs are already built and waiting, and every
   milestone below changes something they measure.
2. **M16 next.** It is the only one of the three the owner reported as broken
   rather than missing, and both of the others are hard to judge without it: a
   difficulty ramp cannot be evaluated by a player who cannot find the beat.
3. **M18's art prompt goes to the owner immediately** —
   `prompts/assets-v2/18-mug-drink-3frame.md`. Art is rendered outside this
   repository, so it is the long pole and it runs in parallel. M18 itself is
   independent of M16 and M17 and its execution prompt is already written
   (`prompts/19-m18-mug-drink-reaction.md`), so it can run the moment the owner
   approves the three frames as a sequence.
4. **M17 last**, and its retune of `level01` is split into M17.1, gated on the
   M14.1 retest closing. M17 itself leaves `level01` and `defenseDrill` byte
   for byte and proves the ramp on a new Stage 4.

**Four defects behind "the beats are not clear"**, each fixed separately in M16:

- the pad *grows* into the beat and growth has no readable instant — nothing
  meets anything, so M16 adds a ring that converges onto the rim;
- `STAGE_MOTION.bpm` is 132 against the Groove's 90, so the lights and the band
  beat against the pad and align only once every 10 seconds;
- no beat cue is audible, on the one screen the player must also scan for glass;
- the music loop is 21.75 s, which is 32.625 beats at 90 BPM, so it slips about
  417 ms per loop — more than twice the GOOD window. Open item 13 calls this
  harmless; it is not, because a player who listens for the beat is being given
  a clock that is wrong.

**Owner decisions, answered 2026-09-04.** All four were put to the owner and
three are settled; they are folded into the specs above.

1. **The click ships in the whole game, with a switch.** On by default in every
   stage that has a beat, toggled from the title screen and the pause overlay.
   Session-only, like `bestStageCleared`, because storage is an MVP non-goal.
2. **Re-acquire the music.** Drift is not accepted. Every stage with a beat
   gets a bed whose loop is a whole number of 90 BPM beats, routed per stage —
   sparse for the teaching stage, full for the show. This closes open item 13
   and is the moment to close open item 2 as well (`crowd_applause.wav` is
   still the untrimmed 6.9 MB source and the mix is unnormalized).
3. **Drinking a mug scores.** M18 adds a flat `SCORING.drinkBonus` of 25 on
   top of `75 x multiplier`, unmultiplied and **only when the mug is actually
   drunk** — the mug is the *easier* target (120 px radius against 104, slower
   at both ends), so a multiplied premium would make the easy object the best
   scoring path at high combo. At x1 a drunk mug equals a bottle; at x4 it is
   still worth less. A mug smashed early pays `75 x multiplier` and no bonus,
   which is what makes waiting a decision. Integrity healing stays deferred:
   the owner asked for points, not for health.
   **Defense scores are therefore not comparable across the M18 boundary**, in
   the same way Groove scores are not across M13/M13.1 (open item 16).
4. **`level01` retune: leaning yes, not decided** — *"acho que sim, nao estou
   certo"*. Recorded as a leaning. M17.1 asks once more with the measured
   before/after table in hand, because retuning `level01` is what makes every
   earlier device observation incomparable.

## Gates

- M0–M2 Fast Track: **COMPLETE** (2026-08-30)
- M3 Asset Contract: **RECONCILED WITH M6** — its original contract-only art
  checkpoint was subsequently satisfied by M6A production and the green Art Gate
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
- M10 Visual Beat Clock & Groove Pad Foundation: **GATE GREEN** (2026-08-31) — 34 new rhythm tests; no defense value changed
- M11 Dual-Task Gameplay Integration: **GATE GREEN** (2026-08-31) — ADR 0011; 17 integration tests; no difficulty value changed
- M12 Dual Score, HUD & Results: **GATE GREEN** (2026-08-31) — two metrics, no combined total; 15 presentation contract tests
- M13 Rhythm MVP Candidate: **PLAYED** (2026-08-31) — `READY_FOR_RHYTHM_PLAYTEST`; confirmed working on the Galaxy S23 FE; owner's verdict was promising, keep the difficulty, fix readability and entry
- M13.1 Groove Readability & Entry Tuning: **VALIDATED BY OWNER** (2026-09-01) — `M13_1_VALIDATED`; no tuning requested; detailed checklist breakdown not supplied
- M14 Visual Refresh V2: **PRODUCTION INTEGRATED** (2026-09-03) — `V2_DEVICE_REVIEW`; 33/33 assets, ambient loops enabled, 241 tests green; physical-device owner review remains

## M13.1 native smoke (2026-09-01)

Run on the `Pixel_9` emulator against the local dev server — no EAS, no
release build. The app was already installed and M13.1 changes nothing native
(`react-native-svg` was already linked for the quit icon), so this was a JS
reload rather than a rebuild.

Objectively confirmed on the device:

| Check | Result |
|---|---|
| Launches landscape, title screen reads "Tap the pulsing pad on the beat." | pass |
| Start opens the pre-roll rather than the round | pass |
| `3`, `2`, `1`, `GO!` each observed on screen, in order | pass |
| Pad renders as a wide ellipse on the kick/snare faces and pulses through the count | pass |
| No bottle or mug appears before `GO` | pass |
| Targets spawn after `GO` — an untouched round ruined the show with 3 misses | pass |
| Groove clock runs after `GO` — 10 judged beats in ~7 s, none of them beat 0 | pass |
| Rapid alternating taps: no crash, no ANR, no exception in logcat | pass |
| Backgrounding during the pre-roll returns to the title screen | pass |
| Restart runs a fresh countdown from `3` | pass |

**Not confirmed, and not claimed: pad and target *tap resolution*.** This is
the pre-existing emulator limitation recorded as open item 12 — no adb input
method reaches the game engine's bubbling touch handler, though overlay
`Pressable`s receive them, which is why the buttons above could be driven at
all. Dual-task touch behaviour rests on `tests/dualTask.test.ts`, and the pad's
new geometry on the cases added to `tests/rhythm.test.ts`. Whether the bigger
pad is *comfortable* is an owner question by definition.

One defect found here and fixed: the countdown numerals were drawn straight
onto the scene and were barely legible over the singer and the crowd. They now
sit on a dark plate that scales and fades with the pulse.

## M13 native validation (2026-08-31)

Build facts, exactly as run:

| | |
|---|---|
| Workflow | `npx expo run:android` (local; **no EAS**) |
| Emulator | `Pixel_9` AVD, Android 16 (API 36), arm64 |
| Screen | 2424 x 1080 physical, 420 dpi — **923 x 411 dp** in landscape |
| Gradle | `BUILD SUCCESSFUL`, `app-debug.apk`, 354 tasks |
| Autolinking | `expo-modules-autolinking resolve -p android` reports **15** modules (ADR 0006 threshold) |
| Package | `com.worstbandever.app` (retained; ADR 0010) |
| Launcher label | **Worst Gig Ever** — confirmed in the dev-client header |

| Check | Result |
|---|---|
| Builds, installs, launches | Yes |
| Landscape | Yes — display reported `cur=2424x1080`, rotation 1 |
| No fatal exception | Yes — zero `FATAL EXCEPTION` in logcat across the whole session |
| Audio native module loads | Yes — `expo.modules.audio.AudioModule` active; `AudioTrack`/`AudioFlinger` traffic once a round starts |
| Round starts and runs | Yes — timer counts down, bottles fly, Show Integrity decrements |
| READY copy | Yes — WORST GIG EVER, tagline, both instructions, nothing clipped |
| Groove Pad renders on the hi-hat | Yes — the ring is legible over the art and through the stage-light pulse |
| Dual HUD | Yes — `DEFENSE` top-left, timer centre, `SHOW INTEGRITY` top-right, `GROOVE` above the pad |
| Dual end summary | Yes — both columns, unclipped, after the fix above |
| Pause / resume | Yes — overlay shows both columns; resume continues the round |
| Background auto-pause | Yes — HOME then return comes back PAUSED |
| Restart | Yes — Play again begins a fresh round with both metrics reset |

### Physical device validation (2026-08-31) — the touch gap is closed

Ran on the owner's **Galaxy S23 FE (`SM-S711B`)**, Android 16, arm64-v8a,
1080x2340 @ 450 dpi — **832 x 384 dp in landscape**, a *shorter* viewport than
the emulator's 411 dp. Installed over USB with `npx expo run:android` plus
`adb install` (local debug dev client; **no EAS**).

A full round was played by a human. Result:

| Groove | | Defense | |
|---|---|---|---|
| Groove score | 1220 | Defense score | 1400 |
| Beats hit | 14 / 39 | Objects destroyed | 13 |
| Perfect / Good | 8 / 6 | Objects missed | 3 |
| Beats missed | 25 | Best hit combo | 5 |
| Best beat streak | 6 | Integrity left | 0 of 3 |
| Mean timing error | 88 ms | Outcome | SHOW RUINED |

What this establishes, which no emulator run could:

- **Groove Pad taps work on real hardware** — 14 beats scored, 8 of them PERFECT.
- **Target taps work concurrently** — 13 objects destroyed, best combo 5, in the
  same round as the beats.
- **The dual-task loop runs on device**, both dimensions scoring independently.
- **The results overlay is not clipped at 384 dp** — title, both columns, the
  mean-timing detail line, and both buttons are all on screen. The M13 overlay
  fix holds on a shorter viewport than the one it was measured against.
- Landscape correct (`cur=2340x1080`), zero fatal exceptions.

Two build facts worth keeping:

- The old EAS-signed `preview:device` APK (v1.0.2) could not be upgraded in
  place — `INSTALL_FAILED_UPDATE_INCOMPATIBLE`, because the local debug build
  is signed with the debug key. It was uninstalled first, with the owner's
  agreement. Any future local install over an EAS build hits the same wall.
- **`android/` was stale and still carried the old launcher label.** `app.json`
  said Worst Gig Ever but `android/app/src/main/res/values/strings.xml` said
  `Worst Band Ever`, so the home-screen name was still the old one;
  `versionName` was also pinned at 1.0.1 against app.json's 1.0.3. `npx expo
  prebuild --platform android` regenerated both. The directory is gitignored
  and generated on demand (ADR 0006), so there is nothing to commit — but
  **anyone with an existing `android/` must re-run prebuild after an app.json
  identity change or they will keep shipping the old name.**

**Not validated on the emulator: play-surface touch.** `adb input tap`,
`input motionevent`, and `input swipe` all reach React Native `Pressable`
overlays (Start, Pause, Resume, Play again all work) but produce **nothing** in
the game's touch handler — taps aimed directly at a bottle's arrival point
destroyed zero objects, so this is not specific to the Groove Pad. The engine
listens with a bubbling `onTouchStart` on a plain view rather than through the
responder system, and adb-injected events do not reach it. This is a harness
limitation, not a product defect, and it is the same gap the M6B emulator pass
hit: that run was also "one tap to start and no further input".

What covers it instead: `tests/dualTask.test.ts` drives the real
`roundSystem` with touches shaped exactly as the engine delivers them
(`pageX`/`pageY` minus the surface offset) and asserts pad-only, target-only,
overlapping, one-finger, and two-finger cases. **Touch on a real phone is the
first thing the playtest must confirm**, and the checklist asks for it.

Also observed: under `adb` input load the emulator's frame rate drops far
enough that `MAX_TICK_DELTA_MS` clamping makes the round clock run at roughly
a quarter of wall time (19 s of tapping advanced the round 5 s). That is an
emulator artifact of a debug build with `jsEngine: jsc`, not a gameplay bug —
and it is exactly why ADR 0006 says not to judge pacing without a real device.

## Historical M0–M6B device validation (2026-08-30)

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

The current M13.1 candidate was last smoke-tested on the `Pixel_9` AVD on
2026-09-01: the dev client launched through Metro, ran the full countdown, and
started the Groove + Defense round without a pre-`GO` spawn. See the M13.1
native-smoke section above for the exact boundary of what the emulator proved.

## Physical playtest instrument

The active instrument is
`docs/specs/M13.1-physical-retest-checklist.md`. The M5 checklist and decision
documents are historical records and must not be used for the current build.

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
| Flicker | V2 triplets pass pixel continuity, including wrap; ambient loops enabled | `game/rendering/SceneRenderer.tsx` |

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

1. **M14.1 awaits physical-device performance retest.** The owner approved M14
   visuals after installing its APK. Rendering and feedback corrections are
   uncommitted; the owner requested a new EAS APK, now submitted (see gate).
2. `crowd_applause.wav` is still the full 39 s / 6.9 MB source, and volume normalization across the five files has not been done. Both are audible in the current build and are deliberately left alone until after observation.
3. The current tuning is playtest-informed but remains provisional. The M13
   physical playtest found the dual-task difficulty desirable, so every
   difficulty value is frozen through the M13.1 re-test. Tune only after the
   owner records one of the explicit M13.1 decision outcomes.
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
9. **M14 visuals are approved; M14.1 tap responsiveness remains to be tested.**
10. **Ambient loop defect resolved 2026-09-03:** all four V2 triplets pass;
    `AMBIENT_LOOP_ART_READY = true`. No frame-count or timing changes.
11. `npm run validate:art` checks PNG signature, dimensions, and alpha, so it passed art that is not a usable loop. **Addressed 2026-09-01:** `npm run measure:art` (`scripts/measure-art-bounds.mjs`) decodes pixels and reports per-triplet feet-anchor drift and frame-to-frame change, plus measured target bounds against the tap-circle rule. Historical Pack 1 scored 10–51 px drift and 43–88% change. V2 passes the unchanged 8 px/25% gates, including wrap; the strict check is now in `npm run verify`.
12. **Play-surface touch cannot be exercised on the emulator** — no adb input
    method reaches the game engine's bubbling touch handler, though Pressables
    receive them. **Closed on hardware:** a round on the Galaxy S23 FE scored
    14 beats and destroyed 13 objects, so both resolvers work on a real
    device. The emulator limitation remains for future automated runs.
13. **The Groove Pad is not synchronized to the music, on purpose.** The pulse
    runs at 90 BPM off gameplay time; the track loops on its own clock. They
    drift. The playtest checklist says so up front so the mismatch is not
    reported as a bug — syncing them is a later milestone and only worth
    building if the visual mechanic proves fun.
14. The Groove `GROOVE` panel sits over the left crash cymbal, which is gold
    on gold. It carries a text shadow and read clearly on the emulator, but a
    phone at real size is the judge. M13.1 did **not** move it: the pad went to
    the lower centre, and the space above a centred pad is the target corridor,
    where M13.1 forbids Groove feedback. The readout therefore stays on the left
    rail and is no longer stacked above the pad.
15. **The bottom of the canvas runs under the system navigation bar.** On the
    `Pixel_9` emulator the gesture pill covers roughly canvas y 1020-1080, so
    the lowest ~5% of the Groove Pad is behind it. This is not new — the M10
    pad reached y 1078 and the owner played a full round on hardware — and the
    pad's centre band sits well clear. Worth watching in the re-test: if taps
    near the bottom edge feel swallowed, this is why.
17. **The results screen used to steal the last beat, and the shape of that
    bug is worth remembering.** A stage ends abruptly and the results button row
    sits in the lower centre — over the groove pad the player is still tapping —
    so the next tap of a beat that no longer exists landed on "Next stage". Fixed
    at M18.1 with a 900 ms arming delay (`RESULTS_ARM_MS`, `settledMs`). The
    general lesson outlives the fix: **any overlay that appears without warning
    inherits whatever the finger was already doing**, and the lower centre is
    where the finger lives in this game.
18. **Defense scores are not comparable across the M18 boundary**, as Groove
    scores are not across M13/M13.1. A round with mugs scores higher after M18
    for the same play, and the gap widens with how many mugs are drunk.
19. **The 8 px art anchor gate is blind to the drink frames.**
    `measure-art-bounds.mjs` anchors on the lowest opaque row, and the forearm
    runs to the frame edge in both frames, so the drift reads 0 however far the
    arm swims sideways. The shipped pair was measured by hand (worst case 6 px).
    A real sequence check is open work — until it exists, a green
    `measure:art` says nothing about this family.
20. **The drink has no sound and no visible award.** The gulp SFX needs a
    licence-verified CC0 file (rules 13 and 14) and the `+25 CHEERS` flourish
    needs a floating-award treatment that does not exist yet. The bonus reads
    only in the Defense score.

16. **Groove scores are not comparable across the M13/M13.1 boundary.** A
    60-second round now has 89 scored beats rather than 88, because the two-beat
    count-in became the single unscored `GO` beat (ADR 0012). Do not read the
    M13 playtest's 14/39 against an M13.1 figure.

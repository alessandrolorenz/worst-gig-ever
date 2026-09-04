# M15 — Opening story, stage briefings, and two stages

- Status: implemented, awaiting physical-device review.
- Branch: `feat/m15-story-and-stages`.
- Baseline: `4571f30` (M14.1 render performance).
- Requested by the owner on 2026-09-03, in three parts, alongside five new
  illustrations delivered in `design-reference/intro-*/`.

## The request

1. Use the new images as a short story shown before the game starts — the
   poster, then the band arriving, setting up, playing, then the sound desk,
   and then the game is ready to begin.
2. A screen explaining how to play: you have to keep hitting the drum, because
   you are the drummer, and defend yourself from thrown bottles.
3. Two stages to begin with: one that is defense only, then one that is hitting
   the drum *and* defending.

All three are delivered. Nothing else was added.

## Decisions taken with the owner

Asked and answered before implementation, on 2026-09-03:

| Question | Chosen |
| --- | --- |
| How the story behaves | Auto-play, tap to advance, Skip button, once per launch, replayable from the title |
| Stage structure | Two separate rounds; clearing Stage 1 leads into Stage 2 |
| Where how-to-play lives | A briefing card per stage, immediately before its round |
| Git base | M14.1 committed first, so this work is a separate diff |

## What this milestone does not change

**No gameplay value moved.** BPM, timing windows, target speeds, spawn cadence,
fastball chance, hit forgiveness, scores, integrity, vocalist timing, and round
duration for the validated round are all untouched. `game/config/rhythm.ts`,
`game/config/scoring.ts`, `game/config/stage.ts`, `game/config/targets.ts`, and
`game/systems/approach.ts` have no diff in this milestone.

`game/levels/level01.ts` keeps every number it had. It is now Stage 2, and it is
the round the owner validated at M13.1 and approved visually at M14 — which is
what keeps the pending M14.1 device retest a retest of the same thing.
`tests/stageFlow.test.ts` asserts the whole schedule field by field, so a future
edit to it fails there rather than in a playtest.

The only change to that file is that the shared `LevelDefinition` and
`SpawnPhase` types moved out of it into `game/levels/levelDefinition.ts`, where
they stopped belonging to one level once there were two.

## 1. The opening story

Five stills, in the order the show falls apart, each with one line of caption:

| Panel | Still | Caption |
| --- | --- | --- |
| `poster` | the gig poster in the alley | "One night only. Nobody asked for it." |
| `arrival` | all four arriving in the storm | "You went anyway." |
| `setup` | the load-in | "Load in. Bolt it down. Hope." |
| `performance` | the show working | "For about four songs, it worked." |
| `soundDesk` | beer across the mixing desk | "Then a beer found the mixing desk." |

The last panel is the one that matters mechanically. It is the only place the
game ever answers "why is a crowd throwing glassware at me", and it holds
longer than the rest for that reason.

**Behaviour.** Each panel holds 3.6 s (4.4 s for the last) and then advances by
itself. A tap advances immediately; a Skip button in the corner ends the story
from anywhere. It runs once per launch and is replayable from the title. The
last panel leads to the title screen, not into a round.

**Where the logic lives.** `game/state/storyState.ts` is a pure domain — no
React, no React Native, no image filenames — advanced by `game/systems/
flowSystem.ts` from the engine's elapsed-time delta, the same clock the round
uses (AGENTS.md rule 5). There is no `setTimeout` anywhere in the story: a
wall-clock timer would be the only clock in the app that kept running while the
app was backgrounded.

The step is clamped to 100 ms, matching `MAX_TICK_DELTA_MS`, so returning from
a long background cannot play the whole story to an empty room.

**The crossfade is the exception, deliberately.** Panel opacity is a native
`Animated.timing` keyed on the panel index, not a value derived from the story
clock. Deriving it would re-render the story screen sixty times a second to
fade a static image, which is precisely the per-frame JavaScript cost M14.1 was
spent removing.

**Fit is `contain`.** The stills are 16:9 and a modern phone in landscape is
nearer 19.5:9, so `cover` would crop about a fifth of the height from
compositions that use it. This matches what `fitCanvas` already does to the
play surface.

### Art conditioning

The five sources are 1672x941 PNG, 11.5 MB in total. Shipped as 1600x900 JPEG
at quality 85: 2.3 MB in total, a 9.2 MB saving on the bundle.

JPEG is the one deviation from the project's PNG art pipeline and is confined
to `assets/art/story/`. These are opaque, full-bleed narrative stills with no
alpha to preserve. Gameplay art is unaffected and `validate:art` still enforces
the PNG contract across all 33 required Pack 1 files.

The stills live in a new `story` section of the asset manifest rather than in
`assets`, so the Pack 1 contract — asserted at exactly 35 production entries —
is untouched. Provenance: `docs/assets/M15-STORY-ART-PROVENANCE.md`.

## 2. Stage briefings

Each stage opens with a card naming what it asks for, immediately before its
round, and reachable again from the title via "How to play".

Per stage rather than one rulebook at the title, because the two stages ask for
different things and the second only needs to name what is new — the player has
just spent a whole stage doing the rest.

Stage 1:

- The crowd is throwing what it was drinking.
- Tap a bottle or a mug to smash it before it reaches your kit.
- Three things get through and the show is over.
- No beat to keep yet. Just defend.

Stage 2:

- You are the drummer, so now you have to actually drum.
- Tap the pulsing pad on the drum head, on every beat.
- Keep smashing the bottles at the same time.
- A missed beat costs you the streak. A missed bottle costs the show.

The copy is data on the stage, not markup in a component, so
`tests/hudContract.test.ts` asserts the contract rather than the wording: every
stage must explain breaking what the crowd throws and what a miss costs, and a
stage must name the pad if and only if it switches the Groove on.

The briefing list scrolls rather than growing, so a longer briefing can never
push a button off a 411 dp screen — the failure M13 found in the results
overlay.

## 3. Two stages

A **level** is a spawn schedule; a **stage** is a level plus what the game asks
for around it. They are separate types in `game/levels/stages.ts` because a
`LevelDefinition` is read by the round domain on every tick and must not depend
on presentation, while a `StageDefinition` is read by the flow and the overlays
and is never consulted while resolving a tap.

### Stage 1 — "Hold the line", defense only

`game/levels/defenseDrill.ts`. 40 s, three Show Integrity, no vocalist
interruption, seed 2.

| Phase | Cadence | Kinds |
| --- | --- | --- |
| 0–12 s | 1800 ms | bottles |
| 12–28 s | 1300 ms | bottles, mugs |
| 28–40 s | 950 ms | bottles, mugs |

The first two phases are *identical* to the show's first two. The drill is not
an easier game; it is the show's opening minute with one hand freed, so what
the player learns is literally what Stage 2 then opens with. Only the last
phase differs: the show finishes at 850 ms, so the drill ends one step short
and leaves Stage 2 somewhere to go.

40 s rather than 60 s so that failing the first attempt costs forty seconds
rather than a full minute. Three integrity because the drill has to teach the
same loss the show uses. Seed 2 because the two stages are played back to back
and a shared seed would open the show with the throws just rehearsed. No
vocalist because it is the show's only event and spending it in the tutorial
would leave Stage 2 with none.

### Stage 2 — "Keep the beat", groove + defense

`game/levels/level01.ts`, unchanged. The validated round.

### The Groove switch is a rule, not a coat of paint

`stage.groove` reaches the rhythm domain through `BeatContext.grooveEnabled`,
built once per frame by `roundSystem`. When false:

- `tickRhythm` schedules and finalizes nothing, so no beat is ever missed;
- `resolvePadTap` scores nothing;
- `SceneRenderer` does not draw the pad;
- `Hud` does not draw the Groove readout;
- the results screen reports one performance instead of two;
- the failure line does not mention a beat.

All six, not one. A hidden pad over a live clock would still finalize a missed
beat every 667 ms, and the player would reach the results screen having lost a
streak in a job they were never given. `tests/stageFlow.test.ts` runs a full
defense-only round and asserts the Groove state is byte-identical to a fresh
one, with a control case proving the same taps do score on Stage 2.

The `3 → 2 → 1 → GO` pre-roll runs on **both** stages. It is the entry ritual
for a round, not for the Groove, and Stage 1 needs the same three beats of
warning before bottles start arriving.

### Progression, and why nothing is locked

Clearing Stage 1 leads straight into Stage 2's briefing without returning to
the title. That is the intended path and the results screen offers it as the
primary button.

**No stage is locked.** A progression the player cannot skip would have to
survive a relaunch to be fair, and it cannot: persistence needs storage, and
storage is an MVP non-goal. Locking Stage 2 would therefore mean replaying the
drill on every cold start — including for the owner, who still has an M14.1
device retest to run against exactly that round. `bestStageCleared` is
session-only and drives one thing: a tick mark on the title's stage button.

## Architecture

A new pure domain, `game/state/appFlow.ts`, owns which screen exists. Until now
`GameState` was the whole screen stack, and the title was "the overlay you get
in READY". That stopped being true once there was a story before the title, a
briefing between the title and the round, and two stages to choose between —
none of which are states of a *round*.

The two domains are not peers. The flow may read the round's outcome; the round
never reads the flow, and `roundState.ts` has no import from `appFlow.ts`. That
one-way rule is what keeps the round exactly as testable as it was.

```
STORY ──tap/skip/timeout──▶ TITLE ──pick a stage──▶ BRIEFING ──Start──▶ ROUND
             ▲                 ▲                        │                │
             └── "Story" ──────┘◀────── "Back" ─────────┘                │
                               ◀────────── "Quit to title" ──────────────┤
                                                                         │
                       BRIEFING (next stage) ◀── "Next stage" ───────────┘
```

New files:

- `game/state/appFlow.ts` — screens, stage selection, progression.
- `game/state/storyState.ts` — the story's panels and clock.
- `game/systems/flowSystem.ts` — ticks the story from the engine loop.
- `game/levels/levelDefinition.ts` — the shared level contract.
- `game/levels/defenseDrill.ts` — Stage 1's schedule.
- `game/levels/stages.ts` — the two stages and their briefings.
- `game/rendering/StoryIntro.tsx` — the story screen.
- `game/rendering/storyAssets.ts` — the only module naming a story image.

One behaviour change outside the new screens: backgrounding the app during the
pre-roll now returns to the **briefing** rather than the title. M13.1's reason
for cancelling is unchanged — three seconds of preparation resumed from the
middle teaches nothing — but the briefing is now where Start lives.

## Verification

- `npm run verify` — type-check, lint, 296 tests, and both art gates.
- 45 new tests across `tests/storyIntro.test.ts` (18), `tests/stageFlow.test.ts`
  (23), and `tests/flowSystem.test.ts` (6). Two existing contracts in
  `tests/hudContract.test.ts` were rewritten rather than deleted: the title no
  longer carries the how-to-play copy, so the assertion moved to the briefings
  and became stronger — each stage must teach the job it actually asks for.
- `npm run validate:art -- --require-ready` — `PASS_ART_READY`, 33/33.
- `npm run measure:art -- --require-continuity` — `PASS_AMBIENT_LOOP_READY`.

## Open items

1. Physical-device review of the story screen, the briefings, and Stage 1.
2. The M14.1 performance retest is still outstanding and is unaffected: Stage 2
   is the same round on the same art.
3. Stage progression is not persisted. If the owner wants a real unlock, it
   needs storage and a decision to lift an MVP non-goal.

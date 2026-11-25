# M29–M30 — Crowd Destruction Round and Difficulty Stages

Status: **implemented; automated, browser and Android-emulator checks pass; physical playtest pending**  
Created: 2026-10-07  
Baseline: `m23/admob-compat-15.8.3` at `922c98b`, on top of the uncommitted M26–M28 work.

## Product decision

Crowd Mode stops being "throw bottles, collect points" and becomes a bounded
arcade round: **destroy the listed things before the beer runs out, and do
not hit the waiter.** No final art is produced here; every new visual is a
labelled placeholder with a named replacement slot.

## Architecture

```text
crowdConfig    targets, rects, points, fall offsets, reactions, waiter geometry
crowdStages    the three stages — pure data
      ↓
crowdState     gesture, flight, hit resolution, props, performers,
               objectives, bottles, outcome — pure, elapsed-time
      ↓
crowdSystem    native/web input adapter and engine clock (unchanged)
      ↓
CrowdScene     layer placement and code-driven motion
CrowdPlaceholders   every temporary drawing, one component per art slot
crowdArtSlots  the manifest of final art, none of it delivered
```

`AppFlowState` gains one screen, `CROWD_SELECT`. Which stage is being played
is `CrowdState.stageId`, not a flow field, so the flow and the round cannot
disagree. Band Mode's state, systems and renderer are untouched.

## M29 — Destruction and objectives

### Targets

| Target | Type | Points | Held by | On hit |
|---|---|---:|---|---|
| Bassist, guitarist | performer | 300 | — | recoil 600 ms |
| Vocalist | performer | 500 | — | recoil 600 ms |
| Amplifier | stage prop | 400 | — | intact → damaged |
| Crash cymbal | stage prop | 550 | — | intact → wobbling → falling → down |
| Ride cymbal | stage prop | 650 | — | intact → wobbling → falling → down |
| Microphone | instrument | 500 | vocalist | intact → falling → down; singer disarmed |
| Guitar | instrument | 450 | guitarist | intact → falling → down; guitarist disarmed |
| Bass | instrument | 450 | bassist | intact → falling → down; bassist disarmed |

Resolution order is waiter, then props and instruments, then performers. An
instrument sits inside its performer's rect, so the natural sequence is the
one the brief asks for: knock the guitar loose, then the same throw reaches
the guitarist.

### Performer state

A performer is `armed` (holding their instrument), has a `hits` count, and may
be `reacting`. `crowdPerformerPose` derives what a renderer needs: a base of
`performing` or `disarmed`, plus hit progress. There is no general state
machine; three booleans and a timer are the whole model.

A performer can be hit before or after being disarmed. Disarming comes only
from hitting the instrument.

### Scoring — no farming

All of it is decided in `hitPoints` in `crowdState.ts`:

- every prop and instrument is one-shot: once hit it stops being a target;
- a performer's first hit pays in full, every later one pays 50;
- a miss costs 50, the waiter costs 300;
- ruining the gig banks a per-stage bonus for each unused bottle.

### Objectives

One objective per target: `{ objectiveId, targetId, requiredCount,
currentCount, completed }`. They are advanced by `recordObjectiveHit`, called
from the same place a hit is applied — never from the HUD. The checklist in
the bottom-left corner only reads them.

### Round

- Each valid throw spends one bottle, on release. An invalid gesture spends
  nothing.
- When the result hold of a throw ends: all objectives complete → `finished`
  / `success`; otherwise no bottles left → `finished` / `failure`; otherwise
  reload. The winning hit is therefore seen before the result screen.
- `finished` accepts no gestures. Retry is `resetCrowd`, which keeps the stage.
- The result screen reports outcome, score, objectives and throws used, with
  Retry and Stages.

## M30 — Stages

| | Warm-up | The crowd gets worse | Destroy the gig |
|---|---:|---:|---:|
| Objectives | 4 | 7 | 9 (everything) |
| Bottles | 10 | 11 | 12 |
| Spare bottles | 6 | 4 | 3 |
| Prop hit-rect scale | 1.2 | 1.0 | 0.85 |
| Aim guide shows | 5 dots to 55% | 3 dots to 45% | 2 dots to 40% |
| Waiter delay / crossing / cycle (s) | 4.0 / 8.0 / 13.0 | 2.2 / 6.2 / 9.0 | 1.2 / 4.6 / 6.2 |
| Bonus per spare bottle | 50 | 100 | 200 |

A stage is one `CrowdStageConfig` object. Nothing in the domain branches on a
stage id. Performer rects are never scaled. All three stages are open from the
start; there is no unlock or persistence. The waiter remains the only blocker.

All values are first guesses for a device playtest, not tuned results.

**Aim guide retuned 2026-11-25** (was 5 dots to 50% / 3 to 24% / 2 to 12%).
Owner request after playing on the phone: the guide was hidden behind the
finger. The dots start at the bottle, but with `CROWD_THROW.projection` at
2.05 the finger already sits about halfway along the straight throw line. The
arc lifts the dots, so a dot only clears the finger past roughly 0.4 of the
flight. Assuming about 120 canvas px of fingertip above the touch point (an
estimate, not a measurement), the old Stage 2 guide ended under the fingertip,
the old Stage 3 guide was always under the hand, and Warm-up showed about one
dot. The new values let about 1–2 Warm-up dots, and only the tip of the last
Stage 2 and Stage 3 dot, show past the finger. Dot counts, the ladder (fewer
and shorter at each stage) and "never the landing point" are unchanged. A
physical retest with a finger decides whether these values hold.
Local release **1.4.2 (11)**, upload key (`56b20661…ea51e`), installed
2026-11-25 on the SM-S731B. Its 1.4.1 had been installed from Chrome on
2026-11-16 with a different signer (`03e74b22…0535a`), so it was uninstalled
first and that phone's save was lost, with the owner's approval. The app
launched with no runtime error.

## Deviations from the M28 record

1. **The stage still was not filling the canvas.** A bundled image keeps its
   intrinsic 1600x900 unless given a size, so it drew in the top-left with a
   black band right and below, and the amplifier target sat in that band. The
   plate now has an explicit 1920x1080 box, and every target rect was
   re-authored against the artwork it is actually over.
2. **Targets are the things in the picture.** M28 drew its own microphone
   stand, cymbals and amplifier beside the painted ones. They are now the
   painted singer's handheld microphone, the kit's two large cymbals and the
   right-hand amplifier. The band has no microphone stand.
3. **Cymbals no longer recover.** M28's cymbals wobbled and came back, which
   made them farmable. They now wobble, fall and stay down.
4. **`openCrowdMode` opens the stage picker**, not a round.
5. **Impact bounds widened** (60–1890 x, 120–720 y) so the amplifier is
   reachable.

## Tests

`tests/crowdMode.test.ts` (33) covers the M26–M28 contracts, objectives,
one-time scoring, all three disarm transitions, prop states, bottle spend,
win, win on the last bottle, loss, retry, whole-round coarse/fine time-step
equivalence, each stage's objective set and budget, monotonic difficulty,
stage selection, scale and per-stage waiter. `tests/crowdArtSlots.test.ts`
(6) ties the art manifest to the placeholder file, the disk and the written
contract. None of them import React.

## Not done, on purpose

Final art; audio for Crowd Mode; persistence, unlocks or records; additional
blockers; any monetization change.

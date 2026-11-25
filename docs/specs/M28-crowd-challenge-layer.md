# M28 — Crowd Challenge Layer

> **Read with M29–M30.** While finishing M28 the stage still was found to be
> drawing at 1600x900 rather than filling the canvas, so the target positions,
> the code-drawn props and the recovering cymbals described below were
> replaced. The architecture, waiter rules, hit ordering and aim-guide
> principle stand. See "Deviations from the M28 record" in the M29–M30 spec.

Status: **implemented; geometry and cymbal behaviour superseded by `M29-M30-crowd-destruction-and-stages.md`; physical playtest pending**  
Created: 2026-10-07  
Baseline branch: `m23/admob-compat-15.8.3`  
Baseline HEAD: `922c98b2efffed3d10e1a35b6c31786c54059bae`

## Baseline

M28 began from the uncommitted, verified M26–M27 implementation. The working
tree already contained the dual-mode and Crowd vertical-slice files described
in `M26-M27-crowd-mode-vertical-slice.md`; those changes were preserved as the
source-of-truth baseline rather than reset. `npm run verify` passed before M28
with 678 tests and every configured repository gate green.

## Product decision

M28 makes a throw a choice about **where** and **when**:

- three existing musicians remain broad, repeatable targets;
- four smaller stage props reward precision;
- a waiter crosses the target plane on a readable fixed cycle;
- the waiter resolves before anything visually behind them;
- the aim guide shows only the first 24% of the path and never the endpoint.

No objective, mission, combo or progression system is introduced.

## Architecture

The M27 boundaries remain intact:

```text
crowdConfig   authored target, scoring, reaction and waiter tuning
      ↓
crowdState    pure gesture, trajectory, clock, hit ordering and reactions
      ↓
crowdSystem   native/web event adapter and elapsed-time provider
      ↓
CrowdScene    visual projection of domain state only
```

`CrowdTargetDefinition` now represents performers and stage props with one
geometry/resolution path. Each target carries a type, score, hit behavior and
repeatability flag. Stage prop runtime state is part of `CrowdState`, making a
future objective layer able to inspect `active` and `status` without adding a
second collision model.

The scene has one absolute `elapsedMs` clock. Flight, result hold, cymbal
recovery and waiter motion consume elapsed time rather than frames. A tick
crossing flight/result boundaries consumes its full delta, so coarse and fine
steps reach equivalent state.

## M28.1 — Orientation

Crowd Mode now reuses the existing `04_performance.jpg` story still. It already
shows the band performing toward the player and the foreground audience from
behind, unlike the drummer-POV isolated sprites used by the initial prototype.
The file is reused unchanged. Band Mode still uses its original composition.

## M28.2 — Stage targets and scoring

| Target | Type | Points | Repeatable |
|---|---|---:|---|
| Bassist | Performer | 300 | yes |
| Vocalist | Performer | 500 | yes |
| Guitarist | Performer | 300 | yes |
| Amplifier | Stage prop | 400 | no |
| Microphone | Stage prop | 500 | no |
| Crash cymbal | Stage prop | 550 | yes |
| Ride cymbal | Stage prop | 650 | yes |

Stage props resolve before performer rectangles where the visible art overlaps.
Their authored regions do not overlap each other, and tests exercise every
centre independently. A miss remains −50.

## M28.3 — Reactions

- Crash and ride cymbals wobble using deterministic elapsed-time rotation,
  then recover after 900 ms.
- The microphone falls and becomes inactive.
- The amplifier tilts, gains a damage crack and becomes inactive.
- Performer hits receive a short visible impact highlight without changing
  the reused performance still.
- Reset restores every prop, reaction, score, throw count and clock.

These are state transitions and presentation transforms, not physics bodies.

## M28.4 — Waiter blocker

One code-drawn waiter walks left-to-right across the target plane carrying a
tray. The cycle is deterministic: a 2.2 second opening pause, a 6.2 second
crossing, then the cycle restarts after 9 seconds. The waiter is visually in
front of stage targets and their authored rectangle resolves first.

Hitting the waiter produces `wrong-target` feedback and −300 points. A target
behind the waiter cannot score during overlap; waiting until the waiter passes
restores the normal target result. English and pt-BR both explain the penalty.

## M28.5 — Aim assistance

The endpoint reticle and full four-dot trajectory are removed. During aiming,
three decreasing dots show only progress 0.08, 0.16 and 0.24 of the launch
path. The guide teaches direction while hiding the landing point. The existing
swipe projection and projectile trajectory are unchanged.

> **Values superseded.** M30 made the guide a per-stage field, and on
> 2026-11-25 it was lengthened so it clears the finger. See the stage table in
> `M29-M30-crowd-destruction-and-stages.md`.

A 250 ms input-arm delay absorbs the pointer release used to enter or reset
Crowd Mode. It prevents a menu selection from becoming an invalid throw without
changing an armed swipe.

## Asset decision

No image or audio asset was created, regenerated or modified. The audience-
facing performance still is reused through its existing registry. Target
emphasis, prop reactions and the waiter use inexpensive React Native views so
they remain replaceable and add no provenance burden.

## Validation gate

Automated coverage includes all secondary targets and scores, unique prop
regions, reaction transitions, reset, waiter motion, waiter penalty and depth
ordering, waiting behavior, shortened aim assistance and time-step
independence. Browser and Android runtime results are recorded in
`docs/handoff/CROWD-MODE-STATUS.md`.

The remaining product gate is a physical phone:

> Are the small targets readable, is the waiter timing fair, and is the reduced
> guide still understandable under a thumb?

Do not add objectives or progression until that playtest is complete.

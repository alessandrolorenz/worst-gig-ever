# M5A — First Tuning Pass

## Purpose

Refine the M4 playable graybox after the first human observation pass, without
expanding scope and without introducing final art.

M5A improves basic input reliability, object readability, target trajectories,
stage liveliness, and event readability. It is **not** a feature-expansion
milestone.

## What the first observation established

The M4 slice already proves that the drummer POV concept is understandable, the
stage chaos fantasy is visible, the vocalist interruption reads as a distinct
gameplay event, the score / combo / integrity / round flow work, audio is
integrated, and the game runs on Android.

It also produced five observations, which are the whole of M5A's scope:

1. Hitting targets is not yet reliable enough.
2. Thrown objects approach too linearly.
3. Stage performers should feel more alive.
4. Band members can become part of the chaos.
5. Art direction will likely be a major multiplier for appeal (M6, not here).

## Scope

### In scope

- improve tap / click hit reliability;
- improve target hitbox clarity and forgiveness;
- replace straight-line target travel with throw-like arc trajectories;
- support simple "performer reaction" states;
- support simple looped performer and crowd motion;
- improve stage readability where needed;
- preserve the current gameplay loop and milestone boundaries.

### Out of scope

Final art; monetization; online features; new game modes; new enemies or major
event systems; difficulty rebalancing beyond first-pass readability;
store/publishing work; progression systems; multi-song content expansion.

## Tuning priorities

### Priority 1 — Input reliability

The player must be able to hit incoming bottles and mugs reliably on both
device touch and desktop/simulator input. Focus: touch-down resolution
correctness, click/tap coordinate mapping correctness, hitbox size review,
target selection priority when objects overlap, interaction-layer conflicts.

This is a core playability issue, not polish. M5A prefers slightly generous
interaction over strict precision.

### Priority 2 — Arc-based throws

Incoming objects should feel thrown from the crowd toward the drummer: a
visible arc, slight horizontal drift variation, optional rotation in flight,
deterministic and tunable motion, pseudo-perspective preserved.

Authored trajectory curves rather than full physics. Conceptual model: spawn
origin, destination near the drummer zone, arc height, progress curve,
scale/depth progression, optional spin.

### Priority 3 — Performer reactions

Band members begin contributing to the show's chaotic personality. Performers
can react when hit or nearly hit, and can dodge; reactions are readable with
simple state swaps.

Minimal pose set: `idle`, `loopA`, `loopB`, `hitReaction`, `dodge`.

The vocalist remains the only gameplay-critical special event. Other performer
reactions are presentation-only in this milestone.

### Priority 4 — Ambient stage motion

Crowd loop motion, simple band idle looping, and optional stage-light pulsing
or beat-based visual rhythm. Intentionally simple and low-frame; retro and
choppy is acceptable, and "alive enough" matters more than smoothness.
Baseline: 2–3 frame loops on a fixed beat cadence, deterministic.

## Non-goals

Do not attempt final animation polish, replace anything with skeletal
animation, add character AI, add complex bounce/ricochet systems, or add new
event families unless strictly needed.

## Deliverables

1. Improved input reliability.
2. Arc trajectory system for incoming objects.
3. Minimal performer reaction-state support.
4. Minimal crowd/band loop support.
5. Updated tests for any new domain behavior.
6. Documentation updates reflecting the new motion/reaction model.
7. No scope expansion.

## Success criteria

M5A is successful if all of the following hold:

1. The player can reliably hit incoming objects.
2. Incoming objects visibly feel thrown rather than sliding in a straight line.
3. The vocalist event is readable and still feels chaotic.
4. The stage feels more alive even with placeholder or limited animation.
5. The tuning improves clarity and feel without changing the product scope.

Criteria 1, 3, and 4 are subjective and are answered by re-running
`docs/specs/M5-physical-playtest-checklist.md` on a device, not by the test
suite. The suite's job is to prove the mechanisms exist and behave
deterministically.

## Verification

The full validation gate must remain green: `npm run type-check`,
`npm run lint`, `npm test`, `npm run verify`. Where behavior changes in
deterministic systems, tests are updated accordingly.

## Exit

M5A ends with a better-feeling playable slice, not a visually finished product.
The next milestone is **M6 — Art Direction & Asset Pack 1**.

## Implementation record

See `docs/decisions/0007-m5a-first-tuning-pass.md` for what was actually
changed, the values chosen, and the reasoning behind each.

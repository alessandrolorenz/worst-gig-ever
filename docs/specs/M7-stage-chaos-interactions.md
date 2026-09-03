# M7 — Stage Chaos Interactions

## Objective
Make the band participate visibly in incoming-object chaos without turning the game into a different ruleset.

Desired comedy:
- bottle may pass normally;
- performer may dodge;
- bottle may clip a performer and trigger a comic reaction;
- projectile remains understandable and continues toward the drummer.

## Scope
In:
- deterministic performer/projectile presentation intersections;
- dodge reactions;
- comic clip/hit reactions;
- small post-contact deflection/spin change;
- projectile remains player-relevant;
- vocalist/bassist/guitarist participate when geometrically appropriate.

Out:
- new score currency;
- band health/damage;
- permanent performer removal;
- complex AI/ragdolls;
- full collision physics;
- new special-event families;
- ricochet chains;
- player protection strategy.

## Interaction model
At spawn derive any presentation interaction deterministically from round seed/target identity and trajectory.

Outcomes:

### `none`
Normal flight.

### `dodge`
- performer briefly enters `dodge`;
- trajectory unchanged or cosmetically adjusted;
- projectile continues toward drummer.

### `clip`
- performer briefly enters `hitReaction`;
- projectile gets small deterministic lateral/vertical deflection and extra spin;
- projectile continues toward drummer;
- no score/integrity effect at performer contact;
- eventual player hit/miss resolves normally.

## Fairness
1. Non-player band interaction never makes a projectile disappear in M7.
2. No impossible last-second jumps.
3. Deflection capped and visible early enough to react.
4. Same seed/input schedule reproduces interaction.
5. Interaction cannot resolve a target twice.
6. Vocalist special event keeps existing domain semantics.

## Frequency
Config-driven and occasional. Most throws remain normal; enough dodges/clips occur in 60 seconds that the joke is noticeable without obscuring the core loop.

## Exit
Deterministic outcomes, readable reactions, projectiles stay relevant, no new scoring economy, M5A hit reliability preserved, gate green.

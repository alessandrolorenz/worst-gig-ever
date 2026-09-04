# M17 — Difficulty Curve and Throw Patterns

**Status:** implemented on `feat/m16-beat-clarity`, alongside M16. **M17.1 —
retuning `level01` — is not started and is still gated.**

Built before the M16 device review on purpose: M17 as specified is a *no-op* on
every existing level, proven spawn-by-spawn, so it cannot disturb the M14.1
performance retest or M16's own review. What still waits for a device is
*judging* the encore, not building it.
**Stop checkpoint:** `M17_CURVE_AND_PATTERNS_DEVICE_REVIEW`.

## Why this milestone exists

Owner playtest, 2026-09-04: *"deve ter gradual a velocidade, frequência e deve
ter uns padrões pra serem feitos tipo combo de três garrafas em sequência, de um
lado e de outro, tipo: tap, tap, tap, no mesmo lugar."*

Two requests, one subsystem — both live in the spawn scheduler.

## What is actually true today

**Cadence steps; it does not ramp.** `level01` runs 1800 ms → 1300 ms → 850 ms
as three flat blocks. The transitions are cliffs, and inside a block nothing
gets harder at all — a player at 14 s and a player at 1 s face identical
pressure.

**Speed never ramps.** A bottle spawned at 2 s and a bottle spawned at 58 s are
drawn from the same `approachMs` window with the same 20% `FASTBALL_CHANCE`.
The round's last minute is denser but not faster.

**There are no patterns.** Every spawn draws its kind, lane, fastball roll, and
duration independently. Three bottles in a row down one lane can only happen by
coincidence, and because durations are drawn per target from a 900 ms-wide
window, they would arrive scrambled even then. *This is the reason patterns
cannot simply be authored on top of the current scheduler* — see below.

## What changes

### A. Ramped cadence within a phase

`SpawnPhase` gains an optional `spawnEveryToMs`. When present, the interval is
interpolated linearly from `spawnEveryMs` to `spawnEveryToMs` across the phase.
When absent the phase is constant, which is exactly today's behavior — so every
existing level keeps its schedule byte for byte until it is deliberately
retuned.

### B. Ramped approach speed across the round

`LevelDefinition` gains an optional `speedCurve: { startScale, endScale }`,
a multiplier applied to the drawn approach duration as a function of
`spawnAtMs / durationMs`. Applied **after** the window is drawn, so the normal
and fast windows ramp together and the deliberate gap between them — the thing
that makes a fastball read as a different object rather than an early one —
is preserved at every point on the curve.

Floored at `MIN_APPROACH_MS` = **1000 ms**, the bound
`tests/contracts.test.ts` already enforces on the fast window. A ramp is a
tuning dial, and a dial with no stop eventually authors a throw nobody can see
— which is not difficulty, it is a different game. Held by a test against a
curve far steeper than anything shipped.

### C. Ramped fastball chance

`LevelDefinition` gains an optional `fastballCurve: { start, end }`, replacing
the constant `FASTBALL_CHANCE` when present. Rare early, common late.

**Determinism is preserved in all three.** Each curve is a pure function of
elapsed time and is applied to the *result* of the existing generator calls.
The roll is still always taken, still in the same order, so the sequence of RNG
draws per spawn is unchanged and a seed still replays a round exactly
(AGENTS.md rule 6).

### D. Volleys — the patterns

A **volley** is an authored group of throws that spawns as one unit.

```ts
interface VolleyMember {
  readonly laneIndex: number;   // index into STAGE.laneXs
  readonly arriveAfterMs: number; // relative to the first member's arrival
  readonly kind: TargetKind;
}
interface VolleyTemplate {
  readonly id: string;
  readonly members: readonly VolleyMember[];
}
```

`SpawnPhase` gains an optional `volleys: { chance: number; templates: readonly string[] }`.
On each scheduled spawn, one roll decides whether that spawn becomes a volley.

Two rules make this work, and both are the whole point:

**1. Volleys are authored in arrival time, not spawn time.** One approach
duration is drawn for the *entire volley*, and members are spawned at
`t + arriveAfterMs` so they **arrive** at the authored spacing. Spawning three
bottles 360 ms apart with independently drawn 1050–1950 ms durations produces
an arrival order that is not even guaranteed to match the spawn order. A
pattern the player cannot perceive is not a pattern.

**2. A volley is admitted whole or not at all.** The scheduler currently drops
a spawn when `maxConcurrentTargets` is reached. Dropping the middle member of
a three-bottle line turns the intended figure into a random pair. If the cap
cannot take every member, the volley is refused and a single ordinary throw
happens instead. Members already queued count against the cap
(`committedTargetCount`), so the ordinary cadence cannot fill the screen inside
a gap a volley has already reserved.

### Deviation: each member keeps its own speed

**Recorded under AGENTS.md rule 23.** This spec called for *one approach
duration drawn for the whole volley*. That would have made a mug fly at bottle
speed — and the mug being the slow, wide, heavy object is something the player
has spent three stages learning.

What was built instead draws each member's duration from its own kind's window
and solves its spawn time backwards from the arrival it owes:

```
spawnAt = baseArrival + arriveAfterMs - durationMs
```

with `baseArrival` set one slowest-member duration after the scheduled slot, so
no member is ever asked to have left before the volley was rolled. The arrival
spacing is exactly as authored — held by a test at 16, 33 and 97 ms steps — and
every object still moves the way it always has.

### Interruptions abandon a figure

A volley in flight is dropped when the vocalist steps into the sightline. M1
pauses *spawning* during the interruption; holding the queue instead would dump
the remainder of a figure the instant the singer stepped aside, in a clump, at
spacing that no longer meant anything, at a player who had been looking
somewhere else.

Initial templates:

| id | Shape | Reads as |
|---|---|---|
| `TRIPLE_SAME_LANE` | 3 bottles, one lane, 360 ms apart | *tap, tap, tap, no mesmo lugar* — hold the finger still |
| `SIDE_TO_SIDE` | 3 bottles, lanes 0 → 4 → 0, 460 ms apart | *de um lado e de outro* — cross the screen and come back |
| `PINCER` | 2 bottles, lanes 0 and 4, arriving together | forces a real choice; the first genuine skill test |
| `MUG_SANDWICH` | mug centre, bottle either side, 300 ms apart | the slow object anchors two fast ones |

Volleys are introduced by the curve like everything else: absent from Stage 1's
opening, occasional in the middle of the show, frequent at the end.

**Scoring is untouched.** A cleared volley is worth three ordinary hits and
three combo, which the existing `COMBO_TIERS` already rewards. A dedicated
volley bonus is deliberately deferred — it would change the score contract, and
this milestone is about what the player *does*, not what they are paid.

### E. Retuning the levels — gated

`level01` is the round the owner validated at M13.1, approved visually at M14,
and **is still the subject of the open M14.1 performance retest**. Retuning it
in the same milestone that introduces the machinery would destroy that
baseline mid-measurement.

So M17 splits:

- **M17** lands curves and volleys with every curve *absent* from `level01`,
  `defenseDrill` and `findTheBeat`, and applies them to a new **Stage 4,
  "Encore"**, which is where the ramp and the patterns are actually played and
  judged.

  The no-op is not asserted by inspection. `tests/difficultyCurve.test.ts`
  replays each untouched level and hashes its **entire spawn stream** — time,
  kind, duration to six decimals, lane — against signatures recorded from the
  tree immediately before the scheduler was rewritten, and separately pins each
  level's final RNG state, which is a fingerprint of every draw taken. Any
  drift at all fails.

  The mechanism behind that: the volley roll happens **only when a phase
  declares volleys**, so a phase without them consumes exactly the run of the
  generator it consumed before M17.
- **M17.1** retunes `level01` onto the curve, with measured before/after (mean
  spawn interval and mean approach duration per third of the round, fastball
  count, volley count). It runs only after the M14.1 retest has closed.

Asked on 2026-09-04 whether M17.1 may retune `level01`, the owner answered
*"acho que sim, não estou certo"* — leaning yes, not decided. That is recorded
as a **leaning, not an approval**, and M17.1 must therefore ask again, once,
with the measurement table in hand. The reason to hold the line here is
concrete rather than procedural: `level01` is the only round with a physical
baseline behind it, and the moment it is retuned, every earlier device
observation stops being comparable. A decision made against measured
before/after numbers is a different decision from one made against a
description of a curve.

## What the Encore measures

Stage 4, `encore.ts`: 45 s, three integrity, no vocalist, seed 4, and
`maxConcurrentTargets: 5` — one more than the show, because a three-member
figure needs the room to land whole. At the show's cap of four, with two
objects typically in the air, a triple would be refused more often than thrown
and the patterns would be a feature nobody saw. It is a new level's own value;
no validated number moved.

Measured over a full round, against the show:

| | Show (`level01`) | Encore |
|---|---|---|
| spawns | 37 | 55 |
| mean gap, thirds | 1700 / 1300 / 850 | 1508 / 769 / 564 |
| mean approach, thirds | 1641 / 1640 / 1898 | 1691 / 1633 / 1388 |
| fastest throw | 1115 ms | 1000 ms *(the floor)* |
| volleys | — | 8 |

The show's row is unchanged from what `project-status.md` recorded in August,
which is the point.

Its music is the **teaching bed**, because that is the only tempo-locked one
that exists and a stage that scores beats must not play music that drifts
against them (M16, section E). It is the wrong music for an encore and the
right property; when the show gets a tempo-locked bed, this stage takes it.

## Non-goals

- No new target kind, no new hitbox, no scoring change, no integrity change.
- No procedural generation. Templates are authored data (AGENTS.md rule 6).
- No change to the Groove. M16 owns the beat.

## Verification

`npm run verify` plus:

1. same seed, same round — with curves absent, the spawn stream is identical to
   the pre-M17 stream, asserted target by target;
2. with a curve present, mean interval and mean approach duration decrease
   monotonically across round thirds;
3. no scaled approach duration ever falls below 1000 ms;
4. every volley is fully spawned or not spawned at all — never partially;
5. volley members arrive in authored order at the authored gaps, within one
   tick of tolerance, across a full round;
6. `level01.ts` and `defenseDrill.ts` diff clean in M17.

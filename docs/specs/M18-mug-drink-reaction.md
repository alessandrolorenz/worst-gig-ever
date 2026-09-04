# M18 — Mug Drink Reaction

**Status:** planned, not started. **Art dependency starts now** — see below.
**Stop checkpoint:** `M18_DRINK_DEVICE_REVIEW`.

## Why this milestone exists

Owner playtest, 2026-09-04: *"para os copos de chope o baterista ao invés de
quebrar elas ele pega e bebe (tipo algo simples mas fluido, 3 frames talvez,
pega, aproxima e bebe (virando pra câmera o chope)… Acho que ficaria mais
divertido."* And, on the follow-up: *"beber o chope deve ser até pontuado
positivamente."*

The game is called *Worst Gig Ever* and its joke is the gig. A drummer who
drinks the beer thrown at him is that joke; a drummer who smashes it is the
same event happening twice with different art. Both target kinds currently
resolve identically — burst, five glass shards, `glassBreak` — so the mug has
no identity beyond being slower and worth less.

**Refined by the owner on 2026-09-04, before any code was written.** The drink
is not the outcome of every mug — only of a mug caught *near* the drummer:
*"Para a parte em que o baterista pega e bebe a caneca de cerveja, isso só
ocorra quando a caneca esteja proximo do baterista uns 60% do caminho, se
estiver longe dai quebra com a baqueta."* On the measurement below the owner
settled the threshold at **half the approach**: *"Pode ser em 50% no meio,
isso simplifica."*

That turns one outcome into two, and it is the change that makes the milestone
work. See section A.

## What moves, and what does not

M18 changes the score, in **exactly one way and no other**.

`SCORING.drinkBonus` — a **flat** award on a mug that is *drunk*, added on top
of the existing `basePoints: 75 × comboMultiplier`. Proposed value **25**, and
it is a tuning dial, not a rule.

**A mug smashed early pays nothing extra**: `75 × comboMultiplier`, exactly
what it pays today. The bonus is the reward for having waited, and if it were
paid on every mug hit the wait would buy the player nothing.

**Flat, and deliberately not multiplied by the combo.** The mug is the *easier*
target: a 120 px tap radius against the bottle's 104, and a slower approach at
both ends of both windows. A combo-multiplied premium would make the easy
object the dominant scoring path at high combo, which inverts risk against
reward. Flat keeps the shape honest:

| Combo tier | Bottle | Mug, drunk |
|---|---|---|
| ×1 | 100 | 75 + 25 = **100** |
| ×2 | 200 | 175 |
| ×4 | 400 | 325 |

So drinking makes the mug worth exactly a bottle when the player is starting
out, and still worth less than one once they are on a streak. If the owner
wants the drink to feel like a bigger prize, 50 is the next stop and the table
above is how to read it.

The bonus goes to the **Defense** score. Drinking is a defense event; the
Groove is untouched and the two metrics stay independent (M11, M12).

Everything else is unchanged: combo increment, `targetsDestroyed`, integrity
cost on a miss, hitbox, approach windows, and every bottle value.

**Consequence to record in `project-status.md`:** Defense scores are not
comparable across the M18 boundary, exactly as Groove scores are not comparable
across M13/M13.1 (open item 16). A Stage 3 run with mugs scores higher after
M18 for the same play.

Two adjacent mechanics are named here so they are not smuggled in:

- **Drinking restores Show Integrity.** Thematically perfect, and a direct
  change to the loss condition of the validated round. Deferred — the owner
  asked for points, not for health.
- **Drinking too much blurs the pad.** Funny, and a difficulty mechanic wearing
  a costume. Deferred.

Neither is rejected. Both are separate decisions with their own playtest.

## What changes

### A. A mug is drunk only when it is within reach

On `TARGET_HIT` with `kind === 'beerMug'`, the mug resolves one of two ways:

- **near** — no glass shards, no `glassBreak` SFX, the drink plays and
  `drinkBonus` is awarded. The impact burst stays; the mug was still struck.
- **far** — it breaks with the stick, exactly as it does today: burst, five
  shards, `glassBreak`, `75 × comboMultiplier`. This is the existing path,
  unchanged and not deleted.

The bottle has one outcome at every distance. Only the mug branches.

#### The threshold is `closenessAt()`, not `progress`

`DRINK_MIN_CLOSENESS = 0.5`, in `game/config/targets.ts`, compared against
`closenessAt(progress)` from `game/systems/approach.ts`.

**This distinction is the whole correctness of the feature and must not be
"simplified" back to `progress`.** `progress` is linear in *time*;
`closenessAt` is where the object actually is on screen, and with
`STAGE.farDepth: 4.2` the two diverge enormously. Measured against the real
approach math:

| `progress` (time) | `closeness` (screen) | y | apparent size |
|---|---|---|---|
| 0.60 | **0.26** | 548 | 44% |
| 0.80 | 0.49 | 650 | 61% |
| 0.86 | 0.60 | 700 | 70% |
| 1.00 | 1.00 | 880 (danger line) | 100% |

At 60% of the *flight time* a mug has crossed only **26% of the visible
distance** — still small, still up near the vanishing point. A forearm entering
from the bottom-right to catch that would look worse than anything M18 is
trying to fix, and it is precisely the *"pode ficar estranho"* the owner
flagged. The gate has to be on what the player sees.

`closeness ≥ 0.5` puts the mug at **62% of full size, y 655** — plainly in
reach — and leaves a real window to hit it in:

| | normal mug (1800–2350 ms) | fastball mug (1350–1550 ms, p = 0.2) |
|---|---|---|
| window below `closeness` 0.5 | 1454–1899 ms | 1090–1252 ms |
| **window to land a drink** | **346–452 ms** | **260–298 ms** |

0.6 was the owner's first instinct and is also playable, but it lands at
`progress` 0.863 and leaves only 185–212 ms on a fastball. 0.5 roughly doubles
that margin, and it is a config dial either way.

#### What the branch buys

The mug is the *easier* target — a 120 px tap radius against the bottle's 104,
slower at both ends of both windows — and M18 hangs a premium on it. The gate
is what keeps that honest: smashing early is the safe play at base points,
and drinking is a deliberate choice to let the object come deep, with less
margin for error, for `+25`. Without the gate the premium sits on the easy
object unconditionally, which is the risk/reward inversion the flat bonus was
already written to avoid.

It also thins the density problem measured below: two mugs can only contend
for the one drink slot if the player lets *both* run past `closeness` 0.5.

### B. A three-frame POV drink

Drawn in the foreground, in the drummer's own view, as their hand and forearm:

| Frame | File | Beat |
|---|---|---|
| 1 | `mug_drink_01_catch.png` | the hand closes on the mug, still tilted from flight |
| 2 | `mug_drink_02_raise.png` | brought up and in, foam moving |
| 3 | `mug_drink_03_drink.png` | tipped toward the camera, drinking, the base of the mug facing the player |

120 ms per frame, then a 120 ms fade — **480 ms total**.

### Measured, because the owner flagged it

Owner, after playing M16/M17 on device on 2026-09-04: *"pode ficar estranho
quando ele for beber a cerveja."* Right instinct, and the measurement puts the
risk somewhere other than where it looks:

| | Show (`level01`) | Encore |
|---|---|---|
| mugs per round | 17 | 13 |
| one every | 3.5 s | 3.5 s |
| **closest two arrivals** | **163 ms** | **746 ms** |
| pairs closer than the 480 ms drink | **2 of 16** | 0 of 12 |

So the **Encore is safe** — no two mugs ever arrive closer than 746 ms, and its
density never interrupts a drink. It is the **show** that can land two mugs
163 ms apart, twice a round. The denser stage is the one with room, because
the Encore leans on bottles and volleys while the show mixes mugs in more
evenly.

At one mug every 3.5 s the animation occupies at most about **14% of a round**
in both. That is a running gag, not a takeover — and the section A gate only
lowers it, since a mug smashed early never animates at all. 14% is therefore
the ceiling, reached only by a player who drinks every single mug.

### One slot, and it cuts to the punchline

A second mug landing during a drink **jumps to frame 3** rather than restarting
from the catch. Restarting would mean that in exactly the two cases a round
gets a rapid pair, the player sees two beginnings and no payoff — the one shape
of interruption that costs the joke instead of telling it. Cutting forward
keeps the mug-at-the-camera frame, which is the whole point of the animation.

The other kind of "weird" is worth naming and keeping: the drummer calmly
drinking while glass is still in the air *is* the joke. The game is called
Worst Gig Ever. It should look slightly wrong.

### C. Where it is drawn

Anchored bottom-right, proposed rect **x 1380–1900, y 640–1080**
(520 x 440 on the reference canvas). Two hard constraints:

- it must not overlap the Groove Pad's bounds, x 640–1280 / y 865–1075, or the
  player loses the beat every time they drink;
- it must not enter the central sightline the targets converge along.

Bottom-left is unavailable: the `GROOVE` panel is there. The guitarist is
anchored at x 1640, so the drink art will occlude his legs — accepted, because
it is the drummer's own arm and it is nearer to the camera than anything else
on stage.

### D. The award has to be visible

A flat bonus nobody sees is a number in a log. The award prints as a short
`+25 CHEERS` flourish beside the drink, on the same 480 ms life as the
animation, using the existing floating-award treatment rather than a new HUD
element. The owner asked for the drink to be *rewarding*; the reward has to
read at the moment it is earned.

### E. Sound

One short CC0 gulp/swallow, `assets/audio/sfx/mug_drink.wav`, provenance in
`docs/assets/AUDIO-SOURCES.md` (AGENTS.md rules 13 and 14). No substitution if
acquisition fails — keep the burst and ship without the gulp, and say so.

If M16's audio pass is still open, acquire this file in the same pass: it is
the same licence check, the same provenance table, and the same normalization
step.

### F. State

A presentation-only slot in `game/systems/effects.ts` (or a sibling
`drink.ts`), aged in elapsed milliseconds like every other effect, cleared by
`clearEffects`. The domain does not know it exists — the bonus is awarded by
the round, the animation is drawn by the renderer, and neither reads the other.

## Art production notes

Art is rendered by the owner outside this repository, so the generation prompt
is written first and the milestone waits on it:
**`prompts/assets-v2/18-mug-drink-3frame.md`**.

One measurement rule needs care. `npm run measure:art` enforces, for animation
triplets, under 8 px anchor drift and under 25% frame-to-frame change — because
an *ambient loop* that moves more than that reads as flicker. The drink is a
**sequence, not a loop**: it is supposed to change a lot, and its last frame is
supposed not to match its first. It must be registered as a sequence and
excluded from the loop-continuity gate, or the gate will reject correct art.
The wrist anchor should still hold within 8 px so the arm does not swim.

Manifest: three entries in `assets/manifest/asset-manifest.json`,
`requiredForMvp: false`, `kind: "effect"`, pointing at the prompt file.

## Non-goals

- No change to bottle values, combo behaviour, integrity, hitboxes, or approach
  values. The mug's `basePoints` stays 75; the bonus is additive and flat.
- No drinking animation for the bottle. The bottle breaks at every distance;
  the contrast is the joke.
- No change to `DRINK_MIN_CLOSENESS` per stage, per kind, or over a round. One
  constant, one meaning.
- No drunk meter, no integrity heal, no new HUD panel.
- **No "tell" marking the mug as drinkable** — no glow, no rim, no HUD cue.
  *"Close enough to reach"* is physics the player already understands, and a
  marker would add HUD noise to teach what the animation itself teaches on the
  first drink. Whether the two outcomes read as a rule or as randomness is a
  question for the device review, not for the browser.

## Verification

`npm run verify` plus:

1. a mug hit at `closeness ≥ DRINK_MIN_CLOSENESS` spawns zero shards and fires
   no `glassBreak`; a mug hit below it produces the pre-M18 break in every
   respect; a bottle hit is unchanged at every distance;
2. **the gate reads `closenessAt`, not `progress`** — a mug hit at `progress`
   0.60 (`closeness` 0.26) must *break*. This case exists to fail loudly if the
   comparison is ever moved onto the time axis;
3. a drunk mug awards `75 × multiplier + drinkBonus`, and the bonus is not
   multiplied — asserted at the ×1, ×2, ×3 and ×4 tiers; a mug smashed early
   awards `75 × multiplier` and no bonus;
4. combo, `targetsDestroyed`, and integrity after a mug hit are identical to
   their pre-M18 values on a replayed seed, at both distances; only the score
   differs, and only by `drinkBonus` per mug actually drunk;
5. the drink rect intersects neither `padBounds()` nor the lane corridor;
6. a second mug drunk within 480 ms runs one animation, never two, and cuts to
   the payoff frame rather than restarting from the catch;
7. the drink frames are excluded from the loop-continuity gate and present in
   the manifest;
8. the animation and its SFX are cleared on quit, restart, and unmount
   (AGENTS.md rule 11).

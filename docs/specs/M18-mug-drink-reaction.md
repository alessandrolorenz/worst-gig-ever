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

## What moves, and what does not

M18 changes the score, in **exactly one way and no other**.

`SCORING.drinkBonus` — a **flat** award on a mug hit, added on top of the
existing `basePoints: 75 × comboMultiplier`. Proposed value **25**, and it is
a tuning dial, not a rule.

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

### A. Mug hits stop breaking

On `TARGET_HIT` with `kind === 'beerMug'`: no glass shards, no `glassBreak`
SFX. The impact burst stays — the mug was still struck — and the drink plays.

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

At one mug every 3.5 s the animation occupies about **14% of a round** in both.
That is a running gag, not a takeover.

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
- No drinking animation for the bottle. The bottle still breaks; the contrast
  is the joke.
- No drunk meter, no integrity heal, no new HUD panel.

## Verification

`npm run verify` plus:

1. a mug hit spawns zero shards and fires no `glassBreak`; a bottle hit is
   unchanged in every respect;
2. a mug hit awards `75 × multiplier + drinkBonus`, and the bonus is not
   multiplied — asserted at the ×1, ×2, ×3 and ×4 tiers;
3. combo, `targetsDestroyed`, and integrity after a mug hit are identical to
   their pre-M18 values on a replayed seed; only the score differs, and only by
   `drinkBonus` per mug;
4. the drink rect intersects neither `padBounds()` nor the lane corridor;
5. a second mug within 480 ms runs one animation, never two, and cuts to the
   payoff frame rather than restarting from the catch;
6. the drink frames are excluded from the loop-continuity gate and present in
   the manifest;
7. the animation and its SFX are cleared on quit, restart, and unmount
   (AGENTS.md rule 11).

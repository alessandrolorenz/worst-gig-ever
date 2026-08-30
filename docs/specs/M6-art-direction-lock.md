# M6 — Art Direction Lock

## Objective
Turn the promising M5A graybox into a production-ready visual plan without changing the core gameplay model. Reconcile the original M3 contract with M5A perspective, performer states, hit readability, and stage motion.

## Product fantasy
The player is seated behind a drum kit during a terrible, chaotic rock show.

Immediate read:
> I am the drummer. The gig is out of control. Things are being thrown at us. I have to survive the show.

## Visual tone
- simple cartoon/vector-like clip art;
- readable rather than detailed;
- funny, chaotic garage-rock/punk energy;
- retro mobile arcade feel;
- exaggerated but not grotesque;
- no gore, photorealism, real logos, or real performer likenesses.

## Composition
Reference canvas remains **1920×1080 landscape**.

Back to front:
1. venue/stage background;
2. rear crowd;
3. band performers;
4. front crowd accents where they do not obscure gameplay;
5. projectile flight space;
6. impact/projectile FX;
7. drum kit foreground;
8. HUD/overlays.

The drum kit must sell POV without covering too much projectile travel space.

## Palette intent
- dark charcoal / blue-black / deep purple base;
- saturated magenta, amber, teal, electric-blue lighting accents;
- distinct performer silhouettes/value separation;
- bottles/mugs readable against crowd and performers;
- high-contrast HUD kept separate from art.

## Low-frame animation language
The intentionally choppy animation style is a feature.

### Ambient performers
Use runtime presentation vocabulary:
- `idle`
- `loopA`
- `loopB`

These form the 3-frame repeating stage-motion loop. Differences are subtle: body/head/instrument movement, fixed camera, stable feet/ground anchor.

### Reactions
- `hitReaction`
- `dodge`

Short state swaps/interpolated reactions, not long animation sequences.

### Crowd
Prefer:
- `crowd_front_01`
- `crowd_front_02`
- `crowd_front_03`

Rear crowd may remain mostly static.

## Pack 1 required art

The canonical path, canvas, and alpha contract is frozen here. No other path
for these Pack 1 filenames is valid.

Environment:
- `assets/art/backgrounds/stage_bg_base.png` — 1920×1080 opaque
- `assets/art/backgrounds/stage_lights_overlay.png` — 1920×1080 transparent
- `assets/art/crowd/crowd_back.png` — 1920×520 transparent
- `assets/art/crowd/crowd_front_01.png` — 1920×420 transparent
- `assets/art/crowd/crowd_front_02.png` — 1920×420 transparent
- `assets/art/crowd/crowd_front_03.png` — 1920×420 transparent

Drum kit:
- `assets/art/drums/drumkit_pov.png` — 1920×700 transparent

Vocalist:
- `assets/art/band/vocalist_idle.png`
- `assets/art/band/vocalist_loop_a.png`
- `assets/art/band/vocalist_loop_b.png`
- `assets/art/band/vocalist_blocking.png`
- `assets/art/band/vocalist_hit_reaction.png`
- `assets/art/band/vocalist_dodge.png`

Vocalist files are exactly 640×900 transparent with the same ground anchor.

Bassist:
- `assets/art/band/bassist_idle.png`
- `assets/art/band/bassist_loop_a.png`
- `assets/art/band/bassist_loop_b.png`
- `assets/art/band/bassist_hit_reaction.png`
- `assets/art/band/bassist_dodge.png`

Bassist files are 640×900 transparent.

Guitarist:
- `assets/art/band/guitarist_idle.png`
- `assets/art/band/guitarist_loop_a.png`
- `assets/art/band/guitarist_loop_b.png`
- `assets/art/band/guitarist_hit_reaction.png`
- `assets/art/band/guitarist_dodge.png`

Guitarist files are 640×900 transparent.

Props:
- `assets/art/props/beer_bottle.png` — 256×512 transparent
- `assets/art/props/beer_mug.png` — 384×384 transparent
- `assets/art/props/whiskey_bottle.png` — 280×560 transparent, optional style-set asset
- `assets/art/props/drumstick.png` — 640×96 transparent

FX:
- `assets/art/effects/glass_shard_01.png` through
  `assets/art/effects/glass_shard_06.png` — 128×128 transparent
- `assets/art/effects/hit_burst.png` — 256×256 transparent
- `assets/art/effects/dust_puff.png` — 256×256 transparent, optional

Everything above except `whiskey_bottle.png` and `dust_puff.png` is required
for M6B.

## Runtime reconciliation

M5A already exposes `idle`, `loopA`, `loopB`, `hitReaction`, and `dodge` for
all three performers. The current graybox cadence cycles only `loopA` and
`loopB`; `idle` exists in the vocabulary but is not part of that two-frame
loop. M6 freezes three ambient art frames. M6B may change the presentation
cadence to `idle → loopA → loopB → idle`; that is an animation mapping change,
not a scoring, timing, hitbox, spawn, or trajectory change.

| Runtime state | Vocalist | Bassist | Guitarist |
|---|---|---|---|
| `idle` | `vocalist_idle` | `bassist_idle` | `guitarist_idle` |
| `loopA` | `vocalist_loop_a` | `bassist_loop_a` | `guitarist_loop_a` |
| `loopB` | `vocalist_loop_b` | `bassist_loop_b` | `guitarist_loop_b` |
| `hitReaction` | `vocalist_hit_reaction` | `bassist_hit_reaction` | `guitarist_hit_reaction` |
| `dodge` | `vocalist_dodge` | `bassist_dodge` | `guitarist_dodge` |

Vocalist `blocking` remains a dedicated domain state and maps only to
`vocalist_blocking`.

The front crowd follows the same three-frame intention with
`crowd_front_01`, `crowd_front_02`, and `crowd_front_03`. The current graybox
crowd has two code-drawn states; M6B replaces that presentation only.

## M5A flight-space constraint

Art must support the existing authored trajectories rather than forcing them
to move. Throws originate across the crowd band (`x=260..1660`,
`y=400..505`), arc above their straight perspective path, and land at
`y=880` on the five existing lanes (`x=430, 700, 960, 1220, 1490`). Band and
crowd art sits behind the projectile layer, high-contrast background details
must not compete with that envelope, and the drum kit must preserve the
central sightline. These are composition constraints only; M5A endpoints,
arc parameters, hit forgiveness, and page-coordinate input mapping remain
unchanged.

## Manifest key plan

Preserve existing semantic keys where they still name the same asset. Add
keys for the lights overlay, two additional crowd frames, every performer
loop/reaction state, and the missing guitarist/bassist states. The stale
`bassistGroove` concept becomes a documented legacy alias of `bassistLoopA`;
it must not create a second file path or a separate generated pose. M6A owns
the exact additive manifest migration.

## Isolation rules
- No full-scene flattened illustration.
- Characters, props, effects, crowd, lights, and drums remain independently replaceable.
- Movable/reactive elements use transparent backgrounds.
- Hitboxes remain configuration/domain data, never inferred from bitmap bounds.

## Character continuity
Every pose must depict the same fictional person, outfit, instrument, proportions, hair, palette, line weight, camera angle, and approximate foot anchor.

## Exit criteria
M6 is complete when visual direction is unambiguous, Pack 1 scope is frozen, state naming matches runtime architecture, M3 is reconciled rather than contradicted, and asset generation/integration needs no invented naming/layer decisions.

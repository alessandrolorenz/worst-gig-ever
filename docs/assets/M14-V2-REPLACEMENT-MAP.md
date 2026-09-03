# M14 V2 Replacement Map

## Rule

V2 is an in-place art substitution after owner approval. Every production
target keeps its current canonical path, dimensions, alpha contract, manifest
key, runtime state, and composition anchor. Proof images use separate
`design-reference/m14-v2-proof/` paths and are never runtime assets.

## Environment, crowd, and drum kit

| Manifest key | Current production asset | V2 production target | Contract | V2 source |
|---|---|---|---|---|
| `stageBgBase` | `assets/art/backgrounds/stage_bg_base.png` | same path | 1920×1080 opaque | approved stage proof/style bible |
| `stageLightsOverlay` | `assets/art/backgrounds/stage_lights_overlay.png` | same path | 1920×1080 transparent | stage reference, separate broad light shapes |
| `crowdBack` | `assets/art/crowd/crowd_back.png` | same path | 1920×520 transparent | approved crowd proof and locked cast language |
| `crowdFront01` | `assets/art/crowd/crowd_front_01.png` | same path | 1920×420 transparent | approved crowd proof; canonical frame |
| `crowdFront02` | `assets/art/crowd/crowd_front_02.png` | same path | 1920×420 transparent | edit from approved `crowdFront01` |
| `crowdFront03` | `assets/art/crowd/crowd_front_03.png` | same path | 1920×420 transparent | edit from approved `crowdFront01` |
| `drumkitPov` | `assets/art/drums/drumkit_pov.png` | same path | 1920×700 transparent | approved drum-kit proof |

## Vocalist

| Manifest key | Current production asset | V2 production target | Contract | V2 source |
|---|---|---|---|---|
| `vocalistIdle` | `assets/art/band/vocalist_idle.png` | same path | 640×900 transparent, stable feet | approved vocalist reference |
| `vocalistLoopA` | `assets/art/band/vocalist_loop_a.png` | same path | 640×900 transparent, stable feet | identity-preserving edit from V2 idle |
| `vocalistLoopB` | `assets/art/band/vocalist_loop_b.png` | same path | 640×900 transparent, stable feet | identity-preserving edit from V2 idle |
| `vocalistBlocking` | `assets/art/band/vocalist_blocking.png` | same path | 640×900 transparent, same character | approved reference, facing drummer |
| `vocalistHitReaction` | `assets/art/band/vocalist_hit_reaction.png` | same path | 640×900 transparent, same character | identity-preserving edit from reference |
| `vocalistDodge` | `assets/art/band/vocalist_dodge.png` | same path | 640×900 transparent, same character | identity-preserving edit from reference |

## Bassist

| Manifest key | Current production asset | V2 production target | Contract | V2 source |
|---|---|---|---|---|
| `bassistIdle` | `assets/art/band/bassist_idle.png` | same path | 640×900 transparent, stable feet | approved bassist reference |
| `bassistLoopA` | `assets/art/band/bassist_loop_a.png` | same path | 640×900 transparent, stable feet | identity-preserving edit from V2 idle |
| `bassistLoopB` | `assets/art/band/bassist_loop_b.png` | same path | 640×900 transparent, stable feet | identity-preserving edit from V2 idle |
| `bassistHitReaction` | `assets/art/band/bassist_hit_reaction.png` | same path | 640×900 transparent, same character | identity-preserving edit from reference |
| `bassistDodge` | `assets/art/band/bassist_dodge.png` | same path | 640×900 transparent, same character | identity-preserving edit from reference |

## Guitarist

| Manifest key | Current production asset | V2 production target | Contract | V2 source |
|---|---|---|---|---|
| `guitaristIdle` | `assets/art/band/guitarist_idle.png` | same path | 640×900 transparent, stable feet | approved guitarist reference |
| `guitaristLoopA` | `assets/art/band/guitarist_loop_a.png` | same path | 640×900 transparent, stable feet | identity-preserving edit from V2 idle |
| `guitaristLoopB` | `assets/art/band/guitarist_loop_b.png` | same path | 640×900 transparent, stable feet | identity-preserving edit from V2 idle |
| `guitaristHitReaction` | `assets/art/band/guitarist_hit_reaction.png` | same path | 640×900 transparent, same character | identity-preserving edit from reference |
| `guitaristDodge` | `assets/art/band/guitarist_dodge.png` | same path | 640×900 transparent, same character | identity-preserving edit from reference |

## Props and effects

| Manifest key | Current production asset | V2 production target | Contract | V2 source |
|---|---|---|---|---|
| `beerBottle` | `assets/art/props/beer_bottle.png` | same path | 256×512 transparent; preserve visible bounds | approved bottle proof |
| `beerMug` | `assets/art/props/beer_mug.png` | same path | 384×384 transparent; preserve visible bounds | approved prop language |
| `whiskeyBottle` | absent optional asset | `assets/art/props/whiskey_bottle.png` | 280×560 transparent, optional | deferred; do not produce in M14 |
| `drumstick` | `assets/art/props/drumstick.png` | same path | 640×96 transparent | approved prop language |
| `hitBurst` | `assets/art/effects/hit_burst.png` | same path | 256×256 transparent | approved FX language |
| `dustPuff` | absent optional asset | `assets/art/effects/dust_puff.png` | 256×256 transparent, optional | deferred; do not produce in M14 |
| `glassShard01` | `assets/art/effects/glass_shard_01.png` | same path | 128×128 transparent | approved shard family |
| `glassShard02` | `assets/art/effects/glass_shard_02.png` | same path | 128×128 transparent | approved shard family |
| `glassShard03` | `assets/art/effects/glass_shard_03.png` | same path | 128×128 transparent | approved shard family |
| `glassShard04` | `assets/art/effects/glass_shard_04.png` | same path | 128×128 transparent | approved shard family |
| `glassShard05` | `assets/art/effects/glass_shard_05.png` | same path | 128×128 transparent | approved shard family |
| `glassShard06` | `assets/art/effects/glass_shard_06.png` | same path | 128×128 transparent | approved shard family |

## Aliases and runtime mapping

| Existing semantic entry | V2 action |
|---|---|
| `crowdFront` → `crowdFront01` | Preserve deprecated alias; no duplicate file. |
| `bassistGroove` → `bassistLoopA` | Preserve deprecated alias; no duplicate pose or file. |
| `STAGE_ART` | No code change; all environment targets keep their paths. |
| `PERFORMER_ART` | No code change; state-to-file mapping stays identical. |
| `VOCALIST_BLOCKING_ART` | No code change; same dedicated production path. |
| `TARGET_ART` | No code change; bottle/mug names and paths remain fixed. |
| `GLASS_SHARD_ART` | No code change; array order 01–06 remains fixed. |

## Derived app identity art

These files are outside the Pack 1 manifest but derive from the bottle and
drumstick. Regenerate them with the existing script only after the corresponding
V2 production props are accepted:

| Current file | V2 target | Action |
|---|---|---|
| `assets/icon.png` | same path | rerun `scripts/make-app-icon.mjs` |
| `assets/adaptive-icon.png` | same path | rerun `scripts/make-app-icon.mjs` |
| `assets/favicon.png` | same path | rerun `scripts/make-app-icon.mjs` |
| `assets/splash.png` | same path | rerun `scripts/make-app-icon.mjs` |

## Production order after approval

1. Canonical performer references and idle states.
2. Performer ambient triplets; continuity gate before reactions.
3. Crowd canonical frame and two identity-preserving motion edits.
4. Drum kit, then stage/background/lights with in-scene readability checks.
5. Bottle and mug, with measured content bounds and tap-circle contract checks.
6. Drumstick, burst, and shards.
7. Derived icon/splash files.
8. Provenance, Pack 1 validator, full tests, web smoke, then physical-device
   smoke before enabling the ambient loop.

# M3 — Art and Asset Contract

## M6 reconciliation

M6 keeps M3's composition, isolation, format, and hitbox rules, but replaces
the original single-pose/single-crowd-frame inventory with the frozen Pack 1
contract below. This document and `docs/specs/M6-art-direction-lock.md` now use
the same filenames, dimensions, required/optional status, and runtime state
vocabulary.

## Visual objective

Create a simple, funny, readable 2D cartoon game with a pseudo-3D drummer point of view.

The desired visual language is **vector-like cartoon clip art**, not realism.

## Master composition

- Orientation: landscape
- Reference canvas: 1920 × 1080
- Aspect ratio: 16:9
- Gameplay must remain usable on narrower/wider phone screens through the
  current contain/letterbox canvas fit and safe-area-aware overlays. No
  gameplay-critical content is cropped.

### Depth zones

1. **Far background:** venue wall, lights, distant crowd.
2. **Stage/background-mid:** singer, bassist, guitarist, front crowd edge.
3. **Gameplay flight space:** incoming objects.
4. **Foreground:** drum kit and drumstick feedback.
5. **HUD:** score, combo, integrity, timer.

## Style rules

- bold, clean shapes;
- limited internal detail;
- exaggerated expressions;
- readable at phone size;
- humorous punk/garage-rock attitude;
- no photorealism;
- no gore;
- no real logos;
- no real band likenesses;
- no branded bottle labels;
- transparent backgrounds for movable assets;
- consistent perspective and line weight across the set.

## Runtime format policy

- Prefer transparent PNG for generated movable art in the MVP.
- SVG is welcome for hand-authored simple icons/effects when practical.
- Source artwork may be vector-like even when exported to PNG.
- Do not block the MVP on perfect vector delivery.

## Required asset set — MVP

### Background

#### `stage_bg_base`

- Target: `assets/art/backgrounds/stage_bg_base.png`
- Canvas: 1920 × 1080
- Opaque
- Contains venue architecture and stage floor only.
- Must not contain band characters, drum kit, flying objects, HUD, or foreground effects.

#### `stage_lights_overlay`

- Target: `assets/art/backgrounds/stage_lights_overlay.png`
- Canvas: 1920 × 1080
- Transparent
- Contains only overlayable concert beams, glows, and spots.
- Must not obscure the projectile corridor.

#### `crowd_back`

- Target: `assets/art/crowd/crowd_back.png`
- Canvas: 1920 × 520
- Transparent
- Dense simplified crowd silhouettes/faces.
- Designed to sit behind the band.

#### `crowd_front_01` through `crowd_front_03`

- Targets: `assets/art/crowd/crowd_front_01.png` through
  `assets/art/crowd/crowd_front_03.png`
- Canvas: 1920 × 420 each
- Transparent
- The same crowd composition and identities in all three frames.
- Only small head/body/arm changes; stable placement and a readable central
  projectile corridor.

### Drum kit foreground

#### `drumkit_pov`

- Target: `assets/art/drums/drumkit_pov.png`
- Canvas: 1920 × 700
- Transparent
- Drummer's-eye perspective.
- Snare near lower center, toms mid-lower area, cymbals left/right.
- No visible drummer body required.
- Must leave clear central sightline toward the vocalist.

### Vocalist

All vocalist assets depict the same original fictional person and outfit on an
exact 640 × 900 transparent canvas with the same feet/ground anchor.

- `vocalist_idle`
- `vocalist_loop_a`
- `vocalist_loop_b`
- `vocalist_blocking` — leaning toward the drummer / occupying the sightline
- `vocalist_hit_reaction` — comic surprise / stumble, no injury or gore
- `vocalist_dodge` — clear duck/shift away from the projectile corridor

### Bassist

All bassist assets depict the same original fictional person and instrument on
a 640 × 900 transparent canvas with a stable feet anchor.

- `bassist_idle`
- `bassist_loop_a`
- `bassist_loop_b`
- `bassist_hit_reaction`
- `bassist_dodge`

### Guitarist

All guitarist assets depict the same original fictional person and instrument
on a 640 × 900 transparent canvas with a stable feet anchor.

- `guitarist_idle`
- `guitarist_loop_a`
- `guitarist_loop_b`
- `guitarist_hit_reaction`
- `guitarist_dodge`

### Props

#### `beer_bottle`
- 256 × 512 transparent PNG
- generic unlabeled glass bottle
- no brand

#### `beer_mug`
- 384 × 384 transparent PNG
- generic beer mug
- no logo

#### `whiskey_bottle`
- 280 × 560 transparent PNG
- generic amber bottle with fictional/no label
- optional Pack 1 style-set asset; not a current gameplay target

#### `drumstick`
- 640 × 96 transparent PNG
- isolated wooden drumstick

### Break/effect pieces

#### `glass_shard_01` through `glass_shard_06`
- 128 × 128 transparent PNG each
- simple irregular translucent shard shapes
- no baked motion blur

#### `hit_burst`
- 256 × 256 transparent PNG
- comic impact star/burst

#### `dust_puff`
- 256 × 256 transparent PNG
- optional reaction effect

All other assets in this section are required for M6B. `whiskey_bottle` and
`dust_puff` are the only optional Pack 1 files.

### UI

Prefer code-drawn UI first.

No custom UI art is required before M5 unless a generic icon is missing.

## Animation policy

Do not create long frame-by-frame sequences.

### Bottle break

1. Hide intact target.
2. Show hit burst.
3. Spawn 3–6 shard assets.
4. Move/rotate shards with code or physics.
5. Fade shards out within approximately 400–700 ms.

### Performer state mapping

The runtime vocabulary maps directly to files:

| Runtime pose | File suffix |
|---|---|
| `idle` | `*_idle.png` |
| `loopA` | `*_loop_a.png` |
| `loopB` | `*_loop_b.png` |
| `hitReaction` | `*_hit_reaction.png` |
| `dodge` | `*_dodge.png` |

The ambient visual cycle is `idle → loopA → loopB → idle`. Vocalist
`blocking` is a dedicated gameplay-event visual and overrides ambient poses.
Use position, scale, and slight rotation interpolation for the blocking
entrance and exit.

### Vocalist hit

Swap to `vocalist_hit_reaction`, animate backward, rotate slightly, and exit.

### Crowd

Cycle `crowd_front_01 → crowd_front_02 → crowd_front_03 → crowd_front_01`
on the same intentionally choppy low-frame stage cadence. Rear crowd may
remain mostly static.

## Asset isolation rule

Every asset above must be independently replaceable. Do not flatten the entire scene into a single illustration.

## Hitbox rule

Gameplay hitboxes are defined in configuration and may be smaller/larger than visible asset bounds. Asset replacement must not implicitly change game difficulty.

## Generation consistency rule

When generating visual assets, maintain a reusable style reference and, for characters, reuse the same character reference across poses. Do not regenerate each pose as an unrelated person.

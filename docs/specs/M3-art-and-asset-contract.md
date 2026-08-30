# M3 — Art and Asset Contract

## Visual objective

Create a simple, funny, readable 2D cartoon game with a pseudo-3D drummer point of view.

The desired visual language is **vector-like cartoon clip art**, not realism.

## Master composition

- Orientation: landscape
- Reference canvas: 1920 × 1080
- Aspect ratio: 16:9
- Gameplay must remain usable on narrower/wider phone screens through safe-area-aware cropping/scaling.

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

#### `crowd_back`

- Target: `assets/art/crowd/crowd_back.png`
- Canvas: 1920 × 520
- Transparent
- Dense simplified crowd silhouettes/faces.
- Designed to sit behind the band.

#### `crowd_front`

- Target: `assets/art/crowd/crowd_front.png`
- Canvas: 1920 × 420
- Transparent
- Raised arms / closer crowd layer.
- May be moved subtly for ambience.

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

All vocalist assets should depict the same original fictional person and outfit.

#### `vocalist_idle`
- 640 × 900 transparent PNG

#### `vocalist_blocking`
- 640 × 900 transparent PNG
- leaning toward the drummer / occupying the sightline

#### `vocalist_hit_reaction`
- 720 × 900 transparent PNG
- comic surprise / stumbling backward
- no injury or gore

### Bassist

#### `bassist_idle`
- 640 × 900 transparent PNG

#### `bassist_groove`
- 640 × 900 transparent PNG
- optional for MVP integration; required as future-ready art only if cheap to generate consistently

### Guitarist

#### `guitarist_idle`
- 640 × 900 transparent PNG
- optional visual layer in MVP; no gameplay event required

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
- post-MVP target, but useful to create with the initial style set

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

### Vocalist entrance

Use position, scale, and slight rotation interpolation between `idle` and `blocking` states.

### Vocalist hit

Swap to `vocalist_hit_reaction`, animate backward, rotate slightly, and exit.

### Crowd

Use slow low-amplitude vertical/scale movement, or alternate front-layer movement. Do not require crowd sprite animation.

## Asset isolation rule

Every asset above must be independently replaceable. Do not flatten the entire scene into a single illustration.

## Hitbox rule

Gameplay hitboxes are defined in configuration and may be smaller/larger than visible asset bounds. Asset replacement must not implicitly change game difficulty.

## Generation consistency rule

When generating visual assets, maintain a reusable style reference and, for characters, reuse the same character reference across poses. Do not regenerate each pose as an unrelated person.

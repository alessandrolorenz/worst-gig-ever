# M14 — Visual Refresh V2 Planning

## Status

Prepared for later execution.

Do **not** automatically execute M14 before the owner completes the M13 rhythm playtest and explicitly chooses to continue the visual refresh.

## Objective

Refresh the current art direction toward a cleaner, more readable, more game-oriented style **without making it excessively minimal** and without rebuilding the renderer.

The current visual set proved that the scene composition, characters, crowd, band positions, animation states, and asset-replacement architecture work.

M14 should improve the **art style**, not reinvent the scene.

## Key strategy

The current asset architecture is already replaceable.

Prefer **asset substitution using the same canonical filenames, dimensions, anchors, state names, and manifest keys**.

That means the visual style can evolve without changing gameplay code.

## Proposed V2 direction

Working direction:

**Stylized Punk Arcade Cartoon**

The target is a middle ground between:

- the current highly detailed comic-book illustration; and
- an overly minimal silhouette/poster style.

The game should still have expressive characters, readable faces, recognizable personalities, instruments, clothing, and humor.

### Desired characteristics

- cleaner shapes and silhouettes;
- moderately simplified anatomy;
- fewer small internal details than the current art;
- expressive faces remain important;
- recognizable hairstyles and character-specific features;
- clear hands, instruments, and poses;
- medium line detail rather than dense comic rendering;
- controlled flat-color areas with selective shading;
- limited texture used only where it adds personality;
- bold concert-stage lighting;
- strong separation between foreground, performers, crowd, and projectiles;
- readable at phone size;
- energetic punk / garage-rock attitude;
- slightly exaggerated cartoon proportions;
- visually coherent with the game's humor.

### The intended balance

The art should feel:

- more polished than clip art;
- simpler than a full comic-book panel;
- more expressive than flat vector icons;
- more character-driven than silhouettes;
- more game-oriented than illustration-oriented.

## Avoid

- photorealism;
- highly rendered comic-book anatomy;
- dense cross-hatching;
- excessive costume micro-detail;
- extremely detailed faces;
- overly complex lighting painted into each character;
- generic corporate flat-vector style;
- pure silhouette characters;
- faceless/minimal figures;
- poster graphics so abstract that character personality is lost;
- visual noise that competes with bottles, the Groove Pad, HUD, or timing feedback.

## Character design principle

Each performer should be identifiable from a combination of:

- face and expression;
- hairstyle;
- silhouette;
- instrument;
- outfit colors;
- posture;
- one or two distinctive accessories or visual traits.

Faces are **not secondary**.

The game uses character reactions for humor, so facial expressions and body language must remain readable.

However, faces should not contain unnecessary realism or tiny detail that disappears at phone size.

### Character personality

The vocalist, bassist, and guitarist should each feel like a distinct fictional person.

Their design should support:

- idle personality;
- rhythmic movement;
- dodge reactions;
- comic hit reactions;
- vocalist blocking behavior.

The player should be able to recognize the character even when the pose changes.

## Line and shape language

Use:

- confident outer contours;
- simplified internal line work;
- large readable color areas;
- selective folds/details;
- clear hands/instruments;
- clean silhouette separation.

Avoid using dozens of small lines where one shape or shadow would communicate the same thing.

The reduction in detail should improve readability, not remove personality.

## Color and shading

Use a controlled palette with:

- dark stage base;
- saturated punk/rock accent colors;
- distinct character palettes;
- readable warm/cool contrast;
- simple cel-like or soft two-step shading.

Avoid complex realistic rendering.

Characters should remain readable when stage lights change behind them.

## Animation

Keep existing runtime states:

- `idle`
- `loopA`
- `loopB`
- `hitReaction`
- `dodge`
- vocalist `blocking`

Do not increase frame count.

The deliberately choppy 3-frame ambient motion remains part of the game identity.

### Frame continuity

Across `idle`, `loopA`, and `loopB`:

- the same character must remain clearly recognizable;
- face, hair, clothes, instrument, proportions, and palette stay consistent;
- movement should be small and rhythmic;
- feet/ground anchors should remain stable;
- the character must not appear regenerated from scratch between frames.

Reaction states may move more dramatically but must still preserve character identity.

## Crowd refresh

The crowd should be simplified **more than the band**, because it is supporting scenery.

However, it should not become a featureless silhouette wall.

Preferred approach:

- simplified individual heads and upper bodies;
- readable arms/fists/horns;
- fewer facial details than performers;
- selected visible expressions near the front;
- grouped color/value masses;
- controlled variation;
- less visual clutter than the current crowd;
- clear negative space around projectile paths and the Groove Pad.

The crowd should feel alive and chaotic without becoming the visual focal point.

## Stage and background

The stage should remain recognizable as a real small/medium rock venue.

Simplify texture and architectural detail where possible.

Preserve:

- depth;
- lights;
- stage atmosphere;
- crowd separation;
- performer readability.

Do not flatten the stage into an abstract poster background.

## Drum kit

The drum kit should become cleaner and slightly simpler while remaining obviously a drum kit from drummer POV.

Important:

- cymbals, toms, and snare remain recognizable;
- the foreground should not become visually heavy;
- the center sightline remains open;
- the designated Groove Pad cymbal must be visually easy to identify;
- code-driven pulse/glow must remain visible over the art.

The Groove Pad should be important, but it should still look like part of the drum kit rather than a separate UI button.

Do not bake the pulse into the artwork.

## Projectile readability

Beer bottles, mugs, and future throwable objects must remain visually distinct while:

- small and distant;
- scaling toward the player;
- rotating;
- crossing performer/crowd backgrounds.

Use simpler, stronger shapes than the current art if needed.

Do not compensate for poor art readability by changing hitboxes.

## FX

Glass shards and hit bursts should follow the same cleaner cartoon style.

Effects should:

- be readable;
- be quick;
- feel satisfying;
- avoid excessive detail;
- not obscure the Groove Pad or incoming targets.

## Replacement contract

Whenever possible:

- preserve existing PNG dimensions;
- preserve transparency;
- preserve feet/ground anchors;
- preserve filenames;
- preserve manifest keys;
- preserve existing runtime state names.

If a dimension or anchor must change, update the contract before replacing art.

## Character-reference workflow

For each performer:

1. Create/approve one canonical V2 character reference.
2. Lock face, hairstyle, outfit, instrument, palette, and proportions.
3. Generate/redraw all animation states from that reference.
4. Validate the states side by side before integration.

Do not independently generate each frame from text-only prompts.

## Suggested visual validation sheet

Before integrating a character, compare:

```text
idle | loopA | loopB | dodge | hitReaction | blocking (vocalist only)
```

Check:

- same person;
- same proportions;
- same instrument;
- same clothing;
- stable anchor;
- clear expression;
- readable pose differences.

## Validation

A V2 art replacement is accepted only if:

- Pack 1 validation still passes;
- no hitbox changes are required merely because of art;
- no character anchor jumps across the 3-frame loop;
- character identity remains consistent across states;
- facial expressions remain readable at phone size;
- projectile readability is equal or better;
- Groove Pad readability is equal or better;
- crowd visual noise is lower than the current version;
- runtime gameplay code does not need style-specific branching;
- the new style is visibly simpler than the current comic art without becoming overly minimal.

## Owner visual checkpoint

Before regenerating the full asset set, M14 should produce a **small visual direction proof** first.

Preferred proof set:

1. vocalist reference;
2. bassist reference;
3. guitarist reference;
4. one crowd sample;
5. drum-kit sample;
6. one bottle/prop sample.

The owner should review this small set before the rest of the animation frames and asset family are produced.

This prevents a full art pass in the wrong direction.

## Exit

M14 planning can finish before art exists.

Actual V2 art production requires owner approval after the rhythm playtest.

After M14 planning, the next art-production step should first stop at:

`V2_VISUAL_DIRECTION_REVIEW`

Only after owner approval should the full V2 asset replacement set be generated.

# M14 — Visual Refresh V2 Planning

## Status

Prepared for later execution.

Do **not** automatically execute M14 before the owner completes the M13 rhythm playtest and explicitly chooses to continue the visual refresh.

## Objective

Refresh the current detailed comic-style art toward a simpler, more iconic, more minimal game-art language without rebuilding the renderer.

## Key strategy

The current asset architecture is already replaceable.

Prefer **asset substitution using the same canonical filenames, dimensions, anchors, state names, and manifest keys**.

That means the visual style can change without changing gameplay code.

## Proposed V2 direction

Working direction:

**Minimal Punk Poster Arcade**

Characteristics:
- simpler silhouettes;
- fewer internal lines;
- larger flat color areas;
- stronger shape language;
- limited shading;
- slightly rough screen-print/poster texture if subtle;
- exaggerated readable hair/instruments/poses;
- less facial detail;
- less visual noise in the crowd;
- stage remains dark with bold accent lighting;
- performers read instantly at phone size.

Avoid:
- realistic comic rendering;
- dense cross-hatching;
- tiny costume detail;
- overly polished superhero-comic anatomy;
- photorealism;
- flat generic corporate vector style.

## Character design principle

Each performer should be identifiable primarily from:
- silhouette;
- hair shape;
- instrument;
- one or two outfit colors;
- posture.

Faces should be secondary.

## Animation

Keep existing runtime states:

- idle
- loopA
- loopB
- hitReaction
- dodge
- vocalist blocking

Do not increase frame count.

The deliberately choppy 3-frame motion remains part of the game identity.

## Crowd simplification

The crowd should become more graphic:
- grouped silhouettes;
- simplified heads/arms;
- limited accent colors;
- less individual face detail;
- clearer negative space around projectile paths.

## Drum kit

The drum kit should become simpler but the Groove Pad cymbal must become more visually important.

The designated Groove cymbal may:
- use a cleaner silhouette;
- have slightly different base material/accent;
- leave room for code-driven pulse/glow.

Do not bake the pulse into the artwork.

## Replacement contract

Whenever possible:
- preserve existing PNG dimensions;
- preserve transparency;
- preserve feet/ground anchors;
- preserve filenames;
- preserve manifest keys.

If a dimension/anchor must change, update the contract before replacing art.

## Validation

A V2 art replacement is accepted only if:
- Pack 1 validation still passes;
- no hitbox changes are required merely because of art;
- no character anchor jumps across 3-frame loop;
- projectile readability is equal or better;
- Groove Pad readability is equal or better;
- runtime gameplay code does not need style-specific branching.

## Exit

M14 planning can finish before art exists.

Actual V2 art production requires owner approval after rhythm playtest.

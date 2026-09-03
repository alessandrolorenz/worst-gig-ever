# V2 Production — Stage and Lights

Read `00-style-bible.md`. Use the approved performer lineup as Image 1 for
style, and the current `assets/art/backgrounds/stage_bg_base.png` as Image 2
for architecture and camera.

## Outputs

| File | Size | Transparency |
|---|---|---|
| `assets/art/backgrounds/stage_bg_base.png` | 1920x1080 | **opaque** — this is the only opaque asset in the pack; it must carry no alpha or `tRNS` chunk |
| `assets/art/backgrounds/stage_lights_overlay.png` | 1920x1080 | transparent |

## Base

A real small/medium rock venue seen from the drummer's seat: room, balcony,
stage lip near y≈828, dark purple and charcoal foundation.

Reduce brick cracks, rail segments, cable tangles, plank scratches, and small
fixtures into larger architectural shapes. The current background carries
high-frequency texture across the entire field the projectiles cross, which is
the single largest source of visual noise competing with the targets.

Preserve venue depth. Do not flatten the room into an abstract poster.

## Lights overlay

A separate transparent layer of broad magenta, amber, teal, and electric-blue
beams. The runtime multiplies this layer's opacity with a continuous raised
cosine on the beat (0.58–0.72), so:

- the beams must look correct across that whole opacity range;
- do not bake any pulse, flicker, or beat animation into the pixels;
- keep beams broad and soft — they must not paint over the silhouette of a
  bottle crossing them.

## Production output contract

The opaque base is a full-bleed room, not an isolated subject: no studio card,
feet baseline, transparent padding, or cutout. Resize it to 1920x1080 RGB using
`scripts/resize-png.mjs --opaque true`. Preserve the stage lip near y=828.

For lights, request genuine transparency and preserve generated partial alpha.
A gray-card cutout was rejected during live smoke: it created opaque pastel
patches with hard edges. The accepted edit used the built-in image generator
and only resized its already-transparent output to 1920x1080.

Final correction prompt (2026-09-03):

> Use case: lighting-weather. Image 1 is the existing light overlay edit target.
> Correct only opacity and edge treatment: four faint translucent shafts fading
> smoothly to fully transparent at sides and lower ends, not chalk strokes.
> Preserve the 16:9 canvas and positions: magenta/amber from upper left,
> teal/blue from upper right. Large center and bottom half entirely transparent.
> Genuine alpha background; no checkerboard, gray card, room, other objects,
> speckled edges, white/gray paint, outline, or text. No central beam.
> The runtime composites at 0.58–0.72 opacity: never obscure venue or projectiles.

Stage raw sources and canonical candidates separately. Integrate only after
inspection over the actual room, then run `npm run verify`.

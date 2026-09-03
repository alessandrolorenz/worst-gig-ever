# V2 Production — Drummer-POV Drum Kit

Read `00-style-bible.md`, then use the **approved** drum-kit sample as Image 1.

> The corrected proof candidate has a clear snare and no drumsticks. Production
> remains blocked until the owner explicitly approves the complete proof set.

## Output

`assets/art/drums/drumkit_pov.png` — exactly **1920x700 transparent**.

Authored at canvas width; the runtime places it at native size with a 120 px
downward drop, so the nearest shells run off the bottom edge — that is correct
and intentional, and it is where the closest part of a kit belongs from the
drummer's seat. Do not compose for a fully visible kit.

## Requirements

- Battered red shells, warm gold cymbals, pale worn heads, dark hardware.
- Cymbals, toms, snare, and implied kick stay unmistakable at phone size.
- Simplify stands, dents, tape, grime, and reflection strokes relative to
  Pack 1 — the foreground must get visually lighter, not heavier.
- **Preserve the wide open central sightline.** Bottles approach down five
  lanes through the middle of the canvas; anything painted into that corridor
  competes with a target the player has under a second to read.
- **Leave the lower-centre kick/snare area calm.** The M13.1 Groove Pad is a
  code-drawn ellipse at (960, 970) with half-extents 320x105. It must read as
  part of the kit without the art fighting it.

## Do not

- Bake the Groove Pad, its pulse, glow, ring, label, or any UI into the art.
- Draw drumsticks — strike feedback is the separate `drumstick` asset.
- Draw the drummer's body, arms, or hands.
- Change the viewpoint, the kit layout, or the horizontal positions of the
  components. This is a restyle, not a re-stage.

## Aspect-ratio warning

This family is extremely wide (1920x700 — 2.7:1) — far wider than any aspect a chat image
generator will render natively (they top out around 3:2 landscape). A single
render scaled to fit will either shrink the subject to nothing or crop it.

Expect to assemble these from several overlapping renders, or to render at the
widest available landscape and composite. Whatever the route, the seams must
not fall in the central projectile channel. Raise this before spending a long
render batch on it — it is the one part of the replacement whose production
route is genuinely unsolved.

## Production output contract

**Do not try to output transparency or the canonical pixel size.** Chat image
generators return RGB at their own fixed aspect ratios, and asking for alpha
produces a painted checkerboard instead — that is what wrecked the first
proof-generation run. Alpha and framing are added afterwards by
`scripts/condition-art.mjs`, not by the generator.

What the generator must produce:

- **one subject per image**, never a two-pose sheet — each animation state is
  its own render, because each becomes its own file;
- on a **flat warm-gray studio card**, evenly lit, no gradient, no vignette, no
  cast shadow, no scenery, no ground plane. The card is what gets cut, so it
  must be uniform and must not appear anywhere in the subject's outline;
- **generous even margin** around the subject on all four sides;
- the character's **feet flat on an imaginary floor line**, standing upright and
  level, with the same apparent body scale in every state of a family — the
  conditioning step aligns the feet anchor, and it cannot fix a figure that is
  tilted, cropped, or drawn at a different size;
- free of text, logos, brands, watermarks, real-person likenesses, and gore.

Any output resolution is fine as long as the subject is large in frame.

Conditioning then cuts the card to alpha, feathers the edge, crops to the
subject, scales it into the canonical box, pads to the exact frame, and lands
the feet on the shared baseline.

Do not overwrite anything under `assets/art/` until the owner has approved the
V2 direction. Stage the raw renders, condition them, then integrate through
`docs/assets/M14-V2-INTEGRATION-RUNBOOK.md`.

After conditioning, run `npm run measure:art` and `npm run validate:art`.

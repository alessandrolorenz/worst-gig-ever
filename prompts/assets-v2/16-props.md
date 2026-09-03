# V2 Production — Throwable Props and Drumstick

Read `00-style-bible.md`. Use the approved performer lineup as Image 1 for
style and the current prop as Image 2 for silhouette.

> Requires the approved beer-bottle proof from `06-beer-bottle-sample.md`,
> approved with the complete proof set on 2026-09-02.

## Outputs

| File | Size | Notes |
|---|---|---|
| `assets/art/props/beer_bottle.png` | 256x512 transparent | primary target |
| `assets/art/props/beer_mug.png` | 384x384 transparent | primary target |
| `assets/art/props/drumstick.png` | 640x96 transparent | strike feedback |
| `assets/art/props/whiskey_bottle.png` | 280x560 transparent | **deferred — do not produce in M14** |

## The hard constraint on the two targets

This is the tightest rule in the whole replacement, and it is enforced by a
test that already exists.

A target's *visible* artwork must stay inside the circle the player can tap.
The runtime fits the frame into a draw box with `resizeMode="contain"` and then
discounts the transparent padding, so what matters is the **opaque bounding box
inside the frame**, not the frame itself. Pack 1 measures:

- bottle: 110x494 opaque inside its 256x512 frame;
- mug: 307x339 opaque inside its 384x384 frame.

Those were the original `TARGET_ART_CONTENT` values in
`game/rendering/composition.ts`, and `tests/composition.test.ts` checks the
resulting reach against `effectiveHitRadius` at every approach scale. The
bottle has almost no slack — it is a tall thin object whose half-diagonal is
nearly its half-height, and it is the reason `hitRadiusAtDangerLine` was moved
when the draw size grew.

Measured on the historical Pack 1 art, the bottle clears its tap circle by **1.7 px** at
its tightest approach scale. The mug has 5.3 px. That is the entire budget.

So: **keep the new opaque bounds at or below the Pack 1 numbers.** A bottle
even slightly taller or wider in its opaque box will fail the test, and the fix
is the art, never the hitbox. `npm run measure:art` measures the replacement,
reports the slack, and prints the exact `TARGET_ART_CONTENT` values to paste
into `game/rendering/composition.ts` — do that before running `npm test`.

Integrated V2 measurements (2026-09-03): bottle 94x470 with 5.1 px minimum
slack; mug 306x312 with 8.1 px. `TARGET_ART_CONTENT` now records these values.
No hit radius changed.

## Direction

- **Bottle:** amber glass, gold cap, one broad blank teal label block with no
  text or border, two or three large highlight shapes. Narrow strong vertical
  silhouette that survives rotation and shrinking to roughly 40 px tall.
- **Mug:** squat clear/amber silhouette, one bold handle, limited foam. Must
  stay instantly distinguishable from the bottle at small size — the pair is
  read by silhouette, not colour.
- **Drumstick:** plain warm wood, one contour, one shadow tone. Drawn
  horizontally in its 640x96 frame.

Generic and unbranded throughout: no label text, no recognizable commercial
bottle shape, no decorative typography, no bubbles.

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

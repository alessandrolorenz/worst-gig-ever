# V2 Production — Break Effects

Read `00-style-bible.md`. Use the approved performer lineup as Image 1 for
style.

## Outputs

| File | Size | Notes |
|---|---|---|
| `assets/art/effects/hit_burst.png` | 256x256 transparent | break flash |
| `assets/art/effects/glass_shard_01.png` … `glass_shard_06.png` | 128x128 transparent each | six distinct shards |
| `assets/art/effects/dust_puff.png` | 256x256 transparent | **deferred — do not produce in M14** |

The six shards are a fixed ordered array in the runtime. Keep the numbering:
`glass_shard_01` through `glass_shard_06`, no gaps, no renaming.

## Direction

- **Hit burst:** compact magenta/amber/cream arcade star. Quick and
  satisfying, no text, no rays so long they cover the Groove Pad or an
  incoming target. It confirms a hit — it must not hide the next one.
- **Shards:** six *clearly different* translucent teal/amber silhouettes, one
  highlight each. They are thrown by the physics engine and rotate, so each
  must read as a distinct shape rather than six versions of one triangle.
  No painted motion blur — the motion is simulated.

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

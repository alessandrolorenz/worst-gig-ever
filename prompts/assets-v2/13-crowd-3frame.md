# V2 Production — Crowd Layers

Read `00-style-bible.md`, then use the **approved** crowd sample as Image 1.

> The corrected proof candidate uses an independent cast, reduced detail, and a
> clear centre channel. Do not start production until the owner explicitly
> approves the complete proof set. The detail budget in the proof prompt governs
> everything here.

## Derivation rule

Every state below is derived **from the one approved canonical reference**, as
an edit of it — never regenerated from a text-only prompt. Generating each
frame independently is exactly what produced Pack 1's broken ambient loop,
where the drawn subject changes 60–87% between consecutive frames and the
runtime has to hold a single frame with `AMBIENT_LOOP_ART_READY = false`.

## Detail budget

The crowd is supporting scenery and must simplify **more aggressively than the
performers**:

- grouped charcoal value masses, not individually rendered figures;
- contour weight thinner than or equal to the band's;
- two or three expressive faces in the front row; everything behind them
  resolves into simplified head and shoulder shapes;
- controlled magenta, teal, amber, green, blue, and orange accents;
- no tattoos, fishnet grids, garment seams, or individual hair strands;
- a calm low-detail channel through the central lanes, so a bottle crossing the
  crowd never loses its silhouette.

Never a featureless silhouette wall — the crowd still boos, scowls, throws, and
raises fists and horns.

## Outputs

| File | Size | Direction |
|---|---|---|
| `crowd_back.png` | 1920x520 transparent | Distant rear crowd. The most simplified layer in the game: grouped masses, minimal faces, low contrast so it sits behind everything. Drawn to sit at canvas y=440. |
| `crowd_front_01.png` | 1920x420 transparent | Canonical front-crowd frame. Nearer figures, upper bodies and selected full figures, the expressive front faces. Drawn to sit at canvas y=482. |
| `crowd_front_02.png` | 1920x420 transparent | Identity-preserving edit of frame 01. Same cast, same positions, same clothing — arms, fists, and heads move on the beat. |
| `crowd_front_03.png` | 1920x420 transparent | Second edit of frame 01. The third beat position. Same cast again. |

The three front frames are the same crowd in three poses. Same people, same
order, same wardrobe, same horizontal positions — only limbs and heads move.
`npm run measure:art` reports the change ratio across this triplet on the same
provisional 25% gate as the performers.

No bottle, mug, or drumstick may be baked into any crowd layer — projectiles
are drawn by the runtime.

## Aspect-ratio warning

This family is extremely wide (1920x520 and 1920x420 — up to 4.6:1) — far wider than any aspect a chat image
generator will render natively (they top out around 3:2 landscape). A single
render scaled to fit will either shrink the subject to nothing or crop it.

Production route used: derive left and right groups from the approved crowd
reference; keep each group's cast fixed across edits. Condition front halves
to 900x420 and composite at x=0 and x=1020 on 1920x420 using
`scripts/assemble-crowd-frame.mjs`. The central opening is intentional. Rear
halves are 960x520 at x=0 and x=960. Stabilize frame 03 against frame 01 in the
upper-body motion region, then measure all three transitions including wrap.

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

# V2 Production — Bassist Pack

Read `00-style-bible.md`, then use the approved canonical reference
`design-reference/m14-v2-proof/bassist-reference-v2.png` as **Image 1** on
every call in this file.

## Derivation rule

Every state below is derived **from the one approved canonical reference**, as
an edit of it — never regenerated from a text-only prompt. Generating each
frame independently is exactly what produced Pack 1's broken ambient loop,
where the drawn subject changes 60–87% between consecutive frames and the
runtime has to hold a single frame with `AMBIENT_LOOP_ART_READY = false`.

## Locked identity

Original fictional brown-skinned adult; the shortest and widest of the three;
broad shoulders and hips, thick arms and legs; square-round face with broad
nose and heavy brows; dark curly high puff with shaved sides; gold ear stud;
teal ripped vest; burnt-orange shirt; purple cargo trousers simplified into
large pockets; amber work boots; black wrist band; red-and-cream generic bass.
Grounded, stubborn, bracing against a bad show.

Nothing in that list may change between states.

## Outputs — each 640x900 transparent

| File | State | Direction |
|---|---|---|
| `bassist_idle.png` | `idle` | Canonical ambient pose. Rear three-quarter toward the audience, low wide stance, bass held across the body, scowling toward the stage front. |
| `bassist_loop_a.png` | `loopA` | Edit of idle. Head nods down on the beat, picking hand shifts, knees dip a few pixels. Feet unchanged. |
| `bassist_loop_b.png` | `loopB` | Edit of idle. Head back up, shoulders rotate slightly, bass neck lifts a few degrees. Feet unchanged. |
| `bassist_hit_reaction.png` | `hitReaction` | Comic recoil while still oriented toward the audience — braced, annoyed, unmoved rather than knocked over. That stolidity is the character's joke. |
| `bassist_dodge.png` | `dodge` | A grudging, minimal lean out of the corridor while still oriented toward the audience. Still reads as a dodge in silhouette. |

There is no bassist blocking state. `bassistGroove` is a deprecated alias of
`bassistLoopA` — do not draw a separate pose or write a separate file for it.

## Anchor and continuity rule

All six/five outputs share one feet/ground anchor. The character's lowest
opaque pixel must land on the same scanline in every frame, within a few
pixels — the runtime places all three performers on one floor line
(`PERFORMER_BASELINE_Y = 862`) inside a shared `370x520` frame, so a drifting
anchor makes the band bob independently of the beat.

Across `idle`, `loopA`, and `loopB` specifically:

- it must read as one drawing in three poses, not three drawings;
- face, hair mass, outfit, palette, proportions, instrument, and camera angle
  are identical;
- only head, shoulders, arms, and instrument move, and only slightly;
- feet do not move at all.

`npm run measure:art` reports the measured anchor drift and the frame-to-frame
change ratio for each triplet. Provisional gate: drift ≤ 8 px, change ≤ 25%.

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

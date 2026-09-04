# V2 Production — Mug Drink Reaction (3 frames, chained)

Read `00-style-bible.md` first, every time.

Spec: `docs/specs/M18-mug-drink-reaction.md`.

> These are the only assets M18 needs. Nothing else in the pack changes.

> **The 2026-09-04 gate does not change this brief.** M18 only plays the drink
> when the mug is caught near the drummer (`closeness` ≥ 0.5); a mug hit far
> away breaks with the stick and never animates. These frames were always a
> close-range POV catch — the gate simply guarantees the mug really is that
> close whenever they play.

## Derivation rule — read this before generating anything

**Frame 1 is drawn. Frames 2 and 3 are edits of the frame before them, never
fresh renders from text.** This is the same rule the crowd and performer packs
follow (`13-crowd-3frame.md`), and it exists because Pack 1's ambient loop was
generated frame-by-frame from text and came back changing 60–87% between
consecutive frames — three different drawings instead of one drawing moving.

The performers survived that by being composited: `stabilize-animation-frame.mjs`
blended each generated edit onto the canonical idle, which is why
`M14-V2-PRODUCTION-PROVENANCE.md` can report 0 px drift. **That rescue is not
available here.** It works when a body holds still and one region moves; in the
drink the whole subject moves, so there is no shared base to blend onto. The
continuity has to come from the generation itself, which is why this brief is
chained.

## The anchor that must hold

The forearm enters the picture at the **bottom-right corner** and runs off the
bottom and right edges. Call the place it crosses the bottom edge the **entry
point**. Across all three frames:

- the entry point must sit at the **same horizontal position**;
- the forearm must be the **same thickness** there;
- the arm must be at the **same apparent scale**, with the same skin tone and
  the same sleeve or wristband.

Everything above the wrist is supposed to change enormously. This is a
**sequence, not a loop** — frame 3 is not meant to resemble frame 1, and the
25% frame-to-frame gate that governs the performer triplets is deliberately
turned off for this family.

**`npm run measure:art` will not catch a violation of this.** Its anchor is the
lowest opaque row (`measure-art-bounds.mjs`, `bounds.map(b => b.maxY)`), and
since the forearm runs off the bottom edge in all three frames that row is the
last row in all three and the drift reads 0 whatever the arm does sideways. The
check passes without having looked. **Judge the entry point by eye**, on the
three frames side by side, before judging anything else. If it drifts, say so
and M18 adds a real sequence check rather than pretending the gate covered it.

## Outputs

| File | Size | Notes |
|---|---|---|
| `assets/art/effects/mug_drink_01_catch.png` | 640x544 transparent | frame 1 |
| `assets/art/effects/mug_drink_02_raise.png` | 640x544 transparent | frame 2 |
| `assets/art/effects/mug_drink_03_drink.png` | 640x544 transparent | frame 3 |

They are drawn into a 520x440 rect at canvas x 1380–1900, y 640–1080, so the
frame is that box at 1.23x with padding for the conditioning step.

## Keep frame 1 cheap to redraw

Whatever frame 1 invents has to be reproduced twice. Give the arm **one**
identifying feature at most — a pushed-up sleeve, or a single wristband, or
neither. No tattoos, no watch, no laces, no bracelets stack. The hand holds
**no drumstick**: the drummer dropped it to take the mug, and that is the joke.

---

## Step 1 — the catch

**Attach:** `assets/art/drums/drumkit_pov.png` (viewpoint and palette) and
`assets/art/props/beer_mug.png` (the mug's exact identity).

Paste:

```
Stylized punk arcade cartoon illustration, flat cel shading with a single
shadow tone, confident bold dark-charcoal outer contours, large readable colour
areas, medium internal detail. Not photorealistic: no cross-hatching, no
painted lighting, no fine texture, no micro-folds.

Subject: a drummer's own bare hand and forearm, seen from the drummer's own
seat in first person, entering the picture from the BOTTOM-RIGHT CORNER and
running off the bottom and right edges of the image. No face, no head, no
shoulders, no other character, no drum kit, no scenery — the hand and forearm
are the only subject in the picture.

Action: the hand has just closed around the handle of a flying beer mug and
caught it. The mug is still TILTED from its flight, low in the frame, with beer
and foam slopping over the rim from the impact. The grip is firm and the
fingers wrap the handle clearly.

The mug (match the attached mug image exactly): a chunky stylized faceted glass
beer mug, amber-orange body, thick cream-white foam head, a bold pale
grey-blue faceted handle turned toward the hand, a matching pale grey-blue
faceted base band, heavy dark outline. Same proportions, same colours.

The arm is nearer to the camera than anything else in the game, so draw it
LARGE in the frame with a slightly heavier contour weight than a background
character would get. Simple: bare forearm, no tattoos, no watch, no jewellery.
The hand holds no drumstick.

Composition: one single pose, filling the frame, on a FLAT WARM-GREY STUDIO
CARD — evenly lit, no gradient, no vignette, no cast shadow, no ground plane,
no background objects. Generous even margin on all four sides.

No text, no letters, no logos, no brand marks, no label on the mug, no
watermark, no signature, no real-person likeness, no gore.
```

Iterate here until the catch is right. **Everything downstream inherits this
frame**, so do not move on with an arm you are not happy with.

---

## Step 2 — the raise

**Attach:** the approved **frame 1** as the image to edit.

Paste:

```
Edit the attached image. Keep the SAME drawing, the same art style, the same
arm, the same hand, the same skin tone, the same mug, the same flat warm-grey
studio card, the same lighting and the same margins. This is the second frame
of a three-frame animation of one continuous motion — it must read as the same
drawing moved, not as a new illustration.

MUST NOT CHANGE: the forearm still enters from the bottom-right corner and runs
off the bottom and right edges, crossing the bottom edge at exactly the same
horizontal position and at exactly the same thickness as the attached image.
Same apparent arm scale. Same contour weight.

WHAT CHANGES: the arm has brought the mug UP and INWARD, toward the centre-left
of the frame. The mug is now UPRIGHT instead of tilted, the wrist has rotated to
level it, the foam has settled into a calm head, and the spilled beer of the
previous frame is gone. More of the forearm is now visible, up to about the
middle of the picture. Push the movement clearly — this is the middle of a fast
gesture, so exaggerate the travel rather than nudging it.

Still one single pose, no face, no other character, no drum kit, no scenery.
No text, no logos, no label, no watermark.
```

---

## Step 3 — the drink, and the payoff

**Attach:** the approved **frame 2** as the image to edit, and the approved
**frame 1** alongside it as the anchor reference.

Paste:

```
Edit the first attached image (frame 2). Keep the SAME drawing, the same art
style, the same arm, the same hand, the same skin tone, the same mug, the same
flat warm-grey studio card, the same lighting and the same margins. This is the
final frame of a three-frame animation of one continuous motion.

MUST NOT CHANGE: the forearm still enters from the bottom-right corner and runs
off the bottom and right edges, crossing the bottom edge at the same horizontal
position and the same thickness as in BOTH attached images. Same apparent arm
scale. Same contour weight.

WHAT CHANGES: the mug is now TIPPED HARD TOWARD THE CAMERA and the drummer is
drinking from it. The BASE OF THE MUG FACES THE VIEWER almost straight on — we
are looking up into the bottom of the glass as a bold pale grey-blue faceted
disc, with the amber body foreshortened behind it. Beer is visibly draining,
and a little foam escapes past the rim toward the camera. The wrist is rolled
right over.

This is the punchline frame and it must be the MOST EXAGGERATED of the three —
bigger, closer and more committed than frame 2. Do not make it a small
increment. Do not make it resemble frame 1; it is the end of a sequence, not a
loop.

Still one single pose, no face, no other character, no drum kit, no scenery.
No text, no logos, no label, no watermark.
```

---

## Production output contract

**Do not ask the generator for transparency or for the canonical pixel size.**
Chat image generators return RGB at their own aspect ratios, and a transparency
request comes back as a painted checkerboard — that is what wrecked the first
proof run. Alpha and framing come from `scripts/condition-art.mjs`.

- **One pose per image**, never a three-pose sheet. Each becomes its own file.
- The warm-grey card must be uniform and must not appear inside the subject's
  outline.
- Any output resolution is fine as long as the subject is large in frame.
- Free of text, logos, brands, watermarks, real-person likenesses, and gore
  (AGENTS.md rule 12).

## After generation

Save the three raw renders in order and condition them through one shared crop,
so scale and anchor cannot drift between files:

```sh
node scripts/condition-art.mjs \
  --input-dir design-reference/m18-drink-raw \
  --output-dir design-reference/m18-drink-staging \
  --prefix mug_drink_ --width 640 --height 544
npm run measure:art
npm run validate:art
```

Stage the raw renders first. **Do not overwrite anything under `assets/art/`**
until the owner has approved the three frames as a sequence.

## How to judge them

In this order, because the cheap failures are first:

1. **Entry point**, three frames side by side — same place, same thickness,
   same arm. The script cannot see this; you can.
2. **Frame 3 alone.** It is on screen as the payoff and it is the frame anyone
   will remember. If only one frame is excellent, it must be this one.
3. **The motion**, at 120 ms per frame — not the stills. Frames 1 and 2 are on
   screen for a tenth of a second each and only have to carry the arc.

Re-run step 2 or step 3 alone if one frame fails; the chain means a bad frame 2
also costs frame 3, but a bad frame 3 costs nothing above it.

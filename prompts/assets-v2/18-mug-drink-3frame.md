# V2 Production — Mug Drink Reaction (3 frames)

Read `00-style-bible.md` first, every time. Use the approved drum-kit POV
render as Image 1 for viewpoint and the approved `beer_mug.png` as Image 2 for
the mug's exact silhouette, colour, and handle.

Spec: `docs/specs/M18-mug-drink-reaction.md`.

> These are the only assets M18 needs. Nothing else in the pack changes.

## Outputs

| File | Size | Notes |
|---|---|---|
| `assets/art/effects/mug_drink_01_catch.png` | 640x544 transparent | frame 1 |
| `assets/art/effects/mug_drink_02_raise.png` | 640x544 transparent | frame 2 |
| `assets/art/effects/mug_drink_03_drink.png` | 640x544 transparent | frame 3 |

They are drawn into a 520x440 rect at canvas x 1380–1900, y 640–1080, so the
frame is that box at 1.23x with padding for the conditioning step.

## What this is

The drummer's **own hand and forearm**, seen from the drummer's seat — the same
viewpoint as `drumkit_pov.png`, entering the frame from the bottom-right corner.
Not a third-person character. Not the guitarist. There is no face in these
frames and there should not be one: the player is the drummer.

The arm is nearer to the camera than anything else on stage, so it is drawn
larger and with slightly heavier contour weight than the performers.

## The three beats

**Do not render these as a sheet.** One image per frame, three separate renders,
because each becomes its own file.

| Frame | Pose |
|---|---|
| 1 — catch | Hand closes around the handle low in the frame, mug still tilted from its flight, a little beer slopping out of the top. Forearm mostly out of frame at the bottom-right. |
| 2 — raise | Mug brought up and inward toward the centre-left of the frame, now upright, foam settling, wrist rotating. Forearm visible to about mid-frame. |
| 3 — drink | Mug tipped hard **toward the camera**, base of the mug facing the player, beer visibly draining, a little foam escaping the rim. This is the payoff frame and it must be the most exaggerated of the three. |

Fluid, not detailed: three clear poses that read at phone size in 120 ms each.
Exaggerate the arc between frames rather than adding detail inside them.

## Constraints

- **The wrist anchor must hold within 8 px across all three frames** or the arm
  swims. Everything else is supposed to change a lot — this is a *sequence*,
  not an ambient loop, and it is deliberately excluded from the 25%
  frame-to-frame continuity gate that governs the performer triplets. Do not
  try to make frame 3 resemble frame 1.
- The mug must stay the same object as `beer_mug.png`: same amber, same single
  bold handle, same proportions. The player has to recognize the thing they
  just tapped.
- Generic and unbranded: no label text, no logo, no recognizable commercial
  glassware, no typography (AGENTS.md rule 12).
- No face, no other character, no scenery, no drum kit — the kit is already
  drawn underneath.

## Production output contract

Same as every other V2 prompt, and the same reasons.

**Do not try to output transparency or the canonical pixel size.** Chat image
generators return RGB at their own aspect ratios, and asking for alpha produces
a painted checkerboard. Alpha and framing come from
`scripts/condition-art.mjs`, not the generator.

The generator must produce:

- **one pose per image**, never a three-pose sheet;
- on a **flat warm-gray studio card**, evenly lit, no gradient, no vignette, no
  cast shadow, no ground plane — the card is what gets cut, so it must be
  uniform and must not appear inside the subject's outline;
- **generous even margin** on all four sides;
- the arm entering from the same corner at the same apparent scale in all three;
- free of text, logos, brands, watermarks, real-person likenesses, and gore.

Any output resolution is fine as long as the subject is large in frame.

## After generation

```sh
node scripts/condition-art.mjs \
  --input-dir design-reference/m18-drink-raw \
  --output-dir design-reference/m18-drink-staging \
  --prefix mug_drink_ --width 640 --height 544
npm run measure:art
npm run validate:art
```

Stage the raw renders first. Do not overwrite anything under `assets/art/`
until the owner has approved the three frames as a sequence — play them at
120 ms each and judge the motion, not the stills.

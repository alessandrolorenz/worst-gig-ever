# M18 drink — raw generator output

Drop the three renders here, named so they sort in play order:

```
mug_drink_01_catch.png
mug_drink_02_raise.png
mug_drink_03_drink.png
```

Any resolution, any aspect ratio, RGB on the flat warm-grey card — **not**
transparent and not the canonical size. Alpha and framing come from
`scripts/condition-art.mjs`; see `prompts/assets-v2/18-mug-drink-3frame.md`.

Nothing in this folder is a runtime asset, and nothing here may be copied into
`assets/art/` before the owner approves the three frames as a sequence.

## Generation record — 2026-09-04

- Generator: OpenAI built-in image generation/editing tool; no CLI fallback.
- Frame 1 original: `exec-7c479c42-81e6-483a-a9f4-f3f613e09062.png`.
- Frame 2 approved retry: `exec-baecaec9-ac75-40c2-9363-5e47430601b6.png`.
  The first attempt was rejected because its bottom-edge arm entry moved left
  and became visibly thicker.
- Frame 3 perspective-corrected candidate:
  `exec-b8c9e9a8-4728-470f-b392-474c987dffa5.png`. Earlier attempts, including
  `exec-cdd772cd-80ff-4151-9565-2c1e849bbaf6.png`, were rejected because they
  showed the mug's base to the drummer/camera. The selected frame instead
  clearly shows the open rim, amber beer, and foam inside the mug while the
  base recedes away.
- References: `assets/art/drums/drumkit_pov.png` and
  `assets/art/props/beer_mug.png`. Frames 2 and 3 were chained edits as required
  by `prompts/assets-v2/18-mug-drink-3frame.md`.
- All three raw renders are 1254x1254 RGB images. No runtime asset was replaced.

### Conditioning result — resolved 2026-09-04

The first attempt stopped with `Too few card pixels to condition image`. The
cause was not a shortage of card: `cardLike` in `condition-art.mjs` gated on
chroma <= 30, and this generator's card measures **27-35**, straddling the line.
Frame 1 passed 1229 of its 1254 top-border pixels; frames 2 and 3 passed 137
and 343. The border flood had almost nothing to seed from.

The threshold is now the `--card-chroma` flag, **default 30 and unchanged for
every family conditioned before M18** — re-conditioning the bassist family with
the modified script produces byte-identical PNGs to the original under default
flags. This family uses **40**, chosen against the measured gap rather than by
taste:

| | chroma |
|---|---|
| card | 27-35 |
| **threshold used** | **40** |
| foam (nearest subject colour) | 47 |
| skin | 97-112 |
| beer | 153-205 |

The interior handle grey reads at 23 and is card-like at any threshold, but the
flood is border-connected and never reaches it — as true before the change as
after.

## Selection — two frames, 2026-09-04

The owner cut the sequence to two frames after seeing the renders. Measured on
the conditioned 640x544 output, at matched rows, this is also the only pair
that meets the project's 8 px arm-anchor budget:

| Pair | arm edge drift | thickness drift |
|---|---|---|
| **catch -> drink (shipping)** | **2-6 px** | **2-6 px** |
| catch -> raise | 14-15 px | 14-15 px |

`mug_drink_02_raise.png` is kept here as part of the generation record and is
not a shipping frame. The production pair lives in `../m18-drink-pair/`, where
frame 3 is renamed `mug_drink_02_drink.png`, and conditions to
`../m18-drink-staging-pair/`:

```sh
node scripts/condition-art.mjs \
  --input-dir design-reference/m18-drink-pair \
  --output-dir design-reference/m18-drink-staging-pair \
  --prefix mug_drink_ --width 640 --height 544 --card-chroma 40
```

Owner review of the motion remains the checkpoint; nothing here has been
promoted into `assets/art/`.

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

### Conditioning result

The mandated shared conditioning command was attempted, but stopped with
`Too few card pixels to condition image`. Although the background reads as a
warm-grey card, the generator introduced enough chromatic edge variation to
violate the conditioning script's strict card model. No partial staging output
was accepted and no threshold was weakened. Resolve the card before production
promotion; owner review of the raw motion remains the current checkpoint.

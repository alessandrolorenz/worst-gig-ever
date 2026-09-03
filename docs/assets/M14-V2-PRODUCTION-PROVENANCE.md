# M14 V2 Production Provenance

Recorded 2026-09-03. This ledger supersedes the Pack 1 production rows in
`ART-PROVENANCE.md` for all 33 canonical runtime PNGs. Historical Pack 1 rows
remain as history; the seven approved proof rows still describe the references.

The companion `M14-V2-PRODUCTION-PROVENANCE.json` records every asset key,
runtime path and SHA-256, prompt file, canonical reference, raw path and SHA-256,
original generator filename, source date, provider, and conditioning method.
All 37 selected raw images are retained under `design-reference/m14-v2-raw/`.
Canonical candidates remain under `design-reference/m14-v2-staging/`.

Provider/author: OpenAI built-in image generation, directed for this project.
Rights: original/generated images of fictional adults and generic props; no
third-party stock pack, real-person likeness, band logo, or branded alcohol
label. No external source page or third-party asset license applies.

## Production decisions and deviations

- **Performer identity:** use the approved individual reference, then derive
  ambient/reaction states from its production idle. A front-facing guitarist
  family was rejected after the owner's orientation correction; all integrated
  guitarist states face the audience in rear three-quarter view. Only vocalist
  blocking intentionally turns toward the drummer.
- **Continuity:** shared crop and baseline, with selected upper-body generated
  edits blended onto idle using `stabilize-animation-frame.mjs`. Vocalist ROI
  was .20/.03/.86/.38, feather .04; guitarist loop B used .08/.03/.85/.58,
  feather .05. Crowd frame03 used 0/0/1/.52, feather .05. These are offline
  compositing decisions; no new runtime frames, timing, or animation states.
- **Crowd width:** two independently rendered groups of the approved cast,
  assembled with `assemble-crowd-frame.mjs`. Front halves are 900x420 at x=0
  and x=1020 on 1920x420; back halves are 960x520 at x=0 and x=960. The front
  center opening is intentional. No projectile is baked into either layer.
- **Drum kit:** one full kit render, not the proposed multi-part route. Extract
  the card at 1920x1080 with `condition-art.mjs --bg-distance 45`, then resize
  vertically to 1920x700 using `resize-png.mjs`. The canonical foreground box
  and lower-centre pad remain unchanged. The snare contains no sticks.
- **Stage:** opaque full-bleed base, resized to 1920x1080 RGB. It must not pass
  through a subject crop or foot-anchor routine.
- **Lights:** the gray-card cutout failed live smoke (hard pastel patches).
  A built-in generator edit produced genuine partial alpha. Only resize that
  output; do not run the card extractor. Final source is
  `exec-4fa323b8-08a6-42a5-82c3-d0dfa5a44ba1.png`. There are 1,324,344 clear
  and 749,256 partially transparent pixels, with no fully opaque pixels.
- **Props:** extraction followed by `fit-alpha-content.mjs`. Final measured
  bottle content94x470 and mug306x312 replace the old presentation measurements
  in `TARGET_ART_CONTENT`. Hitboxes are unchanged; minimum slack5.1/8.1px.
- **FX:** centered burst256x256 and six shards128x128. Distinct silhouettes:
  teal sliver, amber crescent, teal quadrilateral, amber fork, teal clipped
  diamond, amber irregular chip. No gore or text.
- **Derived identity:** `node scripts/make-app-icon.mjs` regenerated
  `assets/icon.png`, `assets/adaptive-icon.png`, `assets/favicon.png`, and
  `assets/splash.png` on 2026-09-03 from the V2 bottle and drumstick. Same
  script/layout and rights as the historical ledger; source pixels are V2.

## Validation

`npm run verify` now checks code, the 33-file contract and strict continuity.
The pixel gate checks all three transitions including loop B→idle, and fails
on missing or fully transparent frames. Thresholds remain unchanged at 8px
anchor drift and 25% pixel change. See `docs/verification/M14-gate.md` for
measurements and live smoke. Physical-device owner approval remains pending.

# Canonical reference register

Production files are references only; never overwrite or import marketing art into runtime. Paths below are relative to the repository root. Existing provenance stays in `docs/assets/`.

| Reference | Role |
| --- | --- |
| `assets/art/story/01_poster.jpg` | Existing distressed title/poster, cast proportions and garage tone |
| `assets/art/story/02_arrival.jpg` | Band arrival and bar narrative |
| `assets/art/story/03_setup.jpg` | Drummer hair, black shirt, dark jeans, red kit, backstage behavior |
| `assets/art/story/04_performance.jpg` | Main full-band identity, stage lighting, drummer front view and crowd |
| `assets/art/story/05_sound_desk.jpg` | World/sound-desk narrative |
| `assets/art/band/vocalist_loop_a.png` | Canonical vocalist outfit, silhouette and proportions |
| `assets/art/band/bassist_idle.png` | Bassist skin, puff hair, clothes, red bass and ochre boots |
| `assets/art/band/guitarist_idle.png` | Guitarist orange hair, plaid flares, cream/teal guitar |
| `assets/art/backgrounds/stage_bg_base.png` | Actual gameplay venue geometry and palette |
| `assets/art/drums/drumkit_pov.png` | Red worn-star shells, gold cymbals, player POV |
| `assets/art/props/beer_bottle.png` | Amber bottle, blank teal label |
| `assets/art/props/beer_mug.png` | Angular glass mug and foam |
| `assets/art/effects/mug_drink_01_catch.png`, `mug_drink_02_drink.png` | Actual POV catch/drink mechanic |
| `assets/art/crowd/crowd_front_01.png` | Readable bar-crowd silhouettes |
| `assets/art/results/gig_payout.png` | Canonical owner, exhausted band, cash and next-booking slip |
| `docs/verification/m18.5-evidence/round-new-package.png` | Historical real Android gameplay capture; reference only, not current release proof |
| `docs/verification/m18.5-evidence/title-new-package.png` | Historical four-stage title/UI treatment; predates latest setlist/results |
| `docs/verification/m16-evidence/stage2-beat-alone.png` | Historical Groove Pad placement/pulse reference |

There is no standalone canonical drummer sprite: story/performance and payout establish his identity. Groove Pad is runtime-rendered UI, not a new physical branded instrument. Promotional pulse rings are a metaphor; never label them a screenshot.

Current title, results and Custom Setlist implementation were inspected in `game/rendering/Overlays.tsx`; eleven selectable tracks and four distinct slots were verified in the music catalogue/setlist implementation and M24C spec. Historical captures are suitable for a labeled layout concept. Fresh captures are needed for final store advertising.

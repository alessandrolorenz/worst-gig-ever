# Pack 1 Art Production State

Last updated: 2026-08-30  
Branch: `m5/physical-playtest`  
Completed baseline before art production: `90cf9d7b29bb895d7283d017352424426e000a4c` (`docs: prepare M6A asset pack production`)

## Current gate state

- M5A is complete at `4aa553752c5ed1fdfc47d03a3f8548a44aeb43f3`; do not reimplement it.
- M6 is complete at `6506698fd6d399c97d2960332996f98d78c63765`.
- M6A is complete at `90cf9d7b29bb895d7283d017352424426e000a4c`.
- Pack 1 required assets: 8 present, 25 missing, 0 invalid.
- Optional assets missing: 2 (`whiskeyBottle`, `dustPuff`); optional files do not block the gate.
- Current validator result: `PASS_CONTRACT_ART_MISSING` / `ART_ASSETS_MISSING`.
- M6B has not started. The running game still uses graybox rendering until M6B integrates the PNG files.

Run `npm run validate:art` for the current inventory and
`npm run validate:art -- --require-ready` for the blocking Art Gate.

## Locked owner direction

1. The camera is the drummer's point of view at the rear of the stage, looking outward.
2. The crowd faces the drummer/stage/camera; faces and front torsos are visible.
3. Bandmates stand between drummer and crowd and are mostly seen from the back or three-quarter back.
4. The vocalist's blocking pose turns toward the drummer/camera.
5. The crowd is comically furious: exaggerated scowls, booing, fists, silly outrage, playful rather than grim, with no gore.
6. Crowd motion shows the source of incoming throws through empty-handed wind-up, release, and follow-through poses aimed toward the drummer/camera.
7. Bottles and mugs remain isolated runtime projectile assets. They are not baked into crowd frames.
8. The vocalist is tense and confrontational toward the crowd, not friendly: squared shoulders, clenched fist, defiant microphone pose, still humorous and nonviolent.

These decisions are also recorded in the M3/M6 specs and Pack 1 prompt files.

## Accepted assets

| Asset | Selected generator output | Final properties | SHA-256 |
|---|---|---|---|
| `assets/art/backgrounds/stage_bg_base.png` | `exec-ab7d2df4-d93f-4852-9c52-0f00a3669773.png` | 1920x1080 RGB | `cee443af1eafccecd0d2f14ef2db7c789651b60783d59ea7c2d870b6257139e2` |
| `assets/art/backgrounds/stage_lights_overlay.png` | `exec-5d19f5ba-0e56-4d7e-8006-5938f1848477.png` | 1920x1080 RGBA | `688231254565004e87aa9d1f12b628d42a76e0137c353ae236c9467a783573ae` |
| `assets/art/crowd/crowd_back.png` | `exec-cd8889d0-cd79-416d-b83b-5f114ec1efd6.png` | 1920x520 RGBA | `43492dc0aae3d62531c51ff35e1974a2702e0d42dea6ea4a01e9cf3452abe63b` |
| `assets/art/crowd/crowd_front_01.png` | `exec-c48f9fe3-17e3-4f22-95e0-be7292e7f368.png` | 1920x420 RGBA | `539bf62cd7ed2e7eec3f0a8c53568dd045b587d68217ab6e97ffb5823a0c2997` |
| `assets/art/crowd/crowd_front_02.png` | `exec-2264c3a7-5f37-43d8-8d3f-23ba144f9225.png` | 1920x420 RGBA | `c1b43d14f14c52e077e1d52ae204ee4c5947dea5620644cb87cd047e35977363` |
| `assets/art/crowd/crowd_front_03.png` | `exec-7dd74df5-a53c-4469-baf7-32c30b911b32.png` | 1920x420 RGBA | `85c1309657ff785c0b674ffccc50c93bc750699235f71b1c0b43be920a9959fb` |
| `assets/art/drums/drumkit_pov.png` | `exec-3bab72b4-6818-41a7-81f3-e286bc0dd20b.png` | 1920x700 RGBA | `df12c0bf2794084325f596e862e87dacb7359cedcfd3a83ea38d94c5fdc1` |
| `assets/art/band/vocalist_idle.png` | `exec-ff5b49e7-3af1-4c68-98ce-ee3190b32e38.png` | 640x900 RGBA | `d9530009b991b98ffaa0c0b63a019db13be5938873aee431d29a2291cbe31fc0` |

Generator outputs live under
`/Users/alessandrolorenz/.codex/generated_images/01a05487-7d2d-71a2-b39d-5ec1bf3a8134/`.
The production copies in `assets/art/` are the authoritative versions.

## Rejected output notes

- The first background showed the wrong side of the stage (`exec-df3253cf...`).
- Initial crowd attempts faced away from the drummer (`exec-c592...`, `exec-428...`).
- Several reference/edit attempts embedded a checkerboard or gradient into RGB pixels instead of real transparency (`exec-1c135...`, `exec-cd117...`, `exec-9a170...`, `exec-0f525...`, `exec-052bc...`, `exec-5aab...`, `exec-f04e...`). Do not use them.
- A friendlier valid vocalist (`exec-0038c0d6...`) was superseded after owner feedback. Do not restore it.
- Direct, concise transparent-cutout generations have produced reliable RGBA files. Always inspect with `file` or `sips -g hasAlpha` before accepting an output.

## Missing required assets and production order

1. Vocalist: `vocalist_loop_a`, `vocalist_loop_b`, `vocalist_blocking`, `vocalist_hit_reaction`, `vocalist_dodge`.
2. Bassist: `bassist_idle`, `bassist_loop_a`, `bassist_loop_b`, `bassist_hit_reaction`, `bassist_dodge`.
3. Guitarist: `guitarist_idle`, `guitarist_loop_a`, `guitarist_loop_b`, `guitarist_hit_reaction`, `guitarist_dodge`.
4. Props: `beer_bottle`, `beer_mug`, `drumstick`.
5. Effects: `hit_burst`, `glass_shard_01` through `glass_shard_06`.

The complete dimensions, alpha requirements, and matching prompt paths are
authoritative in `assets/manifest/asset-manifest.json` and are printed by
`npm run validate:art`.

## Resume procedure

1. Generate one distinct asset per built-in image-generation call using the corresponding `prompts/assets/*.md` contract.
2. Reject any output with a baked checkerboard, gradient, text, logo, real-person likeness, or branded label.
3. Mechanically resize accepted outputs with `sips -z HEIGHT WIDTH SOURCE --out TARGET`.
4. Confirm the exact dimensions and required alpha with `file`/`sips` and `npm run validate:art`.
5. Add a factual row to `docs/assets/ART-PROVENANCE.md` for every accepted file.
6. Update this document after each character/effect group so another agent can resume without reconstructing decisions.
7. Once all 33 required assets exist, run `npm run validate:art -- --require-ready`. Continue to M6B only after `PASS_ART_READY`.
8. During M6B, integrate with `pointerEvents="none"`, preserve M5A page-coordinate mapping, hitboxes, forgiveness, and projectile arcs, then run the game for visual smoke testing.

Do not push, run EAS, publish, or add third-party substitute art.

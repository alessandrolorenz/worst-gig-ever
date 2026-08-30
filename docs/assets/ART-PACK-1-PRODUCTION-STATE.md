# Pack 1 Art Production State

Last updated: 2026-08-30  
Branch: `m5/physical-playtest`  
Completed baseline before art production: `90cf9d7b29bb895d7283d017352424426e000a4c` (`docs: prepare M6A asset pack production`)

## Current gate state

- M5A is complete at `4aa553752c5ed1fdfc47d03a3f8548a44aeb43f3`; do not reimplement it.
- M6 is complete at `6506698fd6d399c97d2960332996f98d78c63765`.
- M6A is complete at `90cf9d7b29bb895d7283d017352424426e000a4c`.
- Pack 1 required assets: 26 present, 7 missing, 0 invalid.
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
| `assets/art/band/vocalist_loop_a.png` | `exec-2b5efc5e-2227-4800-91b1-24fca3e9648f.png` | 640x900 RGBA | `95eab2953a1277545900bb39c2c4989e1d00ceab8a796f25937dd1edb8760526` |
| `assets/art/band/vocalist_loop_b.png` | `exec-b54be34f-7ef1-4b8b-9658-a43d911b0392.png` | 640x900 RGBA | `c7a2e3e34f36a0229d908e3a2e0366c7fba004ed1f6bdeadc7ad0dde320a751f` |
| `assets/art/band/vocalist_blocking.png` | `exec-00c8edd9-83c5-4550-8b92-9cc4af4ce87d.png` | 640x900 RGBA | `35b1bf1599f7dbe7099aa984df2206b54d05d1e18334d4991ae71f704f88ca3d` |
| `assets/art/band/vocalist_hit_reaction.png` | `exec-88692c14-e5c0-4b73-94e9-2674dc3429bf.png` | 640x900 RGBA | `eb8c940a544ded3887bc6b0cf42c456a2e1c4fc7ab5cb015e705a4e4276513f2` |
| `assets/art/band/vocalist_dodge.png` | `exec-cdc29961-a375-4be6-8b92-4e18a4551107.png` | 640x900 RGBA | `254ed99467dee8789947361ee5b36357a331f0477efc880f5bc14ca97bed2ca7` |
| `assets/art/band/bassist_idle.png` | `exec-d207e23f-0c0c-4531-89fb-34548db08395.png` | 640x900 RGBA | `ffa4201d2e2b9aa28c25e7740e8cc302e30dc7cab3d539c33df23464a79fe898` |
| `assets/art/band/bassist_loop_a.png` | `exec-2df56f87-7e2e-48d0-9c03-aed9c40d1c9f.png` | 640x900 RGBA | `a72fea4c51a24e1c2383b84d94716f9f74dcbf5b2d6f9abf7ad70ec66cda51d9` |
| `assets/art/band/bassist_loop_b.png` | `exec-a0498f7c-f20a-4d0f-978e-b7674b12b206.png` | 640x900 RGBA | `49e23e12f2acb525e7ff5a5c8a30d6721e45a83b25a4683f9256a1b1f8a1aca0` |
| `assets/art/band/bassist_hit_reaction.png` | `exec-40afdd26-2f58-4c21-8610-94e0ca2e6bfb.png` | 640x900 RGBA | `e2dedbd9333b841b065a686d5736adf7f08337d4c49e20da3fe2980cff8a21ae` |
| `assets/art/band/bassist_dodge.png` | `exec-4f35519f-1ccf-45fa-b688-2f2efd3ea2f6.png` | 640x900 RGBA | `59992720815e288cbe8375c1de25ecf5654ab65e14517becc8ccbf776841289b` |
| `assets/art/band/guitarist_idle.png` | `exec-49516bc7-4b34-4c72-ae42-b93b181912f4.png` | 640x900 RGBA | `b344f6c033f1c2a431586f19a60f12a93c21d936a0165fa48aefffa1ff5c47d7` |
| `assets/art/band/guitarist_loop_a.png` | `exec-b51f9d95-8a44-459b-883d-c06a3748e682.png` | 640x900 RGBA | `fabc96444d34f6f5e63889f67f343dfc532ece8448603c40fa922b29057d2cfc` |
| `assets/art/band/guitarist_loop_b.png` | `exec-a4f22a33-9275-48c7-8d22-cd02126faccc.png` | 640x900 RGBA | `9469ae4b836036db18e0dc6424bde0a1b8bbafa232d34c0add129b694c6d4f86` |
| `assets/art/band/guitarist_hit_reaction.png` | `exec-6fb982b7-0356-4aa5-b953-04abd77a706c.png` | 640x900 RGBA | `f2cd839734d24a03e9ab968e056ebe7a1bbbf8b2f625250416487cbf3eaa0477` |
| `assets/art/band/guitarist_dodge.png` | `exec-c2c69de6-94d5-44c7-963e-36ea6d4d0dfd.png` | 640x900 RGBA | `5b9430a04bb43bb4a9c09c63adcf79523c5fcbc439d6c7e088f968dabb8f8933` |
| `assets/art/props/beer_bottle.png` | `exec-789ef5fc-9934-4ba2-9ff5-8cdcf72db8f6.png` | 256x512 RGBA | `ce5464eb358d2819aef6b673f98dd9c482fc78f43fa318140c31b91c0a4ff9f0` |
| `assets/art/props/beer_mug.png` | `exec-947d5d04-8c15-4ef7-88fc-ddd58f64a3de.png` | 384x384 RGBA | `9f0c38992c6a627a871bd7b62ea555a5d95eab5caf543d0892a9c6d810ac2854` |
| `assets/art/props/drumstick.png` | `exec-a87717a8-9676-4d7d-a5b9-e02434beb4fa.png` | 640x96 RGBA | `e7a20882809915d86d23359c7ed795f680b27924f16d7336a4e4eb4faf4137e2` |

Generator outputs live under
`/Users/alessandrolorenz/.codex/generated_images/01a05487-7d2d-71a2-b39d-5ec1bf3a8134/`.
The production copies in `assets/art/` are the authoritative versions.

## Rejected output notes

- The first background showed the wrong side of the stage (`exec-df3253cf...`).
- Initial crowd attempts faced away from the drummer (`exec-c592...`, `exec-428...`).
- Several reference/edit attempts embedded a checkerboard or gradient into RGB pixels instead of real transparency (`exec-1c135...`, `exec-cd117...`, `exec-9a170...`, `exec-0f525...`, `exec-052bc...`, `exec-5aab...`, `exec-f04e...`). Do not use them.
- A friendlier valid vocalist (`exec-0038c0d6...`) was superseded after owner feedback. Do not restore it.
- A bassist reference/edit attempt (`exec-ea62437f...`) baked a checkerboard into RGB pixels and was rejected.
- Direct, concise transparent-cutout generations have produced reliable RGBA files. Always inspect with `file` or `sips -g hasAlpha` before accepting an output.

## Missing required assets and production order

1. Effects: `hit_burst`, `glass_shard_01` through `glass_shard_06`.

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

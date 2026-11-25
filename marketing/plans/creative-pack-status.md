# Marketing Creative Pack Status

**PARTIAL** — six key-art concepts and written planning are ready for owner review. The image-generation service reached its usage limit before remaining portrait/vertical variants and animation frames. All new visuals are REVIEW.

## Repository references

Canonical references: `assets/art/story/01_poster.jpg`, `03_setup.jpg`, `04_performance.jpg`; bassist/guitarist production sprites; `assets/art/drums/drumkit_pov.png`; bottle/mug props; `assets/art/results/gig_payout.png`. Full register: [references](../references/README.md). Runtime Groove Pad, results, title and Custom Setlist were inspected in source. Historical actual phone captures were inspected for screenshot concepts and are explicitly not current release screenshots.

## Creative direction

Angular 2D ink, worn red drums, dirty small bar, amber/magenta/teal light, canonical band identities. The drummer's divided attention drives the joke. Art stays text-free; copy stays localized outside the image. No production art was edited. The built-in imagegen workflow generated reference-based scenes and one targeted correction; its exact prompts and retained source paths are in `generated/prompts.json`.

## Key art

| Asset | Concept | Format | Dimensions | Status |
| --- | --- | --- | --- | --- |
| A | Impossible Gig | Portrait PNG; landscape variant | 1092×1440; 1672×941 | REVIEW |
| B2 | Keep the Groove | Portrait PNG | 1092×1440 | REVIEW; B initial retained |
| C | Defend the Drummer | Portrait PNG; square variant | 1092×1440; 1254×1254 | REVIEW |
| D | Beer Break | Landscape PNG | 1672×941 | REVIEW; portrait pending |
| E | Worst Setlist | Landscape PNG | 1672×941 | REVIEW; portrait pending |
| F | We Got Paid?! | Portrait PNG | 1092×1440 | REVIEW |

The [manifest](asset-manifest.md) catalogs every delivered original/export with dimensions, bytes, references, generation date, channels and blank owner decision fields. The corrected groove image removes an unwanted hand from the bottle; original B is retained as history. Hero and defense were chosen for format exploration because their main action reads most clearly at small size; this is not owner approval.

## Landing animation

Frames: 0 delivered. Loop duration / format / dimensions / bytes: N/A. Six poses and 3-second timing are planned in [loop notes](../landing-page/gameplay-loop/README.md). No GIF, WebP or sprite sheet is claimed as complete.

## Social feed pack

Four art-only PNG exports at 1080×1350:

- `social/instagram/feed/01-hero.png`
- `social/instagram/feed/02-gameplay-chaos.png`
- `social/instagram/feed/05-gig-payout.png`
- `social/instagram/feed/06-challenge.png`

`03-beer` and `04-custom-setlist` need portrait recomposition; their landscape concepts are delivered under `landing-page/feature-art/`. Exported images use proportional fit with small charcoal mattes, preserving all original content. Hero landscape is 1920×1080; defense square is 1080×1080.

## Story / Reel pack

Zero of four vertical compositions delivered. Their exact concept/copy mapping is saved under `social/instagram/stories/README.md`. The Reel plan includes the pending illustration loop and a separate future real gameplay capture.

## Landing page plan

Hero → three gameplay beats → small loop → Custom Setlist → band payout → actual gameplay → CTA. Section/asset mapping: [landing plan](../landing-page/README.md). No website was built. Store concepts are planning only, not final Google Play submission assets.

## Social plan and copy

Four weeks, two cross-posted feed pieces per week, seven optional Stories/Reels total; five pillars cover gameplay, humor, challenge, music and development. [Campaign table](social-content-plan.md).

English: `marketing/social/copy/en.md`. Portuguese: `marketing/social/copy/pt-BR.md`. Eight short caption drafts per language, Story copy, proposed small hashtag pools and honest friend-test CTAs.

## Production isolation

**NO GAME IMPLEMENTATION CHANGED** by this marketing workstream. Every write performed here targets `marketing/`. No unexpected production file was touched by this task. Type checking, lint and all 579 automated tests passed at the validation checkpoint.

The repository was concurrently updated by another workstream: commits including `ca0cc50`, `7a677c8`, `dec142b` and `8adbe57` appeared while this task ran. Consequently the strict whole-repository baseline check does not pass: it detects changes to `docs/specs/M23-monetization-and-store-readiness.md` and new `.github/workflows/pages.yml`, `game/config/monetization.ts`, `game/state/adBreak.ts`, `game/state/entitlement.ts`, `site/.nojekyll`, `site/index.html`, `tests/adBreak.test.ts`, and `tests/entitlement.test.ts`. These changes were not made or reverted here. The original production art hashes are preserved and no runtime marketing imports were found. Keep the original baseline as evidence; do not rewrite it to hide concurrent changes. Test results above do not validate those later concurrent additions.

## Owner review queue

Use the manifest's blank decision column for each major visual: KEEP / REVISE / REJECT. No generated visual is in `generated/approved/` yet.

## Recommended next creative step

Refine the approved campaign after owner selection, completing the missing portrait, vertical and animation assets when image generation becomes available. Do not automatically build a landing page or publish anything.

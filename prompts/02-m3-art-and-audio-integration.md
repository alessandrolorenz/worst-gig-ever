# Claude Code Prompt — M3 Art and Audio Integration

Integrate the approved visual and audio assets into the already-working graybox vertical slice.

Read:

- `docs/specs/M3-art-and-asset-contract.md`
- `docs/assets/ART-PROMPTS.md`
- `docs/assets/AUDIO-SOURCES.md`
- `assets/manifest/asset-manifest.json`
- `AGENTS.md`

## Rules

1. Do not change gameplay rules just to fit artwork.
2. Keep every movable asset independently replaceable.
3. Keep hitboxes in config/domain data rather than deriving difficulty from raw image size.
4. Preserve aspect ratio.
5. Avoid visual clipping across common landscape phone ratios.
6. Use the manifest logical keys; do not scatter raw file paths across gameplay code.
7. Preserve audio provenance and lifecycle behavior.
8. Missing non-critical art may remain a placeholder; do not invent a different third-party asset.

## Required MVP art integration

- stage background;
- crowd back/front;
- drum kit POV;
- vocalist three poses;
- bassist idle;
- guitarist idle;
- beer bottle;
- beer mug;
- drumstick;
- hit burst;
- glass shards.

## Required MVP audio integration

- rock loop;
- glass break;
- stick whoosh;
- crowd applause;
- optional impact thwack.

## Break animation

Use the contract-defined approach:

- remove/hide intact target;
- short hit burst;
- 3–6 reusable shard assets;
- code-driven movement/rotation;
- fade out.

Do not create a sprite-sheet dependency for the MVP.

## Return

Report:

- assets integrated;
- placeholders remaining;
- any manifest changes;
- rendering changes;
- audio changes;
- validation results;
- physical playtest readiness.

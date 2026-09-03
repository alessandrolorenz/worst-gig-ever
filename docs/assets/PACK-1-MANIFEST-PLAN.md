# Pack 1 Manifest Plan

## Decision

The M6A contract is merged into `assets/manifest/asset-manifest.json` as
version 2 before images exist. This is safe because the runtime does not read
the JSON or eagerly import any art path. The manifest is contract/test data;
M6B creates concrete image imports only after `PASS_ART_READY`.

## Additive migration

- Preserve every pre-M6 semantic key.
- Keep unchanged path-owning keys when the canonical file did not change.
- Preserve `crowdFront` as a deprecated alias of `crowdFront01`; the old
  `crowd_front.png` path is removed because it is not a Pack 1 file.
- Preserve `bassistGroove` as a deprecated alias of `bassistLoopA`; the old
  `bassist_groove.png` path is removed because runtime vocabulary uses
  `loopA`.
- Add `stageLightsOverlay`, all three front-crowd frame keys, and every missing
  performer `idle`/`loopA`/`loopB`/`hitReaction`/`dodge` key.
- Retain props/effects, with only `whiskeyBottle` and `dustPuff` optional.
- Retain the full audio object unchanged. MIDI remains provenance/source only;
  `musicRock01.runtime` remains the WAV.

## Validation metadata

Each production art entry owns exactly one path and records:

- pixel width and height;
- `opaque` or `transparent` PNG contract;
- matching generation prompt;
- `requiredForM6B`.

`scripts/validate-pack1-art.mjs` reads this metadata, checks PNG signature,
IHDR dimensions, and alpha capability, and emits a complete missing checklist.
It does not download, generate, or substitute art.

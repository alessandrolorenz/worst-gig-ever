# Execute M14 — Visual Refresh V2 Planning

Only execute after the owner has completed M13 and explicitly asked to continue the visual refresh.

Read:

- `docs/specs/M14-visual-refresh-v2.md`
- current M3/M6 art contracts
- current asset manifest
- current Pack 1 production assets
- current renderer/state mappings

## Goal

Plan a **Stylized Punk Arcade Cartoon** refresh that is cleaner and simpler than the current detailed comic art, while preserving expressive faces, character personality, recognizable instruments, readable poses, and the existing low-frame animation architecture.

Do not interpret "simpler" as:
- silhouettes;
- faceless characters;
- extremely flat icons;
- generic corporate vector art;
- abstract poster-only figures.

## Required work

1. Audit the current visual set and identify where detail hurts phone-size readability.
2. Preserve canonical filenames, manifest keys, dimensions, and anchors wherever practical.
3. Create an exact current-asset → V2-asset replacement map.
4. Define one canonical V2 reference contract for each:
   - vocalist;
   - bassist;
   - guitarist;
   - crowd;
   - drum kit;
   - props/effects.
5. Preserve existing animation states and frame count:
   - idle
   - loopA
   - loopB
   - hitReaction
   - dodge
   - vocalist blocking
6. Make facial expression and body language explicit requirements for character humor.
7. Reduce crowd detail more aggressively than performer detail.
8. Make Groove Pad readability a first-class drum-kit requirement.
9. Do not modify gameplay, hitboxes, timing, scoring, or input behavior.
10. Do not generate the entire V2 asset family immediately.

## Visual proof gate

Prepare a **small V2 proof set** specification first:

- one canonical vocalist reference;
- one canonical bassist reference;
- one canonical guitarist reference;
- one crowd sample;
- one drum-kit sample;
- one throwable-prop sample.

If generation tooling is available and owner authorization covers generating these proof assets, generate only this proof set.

Otherwise prepare the exact generation prompts/specifications for the proof set.

Then STOP at:

`V2_VISUAL_DIRECTION_REVIEW`

Do not continue to the full asset replacement until the owner explicitly approves the visual direction.

## Verification

Run `docs/verification/M14-gate.md` plus these checks:

- character faces remain part of the design contract;
- no spec describes performers as primarily silhouettes;
- current → V2 replacement map is complete;
- animation frame count is unchanged;
- no gameplay files are modified;
- Groove Pad readability requirements are present;
- full V2 generation has not started before owner approval.

## Return

1. Incoming branch/HEAD.
2. Current visual audit summary.
3. V2 direction summary.
4. Replacement map.
5. Character-reference workflow.
6. Proof-set files/prompts prepared.
7. Verification results.
8. Current git status.
9. Final state: `V2_VISUAL_DIRECTION_REVIEW`.

Do not push.

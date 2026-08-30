# Claude Code Prompt — M0–M2 Fast-Track Bootstrap

You are the implementation engineer for a new SDD-driven React Native arcade game project.

Working title: **Worst Band Ever**  
Playtest tagline: **Survive the worst gig ever.**

The repository is expected to be based on:
`nightness/react-native-game-engine-expo-typescript-template`

Your task is to execute **M0, M1, and M2 as one accelerated bootstrap pass**.

Read first:

- `START-HERE.md`
- `AGENTS.md`
- `docs/specs/M0-product-brief.md`
- `docs/specs/M1-gameplay-spec.md`
- `docs/specs/M2-technical-foundation.md`
- `docs/specs/M3-art-and-asset-contract.md`
- `docs/assets/AUDIO-SOURCES.md`
- `assets/manifest/asset-manifest.json`

## Objectives

1. Audit the incoming template and record the real baseline.
2. Verify license, dependency, and runtime assumptions from the supplied docs.
3. Preserve a working baseline before replacing Balloon Pop behavior.
4. Prepare the repo for the vertical slice with the smallest sensible structural changes.
5. Download or stage the specified CC0 audio assets when the environment allows it.
6. Produce a clear M0–M2 completion report and leave the project ready for M4 implementation.

## Required work

### A. Baseline audit

Record:

- branch;
- HEAD SHA;
- worktree state;
- Node version;
- npm version;
- Expo version;
- React version;
- React Native version;
- `react-native-game-engine` version;
- `matter-js` version;
- existing scripts;
- existing tests/lint/typecheck commands;
- template license.

Run the baseline verification commands that actually exist in the repository.

At minimum, run the template's type-check command.

Do not invent commands that are not configured.

### B. Architecture reconnaissance

Inspect the Balloon Pop implementation and identify:

- entity creation;
- update/game loop;
- touch handling;
- scoring;
- game state management;
- pause/restart;
- Matter.js coupling;
- asset rendering;
- EAS/Expo configuration.

Document which pieces can be reused directly and which should be replaced.

### C. Fast-track specs reconciliation

Review M0/M1/M2 against the actual codebase.

If assumptions differ, update the docs with evidence rather than forcing the code to match an incorrect assumption.

Do not expand product scope.

### D. Prepare directories/contracts

Create only the missing directories needed by the approved structure.

Do not bulk-move template files unless there is a concrete implementation reason.

Ensure the asset manifest remains the central naming contract for future art integration.

### E. Audio acquisition

Use `docs/assets/AUDIO-SOURCES.md`.

Attempt to acquire the selected CC0 assets:

- `rock_theme_song.mid`
- `rock_theme_songloop.wav`
- `glass_breaking.wav`
- one short stick whoosh from the referenced CC0 pack
- optional impact thwack
- crowd applause WAV

Rules:

- verify source page and license before adding;
- preserve the source MIDI separately from runtime audio;
- do not add a MIDI playback dependency;
- if a download cannot be completed in the current environment, leave the expected path unfilled, keep the provenance record, and report the exact blocker;
- calculate SHA-256 for every downloaded source/runtime file and update `docs/assets/AUDIO-SOURCES.md`.

### F. Do not implement M4 gameplay yet

You may create thin scaffolding only when required to establish contracts.

Do not implement the final target loop, score changes, vocalist event, or art integration in this prompt.

## Validation

Run all applicable baseline checks again after your changes.

The final worktree should contain only intentional bootstrap changes.

## Return format

Return:

1. Incoming baseline
2. Template findings
3. Reuse vs replace decision
4. M0–M2 spec reconciliation
5. Audio acquisition status and licenses
6. Created/changed files
7. Verification results
8. Risks/blockers
9. Exact readiness statement for M4
10. Current branch and HEAD

Do not proceed into M4 without a separate instruction.

# Worst Gig Ever — Rhythm Pivot SDD Package

> **Execution status:** The M9–M13 sequence described by this package has been
> completed. The owner validated the M13.1 follow-up, and M14 is now at
> `V2_VISUAL_DIRECTION_REVIEW` with seven candidate proofs. This file is
> retained as package history; use `project-status.md` for the current
> continuation state.

This package continues the existing project after the current visual/arc playtest prototype.

## Product rename

The product name is now:

**Worst Gig Ever**

Primary tagline:

**Keep the beat. Survive the gig.**

The repository may still be named `worst-band-ever`, and the linked EAS project / Expo slug / native bundle identifiers may still contain `worstbandever`. Those are technical identifiers and are deliberately **not** remotely renamed by this package.

M9 changes the user-facing product identity and local package metadata safely, while recording technical identifier migration as a pre-release task.

## Current baseline used to design this package

The supplied repository snapshot showed:

- branch: `m5/physical-playtest`
- HEAD: `8e6a7130784079d621da712a20338aa203c4a483`
- art-integrated drummer-POV scene
- deterministic thrown bottle/mug arcs
- fast-throw window
- reliable surface-relative touch mapping
- score/combo/Show Integrity
- vocalist event
- audio already integrated
- existing stage-motion architecture
- current game remains a 60-second bottle-defense arcade loop

The exact HEAD may be newer by the time this package is executed. Claude must preserve newer valid work instead of resetting to this SHA.

## Rhythm pivot

The new core fantasy is:

> The drummer must keep the groove while surviving the worst gig ever.

The player now has two simultaneous jobs:

1. **Groove** — tap a pulsing cymbal/pad on the visual beat.
2. **Defense** — break incoming bottles/mugs before they hit the kit.

No audio synchronization is required in this pivot. The beat clock is intentionally visual and deterministic.

## Original planned sequence

- M9 — Product Rename & Rhythm Pivot Freeze
- M10 — Visual Beat Clock & Groove Pad Foundation
- M11 — Dual-Task Gameplay Integration
- M12 — Dual Score, HUD & Round Feedback
- M13 — Rhythm MVP Candidate & Physical Playtest Gate
- HUMAN PLAYTEST GATE
- M14 — Visual Refresh V2 Planning (prepared but not auto-executed before approval)

## Important constraints

- Do not rewrite the game from scratch.
- Preserve bottle arcs, hit reliability, existing art integration, vocalist event, audio lifecycle, and deterministic round behavior.
- No microphone input.
- No audio beat detection.
- No attempt to synchronize the visual beat with the current music.
- No EAS build unless the owner explicitly requests it later.
- No store submission.
- No remote repository rename.
- No remote EAS project rename.
- No ads/purchases/backend/accounts.
- No second groove pad in this pivot.
- No mandatory two-finger interaction: one or two fingers must both work naturally.
- All technical artifacts remain in English.

## Installation

Extract this package and merge its contents into the repository root.

It only adds documentation/prompts/verification artifacts. It does not overwrite the game source.

Then give Claude the contents of:

`prompts/10-run-rhythm-pivot-master.md`

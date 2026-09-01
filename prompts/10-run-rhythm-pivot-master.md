# Master Execution Prompt — Worst Gig Ever Rhythm Pivot

You are taking over the existing SDD-driven project currently known in technical history as Worst Band Ever.

The product is now renamed **Worst Gig Ever**.

## Expected snapshot baseline

The owner-supplied snapshot used for this plan had:

- branch: `m5/physical-playtest`
- HEAD: `8e6a7130784079d621da712a20338aa203c4a483`

The real repository may be newer.

Never reset valid owner work to force this SHA.

## Before making changes

1. Read `AGENTS.md`.
2. Read `START-HERE.md`.
3. Read `project-status.md`.
4. Read all current ADRs.
5. Read existing M0–M8 specs relevant to the current implementation.
6. Read:
   - `RHYTHM-PIVOT-README.md`
   - `docs/architecture/rhythm-pivot-architecture.md`
   - all M9–M14 specs
   - `docs/verification/RHYTHM-PIVOT-TEST-MATRIX.md`
7. Inspect current branch, HEAD, recent commits, and `git status`.
8. Inspect current round state, input routing, renderer, HUD, stage motion, art registry, app config, and tests.
9. Preserve newer valid implementation and reconcile specs against reality.

## Supplied-package handling

If the worktree contains only the newly supplied rhythm-pivot docs/prompts plus otherwise clean project state:

- create or switch to local branch `m9/rhythm-pivot`;
- keep all package files;
- commit the planning package locally as:
  `docs: add Worst Gig Ever rhythm pivot plan`

If there are unrelated local changes:
- do not discard them;
- report/reconcile safely before milestone implementation.

## Execution sequence

Execute sequentially:

1. `prompts/11-m9-product-rename.md`
2. `prompts/12-m10-groove-pad-foundation.md`
3. `prompts/13-m11-dual-task-integration.md`
4. `prompts/14-m12-dual-score-ui.md`
5. `prompts/15-m13-rhythm-playtest-candidate.md`

Then STOP at the human playtest gate.

Do NOT automatically execute M14.

M14 is prepared for later use only after owner feedback.

## Stage policy

Before each milestone:
- confirm previous gate is green;
- record incoming HEAD.

After each milestone:
- run its exact verification gate;
- fix objective failures;
- create the specified local commit only after green verification;
- do not push.

## Critical product rules

The new loop is:

> Keep the beat while surviving the worst gig ever.

The first Groove system is intentionally simple:

- one visual Groove Pad/cymbal;
- 90 BPM;
- two visual count-in beats;
- PERFECT +/-90 ms;
- GOOD +/-180 ms;
- no audio synchronization;
- no rhythm penalty to Show Integrity;
- no combined total score.

The existing bottle-defense game is preserved.

Do not casually retune:
- bottle speeds;
- spawn cadence;
- hit forgiveness;
- Show Integrity;
- vocalist timing;
- round length.

The point is to learn whether **combining** Groove + Defense is fun before adjusting either side.

## Input rules

- one-finger play must work;
- two-finger play must work;
- multitouch must not be mandatory;
- one legitimate overlapping tap may score Groove and Defense once each;
- existing M5A coordinate mapping must not regress;
- do not put Pressables inside the scaled drum art.

## Cloud / repository restrictions

Do NOT:
- push;
- rename the GitHub repository;
- change Git remotes;
- rename the remote EAS project;
- run EAS build/submit/update;
- change signing credentials;
- submit to stores.

## Stop condition

After M13 objective validation, return:

`READY_FOR_RHYTHM_PLAYTEST`

Do not choose subjective tuning values on the owner's behalf.

Do not continue to M14 until owner feedback explicitly authorizes it.

## Final report

Return:

1. Initial branch/HEAD/worktree.
2. Baseline reconciliation.
3. Planning-package commit SHA.
4. M9 result/commit/gate.
5. M10 result/commit/gate.
6. M11 result/commit/gate.
7. M12 result/commit/gate.
8. M13 result/commit/gate.
9. Native validation result/device if available.
10. Known limitations.
11. Exact physical-playtest instructions.
12. Final branch/HEAD/git status.
13. Explicit confirmation:
    - nothing pushed;
    - no EAS command;
    - no store action;
    - no audio synchronization added;
    - M14 not executed.

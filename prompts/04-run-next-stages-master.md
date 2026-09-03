# Master Execution Prompt — M6 through M8

You are continuing the SDD-driven development of **Worst Band Ever** after the completed M5A tuning pass.

## Expected incoming baseline
- Repository: `alessandrolorenz/worst-band-ever`
- Expected branch at handoff: `m5/physical-playtest`
- M5A commit: `4aa553752c5ed1fdfc47d03a3f8548a44aeb43f3`
- M5A is COMPLETE. Do not reimplement it.

Before doing anything:
1. Read `AGENTS.md`, `START-HERE.md`, `project-status.md`.
2. Read all existing ADRs and active specs M3–M5A.
3. Read every new spec and verification document supplied by this package.
4. Inspect the current asset manifest and current renderer/system architecture.
5. Run `git status`, record branch and HEAD, and understand all local changes.

If HEAD is newer than the expected M5A commit, inspect and preserve valid work. Never reset or discard owner work to force the expected SHA.

## Sequence
Execute in this exact order:
1. `prompts/05-m6-art-direction-lock.md`
2. `prompts/06-m6a-asset-pack-production.md`
3. ART GATE
4. `prompts/07-m6b-art-integration.md`
5. `prompts/08-m7-stage-chaos-interactions.md`
6. `prompts/09-m8-visual-mvp-candidate.md`

Each stage has a verification gate under `docs/verification/`. Do not continue through a failed gate.

## Local commits authorized
You may create **local commits** after a reached stage is complete and green. Do not push, rewrite published history, or change remotes.

## ART GATE
After M6A, inspect whether all Pack 1 required art exists at the exact finalized paths.

If all required art is present: validate filenames/dimensions/transparency and continue.

If required art is missing: STOP cleanly at `ART_ASSETS_REQUIRED`, return the exact missing-file checklist, matching generation prompt filenames, expected dimensions and transparency. Do not create arbitrary substitute third-party art.

Optional assets never block the gate.

## Hard constraints
- No gameplay-rule changes just to make art fit.
- Preserve M5A hit forgiveness, page-coordinate mapping and arc behavior unless explicit playtest evidence says otherwise.
- No full physics for projectile travel; no skeletal animation.
- Use existing low-frame stage-motion vocabulary. Prefer `idle`, `loopA`, `loopB` as the 3-frame ambient loop.
- M7 performer interactions are deterministic game-feel/presentation interactions, not a new scoring economy.
- A band interaction must not silently remove an incoming target.
- No EAS build, store submission, ads, purchases, backend, accounts, or online services.

## Final condition
Automated work may create an M8 **Visual MVP Candidate**, but it must not claim the game is visually approved or fun for the owner. M8 ends at `READY_FOR_OWNER_PLAYTEST` unless explicit human playtest observations are supplied during execution.

## Consolidated final report
Return:
1. Incoming branch/HEAD and reconciliation.
2. M6 result + commit SHA if committed.
3. M6A result + commit SHA if committed.
4. Art Gate status.
5. M6B result + commit SHA if reached.
6. M7 result + commit SHA if reached.
7. M8 result + commit SHA if reached.
8. Verification results for every reached stage.
9. Exact owner action required, if any.
10. Final branch/HEAD/`git status`.
11. Confirmation that nothing was pushed and no EAS/store action was performed.

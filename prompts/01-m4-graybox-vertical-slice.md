# Claude Code Prompt — M4 Graybox Vertical Slice

Implement the first playable graybox vertical slice defined by:

- `docs/specs/M1-gameplay-spec.md`
- `docs/specs/M2-technical-foundation.md`
- `docs/specs/M4-vertical-slice-plan.md`
- `AGENTS.md`

## Mandatory scope

Build one 60-second landscape round with:

- drummer-stage graybox composition;
- Beer Bottle target;
- Beer Mug target;
- pseudo-perspective approach motion;
- direct tap hit resolution;
- visible temporary drumstick strike feedback;
- score;
- combo;
- 3-point Show Integrity;
- READY / PLAYING / PAUSED / VOCALIST_EVENT / SHOW_COMPLETE / SHOW_RUINED states;
- one deterministic vocalist interruption around 41 seconds;
- restart.

## Art rule

Do not use final art yet. Use shapes/placeholders with clear labels/colors only as needed for development.

## Audio

If the approved audio files are available from M0–M2, integrate the rock loop and minimum useful SFX. If they are not available, keep audio integration behind the defined registry and report the missing files. Do not use unapproved substitute internet assets.

## Architecture

- gameplay time must not be frame-based;
- target resolution must be idempotent;
- gameplay logic must not import final image assets;
- use Matter.js only where it is simpler than deterministic interpolation;
- no feature outside the M4 spec.

## Tests

Add focused automated tests for pure logic where practical:

- game-state transitions;
- scoring and combo;
- miss/integrity behavior;
- pause clock behavior;
- vocalist event single trigger;
- target cannot score twice.

## Validation

Run type check and all configured tests/lint checks.

## Return

Report:

- implemented scope;
- architecture decisions;
- tests added;
- verification output;
- known limitations;
- whether the graybox is ready for physical playtest;
- exact branch and HEAD.

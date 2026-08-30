# Claude Code Prompt — M5 Playtest Polish

The vertical slice has been manually played. Use the supplied playtest observations to make **tuning-only** changes.

Read:

- `docs/specs/M5-playtest-and-decision.md`
- all prior active specs;
- `AGENTS.md`.

## Allowed

- spawn interval tuning;
- target speed tuning;
- hitbox tuning;
- score/combo feedback tuning;
- subtle impact animation tuning;
- audio level/balance tuning;
- safe performance fixes;
- bug fixes;
- accessibility fixes that do not expand product scope.

## Not allowed

- new venue;
- new enemy/target category;
- new band event;
- progression system;
- ads;
- backend;
- achievements;
- shop;
- major architecture rewrite unless the user explicitly selected ENGINE PIVOT.

## Goal

End with enough evidence to choose exactly one:

- EXPAND
- TUNE
- ENGINE PIVOT
- STOP

Return the evidence and recommendation without hiding weaknesses.

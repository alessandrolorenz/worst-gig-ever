# Execute M8 — Visual MVP Candidate

Read M8.

Goal: prepare the first cohesive visual MVP candidate for physical owner playtest.

Required work:
1. Remove/disable normal-mode graybox debug affordances.
2. Fix only clear art-integration defects: anchors, scaling, z-order, clipping, visibility, reaction placement, broken state mapping.
3. Do not retune gameplay difficulty without explicit observed evidence.
4. Run all automated verification.
5. Build/run locally on Android when environment supports it.
6. Create/update M8 physical-playtest checklist from spec questions.
7. Record exact build/device/emulator details.
8. Do not run EAS.
9. Do not claim subjective success.

Verification: `docs/verification/M8-gate.md`.

If objective gate green, local commit: `chore: prepare M8 visual MVP candidate`

Required final state: exactly `READY_FOR_OWNER_PLAYTEST` or `BLOCKED_<reason>`. Never return EXPAND/TUNE/PIVOT/STOP without owner playtest observations.

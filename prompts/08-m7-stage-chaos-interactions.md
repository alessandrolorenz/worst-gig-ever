# Execute M7 — Stage Chaos Interactions

Read M7 and current M5A stage-motion/throw trajectory implementation.

Required work:
1. Add small deterministic presentation-interaction model for incoming targets and band members.
2. Keep interaction config in data/config.
3. Support only `none`, `dodge`, `clip`.
4. `dodge` triggers existing dodge visual and target continues.
5. `clip` triggers hitReaction plus small deterministic trajectory/spin adjustment and target continues.
6. Band contact does not score, consume integrity, or resolve the target.
7. Do not use Matter.js for normal projectile/performer interaction.
8. No band health, AI, new minigames, or event families.
9. Preserve vocalist special-event semantics.
10. Add tests for determinism, fairness caps, continued target availability, no double-resolution.
11. Update ADR/spec/status for meaningful decisions.

Verification: `docs/verification/M7-gate.md`.

If green, local commit: `feat: add M7 stage chaos interactions`
Do not push.

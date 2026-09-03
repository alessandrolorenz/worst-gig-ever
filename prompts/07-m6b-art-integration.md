# Execute M6B — Asset Integration

Precondition: M6A gate must report `PASS_ART_READY`. Otherwise stop.

Read M6B and inspect renderer/input architecture.

Required work:
1. Integrate Pack 1 assets by layer without flattening the scene.
2. Preserve `pointerEvents="none"` or equivalent for non-interactive visuals so M5A coordinate reliability cannot regress.
3. Map stage-motion states to 3 ambient frames plus reactions.
4. Keep deterministic M5A throw poses as the sole target positioning source.
5. Replace code-drawn target bodies with art while preserving configured hit radii.
6. Replace/augment break visuals with shards/burst without changing one-hit idempotency.
7. Make target-radius ring debug-only and disabled in normal play.
8. Do not tune difficulty unless a hard rendering defect makes the game impossible to perceive; stop for owner approval rather than silently tuning.
9. Update docs/status.

Verification: `docs/verification/M6B-gate.md`.

If green, local commit: `feat: integrate M6B visual asset pack`
Do not push.

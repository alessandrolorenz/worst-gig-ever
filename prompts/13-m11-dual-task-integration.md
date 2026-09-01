# Execute M11 — Dual-Task Gameplay Integration

Read M11 and the current M10 implementation.

Goal: make Groove + Defense coexist without increasing raw difficulty values.

Requirements:

1. Route each unique surface tap to both eligible resolvers.
2. Support same-finger and multi-finger play.
3. Allow a legitimate overlap tap to score one beat and hit one target.
4. Preserve all idempotency guarantees.
5. Keep Groove misses independent from Show Integrity and Defense combo.
6. Keep Defense misses independent from Groove streak unless a beat is independently missed.
7. Groove continues through vocalist event.
8. Do not retune BPM, spawn cadence, throw speeds, hitboxes, or integrity.
9. Add integration tests covering all dual-input cases.
10. Update ADR/status if input orchestration changes materially.

Run `docs/verification/M11-gate.md`.

If green, local commit:

`feat: integrate M11 groove and defense gameplay`

Do not push.

# M11 Verification Gate

Automated baseline:
1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. Android/web export

Required integration tests:

- pad-only tap can score rhythm without hitting a target;
- target-only tap can hit target without falsely scoring rhythm;
- overlapping valid pad+target tap can resolve both exactly once;
- same physical tap cannot double-score one beat;
- same physical tap cannot double-hit one target;
- two distinct touch points in same frame can independently resolve pad and target;
- groove miss does not change integrity;
- groove miss does not reset Defense combo;
- target miss does not directly reset Groove streak;
- pause freezes both systems;
- vocalist event leaves Groove active;
- restart resets both rhythm and defense state;
- seeded target behavior remains deterministic.

Device/manual smoke when available:
- play one round with one finger only;
- play one round deliberately using two fingers;
- verify neither strategy feels blocked by input routing;
- rapid taps must not create phantom double hits.

PASS means ready for M12.

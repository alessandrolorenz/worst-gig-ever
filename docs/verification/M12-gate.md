# M12 Verification Gate

1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. Android/web export

Contract checks:
- Groove score displayed from domain truth;
- Defense score displayed from existing domain truth;
- Groove and Defense labels are distinct;
- no combined total introduced;
- READY copy says Worst Gig Ever;
- summary values reconcile with the domain state;
- restart resets displayed metrics;
- pause summary does not mutate score;
- PERFECT/GOOD feedback has text/non-color cue.

Visual smoke:
- HUD does not overlap center target corridor;
- Groove feedback does not cover the Groove Pad;
- no clipping on at least two landscape viewport sizes;
- Show Integrity remains readable.

PASS means ready for M13.

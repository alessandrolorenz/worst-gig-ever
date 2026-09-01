# M9 Verification Gate

Required checks:

1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. Search source/docs for `Worst Band Ever`:
   - remaining occurrences must be historical context, old commit references, or explicitly documented technical legacy.
7. Confirm no Git remote changed.
8. Confirm no EAS command was run.
9. Confirm `extra.eas.projectId` was not changed.
10. Confirm no gameplay behavior changed.
11. Confirm app title copy says `Worst Gig Ever`.

PASS only if rename is coherent and no infrastructure migration was accidentally performed.

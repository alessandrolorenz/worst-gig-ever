# M6 Verification Gate

Required:
1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. Compare against the M5A baseline and confirm M6 introduced no gameplay implementation changes.
7. Every Pack 1 filename has one canonical path.
8. No contradictory state names between M3, M6, manifest proposal, and runtime vocabulary.
9. No third-party visual asset introduced without provenance.

PASS only if automated checks are green, gameplay is unchanged, and the art contract is internally consistent.

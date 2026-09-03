# M6A Verification Gate

Required:
1. `git diff --check`
2. `npm run type-check`
3. `npm run lint`
4. `npm test`
5. `npm run verify`
6. Every generation prompt names canonical contract files only.
7. Every required Pack 1 asset has exactly one expected path.
8. Live/proposed manifest retains all audio entries.
9. Required-vs-optional status is consistent across spec/prompt/manifest.
10. If assets are present, validate dimensions and alpha/transparency deterministically where practical.
11. Confirm no gameplay files changed for contract work.

Outcomes:
- `PASS_CONTRACT_ART_MISSING`
- `PASS_ART_READY`
- `FAIL`

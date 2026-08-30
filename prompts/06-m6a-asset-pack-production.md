# Execute M6A — Asset Pack 1 Production Contract

Read M3, M6, M6A, live asset manifest, and all `prompts/assets/` files.

Required work:
1. Reconcile production contract against actual repo paths.
2. Finalize generation prompts without drifting from the shared style bible.
3. Create `docs/assets/ART-PROVENANCE.md` from template if absent.
4. Produce an additive manifest update plan.
5. Merge live manifest only if runtime will not eagerly require missing files; otherwise keep proposal documented until M6B.
6. Add a small deterministic asset validation script/test only if useful; prefer Node built-ins, no new dependency unless necessary.
7. Do not create substitute third-party art.
8. Do not change gameplay.

ART GATE: enumerate all required M6B paths. If any required asset is missing, return `ART_ASSETS_REQUIRED` with missing path, matching prompt, expected dimensions, transparency, then STOP before M6B. Optional assets never block.

If all art exists, execute `docs/verification/M6A-gate.md` and continue.

Local commit for green contract/preparation: `docs: prepare M6A asset pack production`
Do not push.

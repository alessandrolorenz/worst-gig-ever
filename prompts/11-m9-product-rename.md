# Execute M9 — Product Rename & Rhythm Pivot Freeze

Read:
- `AGENTS.md`
- `project-status.md`
- ADR 0004
- `docs/specs/M9-product-rename-and-rhythm-pivot.md`
- `docs/architecture/rhythm-pivot-architecture.md`

Tasks:

1. Reconcile the actual current branch/HEAD against the package baseline.
2. Rename user-facing product identity to **Worst Gig Ever**.
3. Use tagline **Keep the beat. Survive the gig.**
4. Update local package metadata and lockfile coherently where safe.
5. Do not rename GitHub/EAS remote resources.
6. Do not change the EAS project ID.
7. Do not silently change native application identifiers.
8. Record retained legacy technical identifiers as explicit pre-release debt.
9. Update project status.
10. Do not implement rhythm gameplay yet.

Run `docs/verification/M9-gate.md`.

If green, create a local commit:

`docs: rename product to Worst Gig Ever and freeze rhythm pivot`

Do not push.

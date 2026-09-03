# Worst Band Ever — Next Stages Package

> **Historical document.** Kept as delivered. The product was renamed to
> **Worst Gig Ever** at M9 (2026-08-31); see `RHYTHM-PIVOT-README.md`.

This package continues the SDD sequence **after M5A**.

## Incoming baseline

Expected project state:
- Repository: `alessandrolorenz/worst-band-ever`
- Working branch at handoff: `m5/physical-playtest`
- M5A commit: `4aa553752c5ed1fdfc47d03a3f8548a44aeb43f3`
- M5A is complete and must **not** be reimplemented.
- Current graybox already has improved input mapping, forgiving hitboxes, deterministic throw arcs, performer presentation states, and ambient stage motion.

If the local repository differs, Claude must inspect and reconcile rather than blindly resetting or overwriting work.

## Sequence

1. **M6 — Art Direction Lock** — reconcile M3 with M5A and freeze Pack 1 visual direction.
2. **M6A — Asset Pack 1 Production Contract** — exact filenames, states, provenance, prompts, and manifest plan.
3. **ART GATE** — stop if required art is missing; never silently invent substitutes.
4. **M6B — Asset Integration** — replace graybox visuals without changing gameplay truth.
5. **M7 — Stage Chaos Interactions** — performers dodge or get clipped; projectiles stay understandable and continue toward the drummer.
6. **M8 — Visual MVP Candidate & Physical Playtest Gate** — objective polish, native verification, then stop for human judgement.

## Constraints

- No EAS build in this package unless the owner explicitly asks later.
- No Google Play work, ads, purchases, backend, accounts, or online services.
- No new game mode, multiple songs, or campaign progression.
- No real band likenesses, logos, branded alcohol labels, or copyrighted art.
- Technical documentation remains in English.
- Gameplay/domain logic remains independent from rendering.
- Existing M5A tuning values are not casually retuned during art work.

## Install

Extract this ZIP and merge its contents into the project root. It only adds planning/orchestration files under `docs/` and `prompts/`; it does not overwrite game source or the live asset manifest directly.

Then start Claude with:
`prompts/04-run-next-stages-master.md`

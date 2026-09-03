# V2 Asset Prompts

Direction approved 2026-09-02; all 33 production assets integrated by 2026-09-03.
Current gate: `V2_DEVICE_REVIEW`, awaiting final physical-device owner review.
The proof and production prompt sets below preserve the generation contract.

## Proof set — direction review (00–06)

Small samples the owner reviews before any production art exists. Outputs go to
`design-reference/m14-v2-proof/` and are never runtime assets.

| File | Output | State |
|---|---|---|
| `00-style-bible.md` | — | shared rules, read first, every time |
| `00-performer-lineup-proof.md` | `performer-lineup-v2.png` | approved |
| `01-vocalist-reference.md` | `vocalist-reference-v2.png` | approved |
| `02-bassist-reference.md` | `bassist-reference-v2.png` | approved |
| `03-guitarist-reference.md` | `guitarist-reference-v2.png` | approved |
| `04-crowd-sample.md` | `crowd-sample-v2.png` | approved correction; independent crowd cast |
| `05-drumkit-sample.md` | `drumkit-sample-v2.png` | approved correction; no resting drumsticks |
| `06-beer-bottle-sample.md` | `beer-bottle-sample-v2.png` | approved |

## Production set — the 33 required assets (10–17)

Each file derives its outputs from an approved reference above, as edits of it.
Do not run these from text alone, and do not run them before the owner approves
the direction.

| File | Assets | State |
|---|---|---|
| `10-vocalist-pack.md` | 6 | integrated |
| `11-bassist-pack.md` | 5 | integrated |
| `12-guitarist-pack.md` | 5 | integrated |
| `13-crowd-3frame.md` | 4 | integrated |
| `14-drumkit-pov.md` | 1 | integrated |
| `15-stage-environment.md` | 2 | integrated |
| `16-props.md` | 3 | integrated |
| `17-break-fx.md` | 7 | integrated |

33 required assets. `whiskey_bottle` and `dust_puff` stay deferred.

## Production order

Run in the order given in `docs/assets/M14-V2-INTEGRATION-RUNBOOK.md` — the
performer triplets gate everything else, because they are what failed in Pack 1
and they gated `AMBIENT_LOOP_ART_READY`. All four triplets now pass; loops are enabled.

# M15 Verification Gate — story, briefings, and two stages

- Date: 2026-09-03.
- Branch: `feat/m15-story-and-stages`, on baseline `4571f30`.
- Spec: `docs/specs/M15-story-briefings-and-two-stages.md`.
- Outcome: **`M15_DEVICE_REVIEW`** — automated gate green, physical-device
  review by the owner still required.

## Automated

| Check | Result |
| --- | --- |
| `npm run type-check` | pass |
| `npm run lint` | pass, no warnings |
| `npm test` | **299/299 pass**, 0 fail |
| `npm run validate:art -- --require-ready` | `PASS_ART_READY`, required 33/33, invalid 0 |
| `npm run measure:art -- --require-continuity` | `PASS_AMBIENT_LOOP_READY`, 4/4 triplets, 0 failures |
| `npx expo export --platform web` | pass, bundle 972 kB, all five stills emitted |
| `npx expo export --platform android` | pass, bundle 1.71 MB |

Test count moved 248 → 299. 46 are new and 5 are pre-existing tests whose
contracts moved with the feature (see "Contracts that changed" below).

New suites:

- `tests/storyIntro.test.ts` (18) — panel order, hold durations, tick-size
  independence, the background clamp, tap and Skip, replay, and the five files
  on disk: JPEG signature, exact 1600x900, 16:9, an 800 KB per-file budget,
  a manifest entry, and no leakage into the Pack 1 contract.
- `tests/stageFlow.test.ts` (23) — the stage table, the Stage 2 difficulty
  freeze field by field, the drill's schedule, index clamping, the Groove
  switch as a rule, and every flow transition including the ones that must be
  refused.
- `tests/flowSystem.test.ts` (7) — the story runs on engine time and only on
  its own screen; a full defense-only round leaves the Groove untouched; and
  Stage 1 is cleared **through the real input pipeline**, then leads into
  Stage 2.

## Contracts that changed, and why they were not just deleted

`tests/hudContract.test.ts` asserted that the READY screen carried both
how-to-play lines. M15 moved that copy into the per-stage briefings, so the
assertion moved with it — and got stronger rather than weaker:

- *the title screen carries the renamed identity* — the identity half, kept.
- *every stage briefs the job it asks for, before it asks* — new. Every stage
  must explain breaking what the crowd throws and what a miss costs, and must
  name the pad **if and only if** it switches the Groove on.
- *the stages are ordered, numbered from one, and introduce one job at a time*.
- *a defense-only loss is not explained in Groove terms* — new.

Six `BeatContext` literals in existing tests gained `grooveEnabled: true`, and
two files narrowed the now-nullable `level01.vocalistEventAtMs` once at module
scope with a loud throw rather than a silent fallback.

## Browser round

Driven headless at 923 x 411 — the smallest real target viewport, a 1080p phone
in landscape at 420 dpi — against the actual web export. **Zero page errors and
zero console errors across all three runs.**

Confirmed in order:

1. Story auto-advances through all five panels; captions correct and in order.
2. A tap advances early; Skip exits from any panel; the last panel leads to the
   title, not into a round.
3. Title shows both stages with name and subtitle, plus "How to play" and
   "Story".
4. Stage 1 briefing reads the drill's four lines; Start opens the pre-roll.
5. **Stage 1 playing: DEFENSE, timer, and SHOW INTEGRITY only — no Groove Pad
   on the drum head and no GROOVE column.**
6. Stage 2 briefing reads the show's four lines.
7. **Stage 2 playing: the GROOVE column and the pad are both back.**
8. Stage 2 paused: both summary columns.
9. Stage 1 lost: one summary column, "Retry stage", and the defense-only
   failure line rather than the dual-task one.
10. "Story" from the title replays from panel one, with progress intact.

Evidence: `docs/verification/m15-evidence/`.

The one path not driven in the browser is **Stage 1 cleared → Next stage**: a
blind click sweep breaks about one target in four, which is not a fair test of
anything. It is covered instead by a stronger integration test that plays a
full drill through `roundSystem`'s real touch pipeline to `SHOW_COMPLETE` with
integrity 3/3, then asserts the results screen's transition lands on Stage 2's
briefing.

## Bundle cost

The five story stills add **2.3 MB**. Shipping the source PNGs would have added
11.5 MB. See `docs/assets/M15-STORY-ART-PROVENANCE.md` for the conditioning
command and the reason JPEG is confined to this one directory.

## What this gate does not establish

- **Physical-device review.** Browser runs do not establish touch comfort,
  device frame rate, or whether the story reads well at arm's length.
- **The M14.1 performance question.** It is still open and is unaffected by
  this work: Stage 2 is the same round on the same art, and no gameplay value
  moved. The queued EAS build `9d1dd65c-8c08-411b-80d4-aa89098df279` predates
  this branch and does not contain it.
- **Stage progression across launches.** Nothing is persisted by design; see
  the spec's "Progression, and why nothing is locked".

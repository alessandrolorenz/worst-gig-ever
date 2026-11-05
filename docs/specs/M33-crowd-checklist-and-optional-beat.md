# M33 — Crowd checklist in the audience, optional beat from Stage 3

Status: **implemented and merged to `main`; repository and web-export gates pass; 1.4.1 on the phone**
Created: 2026-11-04
Branch: `m26/crowd-mode` (on top of `cd36fcf`)
Baseline gate: `npm run verify` pass, 717/717 tests

## Source

Owner request after playing 1.4.0 on the Galaxy S23 FE, with a screenshot:
the Crowd checklist covers the bassist, and following the drumbeat while
defending is too hard to be the only way to play the show.

## 1. Crowd Mode — the checklist moves to the bottom corners

Supersedes the checklist half of M32 P1 ("Left: stage name and checklist").

- The checklist is split in two, in its original order: the first half under
  the heading in the bottom-left corner, the rest in the bottom-right with
  "Spare the waiter" last. The left takes the odd one, because the right also
  carries the waiter row: 4 objectives draw as 2 | 2+1, 7 as 4 | 3+1, 9 as 5 | 4+1.
- Both panels stand over the audience strip of the plate. No bottle can land
  there (`impactBounds.bottom` is 720), the throwing hand owns the middle, and
  each corner is below the art box of the performer above it.
- Unchanged: the stage name (top left), score, beers, Retry and Stages (top
  right), the throw cue (top centre), and every row's type, colours, tick,
  strike-through and the red waiter line. Objective logic is untouched.
- Rows are 13 dp with a 2 dp `rowGap` (M32: 14 dp, 3 dp margin) and the panel
  is 210 dp wide, so every label in every locale, pseudo included, is one line.
  Geometry lives in `game/crowd/crowdHudLayout.ts`.
- `pointerEvents="none"` on the whole checklist layer: it cannot take a touch
  from a swipe.

### Measured

The owner's phone runs at 2.81 px/dp: **832x384 dp, 784x384 inside the
three-button bar.** That is shorter than `MIN_VIEWPORT` (923x411), which every
overlay was designed against. On a shorter screen the canvas shrinks and the
text does not, so the S23 FE is the hard case here.

At 784x384 the left panel's top lands at canvas y 790 (bassist box ends 780)
and the right panel's at 835 (guitarist box ends 830). The boxes extend below
the drawn boots, so the visible gap is larger.

`tests/crowdHudLayout.test.ts` checks both panels against every performer's
art box, every target rect at the stage's scale, the throwing hand, the
amplifier and the landing area, for every stage and locale, at 923x411,
784x384, 832x384 and 1280x800.

### Known limit

A 16:9 phone at 640x360 dp is not covered: the left panel would reach the
bassist's box by 9 canvas px and the vocalist's left boot. No current target
device is 16:9.

## 2. Band Mode — Follow the beat, optional from Stage 3

- `StageDefinition.grooveOptional`: false on Stages 1 and 2, true on 3 and 4.
  Stages 1 and 2 are unchanged and ignore the switch entirely.
- `isGrooveActive(stage, followBeat)` in `stages.ts` is the **only** place the
  stage and the choice combine. The round bridge, the renderer, the HUD, the
  pause and results summaries, the outcome line, the records, the share line
  and the gig payout all read it; a test fails if anything outside
  `stages.ts` reads `stage.groove` directly.
- **Off (Standard, the default)** resolves to the existing `groove: false`
  path Stage 1 has always played: no beat scheduled, scored or missed, no
  click, no pad, no Groove readout, one results column, the defense-only
  outcome line, no Groove record, the defense-only share text, and a Groove
  contribution of 0 to the gig payout.
- **On (Rhythm Challenge)** is the original Stage 3/4 round, byte for byte.
- The switch: `Follow the beat: off / on` (`Seguir o ritmo: desligado /
  ligado`), the click switch's own control and wording pattern, on the
  briefing card and the pause screen of Stage 3+ only. The briefing swaps to a
  beat-free list of bullets while it is off (`briefingWithoutBeat`, en and
  pt-BR; new pt-BR copy for the owner to read).
- Saved as `followBeat` in the save file: additive, `SCHEMA_VERSION` stays 1,
  strict `=== true`.

### Switching mid-round (pause)

- **Off:** from the next frame the beat clock stops closing beats. Score so
  far is frozen; if the round ends with the switch off it is recorded and paid
  as defense only, so no beat bonus survives.
- **On:** `joinGrooveAt` closes every beat whose window shut while it was off
  **unjudged**: not hits, not misses. The streak resets only if a beat was
  actually skipped. A beat whose window is still open stays hittable. Without
  this, the first frame after Resume would file every skipped beat as a miss.
- Both run through `toggleFollowBeatInScene` in `sceneEntities.ts`, which the
  handler and the tests share. It lives there, not in `roundSystem`, so the
  round bridge still imports nothing from the app flow.

### Known limits

- Defense bests are kept per stage, not per mode, so an Off run can set a
  Defense best that an On run then competes against. The Groove best only
  moves on an On run.
- The pause screen's button row wraps to two lines on narrow phones. It
  already did on the S23 FE in pt-BR before M33; it still fits the height.

## Validation

- `npm run verify`: **pass**, 733/733 tests (+16), plus the art, provenance,
  tempo, library and monetization gates.
- New: `tests/followTheBeat.test.ts` (12) and `tests/crowdHudLayout.test.ts` (4).
  Extended: the briefing and button-label budgets in `tests/layoutBudget.test.ts`,
  the save round trip.
- Existing dual-task tests in `tests/dualTask.test.ts` and
  `tests/roundSystem.test.ts` select Stage 3, so they now opt into Follow the
  beat explicitly. That is the Rhythm Challenge, and they pass unchanged
  otherwise.
- Mutation checks: making the round bridge ignore the switch fails five of the
  new tests; removing the join fails the mid-round test.
- Production web export walked at 784x384 and 923x411, pt-BR: evidence in
  `docs/verification/m33-evidence/`.
- Android emulator: **not performed.**

## Builds

| Build | Signed with | Where | Notes |
|---|---|---|---|
| Local release **1.4.1 (10)**, 2026-11-04, from the working tree that became `8d5e8d2` + the version bump | Upload key (`56b20661…ea51e`) | Galaxy S23 FE (SM-S711B), over 1.4.0 (9), save kept | Bundle checked for the new code before install; launched with no runtime error. |

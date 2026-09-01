# M12 — Dual Score, HUD & Round Feedback

## Objective

Make the new game readable as two simultaneous challenges.

## Terminology

### GROOVE
Performance on the visual beat.

### DEFENSE
Performance against incoming bottles/mugs.

Do not present one combined total score in the first rhythm MVP.

## In-round HUD

Required:

- timer
- Show Integrity
- Groove score or Groove hit count
- Groove streak (compact)
- Defense score
- Defense combo if currently useful

The HUD must not reduce the central gameplay corridor.

## Suggested layout

Top-left:
- `DEFENSE`
- score
- existing combo feedback

Top-center:
- timer

Top-right:
- Show Integrity

Near Groove Pad but outside the hit area:
- `GROOVE`
- score
- current groove streak
- brief PERFECT/GOOD feedback

The final implementation may adapt to safe areas/current HUD layout, but the two metrics must be visually distinguishable.

## End-of-round summary

Groove section:
- Groove Score
- Beat Hits / Judged Beats
- Perfect
- Good
- Groove Misses
- Best Groove Streak
- optional Mean Timing Error (small/detail text)

Defense section:
- Defense Score
- Objects Destroyed
- Defense Misses
- Best Defense Combo

Do not hide either dimension behind a combined grade.

## Ready copy

Title:
**WORST GIG EVER**

Tagline:
**Keep the beat. Survive the gig.**

Instruction:
**Tap the pulsing cymbal on the beat. Break bottles before they hit your kit.**

Keep it concise.

## End copy

SHOW COMPLETE:
**You kept the groove alive. Somehow.**

SHOW RUINED:
**The gig fell apart. Try to keep the beat while you defend the kit.**

Wording may be polished, but the two-task concept must be clear.

## Accessibility/readability

- Do not communicate PERFECT/GOOD only by color.
- Keep text readable at phone landscape size.
- Pulse must have scale/brightness motion, not color-only.
- Dynamic updates must not cause HUD layout jumps.

## Exit criteria

- two scores clearly visible;
- final summary explains both performances;
- rename is fully reflected in current UI;
- no combined score ambiguity;
- gate passes.

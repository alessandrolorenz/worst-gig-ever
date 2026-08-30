# M1 — Gameplay Specification

## Core loop

1. Start show.
2. Music begins.
3. Incoming targets appear from the distant stage/crowd area.
4. Targets move toward the drummer using pseudo-perspective.
5. Player taps a target before it reaches the danger line.
6. A drumstick strike is visualized.
7. Target breaks/disappears with SFX and impact feedback.
8. Score and combo increase.
9. Missed dangerous targets reduce Show Integrity.
10. One vocalist interruption occurs.
11. Survive until 60 seconds to complete the show.
12. Restart quickly.

## Round configuration — MVP 01

- Duration: 60 seconds
- Show Integrity: 3
- Starting score: 0
- Starting combo: 0
- Maximum required concurrent target count: 4
- Music: one short loopable CC0 rock track
- Special events: exactly 1 vocalist event

## Target types

### Beer Bottle

- primary target;
- one hit;
- standard speed;
- standard hitbox;
- awards 100 base points;
- missed bottle costs 1 Show Integrity.

### Beer Mug

- one hit;
- wider hitbox;
- slightly slower;
- awards 75 base points;
- missed mug costs 1 Show Integrity.

### Whiskey Bottle

Deferred from the first graybox. Candidate post-MVP behavior: smaller hitbox and/or two hits.

## Input

MVP input is direct touch.

- Tap a target to hit it.
- No dragging.
- No manual aim reticle.
- No rhythm accuracy grading.
- The touch must feel immediate.

## Drumstick feedback

A successful hit triggers a short visual strike from the lower foreground toward the tapped target.

This is feedback, not a physical projectile simulation.

For the vocalist special event, a thrown-stick visual may be used as a unique animation.

## Pseudo-perspective

Objects begin smaller and visually farther away, then grow while moving toward the foreground.

Use a normalized approach value `progress` from 0 to 1:

- `0.0`: spawn / distant stage area;
- `0.5`: mid-flight;
- `1.0`: danger line / drummer impact.

Position and scale should be derived from elapsed time and progress, not frame count.

## Hit resolution

A tap is a hit when:

- the target is active;
- the touch point intersects the configured hit region;
- the target has not already been resolved.

After resolution, an entity cannot score twice.

## Score

Initial MVP scoring:

`awardedPoints = basePoints * comboMultiplier`

Combo multiplier:

- combo 0–4: x1
- combo 5–9: x2
- combo 10–19: x3
- combo 20+: x4

A miss resets combo to zero. "Miss" means a target reached the danger line unhit — a tap that lands on empty space costs nothing (ADR 0005). The multiplier is applied to the combo *after* the hit is counted, so the fifth consecutive hit is the first to score x2.

This table may be tuned during M5 without changing the game architecture.

## Show Integrity

- starts at 3;
- dangerous missed target: -1;
- reaches 0: Show Ruined;
- no mid-round healing in MVP.

## Vocalist interruption — MVP special event

At approximately 38–45 seconds:

1. Vocalist moves into the drummer's central view.
2. Normal target spawning briefly slows or pauses.
3. A clear visual cue indicates that the vocalist is obstructing the player.
4. Player taps the vocalist.
5. A drumstick throw/impact animation plays.
6. Vocalist reacts and exits.
7. Normal target flow resumes.
8. Award a fixed bonus of 500 points.

The event is intentionally silly and non-graphic.

### Implementation clarifications (M4)

M1 was silent on three points that only surface once the event is played. Resolved in ADR 0005:

- targets already in flight when the interruption starts stay hittable; only *spawning* pauses. Blocking them would cost Show Integrity for an event the player cannot answer;
- the vocalist is in the foreground and wins any tap that lands on them;
- if the player never swings, the vocalist gives up after 7 seconds and normal flow resumes without the bonus, so the round cannot stall.

## Difficulty curve

### 0–15 seconds

- low spawn pressure;
- mostly bottles;
- teach the interaction without tutorial text.

### 15–35 seconds

- bottles + mugs;
- shorter spawn interval;
- occasional two-target overlap.

### 35–45 seconds

- vocalist interruption.

### 45–60 seconds

- highest spawn pressure;
- up to four concurrent targets;
- crowd/audio intensity may rise.

## Game states

Required states:

- READY
- PLAYING
- PAUSED
- VOCALIST_EVENT
- SHOW_COMPLETE
- SHOW_RUINED

Transitions must be explicit and testable.

## Pause behavior

Pause must:

- freeze gameplay time;
- stop spawning/motion;
- pause music if supported by the selected audio API;
- prevent score changes.

Resume must continue from the same gameplay time.

## Completion

### Show Complete

Occurs when round elapsed time reaches 60 seconds while Show Integrity > 0.

Display:

- score;
- best combo;
- objects destroyed;
- misses;
- restart action.

### Show Ruined

Occurs immediately when Show Integrity reaches 0.

Display the same summary plus a restart action.

## Feel requirements

A successful target hit should combine at least:

- target reaction/removal;
- glass or impact SFX;
- small impact burst;
- score feedback;
- short drumstick strike feedback.

Optional after base functionality:

- subtle screen shake;
- haptic feedback.

## MVP acceptance criteria

- a first-time player can understand what to tap without written tutorial instructions;
- input response feels immediate;
- round can be completed and restarted repeatedly without crash;
- audio stops correctly when leaving/restarting;
- scoring cannot double-count one target;
- pause does not advance the timer;
- gameplay speed is not frame-rate dependent.

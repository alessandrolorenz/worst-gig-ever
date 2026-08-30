# M8 — Visual MVP Candidate & Physical Playtest Gate

## Objective
Produce the first cohesive, art-integrated, device-runnable visual MVP candidate and stop for human judgement. This is not store readiness or monetization readiness.

## Candidate contains
- drummer POV stage composition;
- Pack 1 background/crowd/drum kit;
- 3-frame band/crowd motion;
- beer bottle/mug using M5A arcs;
- reliable touch/click mapping;
- hit/break feedback;
- vocalist event;
- M7 dodge/clip chaos;
- score/combo/integrity/timer;
- music/SFX;
- show-complete and show-ruined outcomes.

## Allowed polish
Only readability/game-feel fixes:
- anchor/scale/z-order/clipping corrections;
- minor animation timing alignment;
- target visibility;
- FX readability;
- obvious audio clipping/level defects;
- safe-area/layout defects;
- removal of graybox/debug affordances from normal mode.

## Not allowed without owner feedback
- difficulty retuning;
- new target types/events/songs;
- progression/monetization/store setup;
- large UI redesign.

## Physical playtest questions
Immediate comprehension: can a new person understand core action within ~5 seconds without explanation?

Hit satisfaction: does a successful hit feel immediate and satisfying; is whoosh/impact/glass/FX coherent?

Trajectory: do props look thrown rather than sliding, and stay trackable?

Stage life: do 3-frame motions feel alive and intentionally retro/choppy?

Chaos: are dodge/clip moments funny/readable and fair?

Vocalist: funny/chaotic rather than merely annoying?

Replay desire: does the player voluntarily want another round?

## Human decision outcomes
- `EXPAND`
- `TUNE`
- `PIVOT`
- `STOP`

Claude must not choose one without owner observations.

## Exit state
Automated work ends at `READY_FOR_OWNER_PLAYTEST` unless explicit physical-playtest observations are supplied during the milestone.

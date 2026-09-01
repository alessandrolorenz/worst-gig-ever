# M13 — Rhythm MVP Candidate & Physical Playtest Gate

## Objective

Produce and objectively validate the first **Worst Gig Ever** rhythm MVP candidate, then stop for owner playtest.

## Candidate definition

One 60-second round containing:

- visual Groove Pad at 90 BPM;
- 2-beat count-in;
- PERFECT/GOOD timing windows;
- Groove score/streak;
- existing bottles/mugs and throw arcs;
- existing Defense score/combo;
- Show Integrity;
- vocalist event;
- existing music/SFX;
- dual-score end summary.

## No audio synchronization

The music is ambience in this candidate.

The Groove Pad is not expected to align with the song.

This must be explicit during evaluation so harmless mismatch is not misdiagnosed as a bug.

## Objective native validation

When Android tooling is available:
- build/run using the existing known-good local workflow;
- no EAS required;
- verify landscape;
- verify audio module loads;
- verify Groove Pad touch works;
- verify target touch still works;
- verify multi-touch or rapid alternating input does not crash;
- verify pause/background/restart.

## Human playtest

Play at least 10 rounds before tuning.

Include:
1. 3 rounds using one finger only.
2. 3 rounds using two fingers naturally.
3. 1 round focusing mostly on Groove.
4. 1 round focusing mostly on Defense.
5. 1 round intentionally ignoring Groove.
6. 1 round intentionally ignoring bottles.

## Questions

### Comprehension
- Without explanation, is it clear that the cymbal should be tapped?
- Is it clear that bottles must still be destroyed?

### Fun
- Is keeping the beat while reacting to bottles more fun than bottle-only play?
- Does attention switching create enjoyable pressure?

### Groove
- Is 90 BPM comfortable?
- Are pulse and timing feedback understandable?
- Do PERFECT/GOOD feel fair?

### Defense
- Do targets remain hittable while attention is split?
- Are fastballs now too punishing?

### Input
- Is one-finger play viable?
- Is two-finger play better but optional?
- Any missed/phantom touches?

### Visual
- Does the pad remain visible during stage chaos?
- Does the current art make the groove mechanic harder to read?

### Replay
- Do you want to play another round voluntarily?

## Decision

After human observation choose:

- `RHYTHM_VALIDATED`
- `TUNE_RHYTHM`
- `TUNE_DEFENSE`
- `TUNE_BOTH`
- `PIVOT_AGAIN`
- `STOP`

Claude must not choose for the owner.

## Exit

Automated execution ends at:

`READY_FOR_RHYTHM_PLAYTEST`

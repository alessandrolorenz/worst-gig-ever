# ADR 0012 — The pre-roll is a round state, and the Groove Pad is a centred ellipse

Date: 2026-09-01
Status: Accepted
Milestone: M13.1

## Context

The first physical playtest of the rhythm build (M13, Galaxy S23 FE) found the
dual-task loop fun and hard, and the difficulty worth keeping. It also found
two things that were friction rather than challenge:

1. the Groove Pad sat on the hi-hat, bottom-left, while bottles converge on the
   centre of the screen — keeping the groove meant looking away from the
   corridor twice a second;
2. the round began the instant Start was pressed, with only M10's two silent
   beats to find the tempo in.

M13.1 asks for both to be fixed without moving any difficulty value.

## Decision 1 — `COUNTDOWN` is a game state with its own clock

Start enters `COUNTDOWN` rather than `PLAYING`. The state machine is now

```text
READY -> COUNTDOWN -> PLAYING <-> PAUSED
```

with the existing vocalist and terminal transitions untouched.

The pre-roll runs on `RoundState.countdownMs`, a second clock that counts
`0 -> 2000 ms` while `elapsedMs` stays at zero.

### Why a separate field rather than a negative `elapsedMs`

`elapsedMs` is read by spawn scheduling, target flight, the vocalist timeline,
`remainingMs`, and the results screen. Every one of them is written assuming
the round clock starts at zero and only goes forward. Letting it go negative
would have put a sign check in each of those places, and the first one anybody
forgot would be a bug that only appears in the first two seconds of a round.

### Why the clock is clamped and the remainder discarded

`GO` fires at exactly `countdownDurationMs()` of countdown time, and the round
then starts at `elapsedMs === 0`. Whatever fraction of a tick is left over is
thrown away rather than carried into the round.

Carrying it would make the round's zero point depend on how the pre-roll
happened to be sliced, and the beat schedule is derived from that zero point —
so every judgement in the round would inherit the frame rate of the two seconds
before it. AGENTS.md rule 5 forbids exactly that. The cost is that `GO` can
land up to one tick late in wall time; nothing downstream can observe it.

### Why one pulse clock spans both

Presentation reads `pulseClockMs`, which is negative through the pre-roll and
zero at `GO`. This is what makes `3 -> 2 -> 1 -> GO` four consecutive beats of
the round's own schedule rather than an animation bolted onto the front: at 90
BPM they fall on -2000, -1333, -667 and 0, and `padPulse` — a pure function of
time modulo the beat interval — swells into each without knowing the pre-roll
exists. There is still exactly one clock and one beat grid.

### Why backgrounding cancels instead of pausing

A three-second preparation sequence resumed from the middle teaches nothing and
would start the round on a beat the player never heard counted. Nothing has
happened yet — no clock, no spawn, no score — so returning to `READY` costs the
player nothing, which is not true of a pause during play.

### Consequence: the count-in became the GO beat

M10 held beats 0 and 1 unscored so the player could learn the tempo. That job
now belongs to the pre-roll, and keeping it would have stacked a fourth silent
beat behind `GO` — the "one coherent preparation sequence" M13.1 forbids.

`RHYTHM.countInBeats: 2` is therefore `RHYTHM.unscoredLeadBeats: 1`: beat 0 is
`GO`, it pulses, it is not scored, and the first scored beat is beat 1, exactly
one interval later.

**This changes the number of scored beats in a 60-second round from 88 to 89.**
It is a direct consequence of a change M13.1 mandates, and `unscoredLeadBeats`
is not on the milestone's frozen list — but it does mean Groove scores are not
comparable across the M13/M13.1 boundary, and the M13 playtest figures should
not be read against M13.1 ones.

## Decision 2 — the pad is a wide ellipse in the lower centre

`GROOVE_PAD` moved from a circle at (218, 928) r=150 to an ellipse at
(960, 970) with half-extents 320 x 105.

### Why the shape had to change

The vertical band available in the centre is pinned at both ends:
`VOCALIST_BLOCKING_RECT` reaches y 860 and the canvas ends at y 1080. The pad
must clear the first — M11 requires the singer never to interfere with the pad
— and stay inside the second. That leaves 220 px, so a *circle* centred at
x 960 could have had a radius of at most 110, which is **smaller** than the 150
it already had. A milestone asking for a bigger pad cannot deliver one as a
circle in that band.

A wide ellipse is also the more honest shape: a drum head seen from the
drummer's seat is a wide ellipse, and the pad now sits on the kick and snare
faces rather than on a cymbal.

The footprint went from 70,686 px² to 105,558 px² — 49% larger, at the top of
the 30-50% M13.1 suggests. No timing window moved.

### Consequence: the drawn mark and the tap area were unified

The ring is drawn at `1 / (1 + peakScale)` of the tap ellipse, so the swell
peaks at exactly the tap boundary and the hit flash expands out to it and
stops. Nothing the pad draws reaches past what a tap resolves.

Rendering moved to `react-native-svg` (already in the bundle for the quit icon)
because a circular `View` stretched 3:1 stretches its border with it, and the
sides of the ring would have come out three times thicker than the top.

### Consequence: the Groove readout no longer sits above the pad

M12 stacked the readout directly above the pad. Above a centred pad is the
target corridor, where M13.1 forbids Groove feedback, so the readout stayed on
the left rail and `GROOVE_PANEL.height` became its own number instead of the
gap up to the pad.

## Alternatives rejected

- **Keeping a circle and accepting overlap with the vocalist rect.** A tap on
  the pad during the vocalist event would also have registered as hitting the
  singer, ending the event early and awarding the bonus for keeping time. M11
  blesses one tap resolving both the pad and a target; making the singer a
  third claimant was not asked for and changes the event's behaviour.
- **Moving `VOCALIST_BLOCKING_RECT` upward** to free vertical space. It is a
  gameplay tap region, and M13.1 freezes vocalist behaviour.
- **A fourth countdown beat, with the round starting after `GO`.** Then `GO`
  is not a beat of the round at all and the first scored beat is two intervals
  from the last numeral. Making `GO` round beat 0 puts the downbeat of the
  round on the count the player was just given.

## Verification

`docs/verification/M13.1-gate.md`, plus `tests/countdown.test.ts` for the
pre-roll contract and the geometry cases added to `tests/rhythm.test.ts` and
`tests/hudContract.test.ts`. Difficulty freeze confirmed: `game/config/targets.ts`,
`game/config/scoring.ts`, `game/config/stage.ts`, `game/levels/level01.ts` and
`game/systems/approach.ts` have no diff in this milestone.

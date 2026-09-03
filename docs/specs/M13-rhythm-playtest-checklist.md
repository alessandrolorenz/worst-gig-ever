# M13 — Rhythm MVP Physical Playtest Checklist

**Build under test:** the M13 rhythm MVP candidate — Worst Gig Ever, one
60-second round with a visual Groove Pad and the existing bottle defense.

Fill this in during the session. Decide afterwards, not while playing.

---

## Before you start — read this first

**The Groove Pad is not synchronized to the music. That is deliberate.**

The pad pulses at a fixed 90 BPM off the round's own clock. The backing track
loops on its own clock at its own tempo. They will drift apart, and they are
supposed to in this candidate — synchronizing them is a later milestone and is
only worth building if the visual mechanic turns out to be fun on its own.

So: **play to the pulsing ring, not to the song.** If the two disagree, that is
the known mismatch, not a bug. Do not report it as one, and do not let it
colour the answers below.

Everything else — a beat that does not register, a tap that lands in the wrong
place, a stutter, a crash — *is* worth reporting.

## What is in the build

| | |
|---|---|
| Groove Pad | the hi-hat, bottom-left of the kit |
| Tempo | 90 BPM (one tap every ~0.67 s) |
| Count-in | 2 pulses, marked `COUNT IN`, not scored |
| PERFECT | within 90 ms of the beat — 100 points |
| GOOD | within 180 ms — 70 points |
| Missed beat | 0 points, resets the beat streak, **costs no Show Integrity** |
| Defense | unchanged bottles and mugs, same speeds, same hitboxes |
| Scores | Groove and Defense shown separately. There is no combined total |

Nothing about the bottle side was retuned for this build. If it feels harder
than last time, that is the cost of splitting your attention, which is exactly
what is being measured.

---

## Session plan — at least 10 rounds before any tuning

Tick each off. Do not adjust anything between rounds.

| # | Rounds | How to play | Done |
|---|---|---|---|
| 1 | 3 | **One finger only.** Alternate between pad and bottles. | ☐ ☐ ☐ |
| 2 | 3 | **Two fingers, naturally.** Whatever feels right. | ☐ ☐ ☐ |
| 3 | 1 | **Groove focus.** Keep the beat; let bottles go. | ☐ |
| 4 | 1 | **Defense focus.** Break everything; let the beat go. | ☐ |
| 5 | 1 | **Ignore the Groove entirely.** Never touch the pad. | ☐ |
| 6 | 1 | **Ignore the bottles entirely.** Only keep the beat. | ☐ |

Record the two scores after each round:

| Round | Mode | Groove score | Beats hit / judged | Best streak | Defense score | Destroyed | Integrity left | Outcome |
|---|---|---|---|---|---|---|---|---|
| 1 | one finger | | | | | | | |
| 2 | one finger | | | | | | | |
| 3 | one finger | | | | | | | |
| 4 | two fingers | | | | | | | |
| 5 | two fingers | | | | | | | |
| 6 | two fingers | | | | | | | |
| 7 | groove focus | | | | | | | |
| 8 | defense focus | | | | | | | |
| 9 | ignore groove | | | | | | | |
| 10 | ignore bottles | | | | | | | |

Round 9 is a control: ignoring the Groove must **not** make you lose the show
any faster than the old bottle-only build did. Round 10 is the opposite
control: ignoring bottles should end in SHOW RUINED with a high Groove score.

---

## Questions

Answer after the session, from what you observed rather than from what you
expected.

### Comprehension

- Without being told, was it clear the cymbal should be tapped?
  ☐ yes ☐ eventually ☐ no — notes:
- Was it clear bottles still have to be destroyed?
  ☐ yes ☐ no — notes:
- Did the `COUNT IN` marking help, or did scoring seem to start arbitrarily?

### Fun — the question the milestone exists to answer

- Is keeping the beat **while** reacting to bottles more fun than bottle-only
  play was? ☐ clearly more ☐ about the same ☐ worse — notes:
- Does switching attention create enjoyable pressure, or just frustration?
- Which round was the most fun, and why?

### Groove

- Is 90 BPM comfortable? ☐ too slow ☐ right ☐ too fast
- Is the pulse readable — did you know when to tap?
- Do PERFECT and GOOD feel fair, or did fair-looking taps get graded down?
- Is the pad visible during bright stage-light pulses and mid-chaos?

### Defense

- Do targets stay hittable while your attention is split?
- Are the fastballs now too punishing? (They were **not** changed for this
  build — if they feel worse, that is attention cost, not speed.)
- Did Show Integrity drain faster than it used to?

### Input

- Is one-finger play viable? ☐ yes ☐ awkward ☐ no
- Is two-finger play better, and does it feel optional rather than required?
- Any missed taps, phantom taps, or double hits?
- Did tapping the pad ever accidentally break a bottle, or vice versa? Did that
  feel like a reward or like a bug? *(It is intentional — one tap inside both
  regions scores both, once each.)*

### Visual

- Does the pad stay legible during stage chaos?
- Does the current art make the groove mechanic harder to read?
- Is the two-column end summary clear? Is anything missing from it?
- Does the HUD get in the way of seeing incoming bottles?

### Replay

- Did you want to play another round without being asked? ☐ yes ☐ no
- After ten rounds, do you want an eleventh?

---

## Decision

Pick exactly one. **Claude must not choose this** — it is the owner's call.

- ☐ `RHYTHM_VALIDATED` — the combination works; build on it.
- ☐ `TUNE_RHYTHM` — the idea works, the Groove numbers are wrong.
- ☐ `TUNE_DEFENSE` — the idea works, the bottle side needs adjusting.
- ☐ `TUNE_BOTH`
- ☐ `PIVOT_AGAIN` — the combination does not work.
- ☐ `STOP`

If tuning, name the specific dial rather than the feeling:

| Dial | Where | Current |
|---|---|---|
| BPM | `RHYTHM.bpm` in `game/config/rhythm.ts` | 90 |
| Count-in beats | `RHYTHM.countInBeats` | 2 |
| PERFECT window | `RHYTHM.perfectWindowMs` | 90 ms |
| GOOD window | `RHYTHM.goodWindowMs` | 180 ms (must stay under 333 ms) |
| Groove points | `RHYTHM.perfectPoints` / `goodPoints` | 100 / 70 |
| Pad size | `GROOVE_PAD.radiusPx` | 150 |
| Pad position | `GROOVE_PAD.centerX` / `centerY` | 218, 928 |
| Pulse shape | `GROOVE_PULSE.leadInMs` / `decayMs` | 260 / 300 ms |
| Throw speeds | `approachMs` / `fastApproachMs` in `game/config/targets.ts` | see ADR 0007 |
| Fastball frequency | `FASTBALL_CHANCE` | 0.2 |
| Hit forgiveness | `HIT_FORGIVENESS.minRadiusPx` / `assistRadiusPx` | 64 / 110 |
| Spawn cadence | `game/levels/level01.ts` phases | 1800 / 1300 / 850 ms |

## Notes and anything that broke

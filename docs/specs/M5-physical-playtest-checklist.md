# M5 — Physical Playtest Checklist

Companion to `docs/specs/M5-playtest-and-decision.md`. That document holds the
decision (EXPAND / TUNE / ENGINE PIVOT / STOP); this one is the instrument used
to gather the observations that decision rests on.

- Build under test: M5A tuned graybox slice (the M4 slice at commit `733fb15` was the first pass)
- Device:
- Android version:
- Date:
- Observer:

## How to use this

Play **at least 10 full rounds** before answering anything. Answer from what
happened, not from what the code is supposed to do.

Two rules that matter more than the questions:

1. **Do not fix anything during the session.** Write it down and keep playing. A
   fix mid-session destroys the comparison between rounds.
2. **Judge the loop, not the graybox.** Blocks and labels are expected. The
   question is whether the *interaction* works, not whether it looks finished.

Score each line: **YES / NO / PARTLY**, and add a sentence when the answer is
anything other than a clean YES.

Hand the first round to someone who has never seen the game and say nothing.
What they do in the first five seconds is the single most informative data
point in this document.

## A. First contact

| # | Question | Y/N/P | Note |
|---|---|---|---|
| A1 | Does the objective become understandable within the first few seconds, without explanation? | | |
| A2 | Does a first-time player work out what to tap on their own? | | |
| A3 | Is the drummer's point of view immediately legible as "you are behind the kit"? | | |

## B. Core interaction

| # | Question | Y/N/P | Note |
|---|---|---|---|
| B1 | Does the pseudo-perspective convincingly read as objects approaching the drummer? | | |
| B2 | Are targets readable — can you tell a bottle from a mug at a glance? | | |
| B3 | Are targets comfortably tappable, especially while still small and distant? | | |
| B4 | Does hit feedback feel immediate — no perceptible gap between tap and response? | | |
| B5 | Does hitting an object feel satisfying? | | |
| B6 | Does the drumstick strike read as *your* action rather than a random flash? | | |

## C. Audio

| # | Question | Y/N/P | Note |
|---|---|---|---|
| C1 | Does the music loop start, run, and loop without a gap or restart glitch? | | |
| C2 | Does the glass break fire on every hit, without cutting itself off during fast play? | | |
| C3 | Is the stick whoosh audible and does it read as part of the same action as the break? | | |
| C4 | Does the impact/thwack on a miss clearly signal "you lost something"? | | |
| C5 | Does the crowd applause fire at Show Complete? | | |
| C6 | Is audio synchronised enough with the visual hit to feel like one event? | | |
| C7 | Are the relative levels tolerable, or does one cue dominate? (Levels are *not* yet normalised — expect this to need work.) | | |

## D. Difficulty and pacing

| # | Question | Y/N/P | Note |
|---|---|---|---|
| D1 | Does the show become exciting rather than confusing as spawn pressure rises? | | |
| D2 | At peak pressure (45–60s, up to 4 targets), can you still track what is happening? | | |
| D3 | Does Show Integrity feel fair — is every lost point one you understand and accept? | | |
| D4 | Does losing a point read clearly at the moment it happens? | | |
| D5 | Does combo feedback make a run of hits feel more rewarding than isolated hits? | | |
| D6 | Is the 60-second round the right length, or does it drag / end abruptly? | | |

## E. The vocalist event

| # | Question | Y/N/P | Note |
|---|---|---|---|
| E1 | Does the event read clearly — is it obvious that the singer is now the thing to hit? | | |
| E2 | Is it funny and chaotic rather than merely annoying? | | |
| E3 | Can you still understand and defend against incoming objects during the event? | | |
| E4 | Does the 500 bonus feel earned? | | |
| E5 | If you deliberately ignore the singer, does the 7-second give-up feel reasonable? | | |
| E6 | Is the return to normal play clean, or does it feel like the show stumbles? | | |

## F. Round lifecycle

| # | Question | Y/N/P | Note |
|---|---|---|---|
| F1 | Does Show Complete occur correctly at 60s with a correct summary? | | |
| F2 | Does Show Ruined occur immediately when the third point is lost? | | |
| F3 | Does restart work repeatedly — 5+ times in a row without degradation? | | |
| F4 | After restart, is the round genuinely fresh (score, combo, integrity, clock, music)? | | |
| F5 | Does pause freeze everything, and does resume continue from the same moment? | | |
| F6 | Does backgrounding the app (home button, notification shade, call) pause it and stop the music? | | |
| F7 | On returning to the foreground, does the round resume sanely rather than skipping ahead? | | |

## G. Technical observation

| # | Question | Y/N/P | Note |
|---|---|---|---|
| G1 | Any visible frame pacing problems — stutter, hitching, uneven approach motion? | | |
| G2 | Any perceptible touch latency? | | |
| G3 | Any audio latency between tap and sound? | | |
| G4 | Any audio clipping, distortion, or crackle? | | |
| G5 | Any scaling problems — is the whole 16:9 canvas visible and correctly proportioned? | | |
| G6 | Are the letterbox bars acceptable on this screen, or do they read as broken? | | |
| G7 | Any safe-area problems — HUD or controls under a notch, cutout, or gesture bar? | | |
| G8 | Any crash, freeze, or black screen across the whole session? | | |
| G9 | Does music ever duplicate, survive a restart, or keep playing after quit? | | |

**Frame pacing caveat:** the development client is a **debug** build with dev-mode
overhead, and `app.json` still sets `jsEngine: "jsc"` rather than Hermes. If G1
is a NO, re-check with a release build before concluding anything about the
engine — see ADR 0001 and the M2 reconciliation note. Do not switch engines on
the strength of a debug-build observation.

## H. The question that actually matters

> Is hitting objects and surviving the chaotic show fun enough that someone
> immediately wants to play another round?

Observe rather than ask: after a round ends, does the player reach for restart
before being prompted?

| Round | Restarted unprompted? | Note |
|---|---|---|
| 1 | | |
| 2 | | |
| 3 | | |

Answer: **YES / NO**

## I. Free observation

Anything surprising, funny, frustrating, or unexpected. Exact words from a
first-time player are worth more than a paraphrase.

## J. Outcome

Only after all 10 rounds:

- Tuning changes the slice needs (list, do not implement yet):
- Bugs found (list):
- Decision per `docs/specs/M5-playtest-and-decision.md`: **EXPAND / TUNE / ENGINE PIVOT / STOP**
- Rationale (two sentences):

## K. M5A tuning pass

Answer these last, and only after J: they ask whether the M5A changes landed
(`docs/specs/M5A-first-tuning-pass.md`, ADR 0007) rather than whether the game
is fun, and knowing what was changed biases every answer above.

| # | Question | Y/N/P | Note |
|---|---|---|---|
| K1 | Do taps now land where you aimed, every time, anywhere on the screen? | | |
| K2 | Is the enlarged hitbox enough, too much, or still not enough? (The faint ring around each object is the real tap radius.) | | |
| K3 | Does the near-miss assist ever resolve an object you were not aiming at? | | |
| K4 | Do objects read as *thrown by someone in the crowd* rather than sliding forward? | | |
| K5 | Is the arc legible enough to anticipate where an object will arrive? | | |
| K6 | Does the tumble help or hurt readability of bottle vs. mug? | | |
| K7 | Does the band look alive rather than static? | | |
| K8 | Are the dodges readable as reactions to a specific object, or just noise? | | |
| K9 | Is the crowd/light motion supporting the show, or distracting from the targets? | | |
| K10 | Does the choppy, low-frame animation read as a style or as a fault? | | |

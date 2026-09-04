# M16 — Beat Clarity and Progressive Teaching

**Status:** in progress on `feat/m16-beat-clarity`. A, B, C, D and F are
implemented and green. E is **structurally done and half-supplied**: music is
routed per stage and the teaching stage plays a generated, provably
tempo-locked bed. The show's own bed is the one thing still outstanding, and it
is a music choice rather than an engineering one.
**Depends on:** the M15 device review and the M14.1 performance retest both
closing. Nothing here is worth judging on an unvalidated baseline.
**Stop checkpoint:** `M16_BEAT_CLARITY_DEVICE_REVIEW`.

## Why this milestone exists

Owner playtest, 2026-09-04, verbatim: *"a representação das batidas que o
baterista tem que acompanhar não estão claras… seria melhor ser progressivo o
uso das batidas pra ensinar como é, com um visual mais claro, poucos objetos, e
vai progredindo ambos."*

This is the same class of report as M13.1 — the mechanic is not wrong, it is
not *legible* — and it is treated the same way: fix the reading, do not touch
the difficulty. **No timing window, BPM, point value, hitbox, or spawn schedule
of an existing level changes in M16.**

## The four reasons the beat is unclear

Each of these is a separate defect with a separate fix. They were not obvious
individually; together they are why a player cannot find the pulse.

### 1. The pad grows, and growth has no readable instant

`padPulse` swells for `GROOVE_PULSE.leadInMs` (260 ms), peaks exactly on the
beat, then falls for 300 ms. The peak *is* the beat — but a growing shape gives
the eye no way to know it has arrived until it is already shrinking. There is
no coincidence event: nothing meets anything.

Every rhythm game that expects sub-100 ms accuracy uses convergence instead,
because two shapes touching is unambiguous in a way that one shape being at its
largest is not.

### 2. The venue runs on a second, unrelated tempo

`STAGE_MOTION.bpm` is **132**. `RHYTHM.bpm` is **90**. The band's three-pose
loop and the stage-glow pulse therefore beat against the Groove Pad at a ratio
of 22:15 — they align once every 15 groove beats, or every 10 seconds, and are
in antiphase for most of the time in between.

The player is looking at a stage where the lights, the guitarist and the pad
each say a different "now". The pad is not competing with nothing; it is
competing with a bigger, brighter, faster signal covering the whole screen.

### 3. Nothing about the beat is audible

Every cue is visual, on the one screen the player must simultaneously scan for
incoming glass. At Stage 2's peak an object spawns every 850 ms while a beat
falls every 667 ms — the two rates are close enough to interfere and the player
has exactly one channel to read both in.

### 4. The music actively misleads

`rock_theme_song_loop.wav` is **21.75 s**, which at 90 BPM is **32.625 beats**.
It therefore slips **0.625 of a beat — about 417 ms — every single loop**, and
after two loops it is in antiphase with the pad. Open item 13 records the
drift as intentional and harmless. It is not harmless: a player who does the
natural thing and listens for the beat is being handed a clock that is wrong,
and wrong by more than the entire GOOD window (180 ms) after the first loop.

## What changes

### A. A converging cue on the pad

**Deviation from this spec, recorded under AGENTS.md rule 23.** This section
originally specified the standard rhythm-game cue: a ring shrinking from 2.2x
onto the pad's rim. Two measurements taken during implementation ruled it out,
and the cue converges *inside* the pad instead.

*Why the ring does not work here.* The pad is a wide ellipse whose bottom edge
is at y 1075 on a 1080 px canvas. Any concentric ring larger than **1.03x** is
cut off by the bottom of the screen — it could only ever converge from above
and the sides. And it would have cost the surface M14.1 just recovered: a 1.45x
ring needs a 952x329 SVG against the current 664x234, roughly twice the
rasterized area, **on the same device whose tap responsiveness is still under an
open retest**. A readability fix that reopens a performance question answers
neither.

*What was built.* Two markers slide along the pad's horizontal axis, from just
inside the rim to touching at its centre, and they touch **exactly on the
beat**. The coincidence is the cue: two shapes meeting is unambiguous in a way
that one shape being at its largest is not.

- One beat of lead time, so exactly one pair is ever in flight.
- A pure function of `pulseClockMs`, like everything else the pad draws, so it
  cannot drift away from the judgement. No new clock.
- It runs through the pre-roll, so `3 → 2 → 1 → GO` is four closings before
  anything is at stake.
- **Linear travel, on purpose.** A timing cue exists to let the eye extrapolate
  where the marker will be; only constant velocity does that. An eased approach
  looks better standing still and is useless in motion.
- The markers fade in over the first 15% of the travel, because reappearing at
  the rim at full brightness reads as a strobe — the defect M6B fixed in the
  stage overlay for the same reason.
- The existing swell stays, its stroke reduced from 10 to 6, as the
  *confirmation* that the beat landed. The markers say "now"; the swell says
  "that was it".

**Contract:** `PAD_SURFACE` does not move by a pixel, and everything M16 draws
fits inside it at every point of the travel. `tests/hudContract.test.ts` holds
both, so a future cue that wants more room has to come and change the number on
purpose.

### B. A bar counter

Four marks under the pad, filled by `beatIndex % 4`, with beat 1 accented.
`GO` is round beat 0, so `GO` is beat 1 of bar 1 and the phrasing starts
correctly for free.

Eighty-nine identical pulses are a texture; twenty-two bars of four are a
rhythm the player can count, predict, and recover into after looking away to
smash a bottle. This is the cheapest large win in the milestone.

### C. An audible click — everywhere, and switchable

A dry stick click on every beat, in **every stage that has a beat**, including
the three pre-roll beats and `GO`, which finally makes the count-in an actual
count-in.

Owner decision, 2026-09-04: *"jogo todo com possibilidade de habilitar e
desabilitar."* So it is on by default and there is one switch:

- a `Click` toggle on the title screen, and the same toggle in the pause
  overlay, so it can be killed mid-round without abandoning the round;
- the flag lives on `AppFlowState` next to `bestStageCleared`, and is
  **session-only** for exactly the reason that one is: storage is an MVP
  non-goal. A relaunch brings the click back. Persisting it is one line once
  any storage exists, and is deferred until there is some;
- turning it off changes **nothing** about judgement. The click is an *output*
  of the clock, so muting it cannot move a beat window. A test replays one seed
  with the click on and off and asserts the two rounds score identically.

**This does not violate the audio non-goal.** The rhythm-pivot architecture
forbids *deriving* the beat clock from audio — measuring, seeking, or
correcting against playback position. Emitting a sound *from* the visual clock
is the opposite direction and cannot introduce drift: the click is a
consequence of the beat, never an input to it. `rhythmState.ts` stays free of
every audio import; the click is fired by the engine bridge off the same beat
boundary the pad draws from.

`assets/audio/sfx/beat_click.wav` is **generated rather than downloaded**, by
`scripts/make-beat-click.mjs` (`npm run make:click`). A file this repository
synthesizes has no licence to verify and no source page that can rot, which is
the strongest possible answer to rules 12-14; it is 90 ms and 8 kB, which
matters for a sound that plays ninety times a round; and its noise runs off a
fixed seed, so regenerating it reproduces the committed SHA-256 exactly.
Provenance is recorded in `docs/assets/AUDIO-SOURCES.md` under *Generated
audio*. `MIX.beatClick` is 0.85, above the music's 0.38.

### D. One tempo in the venue

`STAGE_MOTION.bpm` becomes **90**, matching `RHYTHM.bpm`, so the band steps a
pose on the same beats the player is asked to tap and the stage glow pulses
with them.

This is presentation only — `STAGE_MOTION` is read by `stageMotion.ts` and
nothing in the round or rhythm domain — but it is the single change most likely
to make the beat findable, because it converts the largest distractor on screen
into the largest reinforcement. The band's loop lengthens from 1.36 s to 2.0 s;
"alive enough" is still the bar, and the poses now land on musical beats rather
than between them.

### E. Music re-acquired at 90 BPM, routed per stage

> **Partly implemented.** Routing is done, the teaching stage has its bed, and
> `MIX.music` is down from 0.5 to 0.38 so the click leads. **The show's bed is
> still the drifting rock loop** — replacing it is a taste decision, and the
> click carries the beat there in the meantime. Open item 13 is therefore
> narrowed rather than closed: it now applies to one stage instead of all of
> them, and `tests/audioContract.test.ts` names that stage so a fourth one
> cannot quietly join it.

Owner decision, 2026-09-04: re-acquire the music rather than accept the drift.
That is the right call — no visual fix survives a soundtrack that contradicts
it, and defect 4 above is the one the player is most likely to trust.

**Requirement: every stage that has a beat plays a bed whose loop length is a
whole number of 90 BPM beats.** At 666.67 ms per beat, 32 beats is 21.333 s;
the current file is 21.75 s, so even trimming it is enough to remove the slip
if no better source is found.

Routing becomes per stage, because the stages now want different things:

| Stage | Bed | Why |
|---|---|---|
| 1 Hold the line | the existing rock loop, unchanged | done — no beat is scored here, so drift cannot mislead anyone |
| 2 Find the beat | a **sparse** 90 BPM bed — kick, hat, backbeat, root notes | done — generated, exactly 16 beats, verified on disk |
| 3 Keep the beat | a **full** 90 BPM rock bed | **outstanding** — still the drifting loop; the click carries the beat |

`StageDefinition` gains a `music` key, `audioService` keeps one player per
track instead of one player, and `playMusic` takes that key. Two players rather
than one player re-pointed at a new source: swapping a source is asynchronous
on both platforms, so a stage transition would begin its round before the bed
had loaded and the first bars would be silent.

**The teaching bed is generated**, by `scripts/make-groove-bed.mjs`
(`npm run make:bed`), for the same reason the click is: searching CC0 libraries
for a track that happens to be at exactly 90 BPM *and* happens to loop on a bar
line is slow and uncertain, while rendering one makes the property true by
construction. It is exactly 16 beats — four bars of four — measured off the file
on disk by `tests/audioContract.test.ts`, and every voice's tail is wrapped back
to the head so the loop is seamless. A truncated kick tail clicks on every
repeat, which on a stage whose whole job is teaching a steady pulse is a tick in
precisely the wrong place. Kick on 1 and 3, snare on 2 and 4, eighth-note hats
accented on the beat, root notes on a plain four-bar figure: a bed, not a song.

**The audio mix became assertable.** `audioAssets.ts` reaches for files through
Metro's `require`, so nothing in a `node --test` run could import it and no rule
about the mix was testable at all. Levels, pool sizes and the tempo-lock table
moved to `game/audio/audioMix.ts`, which is plain data; the registry keeps only
the filenames it was documented to own.

The acquisition rules are the existing ones and they are not negotiable: CC0
preferred; every file recorded in `docs/assets/AUDIO-SOURCES.md` with source
page, author, licence, original filename, local filename, retrieval date and
SHA-256 (rule 13); and **no silent substitution** — if a track cannot be
licence-verified, keep the current loop on that stage, say so, and report it
(rule 14).

Two format constraints, both already learned here: Android guarantees only 8-
and 16-bit linear PCM WAVE, so a 24-bit source needs a 16-bit derivative (this
is why the current runtime file is a derivative); and while the audio pass is
open, close open item 2 — `crowd_applause.wav` is still the untrimmed 39 s /
6.9 MB source, and the five-file mix has never been volume-normalized.

**Open item 2 is closed.** The applause was 39.15 s / 6.59 MB — the largest
asset in the app, for a sound that plays once over a results screen. It is now
5.00 s / 0.84 MB, cut from the natural swell with a 1.2 s fade rather than from
a hard onset mid-clap; the first five seconds are where the clap builds, which
was measured before cutting.

The "volume normalization" half of that item was measured and turned out not to
be the problem: all four one-shots already peak at 0.97-1.00, and EBU R128
integrated loudness cannot be measured on them at all, because the gate needs
400 ms of content and three of them are shorter than that. Relative loudness is
set by the `MIX` table, which is where it has always been and is now assertable.
No file was re-levelled.

### F. A new Stage 2 — "Find the beat"

The teaching order the owner asked for is *objects first, then beats, then
both*. Stage 1 already teaches objects. There is no stage that teaches beats,
so the very first time a player is asked to keep time is also the first time
they are asked to do it while defending. The show becomes Stage 3.

| # | Stage | Groove | Length | Job |
|---|---|---|---|---|
| 1 | Hold the line | off | 40 s | objects only *(unchanged)* |
| 2 | **Find the beat** | **on** | **35 s** | **beat first, few objects** |
| 3 | Keep the beat | on | 60 s | both *(`level01`, unchanged)* |

`findTheBeat` schedule:

| From | To | Cadence | Kinds | Why |
|---|---|---|---|---|
| 0 s | 12 s | *(no phase)* | — | eighteen beats with nothing else on screen |
| 12 s | 24 s | 2600 ms | bottle | sparser than any phase in the game; the beat stays the main event |
| 24 s | 35 s | 1800 ms | bottle | exactly the show's opening cadence, so Stage 3 starts where this ends |

`durationMs: 35_000`, `startingIntegrity: 3`, `vocalistEventAtMs: null`,
`maxConcurrentTargets: 4`, `randomSeed: 3` (Stage 1 uses 2, the show uses 1;
three stages played back to back must not rehearse each other).

**The empty opening needs no scheduler change.** `phaseAt` already returns
`null` outside every phase, `tickRound` already sets `nextSpawnAtMs = null`
there, and when the 12 s phase opens it seeds `elapsedMs + spawnEveryMs`. The
first bottle arrives at 14.6 s. This was verified against the current
`roundState.ts` before the stage was designed around it.

Briefing:

- `You are the drummer. Before anything gets thrown, find the beat.`
- `Tap the pulsing pad on the drum head every time the ring closes on it.`
- `Count it: one, two, three, four.`
- `Bottles start halfway through. Keep tapping anyway.`

## Non-goals

- No change to `RHYTHM.bpm`, `perfectWindowMs`, `goodWindowMs`, or any point
  value. The beat is not being made easier; it is being made visible.
- No change to `level01`, `defenseDrill`, `targets.ts`, `scoring.ts`, or
  `approach.ts`. Difficulty ramping and throw patterns are **M17**.
- No change to mug resolution or the drink bonus. That is **M18**.
- No settings *screen*. The click toggle is one control in two places that
  already exist, and it does not persist across a relaunch.

## Verification

`npm run verify` plus:

1. the markers meet exactly on the beat and only on the beat, travel at
   constant velocity, and never draw outside `PAD_SURFACE`, which is unchanged;
2. bar index is `beatIndex % 4` and `GO` is bar position 1;
3. exactly one click fires per beat, including the three pre-roll beats, and
   none in `READY`, `PAUSED`, or a terminal state;
4. with the click disabled no click fires, and a replayed seed produces an
   identical score, streak, and judgement stream — muting an output cannot
   change a judgement;
5. `rhythmState.ts` and `roundState.ts` still import nothing from `audio/`;
6. `STAGE_MOTION.bpm === RHYTHM.bpm`, asserted, so the two cannot drift apart
   again silently;
7. the generated bed measures exactly 16 beats at 90 BPM off the file on disk;
   the teaching stage plays a tempo-locked bed; and the show is the **only**
   scored stage allowed to drift, named in the assertion so a fourth stage
   cannot silently join the exception;
8. every shipped audio file is 8- or 16-bit linear PCM at a sample rate Android
   guarantees; every generated one names a generator script that exists; and
   every new one has a complete provenance entry;
9. the click is shorter than a quarter of a beat interval, so it cannot run into
   the next beat, and is mixed above the music;
10. `findTheBeat` produces no spawn before 12 s and its first spawn at 14.6 s;
11. the three-stage title picker fits alongside the click toggle without
    overlapping the HUD;
12. `level01` and `defenseDrill` diff clean.

Then stop at `M16_BEAT_CLARITY_DEVICE_REVIEW` and ask the owner whether the
beat is now readable **before** any of M17 is started.

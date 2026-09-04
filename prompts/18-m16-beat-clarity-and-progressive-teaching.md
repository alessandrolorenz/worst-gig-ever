# Execute M16 — Beat Clarity and Progressive Teaching

Only execute after **both** open device reviews have closed: the M15 story and
stages review, and the M14.1 tap-responsiveness retest. Do not stack a
readability milestone on an unvalidated baseline.

Read:

- `docs/specs/M16-beat-clarity-and-progressive-teaching.md`
- `docs/specs/M13.1-groove-readability-and-entry-tuning.md`
- `docs/decisions/0012-m13-1-pre-roll-and-centred-groove-pad.md`
- `docs/architecture/rhythm-pivot-architecture.md`
- `docs/assets/AUDIO-SOURCES.md`
- `game/config/rhythm.ts`, `game/state/rhythmState.ts`, `game/rendering/GroovePad.tsx`
- `game/config/stage.ts`, `game/systems/stageMotion.ts`
- `game/audio/audioService.ts`, `game/audio/audioAssets.ts`
- `game/levels/stages.ts`, `game/state/appFlow.ts`, `game/rendering/Overlays.tsx`

## Goal

The owner reports that the beats the drummer must follow are **not clear**.
Make them readable, and teach them in their own stage before asking the player
to keep them while defending.

This is a readability milestone in the M13.1 sense. **No timing window, BPM,
point value, hitbox, or existing spawn schedule changes.**

## Required work

1. **Converging beat ring.** A ring that starts at 2.2x the pad one beat
   interval ahead and lands exactly on the resting rim on the beat. One beat of
   lead, so only one ring is ever in flight. Pure function of `pulseClockMs`;
   no new clock. Runs through the pre-roll. Reduce the existing swell to a
   confirmation.
2. **Bar counter.** Four marks under the pad on `beatIndex % 4`, beat 1
   accented. `GO` is beat 0 and therefore bar position 1.
3. **Audible click, in every stage that has a beat, with a switch.** One dry
   stick click per beat, pre-roll beats included, fired from the visual clock by
   the engine bridge. On by default. A `Click` toggle on the title screen and
   the same toggle in the pause overlay, backed by a session-only flag on
   `AppFlowState` — no storage, and no settings screen. `rhythmState.ts` and
   `roundState.ts` must still import nothing from `audio/`.
4. **One tempo in the venue.** `STAGE_MOTION.bpm` becomes `RHYTHM.bpm`, and a
   test asserts they are equal so they cannot drift apart again.
5. **Re-acquire the music at 90 BPM and route it per stage.** Every stage with
   a beat plays a bed whose loop is a whole number of 90 BPM beats (32 beats is
   21.333 s; the current file is 21.75 s). Stage 1 keeps the existing loop —
   it scores no beat, so drift cannot mislead. Stage 2 gets a **sparse** bed,
   Stage 3 a **full** one. `StageDefinition` gains a `music` key and
   `audioService` keeps one player per track.

   CC0 preferred. Record source page, author, licence, original filename, local
   filename, retrieval date and SHA-256 in `docs/assets/AUDIO-SOURCES.md` for
   every new file, the click included (rule 13). **Never substitute silently**
   — if a track cannot be licence-verified, leave that stage on the current
   loop, keep a placeholder, and report it (rule 14). Android guarantees only
   8- and 16-bit linear PCM WAVE; a 24-bit source needs a 16-bit derivative.

   While the audio pass is open, close open item 2: trim `crowd_applause.wav`
   from its 39 s / 6.9 MB source and normalize volume across the SFX set.
6. **New Stage 2, "Find the beat."** 35 s, groove on, no phase before 12 s,
   2600 ms bottles to 24 s, 1800 ms bottles to the end, seed 3, no vocalist.
   The show becomes Stage 3, unchanged. Briefing copy is in the spec.
7. Check the three-stage title picker still fits alongside the click toggle
   and does not overlap the HUD.

## Do not

- Change `RHYTHM.bpm`, the judgement windows, or any point value.
- Touch `level01.ts`, `defenseDrill.ts`, `targets.ts`, `scoring.ts`, or
  `approach.ts` — difficulty ramping and throw patterns are M17, and the mug
  drink bonus is M18.
- Add a settings screen or any persistence. The toggle is session-only.
- Derive the beat clock from audio playback position. The click is emitted
  *from* the clock; nothing is ever read back into it.

## Verification

`npm run verify` plus:

- the converging ring reaches exactly `RING_SCALE` at beat time and never draws
  outside the tap ellipse;
- bar index is `beatIndex % 4` and `GO` is bar position 1;
- exactly one click per beat, none in `READY`, `PAUSED`, or a terminal state;
- with the click disabled, no click fires and a replayed seed scores
  identically — muting an output cannot move a judgement;
- `rhythmState.ts` and `roundState.ts` import nothing from `audio/`;
- `STAGE_MOTION.bpm === RHYTHM.bpm`;
- each groove stage's bed measures a whole number of 90 BPM beats on disk;
- every new audio file has a complete provenance entry, or is reported as a
  placeholder with its stage still on the old loop;
- `findTheBeat` spawns nothing before 12 s and first spawns at 14.6 s;
- `level01.ts` and `defenseDrill.ts` diff clean;
- a headless browser run at 923x411 with zero page errors.

## Return

1. Incoming branch/HEAD.
2. What was changed, per file, and why.
3. Provenance for every new audio file, or the reason it is a placeholder.
4. Before/after description of the pad's read.
5. Verification results, with test counts.
6. Current git status.
7. Final state: `M16_BEAT_CLARITY_DEVICE_REVIEW`.

Then STOP. Ask the owner whether the beat is readable on a device **before**
any part of M17 is started. Do not push. Do not launch an EAS build.

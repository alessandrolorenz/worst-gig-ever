# Rhythm Pivot Architecture

## Objective

Add a deterministic visual rhythm mechanic to the existing arcade loop without coupling rhythm rules to rendering, audio playback, or React Native components.

## Core architecture

```text
                     Round elapsed gameplay time
                               |
                               v
                      Visual Beat Clock
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
         Pulse View                         Beat Slots
        (render only)                           |
                                                v
User taps ------------------------------> Rhythm Resolver
   |                                            |
   |                                            v
   |                                      Rhythm State
   |
   +-------------------------------> Existing Target Resolver
                                                |
                                                v
                                         Defense State
```

One physical touch may be observed by both resolvers.

That is intentional.

If a bottle overlaps the groove pad and one tap legitimately falls inside both regions, that tap may both:
- satisfy the visual beat;
- break the bottle.

This is a reward for timing and positioning, not a double-processing bug.

## Time source

The rhythm system uses **gameplay elapsed time**, not wall-clock time and not audio playback position.

It must:
- stop while the round is paused;
- stop in terminal states;
- continue during `VOCALIST_EVENT`;
- remain deterministic across frame rates;
- remain independent from the WAV music loop.

Do not use `Date.now()`, timers, `setInterval`, or frame count as gameplay truth.

## Rhythm domain

Recommended domain shape:

```ts
interface RhythmState {
  score: number;
  hits: number;
  misses: number;
  perfects: number;
  goods: number;
  streak: number;
  bestStreak: number;
  lastJudgedBeatIndex: number;
  lastHitBeatIndex: number | null;
  totalAbsTimingErrorMs: number;
}
```

The exact type may differ if the existing architecture suggests a cleaner shape, but all rhythm truth must remain renderer-independent.

## Beat clock

Initial MVP settings:

- BPM: `90`
- beat interval: `60000 / 90 = 666.666... ms`
- count-in: `2` visual beats
- scored beats start after the count-in
- the clock remains fixed for the entire 60-second round

This BPM is deliberately easier than a typical rock hi-hat pattern. Difficulty in the first pivot comes from doing two tasks at once, not from fast tapping.

## Timing windows

Initial contract:

- PERFECT: absolute timing error <= `90 ms`
- GOOD: absolute timing error <= `180 ms`
- outside +/-180 ms: not a valid beat hit

A beat can be judged only once.

A valid pad tap is assigned to the nearest unjudged beat inside the active timing window.

Extra taps:
- do not lose Show Integrity;
- do not reduce Defense score;
- do not create negative rhythm score;
- do not satisfy multiple beats.

When an unhit beat window closes:
- rhythm miss +1;
- rhythm streak resets;
- Show Integrity is unchanged.

## Scoring

Initial rhythm score:

- PERFECT: +100
- GOOD: +70
- MISS: +0

Defense scoring remains the existing bottle/mug scoring system.

No combined overall score is introduced in this pivot.

The game intentionally exposes two independent performance dimensions:
- Groove
- Defense

## Input routing

Keep the existing surface-relative coordinate mapping that fixed M5A.

Do not add nested `Pressable` handlers to the drum art.

The play surface continues to collect touch points and converts them to reference-canvas coordinates.

Each unique tap point is evaluated independently by:

1. rhythm pad hit test;
2. target/vocalist hit resolution.

If two distinct fingers arrive in one frame, they remain two distinct taps unless they satisfy the existing duplicate-touch suppression threshold.

## Groove pad rendering

The current drum kit can remain a single image.

The groove pad is a configured rectangle/circle aligned over one visible cymbal.

Do not crop the drum kit or require new art for M10.

Render a code-driven overlay:
- pulse scale/glow;
- hit flash;
- optional PERFECT/GOOD micro-feedback.

The overlay must not become its own touch target.

## Pulse shape

The visual pulse should anticipate the beat, peak at the beat, then decay.

Suggested pure function inputs:
- elapsed gameplay ms;
- BPM;
- beat offset/count-in;
- pulse lead-in duration;
- pulse decay duration.

Rendering reads the function. Rendering never advances the clock.

## Vocalist event

The visual rhythm clock continues during the vocalist interruption.

The player should still be able to keep the groove while dealing with the vocalist.

This is part of the new fantasy: keep playing while the gig becomes ridiculous.

## State ownership

Existing round state remains the owner of:
- game state;
- elapsed time;
- targets;
- Defense score/combo;
- Show Integrity;
- vocalist event.

Rhythm state becomes the owner of:
- beat judgements;
- Groove score;
- rhythm hit/miss counts;
- rhythm streak;
- timing error aggregates.

## Audio non-goal

The current music may start at approximately the same time as the round, but its playback clock is **not** the rhythm clock.

Do not:
- inspect audio samples;
- detect BPM;
- seek audio to beats;
- reschedule based on audio position;
- add MIDI runtime support.

A future milestone may synchronize music and rhythm after this visual mechanic proves fun.

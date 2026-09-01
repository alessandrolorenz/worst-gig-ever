# M10 — Visual Beat Clock & Groove Pad Foundation

## Objective

Add a single visually pulsing cymbal/pad and deterministic beat-judgement domain without yet changing bottle-defense rules.

## Core rule

The player taps the pulsing cymbal when it reaches the beat peak.

The pulse is visual only.

It is not synchronized to the current music.

## Initial configuration

- BPM: 90
- count-in beats: 2
- PERFECT window: +/-90 ms
- GOOD window: +/-180 ms
- PERFECT points: 100
- GOOD points: 70
- missed beat points: 0
- no Show Integrity penalty for a missed beat
- one scored hit maximum per beat

All values live in configuration, not renderer constants.

## Groove pad

Use one existing visible cymbal as the first Groove Pad.

Preferred implementation:
- configured pad center/rect/radius in the 1920×1080 reference canvas;
- code-rendered glow/ring/pulse over the existing drum-kit art;
- no new art required;
- no nested `Pressable`;
- no touch handler inside the drum-kit image.

The pad must remain visually obvious even during bright stage-light pulses.

## Pulse behavior

The pad:
- begins subtle;
- grows/brightens approaching the expected beat;
- peaks on the beat;
- decays immediately after;
- returns to base between pulses.

A player should understand the intended tap moment without explanatory text after a few beats.

## Count-in

The first 2 pulses are visual count-in beats.

They:
- animate normally;
- are not scored;
- do not count as misses;
- allow the player to learn the pulse before scoring starts.

## Rhythm domain

Add pure/testable rhythm logic independent from React/RN/audio.

It must support:
- expected beat index/time;
- nearest eligible beat;
- PERFECT/GOOD judgement;
- duplicate/extra tap rejection;
- beat miss finalization;
- streak/best streak;
- score;
- timing-error accumulation.

## Pause semantics

Beat progression follows gameplay elapsed time.

Therefore:
- READY: no scored clock progression
- PLAYING: active
- PAUSED: frozen
- VOCALIST_EVENT: active
- SHOW_COMPLETE/SHOW_RUINED: frozen

## M10 UI

During the round:
- Groove Pad pulse visible
- lightweight Groove streak / judgement feedback allowed
- current Defense HUD remains unchanged

Ready overlay copy may explain:
- Tap the pulsing cymbal on the beat.
- Break bottles before they hit the kit.

Full dual-score HUD is deferred to M12.

## Non-goals

- no new target behavior;
- no bottle difficulty change;
- no combined score;
- no audio sync;
- no haptics dependency;
- no second pad;
- no rhythm-based stage hazard.

## Exit criteria

- visual pad pulses deterministically;
- beat judgement works in pure tests;
- pause/vocalist semantics are correct;
- current defense gameplay remains behaviorally unchanged;
- full gate passes.

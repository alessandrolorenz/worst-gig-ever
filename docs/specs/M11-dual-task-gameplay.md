# M11 — Dual-Task Gameplay Integration

## Objective

Make Groove and Defense happen simultaneously.

This milestone is the real gameplay pivot.

## New player loop

```text
Watch pulsing cymbal
        |
        v
Tap on visual beat
        |
        +-------------------------+
        |                         |
        v                         v
Maintain groove              Bottle appears
                                  |
                                  v
                            Break / dodge it
                                  |
                                  v
                          Return attention to groove
```

The fun should come from attention switching, not from complex rhythm patterns.

## Input behavior

One or two fingers are both valid.

The game must not require multitouch to succeed.

### One tap, two valid outcomes

A physical tap may be processed by both:
- Groove Pad resolver;
- Defense target/vocalist resolver.

If the point legitimately lies inside both the pad and a hittable object:
- the beat may be judged;
- the target may be hit.

This is intentional.

Do not force artificial priority that makes one mechanic fail.

### Distinct simultaneous fingers

Two touch points in one frame remain distinct unless the existing duplicate-input rule identifies them as the same physical gesture.

Do not globally collapse a multi-touch frame to one point.

## Groove remains active during chaos

Groove scoring continues while:
- bottles fly;
- performer dodge/clip visuals occur;
- vocalist blocks the sightline.

The pad must remain tappable/readable during the vocalist event.

## Defense remains existing behavior

Preserve:
- target arcs;
- target speed windows;
- hit forgiveness;
- Show Integrity;
- Defense combo;
- target idempotency;
- vocalist special hit behavior.

## Rhythm miss behavior

A missed groove beat:
- increases Groove misses;
- resets Groove streak;
- awards no Groove points;
- does NOT lower Show Integrity;
- does NOT reset Defense combo.

A missed bottle:
- keeps existing Defense consequences;
- does NOT directly alter Groove streak unless the player also misses the beat.

The two systems are intentionally independent.

## Difficulty

Do not change BPM, target spawn cadence, target speed, hitbox forgiveness, or integrity in M11.

First judge the difficulty created naturally by combining the two existing tasks.

## Feedback

Allowed:
- short PERFECT / GOOD feedback near pad;
- Groove streak feedback;
- subtle hit flash on pad.

Avoid large text that covers targets.

## Exit criteria

- groove and defense run concurrently;
- same-finger play works;
- two-finger play works;
- overlapping pad/target tap can resolve both correctly;
- each subsystem remains independently scored;
- no input regression;
- full gate passes.

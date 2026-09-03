# Rhythm Pivot Test Matrix

This matrix is a cross-milestone contract.

## Beat Clock

| Case | Expected |
|---|---|
| READY | no scored beat progression |
| first count-in pulse | visual only |
| second count-in pulse | visual only |
| exact beat tap | PERFECT |
| +90 ms | PERFECT |
| -90 ms | PERFECT |
| +91 ms | GOOD |
| -91 ms | GOOD |
| +180 ms | GOOD |
| -180 ms | GOOD |
| outside window | no hit |
| beat closes unhit | Groove miss |
| PAUSED | no beat progression |
| VOCALIST_EVENT | beat progression continues |
| terminal state | frozen |

## Input

| Case | Expected |
|---|---|
| pad only | rhythm only |
| bottle only | defense only |
| pad + overlapping bottle | rhythm + defense exactly once each |
| two fingers same frame | both distinct gestures preserved |
| duplicate browser/native representation | folded as existing duplicate logic requires |
| nested art element touched | surface coordinate mapping remains correct |

## Independence

| Event | Groove | Defense |
|---|---|---|
| Groove miss | miss/streak reset | unchanged |
| Bottle miss | unchanged directly | existing miss/integrity behavior |
| Groove PERFECT | Groove points/streak | unchanged |
| Bottle hit | unchanged directly | existing score/combo |
| Pause | frozen | frozen |
| Restart | reset | reset |

## Determinism

Same:
- level seed;
- elapsed-time step sequence equivalence;
- input tap schedule

must produce equivalent:
- target spawn/flight behavior;
- rhythm beat judgements;
- final Groove metrics;
- final Defense metrics.

## No audio coupling

Tests must not need an audio device or playback position to validate Groove timing.

# M5 — Playtest and Feasibility Gate

## Purpose

Decide whether the vertical slice deserves expansion.

## Required physical playtest

Play at least 10 full rounds on an Android device or representative emulator, including:

- normal completion;
- intentional misses;
- Show Ruined;
- pause/resume;
- repeated restart;
- rapid multi-target tapping;
- vocalist event interaction.

## Technical checks

Record:

- crashes: yes/no;
- visible stutter under peak load: yes/no;
- touch misses caused by performance: yes/no;
- audio overlap/lifecycle bugs: yes/no;
- restart leaks/duplicate music: yes/no;
- obvious engine limitation: yes/no.

## Fun checks

Answer without trying to justify the implementation effort:

1. Is smashing a bottle satisfying?
2. Does the drummer POV make immediate sense?
3. Does the show feel increasingly chaotic?
4. Is the vocalist event funny the first time?
5. Is restarting appealing rather than annoying?
6. After three rounds, do we naturally imagine more events because the base loop works, or because we are trying to rescue a weak loop?

## Decision

Choose exactly one:

### EXPAND

The base loop is fun and technically healthy. Proceed to M6 planning for additional events, venues, progression, and eventual monetization.

### TUNE

The concept shows promise, but timing/feel/visual clarity must improve before adding content.

### ENGINE PIVOT

The concept is fun, but the selected technical stack is the blocker. Evaluate Expo + Skia + Reanimated (and Matter.js only where useful).

### STOP

The interaction is not fun enough to justify expansion.

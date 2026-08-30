# M4 — Vertical Slice Plan

## Objective

Produce one complete 60-second playable show that is good enough to test fun and engine feasibility on Android.

## Implementation order

### Slice 1 — Baseline preservation

- run the template unchanged;
- capture current behavior;
- run type check/tests;
- record baseline versions and commands.

### Slice 2 — Graybox scene

Replace Balloon Pop presentation with a graybox drummer-stage composition:

- simple stage background;
- simple drum-kit foreground block shapes;
- target spawn area;
- danger line;
- HUD.

No final art yet.

### Slice 3 — Core target loop

Implement:

- beer bottle target;
- beer mug target;
- pseudo-perspective approach;
- touch hit detection;
- target resolution;
- missed-target integrity loss;
- score;
- combo.

### Slice 4 — Round lifecycle

Implement:

- READY;
- PLAYING;
- PAUSED;
- SHOW_COMPLETE;
- SHOW_RUINED;
- restart;
- 60-second timer.

### Slice 5 — Vocalist event

Implement one deterministic event around 41 seconds.

### Slice 6 — Audio

Integrate:

- CC0 rock runtime loop;
- glass break SFX;
- stick whoosh;
- impact/thwack if useful;
- crowd applause at completion.

Audio source/provenance requirements are defined in `docs/assets/AUDIO-SOURCES.md`.

### Slice 7 — Art integration

Replace graybox assets through the asset registry:

- stage;
- crowd;
- drum kit;
- vocalist;
- bottle;
- mug;
- drumstick;
- shards;
- hit burst.

No gameplay behavior should need redesign because art was added.

### Slice 8 — Game feel

Only after the full round works:

- short impact scale/pop;
- shard movement;
- subtle camera shake if safe;
- optional haptics;
- score pop-up.

## Completion checklist

- [ ] app starts cleanly;
- [ ] one 60-second round is playable;
- [ ] two target types work;
- [ ] hit cannot score twice;
- [ ] miss reduces Show Integrity;
- [ ] combo increases/resets correctly;
- [ ] vocalist event triggers exactly once;
- [ ] music starts and stops correctly;
- [ ] glass SFX plays on hit;
- [ ] pause freezes round time;
- [ ] Show Complete works;
- [ ] Show Ruined works;
- [ ] restart works repeatedly;
- [ ] final visual assets remain individually replaceable;
- [ ] type check passes;
- [ ] automated tests pass;
- [ ] physical Android playtest completed.

## Do not add during M4

- new venues;
- additional band events;
- progression map;
- advertisements;
- online services;
- settings screen beyond what is strictly necessary;
- onboarding;
- complex tutorial;
- achievements.

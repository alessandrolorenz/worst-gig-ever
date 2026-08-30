# AGENTS.md

## Mission

Build **Worst Band Ever**, a small mobile arcade game, through specification-driven development. Optimize for a fast playable proof of fun before expanding scope.

## Core working rules

1. **Specifications are the contract.** Read the active milestone spec before changing code.
2. **No feature creep.** Do not implement deferred ideas during the vertical slice.
3. **M0–M2 are fast-tracked.** They may be completed in one execution without separate approval pauses unless a blocker changes scope, licensing, or engine feasibility.
4. **Keep gameplay logic independent from rendering.** Scoring, state transitions, spawn timing, hit resolution, and round progression must be testable without rendered assets.
5. **Use elapsed time, not frame count, for gameplay.** The game must not run faster or slower because of device frame rate.
6. **Prefer deterministic schedules for the first level.** Randomness must be seedable where practical.
7. **Use the current template as a prototype accelerator, not an immutable architecture.** Do not replace React Native Game Engine or Matter.js without documenting an engine-feasibility failure and proposing the replacement first.
8. **Matter.js is optional per mechanic.** Do not force physics into mechanics that are simpler and more predictable with time-based interpolation.
9. **The MVP is pseudo-3D/2.5D, not real 3D.** Approaching objects may use position and scale interpolation to simulate depth.
10. **Do not add a MIDI runtime dependency for the MVP.** The MIDI file is a source/provenance asset; use a rendered WAV/OGG/M4A version for playback.
11. **Audio lifecycle must be explicit.** Music and SFX must stop/release correctly on pause, quit, restart, and unmount.
12. **No copyrighted commercial music, band logos, celebrity likenesses, album art, or recognizable branded alcohol labels.** Use original/generated art or assets with verified commercial-safe licensing.
13. **Every third-party asset requires provenance.** Record source page, author, license, original filename, local filename, and retrieval date in `docs/assets/AUDIO-SOURCES.md` or the equivalent art provenance file.
14. **Never silently substitute an asset.** If download or licensing verification fails, keep a placeholder and report it.
15. **Prefer original/generated visual assets.** Third-party visual packs are not needed for the MVP.
16. **Keep movable visual assets isolated from the background.** Characters, props, effects, crowd layers, and drum kit layers must be replaceable independently.
17. **Do not bake gameplay-sensitive hitboxes into art dimensions.** Define hitboxes in game data/config.
18. **Minimize dependencies.** Add a package only when the existing stack cannot satisfy a concrete requirement.
19. **TypeScript strictness is preserved.** Do not weaken the compiler configuration to make implementation easier.
20. **Technical artifacts and code-facing terminology are written in English.**
21. **Validate every milestone.** At minimum run type checking and all available automated tests; run lint if configured.
22. **Keep the repository clean.** Do not commit generated caches, local build outputs, credentials, or unrelated files.
23. **Record meaningful deviations.** If implementation differs from the spec, update the spec or write a decision note before considering the milestone complete.

## MVP non-goals

Do not implement during M0–M5:

- ads;
- purchases;
- backend;
- accounts;
- cloud saves;
- online leaderboards;
- multiplayer;
- multiple venues;
- long campaign progression;
- real rhythm scoring;
- microphone input;
- licensed commercial songs;
- character customization;
- complex sprite-sheet animation;
- procedural level generation;
- bass groove minigame;
- guitarist special event;
- stage-diver event;
- smoke/light hazard systems.

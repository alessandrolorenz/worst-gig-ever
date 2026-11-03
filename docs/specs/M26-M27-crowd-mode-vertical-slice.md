# M26–M27 — Dual Mode Foundation and Crowd Throw Vertical Slice

Status: **implemented and emulator-validated; physical playtest pending**  
Created: 2026-10-07  
Baseline: `m23/admob-compat-15.8.3` at `922c98b2efffed3d10e1a35b6c31786c54059bae`

Superseded for current Crowd tuning by `M28-crowd-challenge-layer.md`; this file
remains the contract for the original vertical slice.

## Why these milestone numbers

The planning prompt proposed M15–M24 only if the repository had no more
appropriate sequence. This repository already uses M15–M25 for shipped story,
teaching, difficulty, reactions, localization, persistence, monetization and
pre-release work. Reusing those numbers would make the historical gates
ambiguous, so Crowd Mode begins at M26.

## Current state found before implementation

- The app is a landscape Expo 53 / React Native 0.79 TypeScript game.
- `GameEngine.tsx` owns the engine host, audio lifecycle and screen handlers.
- `AppFlowState` is the pure screen/navigation domain; `RoundState` is the pure
  Band Mode gameplay domain. A flow may read a round outcome, but a round does
  not import app flow.
- `react-native-game-engine` is used as the native elapsed-time/input host and
  `react-game-engine` supplies the web equivalent.
- Matter.js is limited to short-lived glass shard debris. Existing bottle
  approach paths are closed-form, elapsed-time trajectories rather than
  physics bodies.
- The scene uses one 1920x1080 reference canvas with tested screen/canvas
  coordinate conversion.
- The renderer already separates gameplay geometry from image dimensions.
- The title/stage/briefing/round flow, four Band stages, scoring, persistence,
  audio, localization and monetization are established and must remain intact.
- All production visual and audio assets have provenance gates. No existing
  asset was modified for this slice.
- Baseline `npm run verify`: pass — type-check, lint, 670 tests, art readiness,
  art continuity, provenance, tempo, music-library and monetization checks.

## Architecture decision

Crowd Mode is a sibling gameplay domain, not a flag inside `RoundState`.

```text
AppFlowState
  TITLE (choose perspective)
    ├─ BAND_SELECT → existing BRIEFING → existing ROUND
    └─ CROWD → CrowdState + crowdSystem

Engine clock/input
  ├─ roundSystem  → existing Band Mode only
  └─ crowdSystem  → Crowd Mode only

SceneRenderer
  ├─ existing Band composition
  └─ CrowdScene composition
```

The mode is derived from the active screen with `gameMode(flow)` rather than
stored as a second mutable field. That makes it impossible for navigation to
say Crowd while a `mode` field says Band. No generic minigame framework or new
navigation dependency is introduced.

`CrowdState` owns gesture state, projectile state, score, throw count and
feedback. It imports no React or React Native module. `crowdSystem` only maps
engine events into reference-canvas points and supplies elapsed milliseconds.
`CrowdScene` only renders that state.

## M26 — Dual Mode Foundation

Goal: expose both perspectives without modifying Band Mode gameplay.

Implemented:

- explicit `TITLE` perspective selector;
- `BAND_SELECT` containing the existing stage-selection experience;
- `CROWD` screen for the new independent session;
- derived `GameMode` vocabulary (`band`, `crowd`);
- return path from both modes to the same selector;
- localized English and pt-BR mode copy.

Band Mode's round state, scoring, schedules, hit resolution, physics debris,
audio rules and stage definitions are untouched.

## M27 — Crowd Throw Prototype

The first playable slice uses one bottle and three targets: bassist, vocalist
and guitarist. The existing drummer has no standalone performer art — the
current drum kit is a full-width first-person layer — so inventing a fourth
art-dependent target would violate the asset and hitbox rules. Three useful
targets are enough to answer the throw-feel question.

Interaction:

1. A bottle waits near the lower centre of the canvas.
2. An upward swipe begins in the lower-centre launch region around the bottle;
   menu taps and stage touches cannot accidentally become throws.
3. Swipe displacement projects an impact point onto the distant stage plane.
4. Power controls flight duration, arc height and spin amount.
5. The bottle follows a deterministic parabolic visual arc, shrinks with
   progress and rotates.
6. The endpoint resolves against authored gameplay rectangles.
7. A hit swaps the musician to the existing hit-reaction frame and awards its
   score; a miss costs 50.
8. Feedback holds briefly, then the next bottle reloads automatically.
9. Reset clears the Crowd session without remounting the engine.

Matter.js is intentionally not used for the throw. A controlled elapsed-time
path is smaller, deterministic and easier to tune. Matter remains available
for later secondary debris if a physical playtest shows it adds value.

Initial scores are vocalist 500, bassist 300 and guitarist 300. These are
prototype tuning values, not a permanent economy.

## Reuse

- 1920x1080 canvas and screen-to-canvas conversion;
- native/web game-engine elapsed time and input stream;
- venue background and lighting overlay;
- bassist, vocalist and guitarist idle/hit frames;
- crowd foreground, beer bottle and impact burst;
- catalogue/localization system;
- existing overlay buttons and visual theme.

No source image or audio file was overwritten, regenerated, resized or
recompressed.

## Risks and deliberate limits

- Touch ergonomics and throw satisfaction cannot be established by unit tests
  or mouse input; Android hardware is the authority.
- Native `start`/`move`/`end` delivery is verified on an Android emulator but
  must still be judged on physical hardware for ergonomics and feel.
- The first composition reuses stage-facing performer art. It proves scale,
  readability and interaction but is not final Crowd Mode art direction.
- There is no timer, bottle limit, progression, audio pass or persistent Crowd
  record. Adding any before the throw is judged would hide the core question.
- The prototype has no drummer target because the repository has no suitable
  isolated drummer asset. Do not crop the existing POV kit into one.
- Crowd score can go negative. That makes a miss immediately legible and can
  be revisited after playtest evidence.

## Adapted roadmap

- **M26 — Dual Mode Foundation:** implemented.
- **M27 — Crowd Throw Prototype:** implemented; automated, web and Android
  emulator validation pass. A physical playtest is the remaining gate.
- **M28 — Throw Tuning and Reactions:** only after device evidence; tune swipe
  projection, target regions, arc, timing and feedback. Add richer reactions
  only where the existing pose family supports them.
- **M29 — Short Crowd Session:** choose bottles or time, results and restart.
- **M30 — Crowd Visual/Audio Polish:** replaceable foreground/hand art, impact
  audio and effects with provenance.
- **M31 — Integrated Product Playtest:** both perspectives, navigation,
  lifecycle and representative Android sizes.
- **M32 — Release Candidate:** regression, performance, permissions and store
  packaging only after both modes are stable.

M28–M32 are not authorized by this slice and are intentionally not started.

## Success gate

Automated checks prove determinism and protect Band Mode. The M27 product gate
is still human:

> On a physical phone, is aiming understandable and is throwing the bottle fun?

Do not expand the Crowd session until that question has an answer.

## Validation record

Validated on 2026-10-07:

- `npm run verify` passed with 678 tests plus all configured repository gates;
- Expo production web export completed successfully;
- browser input smoke proved throw, hit feedback, score/throw updates and reset;
- a Pixel 9 Android emulator build/install smoke proved native navigation,
  touch-event delivery, hit resolution and HUD updates;
- the pre-existing Band four-stage selector opened correctly in both browser
  and Android-emulator smoke tests.

Physical-device testing was not performed and remains the release decision for
M27.

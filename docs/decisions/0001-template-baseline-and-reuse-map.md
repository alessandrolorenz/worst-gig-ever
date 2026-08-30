# ADR 0001 — Template baseline adoption and reuse/replace map

- Status: Accepted
- Date: 2026-08-30
- Milestone: M0–M2 fast track
- Baseline commit: `fb2170978eae4b3bb59e0232e7cc421741c78b32` (branch `main`, clean worktree)

## Context

`START-HERE.md` and `docs/specs/M2-technical-foundation.md` select `nightness/react-native-game-engine-expo-typescript-template` as a prototype accelerator. M2 requires the baseline to be verified rather than assumed before the vertical slice starts.

## Verified baseline

| Item | Value |
|---|---|
| Node | v24.18.0 |
| npm | 11.16.0 |
| Expo SDK | 53.0.22 |
| React | 19.0.0 |
| React Native | 0.79.6 |
| react-native-game-engine | 1.2.0 |
| react-game-engine (web) | 1.2.0 |
| matter-js | 0.18.0 (`@types/matter-js` 0.19.8) |
| TypeScript | 5.8.3 (`strict: true`) |
| Template licence | MIT (Copyright (c) 2025 Josh Guyette) |
| Direct dependency licences | all permissive: MIT, 0BSD (tslib), BSD-2-Clause (`@typescript-eslint/parser`), Apache-2.0 (typescript) |

`tsc --noEmit` passed on the unmodified template. `npx expo export` succeeded for both `web` (385 modules) and `android` (926 modules).

The repository is a clone of the template with an added web-support commit; `origin` was renamed to `upstream` as instructed by `START-HERE.md`.

## Decision

Keep the template as the vertical-slice base. No engine-feasibility failure was found, so the engine-replacement clause in AGENTS.md rule 7 does not apply. Preserve the Balloon Pop example untouched during M0–M2 so the working baseline stays runnable; it is replaced in M4 slice 2.

## Reuse / replace map

Reuse directly:

- Expo + TypeScript + EAS configuration (`app.json`, `eas.json`, `metro.config.js`, `babel.config.js`);
- `App.tsx` safe-area shell and the landscape-relevant inset globals;
- `react-native-game-engine` loop wiring and its `time.delta` argument, which already gives elapsed-time updates (AGENTS.md rule 5);
- the web/native engine switch in `game/systems/GameEngine.tsx` (`Platform.OS === 'web' ? WebGameEngine : ReactGameEngine`), which keeps a fast desktop iteration path;
- the `renderer`-per-entity pattern: an entity is plain data plus a component, which is already the rendering boundary M2 asks for;
- `game/types.ts` structural types (`Position2D`, `Size2D`, `IGameEngine`, `GameEngineEvent`);
- the `dispatch` → `onEvent` channel for gameplay-to-UI events;
- the pause/resume mechanism (`gameEngine.start()` / `.stop()`) as the *mechanism*, not as the round-clock semantics.

Replace in M4:

- `game/entities/entities.ts` — the Balloon/Wall/Matter world is not the target scene. Note two defects to avoid carrying over: `entities()` is called on every render of `GameEngine.tsx` (line 21), building a fresh Matter engine per render, and the balloon body is created with a hard-coded `id: 5`;
- `game/entities/Balloon.tsx`, `game/entities/Wall.tsx` — replaced by graybox target/stage entities;
- `game/systems/GameLoop.ts` — the hit test is a fixed ±100 px box around a single named entity and there is no resolved/idempotent flag; M1 requires per-target configured hitboxes and single resolution. The touch/web-input split in this file is worth keeping as a shape;
- gravity-driven motion (`gravity: { x: 0, y: 1.75 }`) — targets use deterministic time-based interpolation instead (M2, pseudo-perspective). Matter.js stays available for post-break shard debris only;
- the `'start' | 'playing' | 'paused'` state union in `GameEngine.tsx` — superseded by the six-state contract in `game/state/gameState.ts`;
- score-as-React-state — M1 needs score, combo, integrity, and a pause-aware round clock; the domain state moves out of the renderer.

Known coupling to remove rather than extend: `global.gameEngine`, `global.topInset`, and the other `global.*` inset values in `App.tsx`/`game/global.d.ts`. They are convenient in the template but make the gameplay layer untestable in isolation, which AGENTS.md rule 4 forbids for scoring/state/spawn/hit logic.

## Consequences

- The engine-feasibility exit criteria in M2 stay open until the M5 physical playtest.
- Balloon Pop still runs after this bootstrap, so the baseline is preserved and comparable.

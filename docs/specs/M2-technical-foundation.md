# M2 — Technical Foundation

## Strategy

Use `nightness/react-native-game-engine-expo-typescript-template` as the initial technical base because it already demonstrates the exact class of prototype we need: touch targets, moving entities, scoring, game states, Matter.js integration, Expo, TypeScript, and EAS configuration.

This is a **feasibility choice for the vertical slice**, not a permanent architecture decision.

## Baseline expected from the candidate template

At bootstrap time, verify rather than assume:

- Expo project starts successfully;
- TypeScript check passes before modifications;
- Balloon Pop example runs;
- Android path is viable;
- package licenses are acceptable for prototype use;
- current Node/npm environment is compatible.

Record actual versions in `project-status.md` after installation.

### Verified baseline — 2026-08-30 (M0–M2 fast track)

Measured at commit `fb2170978eae4b3bb59e0232e7cc421741c78b32`, branch `main`, clean worktree.

| Assumption | Result |
|---|---|
| TypeScript check passes before modifications | **Confirmed.** `tsc --noEmit` exits 0 on the untouched template. |
| Expo project starts / Balloon Pop runs | **Partly confirmed.** `npx expo export` succeeds for `web` (385 modules, 736 kB) and `android` (926 modules, 1.63 MB). The example was not launched on a physical device during bootstrap; device validation belongs to M4/M5. |
| Android path is viable | **Confirmed at bundle level.** Native build not exercised; `expo-audio` now requires a fresh development client (ADR 0002). |
| Package licenses acceptable | **Confirmed.** Template is MIT (Copyright (c) 2025 Josh Guyette). All direct dependencies are permissive: MIT, 0BSD (`tslib`), BSD-2-Clause (`@typescript-eslint/parser`), Apache-2.0 (`typescript`). |
| Node/npm environment compatible | **Confirmed.** Node v24.18.0, npm 11.16.0. |

Versions: Expo 53.0.22, React 19.0.0, React Native 0.79.6, `react-native-game-engine` 1.2.0, `react-game-engine` 1.2.0 (web), `matter-js` 0.18.0, TypeScript 5.8.3 with `strict: true`.

### Reconciliation notes — where the template differed from this spec

1. **No audio package existed.** This spec's audio architecture assumed an audio API was available; neither `expo-av` nor `expo-audio` was installed. `expo-audio` 0.4.9 was added — see ADR 0002.
2. **No test runner and no lint script existed.** The template's only configured check was `type-check`. Tests now run on `node --test` with native TypeScript type stripping, and lint is enabled as a gate — see ADR 0003. This constrains how tests import code; read that ADR before writing M4 tests.
3. **Orientation was `portrait`.** Corrected to `landscape`, along with the app identity that still pointed at the template author — see ADR 0004.
4. **The `@types` alias was inconsistent.** `tsconfig.json` mapped `@types` to `game/types.ts` while `babel.config.js` mapped it to `./game` (i.e. `game/index.ts`). This is invisible today because every `@types` import is type-only and erased before Metro sees it, but it would fail the moment a runtime value is exported from that module. `babel.config.js` now points at `./game/types`.
5. **The published rock loop is 24-bit PCM**, which is outside Android's guaranteed WAVE support. The runtime file is a 16-bit derivative; the provenance record in `docs/assets/AUDIO-SOURCES.md` carries both hashes and the exact command.
6. **`app.json` sets `"jsEngine": "jsc"`.** Hermes is the React Native default and generally the better choice for a game loop. Left unchanged during bootstrap to keep the baseline comparable; revisit only if M5 finds a frame-pacing problem, and treat it as an ADR rather than a silent flip.

## Engine policy

### React Native Game Engine

Use for:

- game loop orchestration;
- entity lifecycle where useful;
- touch event flow;
- rapid prototype assembly.

### Matter.js

Use only where it provides concrete value.

Good MVP candidates:

- post-break shard motion;
- lightweight decorative debris.

Do **not** require Matter.js for incoming target trajectory if deterministic interpolation is simpler.

### Pseudo-perspective target motion

Recommended implementation:

- each target stores `spawnTime`, `duration`, `start`, `end`, and optional curve parameters;
- derive normalized `progress` from game elapsed time;
- derive x/y/scale from `progress`;
- resolve miss when progress reaches 1;
- render size separately from hitbox configuration.

This keeps timing predictable and easy to tune.

## Rendering boundary

Gameplay domain state must not import concrete image files directly.

Recommended layers:

```text
Game config / level data
        ↓
Gameplay systems
        ↓
Entity view models
        ↓
Renderer / asset registry
        ↓
PNG / SVG / effects
```

## Proposed structure

```text
assets/
  art/
    backgrounds/
    band/
    crowd/
    drums/
    props/
    effects/
    ui/
  audio/
    music/
      source/
      runtime/
    sfx/
  manifest/

game/
  config/
  entities/
  systems/
  rendering/
  audio/
  levels/
  state/
  utils/

docs/
  specs/
  architecture/
  assets/
  decisions/

prompts/
```

Adapt this structure to the template with the smallest safe change set. Do not reorganize everything only for aesthetics.

### Established at bootstrap

The directory tree above exists in full. No template files were moved. `game/config/`, `game/levels/`, and `game/state/` are populated with declarative contracts only; `game/rendering/`, `game/audio/`, and `game/utils/` are empty placeholders for M4.

| File | Contents |
|---|---|
| `game/state/gameState.ts` | `GameState`, `TargetKind`, `TargetStatus` vocabularies as `as const` unions. No transition behavior. |
| `game/config/targets.ts` | Per-kind base points, miss cost, hit radius, approach duration. Hitboxes live here, never in art dimensions (AGENTS.md rule 17). |
| `game/config/scoring.ts` | Combo multiplier table and the vocalist bonus. |
| `game/levels/level01.ts` | The 60-second round schedule: duration, starting integrity, vocalist timing, spawn phases, seed. |
| `tests/contracts.test.ts` | Locks the above against M1/M3 and asserts every manifest-declared audio file exists. |

These modules hold data and types only. Behavior — the clock, spawner, hit resolution, scoring, and state machine — is M4 work. Keeping the split means a tuning change during M5 is a data edit, not a code edit.

`assets/manifest/asset-manifest.json` remains the single naming contract for art and audio and was not modified: all six audio paths it declares are now filled, and the art paths stay unfilled until M3.

## Core domain types

Expected concepts:

```ts
type GameState =
  | 'READY'
  | 'PLAYING'
  | 'PAUSED'
  | 'VOCALIST_EVENT'
  | 'SHOW_COMPLETE'
  | 'SHOW_RUINED';

type TargetKind = 'beerBottle' | 'beerMug';

type TargetStatus = 'active' | 'hit' | 'missed';
```

Implementation names may differ if the existing template has strong conventions, but concepts must remain explicit.

## Level data

Keep level behavior data-driven where inexpensive.

Example:

```ts
export const level01 = {
  durationMs: 60_000,
  startingIntegrity: 3,
  vocalistEventAtMs: 41_000,
  phases: [
    { fromMs: 0, toMs: 15_000, spawnEveryMs: 1800 },
    { fromMs: 15_000, toMs: 35_000, spawnEveryMs: 1300 },
    { fromMs: 45_000, toMs: 60_000, spawnEveryMs: 850 },
  ],
};
```

Exact values are tuning inputs, not architecture.

## Audio architecture

### Music

For MVP playback use a rendered audio file, not live MIDI synthesis.

Keep both when downloaded:

- source MIDI under `assets/audio/music/source/`;
- runtime WAV/OGG/M4A under `assets/audio/music/runtime/`.

Runtime library: `expo-audio` 0.4.9 (ADR 0002). Installed at bootstrap, not yet imported; the service is written in M4 slice 6. It ships native code, so the development client must be rebuilt before audio works on device.

### SFX

Required initial logical keys:

- `glassBreak`
- `stickWhoosh`
- `impactThwack`
- `crowdApplause`

The asset registry maps those keys to concrete files.

### Audio lifecycle

Audio service/module must support:

- preload;
- play music;
- pause/resume music;
- stop/restart;
- one-shot SFX;
- cleanup on unmount/quit.

## Art integration

The first implementation uses graybox shapes.

After gameplay passes the basic loop test, replace placeholders through an asset registry. Avoid rewriting scoring or target movement when art is introduced.

## Testing strategy

Runner: `node --test` with Node's native TypeScript type stripping — no Jest, no transform config, no new dependencies. Import rules and constraints are in ADR 0003; read it before adding tests. `npm run verify` runs type-check, lint, and tests together.

Prioritize tests for pure logic:

- state transitions;
- timer progression;
- pause behavior;
- target hit idempotency;
- scoring;
- combo reset;
- integrity loss;
- level phase selection;
- vocalist event triggering once.

Manual physical validation covers:

- touch feel;
- perceived smoothness;
- audio latency;
- pseudo-perspective readability;
- fun.

## Engine feasibility exit criteria

Continue with the current engine if the vertical slice:

- runs reliably on target Android hardware;
- maintains responsive touch under peak MVP target count;
- can render art + simple effects without obvious stutter;
- handles music and SFX without lifecycle bugs;
- does not require hacks that couple every mechanic to the engine internals.

If this fails, stop before feature expansion and evaluate a migration to an Expo + Skia + Reanimated rendering approach. Do not perform the migration silently.

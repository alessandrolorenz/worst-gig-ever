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

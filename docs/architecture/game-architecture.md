# Game Architecture — Vertical Slice

## Principle

Keep the game small, deterministic, data-driven where useful, and replaceable at the rendering boundary.

## Logical flow

```text
Input
  ↓
Game Loop / Clock
  ↓
Game State + Level Schedule
  ↓
Spawn / Movement / Hit Resolution
  ↓
Score / Combo / Integrity
  ↓
Entity View Model
  ↓
Renderer + Asset Registry
  ↓
Visuals

Audio events are emitted from resolved gameplay events, not from image components.
```

## Systems

### Clock system

Owns active round elapsed time and pause semantics.

### Spawn system

Reads level phase configuration and creates targets.

### Approach system

Updates target progress based on elapsed time.

### Hit system

Resolves touch against active target hitboxes and emits a hit event once.

### Score system

Consumes resolved hit/miss events and updates score/combo.

### Integrity system

Consumes misses and ends the show when integrity reaches zero.

### Special event system

Triggers the vocalist event once at the configured timeline position.

### Audio system

Responds to game events and manages lifecycle.

### Rendering

Maps game state to visual components/assets. Rendering must not own score or timer rules.

## Planned module homes

Established at the M0–M2 bootstrap; the behavior in each system is written during M4.

| Layer | Location | State at bootstrap |
|---|---|---|
| Level schedule | `game/levels/` | `level01.ts` present (data) |
| Tuning data, hitboxes | `game/config/` | `targets.ts`, `scoring.ts` present (data) |
| Round state vocabulary | `game/state/` | `gameState.ts` present (types) |
| Clock, spawn, approach, hit, score, integrity, special event | `game/systems/` | template `GameLoop.ts` only — replaced in M4 |
| Entity view models | `game/entities/` | template Balloon/Wall — replaced in M4 |
| Renderer and asset registry | `game/rendering/` | empty |
| Audio service | `game/audio/` | empty; `expo-audio` installed, unused |
| Shared helpers | `game/utils/` | empty |
| Contract tests | `tests/` | `contracts.test.ts` |

Systems consume data from `config/`, `levels/`, and `state/` and must not import concrete image files. Nothing under `config/`, `levels/`, or `state/` may import React or React Native, so that all of it stays testable outside Metro.

## Event examples

```text
TARGET_HIT
TARGET_MISSED
COMBO_CHANGED
INTEGRITY_CHANGED
VOCALIST_EVENT_STARTED
VOCALIST_HIT
SHOW_COMPLETED
SHOW_RUINED
```

An implementation may use direct reducer/actions instead of a formal event bus. Do not add infrastructure merely to imitate this diagram.

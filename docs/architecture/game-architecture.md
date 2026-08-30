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

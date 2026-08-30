# ADR 0005 — M4 vertical slice architecture and rule clarifications

- Status: Accepted
- Date: 2026-08-30
- Milestone: M4 graybox vertical slice

## Context

M4 turns the M0–M2 contracts into a playable 60-second round. Several rules in M1 had gaps that only appear once the round is actually played, and a few structural choices were needed to keep gameplay independent of rendering.

## Structure

The round domain (`game/state/roundState.ts`, plus `config/`, `levels/`, `systems/approach.ts`, `utils/rng.ts`) imports neither React nor React Native. It owns the clock, spawning, hit resolution, scoring, combo, Show Integrity, and every state transition, and reports what happened as a list of events.

`game/systems/roundSystem.ts` is the only bridge: it converts platform input into canvas-space taps, advances the domain, and translates domain events into effects and audio cues. `game/systems/GameEngine.tsx` owns the engine loop, the audio lifecycle, and the overlays. The single piece of gameplay data mirrored into React state is the current `GameState`, used to pick an overlay — a projection, not a second copy.

The practical proof is `tests/roundSystem.test.ts`: a full round, including Matter debris, runs under plain `node --test` with only the audio device faked.

## Decisions and clarifications

1. **The vocalist does not make targets unhittable.** M1 says spawning pauses during the interruption but is silent about targets already in the air. Blocking taps on them punishes the player for an event they were given no way to answer, so in-flight targets stay resolvable. The vocalist is in the foreground and therefore wins any tap that lands on them.
2. **An ignored vocalist gives up after 7 s** (`VOCALIST_TIMEOUT_MS`). M1 defines no failure path for the event; without a timeout a player who never taps stalls spawning for the rest of the show.
3. **Taps resolve on touch-down, not on release.** The template used the engine's `press` event, which waits for the finger to lift. M1 requires the response to feel immediate, and the extra latency reads as sluggishness.
4. **A tap that hits nothing does not break the combo.** Only a target reaching the danger line does. Punishing stray taps would discourage exactly the fast swinging the game is asking for.
5. **The combo multiplier applies to the combo after the hit is counted**, so the fifth consecutive hit is the first to score x2.
6. **Taps are resolved before time advances**, so a tap is judged against the frame the player actually saw.
7. **The engine loop runs continuously; pause is enforced by the domain.** `tickRound` ignores ticks unless the state is PLAYING or VOCALIST_EVENT, which makes pause a single rule instead of a special case spread across the engine. Overlays keep re-rendering as a result.
8. **Time steps are clamped to 100 ms** (`MAX_TICK_DELTA_MS`). Without it, returning from the background delivers one multi-second delta and every in-flight target is missed at once. `AppState` also auto-pauses the round when the app leaves the foreground.
9. **Matter.js drives the shard debris and nothing else** (AGENTS.md rule 8). Target approach is deterministic interpolation; debris is where a solver genuinely pays off, and it exercises the physics path for the M5 feasibility judgement. The Matter world is created once per mount and never during a render, fixing the template defect recorded in ADR 0001.
10. **The canvas is letterboxed ("contain"), not cropped.** Nothing gameplay-critical can end up off-screen on an unusual aspect ratio, which matters more for a graybox than edge-to-edge presentation. Overlays render outside the scaled canvas so their text stays legible at device scale.
11. **Audio degrades to silence rather than crashing.** `expo-audio` is required lazily and every call is guarded, so the round still runs in Expo Go or a development client built before ADR 0002. The READY screen says so when audio is unavailable.

## Removed

Balloon Pop and its supporting files were deleted, along with `game/global.d.ts`, `game/types.ts`, and `game/index.ts`. The last three held the `global.*` inset/engine coupling ADR 0001 flagged as untestable, plus a `Dimensions` snapshot taken at module load that is wrong after any rotation. The `@game` and `@types` path aliases went with them.

The runnable template baseline is preserved by the `baseline/template-import` tag, not by dead code in the worktree.

## Consequences

- Tuning (spawn cadence, hitbox size, approach speed, combo table) is a data edit in `config/` or `levels/`, not a code change — which is what M5 needs.
- Art integration (slice 7) replaces the block shapes in `game/rendering/` only. No rule reads an asset.
- The vocalist timeout and the tap-priority rule are new behavior, not in M1. They are recorded here rather than silently added.

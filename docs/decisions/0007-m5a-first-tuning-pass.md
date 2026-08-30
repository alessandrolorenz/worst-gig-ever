# ADR 0007 — M5A first tuning pass: input, arcs, and stage life

- Status: Accepted
- Date: 2026-08-30
- Milestone: M5A first tuning pass
- Spec: `docs/specs/M5A-first-tuning-pass.md`

## Context

The M4 slice is playable but the first observation pass produced four
actionable complaints: hits are unreliable, objects travel in straight lines,
the band is static, and the stage as a whole reads as a diagram rather than a
show. M5A addresses those four and nothing else. No new gameplay rule, event
family, or scoring value was introduced.

Every value below lives in `game/config/`. They are tuning inputs and are
expected to change after the next playtest.

## 1. Input reliability

### The coordinate-mapping defect

`roundSystem` preferred `locationX`/`locationY` from the native touch and fell
back to `pageX`/`pageY`. That is backwards.

react-native-game-engine does not use a responder on a single view; it listens
with a **bubbling** `onTouchStart` on its entity container
(`node_modules/react-native-game-engine/src/GameEngine.js`). In React Native,
`locationX`/`locationY` on a bubbled touch are measured from **the view the
finger actually landed on**, not from the view holding the handler. The scene
is built from dozens of nested absolutely-positioned views — crowd heads, band
blocks, drum shells, target shapes — so any touch landing on one of them
reported coordinates relative to that child's corner. The resulting canvas
point could be hundreds of pixels away from where the player aimed, and the
error changed depending on what happened to be under the finger.

Decisions:

- **`pageX`/`pageY` minus the play surface's own window position is the
  mapping.** Page coordinates are window-relative and therefore mean the same
  thing regardless of what was touched. `locationX`/`locationY` are kept only
  as a fallback for a platform that omits page coordinates.
- **The scaled canvas is marked `pointerEvents="none"`.** Nothing inside it is
  interactive — the engine listens at the container — so removing it from hit
  testing eliminates the entire class of problem rather than just this
  instance. The HUD was already non-interactive; the overlays render outside
  the canvas.
- **Near-coincident taps in one frame are folded together**
  (`HIT_FORGIVENESS.duplicateTapDistancePx`, 28 canvas px). A browser reports a
  single finger as both `onTouchStart` and `onMouseDown`; without this, one
  swing could destroy two objects.

### Hitbox forgiveness

The M4 hitbox was the configured radius scaled by apparent size. At the spawn
plane that is roughly 21 canvas px for a bottle — about 1.6 mm on a phone.
That, not latency, is the likeliest cause of "hitting is not reliable enough".

Two independent allowances, applied in this order:

1. **The hitbox is enlarged and floored.** `radiusMultiplier` 1.25 and
   `minRadiusPx` 64. The floor dominates most of the flight (a bottle stays at
   64 px until roughly 87 % of its approach), so for most of its life a target
   is a constant, thumb-sized mark.
2. **A miss that came close still resolves.** If no target is under the finger,
   the nearest one within `assistRadiusPx` (110 canvas px) **of its own hitbox
   edge** is resolved. Measuring from the edge rather than the centre means a
   big near target and a small far one are judged by the same margin of error.

Direct hits always beat assisted ones, and among direct hits the most urgent —
the one closest to the drummer — still wins, as in M4. So aiming carefully is
never punished by the assist. The generosity is bounded by a contract test: the
total reach of one swing must stay under two lane pitches, or the player would
stop choosing a target.

The renderer draws a faint ring on the real tap radius while a round is
running. That is a graybox affordance rather than decoration: the next playtest
cannot judge whether the widening is enough unless the observer can see what
they were aiming at. It reads the same number hit resolution uses, and it goes
away with the graybox.

**Not changed:** taps still resolve on touch-down and are still resolved before
time advances (ADR 0005, points 3 and 6). Neither was implicated.

## 2. Arc-based throws

`game/systems/approach.ts` gains `throwPoseAt(progress, trajectory)`. A
`Trajectory` is authored once at spawn — origin, lane, arc height, drift, spin
— and the whole flight is a closed-form function of progress. There is no
integration, no state, and no physics: Matter.js still drives only the shard
debris (AGENTS.md rule 8).

- **The arc is a lift off the straight line, not a replacement for it.** The
  existing depth model still produces both endpoints, so a target still spawns
  at the far scale and still arrives at the danger line at full size. Hit
  resolution and the miss rule therefore cannot disagree with what is drawn.
  `throwPoseAt` with a zero arc is exactly `poseAt`, and a test asserts it.
- **The arc weight is `4p(1-p)`** — zero at both ends, one at mid-flight. A
  parabola rather than a sine because its endpoints are exactly zero without
  depending on floating-point luck.
- **Lift and drift are multiplied by apparent size**, so a throw bends little
  while far away and a lot close up. The arc lives inside the perspective
  instead of fighting it. In practice an object now rises out of the crowd,
  hangs, and then plunges at the kit.
- **Objects are thrown from the crowd, not from the vanishing point.**
  `THROW_ORIGIN` spreads the release point across most of the canvas width at
  crowd height. Launching everything from one point was the single largest
  reason M4 read as "sliding".
- **Spin is signed and per-kind.** A bottle tumbles up to 2.4 turns per flight;
  a mug, being heavier, up to 1.1.

Every parameter is drawn from the round's existing seeded generator, so a seed
still replays a round exactly — the throws are varied, not random at runtime.

## 3. Performer reactions and 4. ambient stage motion

`game/systems/stageMotion.ts` is new, pure, and imports no React. It owns the
five poses M5A asks for (`idle`, `loopA`, `loopB`, `hitReaction`, `dodge`), the
ambient loop cadence, and the beat pulse.

- **Presentation only.** Nothing here scores, ends a round, or changes what the
  player can hit. The vocalist interruption remains the one gameplay-critical
  band event and stays in `game/state/roundState.ts`; the reaction system only
  supplies the vocalist's idle loop, so the two cannot contradict each other.
- **Dodges are derived, not evented.** A performer ducks when an active target
  is currently passing close to their anchor. This is a read of gameplay state
  the player can already see, so it cannot drift out of sync — and it lets M5A
  honour its own non-goal of adding no new event family for presentation.
  Impact flinches do use an existing event (`TARGET_HIT`, `VOCALIST_HIT`),
  because "where the object broke" is not derivable from a later snapshot.
- **A reaction already playing is not restarted.** Re-entering a pose reads as
  a flicker, not as more chaos.
- **Its clock is its own.** The stage keeps breathing on the title, pause, and
  results screens, where round time deliberately does not advance. It is an
  elapsed-millisecond accumulator like everything else (AGENTS.md rule 5), and
  every read of it is a pure function, so the choreography is assertable
  without a renderer.
- **Loops step between whole frames.** `loopFrameAt` returns an integer index,
  so poses swap rather than interpolate. Two frames on a two-beat cycle at an
  authored 132 bpm. The `bpm` value is a tuning input, not a measurement taken
  from the music track.
- **`loopA` / `loopB` match the idle/groove pose pair already declared in
  `assets/manifest/asset-manifest.json`**, so M6 can drop art in without
  renaming anything.

Measured over a full simulated round, a performer spends roughly 90 % of the
time on the ambient loop, around 10 % dodging, and a few percent flinching.
The vocalist, standing in the middle of the flight path, dodges considerably
more — which is the intended joke.

Crowd heads bob on the same loop with a fixed per-head phase offset, and the
stage glow pulses on the beat.

## Consequences

- Tuning remains a data edit. Approach speed, arc shape, forgiveness, and the
  ambient cadence are all values in `game/config/`.
- The first dial to turn if the next playtest says the game became too easy is
  `HIT_FORGIVENESS.minRadiusPx`, then `assistRadiusPx`. Both are single
  numbers with contract tests bounding them.
- `TargetView` now carries `rotation` and `hitRadius`. The renderer still
  derives nothing itself.
- Art integration in M6 replaces the block shapes and the pose transforms in
  `game/rendering/` only. No rule reads an asset, and the five pose names are
  the contract between them.

## Verification

`npm run verify` is green: type-check clean, lint clean, 116/116 tests passing
(59 before M5A). `npx expo export` succeeds for android and web.

The coordinate-mapping fix and the tap-deduplication were each confirmed by
mutation: reverting them individually turns seven and one test red
respectively.

Success criteria 1, 3, and 4 are subjective and remain **unverified** — they
need a device and a person. Re-run
`docs/specs/M5-physical-playtest-checklist.md` against this build.

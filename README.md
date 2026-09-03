# Worst Gig Ever

**Keep the beat. Survive the gig.**

A small mobile arcade game: you are the drummer at a chaotic rock show. Keep a
simple groove on the pulsing lower-centre drum pad while the crowd throws things at your kit.
Smash them before they land, survive sixty seconds, and try not to let the
singer ruin your night.

Built with Expo, React Native Game Engine, and Matter.js, using
specification-driven development.

> **Renamed at M9** (2026-08-31), from the working title *Worst Band Ever*. The
> joke is the gig, not the band. The GitHub repository, the Expo slug
> (`worst-band-ever`), the EAS project, and the native application identifiers
> (`com.worstbandever.app`) deliberately still carry the old name — they are
> technical identifiers with remote state attached, and migrating them is a
> pre-release task tracked in ADR 0010.

> **Status:** M14 V2 art is integrated: 33/33 canonical assets, distinct
> performers facing the audience, a clear snare, and enabled ambient loops.
> Visuals approved on device. Current checkpoint: `PERFORMANCE_DEVICE_RETEST`;
> M14.1 reduces rendering overhead and fixes slow-frame hit feedback, pending
> a new APK test. See `docs/verification/M14.1-gate.md`.

## Running it

**[docs/running-the-game.md](docs/running-the-game.md)** — step by step for
web, the Android emulator, and a physical device.

The short version:

```sh
npm install
npm run web                                   # fastest look at it
```

For Android, with an emulator already running:

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
npm start                                     # then press "a"
```

The installed APK is a **development client** — it loads its JavaScript from
Metro at runtime, so TypeScript and JSX changes need no rebuild.

## Validating it

```sh
npm run verify        # type-check, lint, tests, art contract and continuity
```

Individually: `npm run type-check`, `npm run lint`, `npm test`
(`node --test`, using native TypeScript type stripping — no test framework).

The gate runs entirely in JavaScript and cannot catch native linking
regressions. Only a native build can; see ADR 0006.

## How the code is organised

Gameplay logic is independent of rendering. Everything under `game/config/`,
`game/levels/`, and `game/state/` imports neither React nor React Native, so
every rule is testable without a renderer — `tests/roundSystem.test.ts` runs a
full round, Matter physics included, under plain `node --test` with only the
audio device faked.

```
game/
  config/      tuning data — hitboxes, arcs, scoring, stage geometry and cadence
  levels/      round schedules (level01)
  state/       the round domain: clock, spawning, hit resolution, scoring, state machine
  systems/     approach and throw math, effects, debris, stage motion, the engine bridge
  entities/    the engine entity map
  rendering/   scene renderer, art registry, scene composition, HUD, overlays, canvas fitting
  audio/       audio service and asset registry
  utils/       seedable RNG
tests/         node:test suites, one per module
docs/
  specs/       milestone specifications — the contract
  decisions/   ADRs, numbered
  architecture/, assets/
```

Rendering is replaceable: no gameplay rule reads an asset, and no hitbox is
derived from art dimensions.

## Working on it

Read **`AGENTS.md`** first — it holds the working rules, and they are binding.
The important ones: specifications are the contract, no feature creep, gameplay
logic stays independent of rendering, elapsed time rather than frame count,
seedable randomness, and every milestone must pass the validation gate.

Then, in order:

| Document | What it is |
|---|---|
| `START-HERE.md` | the original brief and MVP definition |
| `project-status.md` | current phase, gates, open items — start here for "where are we" |
| `docs/specs/` | milestone specs, M0 through the prepared M14 plan |
| `docs/decisions/` | ADRs: why things are the way they are |
| `docs/architecture/game-architecture.md` | system boundaries |
| `docs/running-the-game.md` | how to run and debug it |

## Provenance

Bootstrapped from
[nightness/react-native-game-engine-expo-typescript-template](https://github.com/nightness/react-native-game-engine-expo-typescript-template)
(MIT, Copyright © 2025 Josh Guyette), tracked as the `upstream` remote and kept
at the `baseline/template-import` tag. The template's Balloon Pop example and
its `global.*` coupling were removed in M4; see ADR 0001 and ADR 0005.

Audio assets are CC0 with provenance recorded in `docs/assets/AUDIO-SOURCES.md`.
No copyrighted music, band logos, celebrity likenesses, or branded alcohol
labels are used anywhere in the project.

## License

MIT. See `LICENSE`.

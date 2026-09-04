/**
 * The round-schedule contract, shared by every level.
 *
 * Source of truth: docs/specs/M1-gameplay-spec.md (Round configuration)
 *                  docs/specs/M15-story-briefings-and-two-stages.md (Stages)
 *
 * Extracted from `level01.ts` in M15, when a second level appeared and the
 * shape stopped belonging to any one of them. Data only: the scheduler that
 * reads it lives in `game/state/roundState.ts`.
 */
import type { TargetKind } from '../state/gameState.ts';

export type { VolleyMember, VolleyTemplate } from './volleys.ts';

export interface SpawnPhase {
  readonly fromMs: number;
  readonly toMs: number;
  readonly spawnEveryMs: number;
  /**
   * Interval at the *end* of the phase, interpolated linearly from
   * `spawnEveryMs` across it (M17).
   *
   * Optional, and absent means constant — which is exactly the behaviour every
   * phase had before M17, so the levels that do not opt in keep their schedule
   * throw for throw. `tests/stageFlow.test.ts` replays them to prove it.
   *
   * Until M17 the difficulty curve was a staircase: `level01` steps 1800 to
   * 1300 to 850 as three flat blocks, so the transitions are cliffs and inside
   * a block nothing gets harder at all. A player at second 14 and a player at
   * second 1 face identical pressure.
   */
  readonly spawnEveryToMs?: number;
  readonly kinds: readonly TargetKind[];
  /**
   * Authored figures this phase may throw instead of a single object (M17).
   *
   * `chance` is rolled once per scheduled spawn, and **only when this field is
   * present**. A phase without volleys therefore makes exactly the generator
   * calls it always did, which is what lets the validated levels replay
   * identically rather than merely similarly.
   */
  readonly volleys?: {
    readonly chance: number;
    /** Ids into `VOLLEY_TEMPLATES`. */
    readonly templates: readonly string[];
  };
}

/**
 * A value that ramps across a round, from `start` at time zero to `end` at the
 * final whistle (M17).
 *
 * Linear, and a pure function of the spawn's own time — so it is applied to
 * the *result* of the existing generator calls rather than changing which
 * calls are made, and a seed still replays a round exactly (AGENTS.md rule 6).
 */
export interface RoundCurve {
  readonly start: number;
  readonly end: number;
}

export interface LevelDefinition {
  readonly id: string;
  readonly durationMs: number;
  readonly startingIntegrity: number;
  /**
   * When the vocalist steps into the sightline, or `null` for a level that has
   * no interruption at all (M15).
   *
   * Nullable rather than "a time past the end of the round": a level that is
   * never interrupted should say so, and a sentinel far in the future would
   * still be compared against the clock on every tick and would fire on the
   * final tick of a round whose duration happened to reach it.
   */
  readonly vocalistEventAtMs: number | null;
  readonly maxConcurrentTargets: number;
  /**
   * Seed for any randomized selection inside a phase, so a round is
   * reproducible during tuning (AGENTS.md rule 6).
   */
  readonly randomSeed: number;
  /**
   * Multiplier on every drawn approach duration, ramped across the round
   * (M17). Absent means a flat 1, which is what every level had before.
   *
   * Speed never ramped at all until M17: a bottle spawned at second 2 and one
   * spawned at second 58 were drawn from the same window with the same
   * fastball chance. The round's last minute was denser but not faster.
   *
   * Applied *after* the window is drawn, so the normal and fast windows ramp
   * together and the deliberate gap between them survives at every point on
   * the curve — that gap is what makes a fastball read as a different object
   * rather than an ordinary one arriving early.
   */
  readonly speedCurve?: RoundCurve;
  /**
   * Fastball probability, ramped across the round (M17). Absent means the flat
   * `FASTBALL_CHANCE`. Rare early, common late.
   */
  readonly fastballCurve?: RoundCurve;
  readonly phases: readonly SpawnPhase[];
}

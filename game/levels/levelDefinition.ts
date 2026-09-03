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

export interface SpawnPhase {
  readonly fromMs: number;
  readonly toMs: number;
  readonly spawnEveryMs: number;
  readonly kinds: readonly TargetKind[];
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
  readonly phases: readonly SpawnPhase[];
}

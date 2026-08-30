/**
 * Level 01 — "MVP 01" round schedule.
 *
 * Source of truth: docs/specs/M1-gameplay-spec.md (Round configuration, Difficulty curve)
 *                  docs/specs/M2-technical-foundation.md (Level data)
 *
 * Data only. The spawn scheduler that reads it is implemented in M4.
 * Times are milliseconds of round-elapsed (pause-excluded) gameplay time.
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
  readonly vocalistEventAtMs: number;
  readonly maxConcurrentTargets: number;
  /**
   * Seed for any randomized selection inside a phase, so a round is
   * reproducible during tuning (AGENTS.md rule 6).
   */
  readonly randomSeed: number;
  readonly phases: readonly SpawnPhase[];
}

export const level01: LevelDefinition = {
  id: 'level01',
  durationMs: 60_000,
  startingIntegrity: 3,
  vocalistEventAtMs: 41_000,
  maxConcurrentTargets: 4,
  randomSeed: 1,
  phases: [
    // Teach the interaction: low pressure, bottles only.
    { fromMs: 0, toMs: 15_000, spawnEveryMs: 1800, kinds: ['beerBottle'] },
    // Introduce mugs and allow occasional overlap.
    { fromMs: 15_000, toMs: 35_000, spawnEveryMs: 1300, kinds: ['beerBottle', 'beerMug'] },
    // 35_000-45_000 is intentionally left unscheduled: the vocalist
    // interruption owns that window (M1, Difficulty curve).
    // Peak pressure to the end of the show.
    { fromMs: 45_000, toMs: 60_000, spawnEveryMs: 850, kinds: ['beerBottle', 'beerMug'] },
  ],
};

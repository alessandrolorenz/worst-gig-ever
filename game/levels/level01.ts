/**
 * Level 01 — "MVP 01" round schedule.
 *
 * Source of truth: docs/specs/M1-gameplay-spec.md (Round configuration, Difficulty curve)
 *                  docs/specs/M2-technical-foundation.md (Level data)
 *
 * Data only. The spawn scheduler that reads it is implemented in M4.
 * Times are milliseconds of round-elapsed (pause-excluded) gameplay time.
 *
 * This is the round the owner validated on a physical device at M13.1 and
 * approved visually at M14. **No value in it has changed since**, and M15
 * deliberately did not change one either: it is Stage 2 of the new two-stage
 * flow exactly as it was, which is what makes the pending M14.1 performance
 * retest still a retest of this round. The shared shape moved to
 * `levelDefinition.ts` when Stage 1 arrived; the numbers below did not move.
 */
import type { LevelDefinition } from './levelDefinition.ts';

export type { LevelDefinition, SpawnPhase } from './levelDefinition.ts';

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

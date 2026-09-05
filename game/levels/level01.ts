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
 * approved visually at M14, and it went unchanged from then until M17.1.
 *
 * **M17.1 retuned it on 2026-09-05**, with the owner's explicit go-ahead given
 * against the measurement table in
 * `docs/specs/M17-difficulty-curve-and-throw-patterns.md`. That table is why
 * the retune happened at all: measured over 200 seeds, the show escalated on
 * exactly one axis. Its cadence tightened from 1700 ms to 850, but its objects
 * got *slower* across the round, 1640 ms to 1767, and its fastballs stayed
 * flat at 2.2 / 2.5 / 2.8 per third. By object speed the final phase — the one
 * this file calls "peak pressure" — was the easiest stretch of the show.
 *
 * The shape chosen was the conservative one of two. **The opening does not
 * move**: the first phase keeps its flat 1800 ms and bottles, `speedCurve`
 * starts at 1.0 and `fastballCurve` at 0.2, which are the values the validated
 * round already ran at, so the first third shifts by 7 ms of spawn gap and 0.2
 * of a fastball. Everything behind it escalates. The cost, stated plainly
 * because it was the reason to ask: the round is net harder, 9.1 fastballs per
 * play against 7.5.
 *
 * Structure is untouched — duration, integrity, the vocalist event, the
 * concurrency cap and the seed are the validated numbers, and volleys stay the
 * encore's identity. `npm run measure:rounds` reproduces the table.
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
  /*
   * Opens at 1.0 — the multiplier the validated round ran at, so the first
   * throws are the throws it always made — and closes 12% faster. The encore
   * ends at 0.80; the show is not allowed to reach it.
   */
  speedCurve: { start: 1.0, end: 0.88 },
  /*
   * Opens at `FASTBALL_CHANCE`, again the validated value, and rises to 0.28.
   * The encore runs 0.05 to 0.35: it ramps further in both directions because
   * it is the round that is meant to be the hardest thing in the game.
   */
  fastballCurve: { start: 0.2, end: 0.28 },
  phases: [
    /*
     * Teach the interaction: low pressure, bottles only. Deliberately the one
     * phase with no ramp of its own. It is the stretch with a physical
     * baseline behind it, and the measurement said the show's problem was its
     * ending rather than its opening.
     */
    { fromMs: 0, toMs: 15_000, spawnEveryMs: 1800, kinds: ['beerBottle'] },
    // Mugs join, and the cadence now tightens *inside* the phase rather than
    // stepping to the next one. Opens slightly gentler than the flat 1300 it
    // replaced and ends harder.
    {
      fromMs: 15_000,
      toMs: 35_000,
      spawnEveryMs: 1350,
      spawnEveryToMs: 1180,
      kinds: ['beerBottle', 'beerMug'],
    },
    // 35_000-45_000 is intentionally left unscheduled: the vocalist
    // interruption owns that window (M1, Difficulty curve).
    // Peak pressure to the end of the show — and now peak on all three axes,
    // not just cadence.
    {
      fromMs: 45_000,
      toMs: 60_000,
      spawnEveryMs: 880,
      spawnEveryToMs: 760,
      kinds: ['beerBottle', 'beerMug'],
    },
  ],
};

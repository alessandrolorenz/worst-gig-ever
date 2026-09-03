/**
 * Defense drill — the Stage 1 round schedule (M15).
 *
 * Source of truth: docs/specs/M15-story-briefings-and-two-stages.md
 *
 * One job only: bottles and mugs come out of the crowd and the player breaks
 * them. The Groove Pad is switched off for this stage by `stages.ts`, so
 * nothing here has to know the Groove exists — this file stays what every
 * level file is, a spawn schedule.
 *
 * Data only. Times are milliseconds of round-elapsed gameplay time.
 *
 * ## Why the numbers are these numbers
 *
 * The first two phases are *deliberately identical* to `level01`'s first two —
 * 1800 ms of bottles, then 1300 ms of bottles and mugs. The drill is not a
 * different game with easier throws; it is the show's opening minute with one
 * hand freed, so what the player learns here is literally what Stage 2 opens
 * with.
 *
 * Only the last phase differs. `level01` finishes at 850 ms, which is the
 * pressure a player is asked to hold *after* they have already been through
 * this drill. Ending the drill at 950 leaves exactly one step of escalation
 * for Stage 2 to supply, so the show still has somewhere to go.
 *
 * There is no vocalist interruption: it is the show's surprise, and spending
 * it in the tutorial would cost Stage 2 the only event it has.
 */
import type { LevelDefinition } from './levelDefinition.ts';

export const defenseDrill: LevelDefinition = {
  id: 'defenseDrill',
  /*
   * Two thirds of a show. Long enough to reach real pressure and to make
   * clearing it mean something; short enough that failing on the first
   * attempt costs the player forty seconds rather than a full minute.
   */
  durationMs: 40_000,
  /** The same three the show gives, because the drill teaches the same loss. */
  startingIntegrity: 3,
  vocalistEventAtMs: null,
  maxConcurrentTargets: 4,
  /*
   * A different seed from `level01`. The two stages are played back to back,
   * and sharing a seed would open the show with the throws the player just
   * finished rehearsing.
   */
  randomSeed: 2,
  phases: [
    // Same opening as the show: bottles only, one every 1800 ms.
    { fromMs: 0, toMs: 12_000, spawnEveryMs: 1800, kinds: ['beerBottle'] },
    // Same second phase as the show: mugs join, cadence tightens to 1300 ms.
    { fromMs: 12_000, toMs: 28_000, spawnEveryMs: 1300, kinds: ['beerBottle', 'beerMug'] },
    // One step short of the show's 850 ms peak.
    { fromMs: 28_000, toMs: 40_000, spawnEveryMs: 950, kinds: ['beerBottle', 'beerMug'] },
  ],
};

/**
 * Find the beat — the Stage 2 round schedule (M16).
 *
 * Source of truth: docs/specs/M16-beat-clarity-and-progressive-teaching.md
 *
 * The stage that was missing. Until M16 the first round that asked the player
 * to keep time was also the first round that asked them to defend the kit
 * while doing it — the two jobs arrived together, and the owner's report that
 * the beats "não estão claras" is what a player says when they were never
 * given a chance to learn one of them alone.
 *
 * Stage 1 teaches the objects. This teaches the beat. Stage 3 is the show.
 *
 * Data only. Times are milliseconds of round-elapsed gameplay time.
 *
 * ## Why the numbers are these numbers
 *
 * **Nothing spawns for the first twelve seconds.** That is eighteen beats with
 * the pad, the markers, the bar counter and the click and nothing else on
 * screen. It is the only place in the game where the beat is the whole of what
 * the player is doing, and it is the point of the stage.
 *
 * Then 2600 ms — sparser than any phase in any other level, the next slowest
 * being the show's opening 1800 — because "poucos objetos" has to mean the
 * beat is still the main event once objects exist. Bottles only: a mug is a
 * second thing to recognize and this stage already has one lesson.
 *
 * The last phase is 1800 ms, which is exactly the show's opening cadence, so
 * Stage 3 starts at the pressure Stage 2 finished at rather than stepping
 * back down and then up again.
 *
 * There is no vocalist interruption, for the reason Stage 1 has none: it is
 * the show's surprise and spending it in a tutorial costs Stage 3 the only
 * event it has.
 */
import type { LevelDefinition } from './levelDefinition.ts';

export const findTheBeat: LevelDefinition = {
  id: 'findTheBeat',
  /*
   * Shorter than the drill and much shorter than the show. Long enough to hold
   * twelve seconds of pure beat and still reach a cadence worth defending;
   * short enough that a player who loses it has lost thirty-five seconds.
   */
  durationMs: 35_000,
  /** The same three every stage gives, because the loss must mean the same. */
  startingIntegrity: 3,
  vocalistEventAtMs: null,
  maxConcurrentTargets: 4,
  /*
   * Distinct from `defenseDrill` (2) and `level01` (1). Three stages are
   * played back to back and none of them should be a rehearsal of another.
   */
  randomSeed: 3,
  phases: [
    /*
     * 0-12 s is intentionally left unscheduled — the beat, alone.
     *
     * This needs no scheduler change: `phaseAt` already returns null outside
     * every phase, `tickRound` already clears `nextSpawnAtMs` there, and when
     * the 12 s phase opens it seeds `elapsedMs + spawnEveryMs`. The first
     * bottle therefore arrives at 14 600 ms, not at 12 000.
     */
    // Objects join, as sparsely as the game ever throws them.
    { fromMs: 12_000, toMs: 24_000, spawnEveryMs: 2600, kinds: ['beerBottle'] },
    // The show's opening cadence, so Stage 3 begins where this ends.
    { fromMs: 24_000, toMs: 35_000, spawnEveryMs: 1800, kinds: ['beerBottle'] },
  ],
};

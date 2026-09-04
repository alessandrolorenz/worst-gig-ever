/**
 * Encore — the Stage 4 round schedule (M17).
 *
 * Source of truth: docs/specs/M17-difficulty-curve-and-throw-patterns.md
 *
 * The stage where the difficulty curve and the throw patterns are actually
 * played, and the reason they exist somewhere other than `level01`.
 *
 * ## Why a new level rather than a retune of the show
 *
 * `level01` is the round the owner validated at M13.1, approved visually at
 * M14, and **is still the subject of the open M14.1 performance retest**.
 * Retuning it in the same milestone that introduces the machinery would
 * destroy that baseline mid-measurement. So M17 leaves it byte for byte —
 * `tests/stageFlow.test.ts` replays it spawn by spawn to prove it — and proves
 * the ramp here instead. Retuning the show is M17.1, and it is gated on the
 * owner's explicit go-ahead once the retest closes.
 *
 * ## What is different about it
 *
 * Everything the owner asked for on 2026-09-04, in one round:
 *
 *   - **cadence ramps inside each phase** rather than stepping between flat
 *     blocks, so pressure builds continuously instead of at three cliffs;
 *   - **throws get faster across the round**, which nothing in the game did
 *     before — a bottle at second 2 and one at second 58 were drawn from the
 *     same window;
 *   - **fastballs get commoner**, from one in twenty to better than one in
 *     three;
 *   - **objects arrive as authored figures** — three down one lane, side to
 *     side, a pincer, a mug between two bottles.
 *
 * Data only. The scheduler that reads it is `game/state/roundState.ts`.
 */
import type { LevelDefinition } from './levelDefinition.ts';

export const encore: LevelDefinition = {
  id: 'encore',
  /*
   * Three quarters of a show. The encore is meant to be the hardest thing in
   * the game, and a minute of its final phase would be a war of attrition
   * rather than a climax.
   */
  durationMs: 45_000,
  startingIntegrity: 3,
  /*
   * No interruption. The vocalist walking into the sightline is the *show's*
   * surprise, and it also pauses spawning — which in a round built entirely
   * out of escalation would arrive as a rest exactly when the pressure is
   * supposed to be highest.
   */
  vocalistEventAtMs: null,
  /*
   * One more than the show's four. A three-member figure needs the room to
   * land whole: at the show's cap, with two objects typically in the air, a
   * triple would be refused more often than it was thrown and the patterns
   * would be a feature nobody saw. This is a new level's own value — no
   * validated number moved.
   */
  maxConcurrentTargets: 5,
  /** Distinct from the drill (2), the beat stage (3) and the show (1). */
  randomSeed: 4,
  /*
   * Starts 12% *slower* than the base windows and finishes 20% faster. The
   * opening being gentler than the show's is deliberate: the encore has to
   * have somewhere to climb from, and a round that starts at the show's peak
   * has nothing left to escalate into.
   */
  speedCurve: { start: 1.12, end: 0.8 },
  /** One throw in twenty at the top, better than one in three at the end. */
  fastballCurve: { start: 0.05, end: 0.35 },
  phases: [
    /*
     * Learn the ramp on single bottles. No figures yet: the player is being
     * shown that the round itself is accelerating, and a pattern arriving in
     * the same breath would be read as the cause.
     */
    { fromMs: 0, toMs: 15_000, spawnEveryMs: 1700, spawnEveryToMs: 1300, kinds: ['beerBottle'] },
    /*
     * Mugs join, and so do the two figures that are about *movement* — hold
     * the finger still, or cross the screen and come back.
     */
    {
      fromMs: 15_000,
      toMs: 32_000,
      spawnEveryMs: 1250,
      spawnEveryToMs: 950,
      kinds: ['beerBottle', 'beerMug'],
      volleys: { chance: 0.3, templates: ['TRIPLE_SAME_LANE', 'SIDE_TO_SIDE'] },
    },
    /*
     * Everything at once, including the pincer — the first figure in the game
     * that cannot simply be done, and the reason the last third is a climax
     * rather than just a faster middle.
     */
    {
      fromMs: 32_000,
      toMs: 45_000,
      spawnEveryMs: 950,
      spawnEveryToMs: 720,
      kinds: ['beerBottle', 'beerMug'],
      volleys: {
        chance: 0.45,
        templates: ['TRIPLE_SAME_LANE', 'SIDE_TO_SIDE', 'PINCER', 'MUG_SANDWICH'],
      },
    },
  ],
};

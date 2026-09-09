/**
 * The fictional cash payment shown after a completed full show.
 *
 * This is a result statistic, not an economy. It is derived from the two
 * scores already on the final results screen, returned to that screen, and
 * never written to the app flow or the save file.
 */
import type { GameState } from './gameState.ts';
import type { AppFlowState } from './appFlow.ts';
import { hasNextStage } from '../levels/stages.ts';

export const GIG_PAYOUT = {
  minimum: 200,
  maximum: 400,
  /** Every 1,000 points adds ten fictional dollars/reais. */
  scoreStep: 1_000,
  stepValue: 10,
  /** Each score dimension can add at most half of the $200 variable portion. */
  maximumPerScore: 100,
} as const;

export interface GigPayoutScores {
  readonly grooveScore: number;
  readonly defenseScore: number;
}

function scoreContribution(score: number): number {
  if (!Number.isFinite(score) || score <= 0) return 0;
  const stepped = Math.floor(score / GIG_PAYOUT.scoreStep) * GIG_PAYOUT.stepValue;
  return Math.min(GIG_PAYOUT.maximumPerScore, stepped);
}

/**
 * A small-gig payment, in round fictional units.
 *
 * Groove and Defense contribute independently and symmetrically. Beer
 * consumption is deliberately not an input: the bar does not pay extra for
 * drinking. The function is pure, deterministic, and bounded to $/R$200–400.
 */
export function deriveGigPayout(scores: GigPayoutScores): number {
  return (
    GIG_PAYOUT.minimum +
    scoreContribution(scores.grooveScore) +
    scoreContribution(scores.defenseScore)
  );
}

/**
 * The payout for the result currently on screen, or null when there is none.
 *
 * `SHOW_COMPLETE` is also the state used between stages, so the state alone
 * is not enough. A full show is complete only when the cleared stage has no
 * successor. This deliberately ignores the run's setlist: official and custom
 * shows earn the same payout under the same rules.
 */
export function gigPayoutForResult(
  flow: Pick<AppFlowState, 'stageIndex'>,
  outcome: GameState,
  scores: GigPayoutScores,
): number | null {
  if (outcome !== 'SHOW_COMPLETE' || hasNextStage(flow.stageIndex)) return null;
  return deriveGigPayout(scores);
}

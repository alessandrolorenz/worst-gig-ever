/**
 * Scoring and Show Integrity contract.
 *
 * Source of truth: docs/specs/M1-gameplay-spec.md (Score, Show Integrity)
 *
 * Declarative table only. `awardedPoints = basePoints * comboMultiplier` and
 * combo reset behavior are implemented in M4.
 */

export interface ComboTier {
  /** Inclusive lower bound of the combo counter. */
  readonly minCombo: number;
  readonly multiplier: number;
}

/** Ordered from lowest to highest combo. The last tier is open-ended. */
export const COMBO_TIERS: readonly ComboTier[] = [
  { minCombo: 0, multiplier: 1 },
  { minCombo: 5, multiplier: 2 },
  { minCombo: 10, multiplier: 3 },
  { minCombo: 20, multiplier: 4 },
];

export const SCORING = {
  startingScore: 0,
  startingCombo: 0,
  /** Fixed award for the vocalist interruption (M1, MVP special event). */
  vocalistEventBonus: 500,
} as const;

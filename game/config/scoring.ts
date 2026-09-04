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
  /**
   * Flat award for drinking a mug rather than smashing it (M18).
   *
   * Deliberately not multiplied by the combo. The mug is the *easier* target —
   * a 120 px tap radius against the bottle's 104, slower at both ends of both
   * windows — so a combo-multiplied premium would make the easy object the
   * best scoring path at high combo. A mug smashed early pays base points and
   * no bonus, which is what makes waiting for the drink a decision.
   */
  drinkBonus: 25,
} as const;

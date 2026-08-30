/**
 * Target tuning data.
 *
 * Source of truth: docs/specs/M1-gameplay-spec.md (Target types)
 *
 * Hitboxes live here and not in art dimensions (AGENTS.md rule 17), so that
 * replacing placeholder shapes with final art cannot change difficulty.
 * Values are tuning inputs; M5 may retune them without architecture changes.
 */
import type { TargetKind } from '../state/gameState.ts';

export interface TargetDefinition {
  /** Points awarded before the combo multiplier is applied. */
  readonly basePoints: number;
  /** Show Integrity removed when the target reaches the danger line unhit. */
  readonly integrityCostOnMiss: number;
  /**
   * Tap radius at full approach (progress = 1), in reference-canvas pixels.
   * The effective radius scales with approach progress at runtime.
   */
  readonly hitRadiusAtDangerLine: number;
  /** Spawn-to-danger-line travel time. Lower means a faster, harder target. */
  readonly approachDurationMs: number;
}

export const TARGET_DEFINITIONS: Readonly<Record<TargetKind, TargetDefinition>> = {
  beerBottle: {
    basePoints: 100,
    integrityCostOnMiss: 1,
    hitRadiusAtDangerLine: 90,
    approachDurationMs: 2200,
  },
  beerMug: {
    basePoints: 75,
    integrityCostOnMiss: 1,
    hitRadiusAtDangerLine: 120,
    approachDurationMs: 2600,
  },
};

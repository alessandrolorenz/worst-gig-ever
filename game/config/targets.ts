/**
 * Target tuning data.
 *
 * Source of truth: docs/specs/M1-gameplay-spec.md (Target types)
 *                  docs/specs/M5A-first-tuning-pass (arc motion, hit forgiveness)
 *
 * Hitboxes live here and not in art dimensions (AGENTS.md rule 17), so that
 * replacing placeholder shapes with final art cannot change difficulty.
 * Values are tuning inputs; they may be retuned without architecture changes.
 */
import type { TargetKind } from '../state/gameState.ts';

/**
 * Authored throw shape for a target kind (M5A, Priority 2).
 *
 * Ranges rather than fixed values, so two bottles from the same lane do not
 * trace the same line. The concrete trajectory is drawn once at spawn from the
 * round's seeded generator, which keeps a round reproducible while still
 * looking hand-thrown.
 */
export interface ArcDefinition {
  /** Peak lift above the straight line, in canvas px at full approach. */
  readonly minHeightPx: number;
  readonly maxHeightPx: number;
  /** Largest sideways wander during flight, in canvas px at full approach. */
  readonly maxDriftPx: number;
  /** Full rotations over the whole flight. Heavier objects tumble less. */
  readonly maxSpinTurns: number;
}

/**
 * How long a throw takes to cross the room, as a range (2026-08-31 tuning).
 *
 * A fixed duration per kind made every bottle of a kind arrive at exactly the
 * same speed, which the player learns in a few throws. Drawing the duration
 * per target means some come in noticeably harder than others and the read has
 * to be made each time. The draw is from the round's seeded generator, so a
 * seed still replays a round exactly (AGENTS.md rule 6).
 */
export interface ApproachWindow {
  readonly minMs: number;
  readonly maxMs: number;
}

/**
 * How often a throw is drawn from `fastApproachMs` instead of `approachMs`
 * (2026-08-31 tuning, second speed pass).
 *
 * Widening one window would have made every throw a little faster and none of
 * them alarming: a uniform draw spends most of its time near the middle, so
 * the tail a player has to fear is rare enough to be noise. Two separated
 * windows instead give a readable baseline and an occasional throw that is
 * plainly harder — the fast window does not overlap the normal one, so a
 * fastball is a different object to react to, not the same one slightly early.
 *
 * One roll per spawn, from the round's seeded generator, so the fastballs fall
 * in the same places on every replay of a seed.
 */
export const FASTBALL_CHANCE = 0.2;

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
  readonly approachMs: ApproachWindow;
  /** The window used instead, `FASTBALL_CHANCE` of the time. Strictly faster. */
  readonly fastApproachMs: ApproachWindow;
  readonly arc: ArcDefinition;
}

export const TARGET_DEFINITIONS: Readonly<Record<TargetKind, TargetDefinition>> = {
  beerBottle: {
    basePoints: 100,
    integrityCostOnMiss: 1,
    // Raised from 90 with the bottle's drawn size (2026-08-31): the artwork is
    // held inside this circle by `tests/composition.test.ts`, so a bottle big
    // enough to read at speed does not fit a 90 px one. The dial is here, in
    // config, and moved on purpose — art still does not define it (rule 17).
    hitRadiusAtDangerLine: 104,
    approachMs: { minMs: 1450, maxMs: 1950 },
    fastApproachMs: { minMs: 1050, maxMs: 1250 },
    // Light and end-over-end: a thrown bottle spins hard and wanders.
    arc: { minHeightPx: 170, maxHeightPx: 320, maxDriftPx: 95, maxSpinTurns: 2.4 },
  },
  beerMug: {
    basePoints: 75,
    integrityCostOnMiss: 1,
    hitRadiusAtDangerLine: 120,
    approachMs: { minMs: 1800, maxMs: 2350 },
    fastApproachMs: { minMs: 1350, maxMs: 1550 },
    // Heavy: a flatter lob with a lazier tumble.
    arc: { minHeightPx: 120, maxHeightPx: 230, maxDriftPx: 60, maxSpinTurns: 1.1 },
  },
};

/**
 * How near the mug has to be before the drummer drinks it instead of smashing
 * it (M18, owner decision 2026-09-04).
 *
 * Compared against `closenessAt(progress)` — where the mug *reads* as being —
 * and never against `progress`, which is linear in time. With
 * `STAGE.farDepth` at 4.2 the two diverge hard: at progress 0.60 a mug has
 * crossed only 26% of the visible distance, so a time gate would put the
 * drummer's forearm on screen to catch an object still up near the vanishing
 * point. 0.5 closeness is progress 0.808 — the mug at 62% of full size,
 * y 655 — and leaves 346-452 ms to land the hit on a normal mug, 260-298 ms
 * on a fastball.
 */
export const DRINK_MIN_CLOSENESS = 0.5;

/**
 * Hit-resolution forgiveness (M5A, Priority 1).
 *
 * The first playtest found targets unreliable to hit, which is a playability
 * problem rather than polish: a player who cannot land the swing cannot judge
 * whether the swing is fun. M5A therefore prefers slightly generous
 * interaction over strict precision.
 *
 * Two independent allowances, in this order:
 *  - the hitbox itself is enlarged and given a floor, so a distant target
 *    never shrinks to a pinprick;
 *  - if nothing at all is under the finger, the nearest target within
 *    `assistRadiusPx` of its own hitbox edge is still resolved.
 */
export const HIT_FORGIVENESS = {
  /** Applied to every scaled hit radius. */
  radiusMultiplier: 1.25,
  /** Floor in canvas px, regardless of how far away the target still is. */
  minRadiusPx: 64,
  /** Extra reach used only when the tap hits nothing directly. */
  assistRadiusPx: 110,
  /**
   * Two taps closer together than this within one frame count as one swing.
   * A browser reports a single finger as both `onTouchStart` and
   * `onMouseDown`; without this the same swing is resolved twice.
   */
  duplicateTapDistancePx: 28,
} as const;

/**
 * Pseudo-perspective approach math (M1, M2) and throw arcs (M5A).
 *
 * A target moves from where it was thrown to its lane at the danger line.
 * Everything is derived from normalized `progress` (0 = spawn, 1 = danger
 * line), which itself is derived from elapsed gameplay time — never from a
 * frame counter (AGENTS.md rule 5). The same elapsed time always produces the
 * same position, so the motion is reproducible and testable without rendering.
 *
 * Depth model: apparent size is inversely proportional to distance. Depth
 * moves linearly from `farDepth` to 1, so scale = 1 / depth. That makes a
 * target grow slowly while far away and rush the last stretch, which is what
 * sells the approach.
 *
 * Arc model (M5A, Priority 2): the depth interpolation above gives the
 * straight line between the two endpoints; the arc is a lift *off* that line,
 * shaped by a parabola that is zero at both ends. Both endpoints therefore stay
 * exactly where the perspective model puts them, and the whole trajectory is a
 * closed-form function of progress — no integration, no physics, no state.
 * Matter.js is deliberately not used here (AGENTS.md rule 8).
 */
import { STAGE } from '../config/stage.ts';

export interface ApproachPose {
  /** 0 at spawn, 1 at the danger line. */
  progress: number;
  x: number;
  y: number;
  /** 1 at the danger line. */
  scale: number;
}

/** A pose plus the tumble the object picked up when it was thrown. */
export interface ThrowPose extends ApproachPose {
  /** Radians. Accumulates over the flight. */
  rotation: number;
}

/**
 * One authored throw. Drawn from the round's seeded generator at spawn and
 * then never changed, so the flight is fully determined by its progress.
 */
export interface Trajectory {
  /** Where in the crowd the object was thrown from. */
  readonly originX: number;
  readonly originY: number;
  /** Lane x it converges on at the danger line. */
  readonly laneX: number;
  /** Peak lift off the straight line, in canvas px at full approach. */
  readonly arcHeightPx: number;
  /** Peak sideways wander, in canvas px at full approach. Signed. */
  readonly driftPx: number;
  /** Full rotations over the whole flight. Signed. */
  readonly spinTurns: number;
}

export function clamp01(value: number): number {
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/** Normalized approach progress for a target at a given round time. */
export function progressAt(elapsedMs: number, spawnAtMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  return clamp01((elapsedMs - spawnAtMs) / durationMs);
}

/** Apparent scale at the spawn plane. */
export function farScale(): number {
  return 1 / STAGE.farDepth;
}

/** Apparent size at a given progress. */
export function scaleAt(progress: number): number {
  const depth = STAGE.farDepth + (1 - STAGE.farDepth) * clamp01(progress);
  return 1 / depth;
}

/**
 * How far along the approach the target reads as being: 0 at the spawn plane,
 * 1 at the danger line. Derived from apparent size rather than raw progress so
 * that position and scale always agree with one another.
 */
export function closenessAt(progress: number): number {
  const near = farScale();
  return (scaleAt(progress) - near) / (1 - near);
}

/**
 * Straight-line pose from the vanishing point to a lane.
 *
 * Kept as the reference perspective path: `throwPoseAt` bends away from
 * exactly this line, and tests compare against it.
 */
export function poseAt(progress: number, laneX: number): ApproachPose {
  const p = clamp01(progress);
  const closeness = closenessAt(p);

  return {
    progress: p,
    x: STAGE.vanishingPoint.x + (laneX - STAGE.vanishingPoint.x) * closeness,
    y: STAGE.vanishingPoint.y + (STAGE.dangerLineY - STAGE.vanishingPoint.y) * closeness,
    scale: scaleAt(p),
  };
}

/**
 * Arc weighting: 0 at both ends of the flight, 1 at the halfway point.
 *
 * A parabola rather than a sine because it is cheaper and because its
 * endpoints are exactly zero without relying on floating-point luck.
 */
export function arcShape(progress: number): number {
  const p = clamp01(progress);
  return 4 * p * (1 - p);
}

/**
 * Screen pose for a thrown target.
 *
 * The lift and the drift are both multiplied by apparent size, so a throw that
 * is still far away bends only slightly and the same throw close up bends a
 * lot. That keeps the arc inside the perspective rather than fighting it.
 */
export function throwPoseAt(progress: number, trajectory: Trajectory): ThrowPose {
  const p = clamp01(progress);
  const scale = scaleAt(p);
  const closeness = closenessAt(p);
  const lift = arcShape(p) * scale;

  return {
    progress: p,
    x:
      trajectory.originX +
      (trajectory.laneX - trajectory.originX) * closeness +
      trajectory.driftPx * lift,
    y:
      trajectory.originY +
      (STAGE.dangerLineY - trajectory.originY) * closeness -
      trajectory.arcHeightPx * lift,
    scale,
    rotation: trajectory.spinTurns * 2 * Math.PI * p,
  };
}

/**
 * Tap radius at the target's current apparent size. Configured radii are
 * defined at the danger line, so a distant target is proportionally harder
 * to hit. The hitbox comes from config and never from art bounds
 * (AGENTS.md rule 17).
 *
 * This is the raw perspective radius; the M5A forgiveness allowances are
 * applied on top of it in `game/state/roundState.ts`, which is the only place
 * that decides whether a tap connects.
 */
export function hitRadiusAt(radiusAtDangerLine: number, scale: number): number {
  return radiusAtDangerLine * scale;
}

/**
 * Pseudo-perspective approach math (M1, M2).
 *
 * A target moves from the vanishing point to its lane at the danger line.
 * Everything is derived from normalized `progress` (0 = spawn, 1 = danger
 * line), which itself is derived from elapsed gameplay time — never from a
 * frame counter (AGENTS.md rule 5). The same elapsed time always produces the
 * same position, so the motion is reproducible and testable without rendering.
 *
 * Depth model: apparent size is inversely proportional to distance. Depth
 * moves linearly from `farDepth` to 1, so scale = 1 / depth. That makes a
 * target grow slowly while far away and rush the last stretch, which is what
 * sells the approach.
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

/**
 * Screen pose for a target.
 *
 * Vertical travel and lateral divergence both follow apparent size rather
 * than raw progress, so position and scale stay consistent with one another.
 */
export function poseAt(progress: number, laneX: number): ApproachPose {
  const p = clamp01(progress);
  const depth = STAGE.farDepth + (1 - STAGE.farDepth) * p;
  const scale = 1 / depth;
  const near = farScale();
  // 0 at the spawn plane, 1 at the danger line.
  const closeness = (scale - near) / (1 - near);

  return {
    progress: p,
    x: STAGE.vanishingPoint.x + (laneX - STAGE.vanishingPoint.x) * closeness,
    y: STAGE.vanishingPoint.y + (STAGE.dangerLineY - STAGE.vanishingPoint.y) * closeness,
    scale,
  };
}

/**
 * Tap radius at the target's current apparent size. Configured radii are
 * defined at the danger line, so a distant target is proportionally harder
 * to hit. The hitbox comes from config and never from art bounds
 * (AGENTS.md rule 17).
 */
export function hitRadiusAt(radiusAtDangerLine: number, scale: number): number {
  return radiusAtDangerLine * scale;
}

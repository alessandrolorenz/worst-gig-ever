/** M28–M29 Crowd Mode tuning on the shared 1920x1080 reference canvas. */

export interface CrowdPoint {
  readonly x: number;
  readonly y: number;
}

export interface CrowdRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export const CROWD_CANVAS = { width: 1920, height: 1080 } as const;

export const CROWD_PERFORMER_TARGET_IDS = ['bassist', 'vocalist', 'guitarist'] as const;
export const CROWD_STAGE_TARGET_IDS = [
  'amplifier',
  'microphone',
  'crashCymbal',
  'rideCymbal',
  'guitar',
  'bass',
] as const;
export const CROWD_TARGET_IDS = [
  ...CROWD_PERFORMER_TARGET_IDS,
  ...CROWD_STAGE_TARGET_IDS,
] as const;

export type CrowdPerformerTargetId = (typeof CROWD_PERFORMER_TARGET_IDS)[number];
export type CrowdStageTargetId = (typeof CROWD_STAGE_TARGET_IDS)[number];
export type CrowdTargetId = (typeof CROWD_TARGET_IDS)[number];
/** An instrument is a stage prop a performer is holding until it is hit. */
export type CrowdTargetType = 'performer' | 'stage-prop' | 'instrument';
export type CrowdHitBehavior =
  | 'performer-reaction'
  | 'amplifier-damage'
  | 'drop'
  | 'cymbal-knockdown';

/** Where a knocked-loose prop comes to rest, relative to its authored rect. */
export interface CrowdFall {
  readonly dx: number;
  readonly dy: number;
  readonly rotateDeg: number;
}

export interface CrowdTargetDefinition {
  readonly id: CrowdTargetId;
  /**
   * Authored against the full-canvas performance still. Gameplay truth: never
   * derived from, and never to be re-derived from, replacement art (rule 17).
   */
  readonly rect: CrowdRect;
  readonly type: CrowdTargetType;
  /** Awarded once for a prop, and for a performer's first hit only. */
  readonly points: number;
  readonly hitBehavior: CrowdHitBehavior;
  /** The performer who is disarmed when this instrument is knocked loose. */
  readonly heldBy?: CrowdPerformerTargetId;
  readonly fall?: CrowdFall;
}

export const CROWD_PERFORMER_TARGETS: readonly CrowdTargetDefinition[] = Object.freeze([
  {
    id: 'bassist',
    rect: { x: 160, y: 200, width: 440, height: 550 },
    type: 'performer',
    points: 300,
    hitBehavior: 'performer-reaction',
  },
  {
    id: 'vocalist',
    rect: { x: 600, y: 185, width: 380, height: 670 },
    type: 'performer',
    points: 500,
    hitBehavior: 'performer-reaction',
  },
  {
    id: 'guitarist',
    rect: { x: 1370, y: 90, width: 360, height: 720 },
    type: 'performer',
    points: 300,
    hitBehavior: 'performer-reaction',
  },
]);

/** Props and instruments resolve before the performer standing behind them. */
export const CROWD_STAGE_TARGETS: readonly CrowdTargetDefinition[] = Object.freeze([
  {
    id: 'amplifier',
    rect: { x: 1700, y: 480, width: 180, height: 230 },
    type: 'stage-prop',
    points: 400,
    hitBehavior: 'amplifier-damage',
  },
  {
    id: 'microphone',
    rect: { x: 683, y: 346, width: 100, height: 100 },
    type: 'instrument',
    points: 500,
    hitBehavior: 'drop',
    heldBy: 'vocalist',
    fall: { dx: -90, dy: 330, rotateDeg: -115 },
  },
  {
    id: 'crashCymbal',
    rect: { x: 815, y: 240, width: 140, height: 90 },
    type: 'stage-prop',
    points: 550,
    hitBehavior: 'cymbal-knockdown',
    fall: { dx: 70, dy: 400, rotateDeg: 160 },
  },
  {
    id: 'rideCymbal',
    rect: { x: 1210, y: 230, width: 165, height: 90 },
    type: 'stage-prop',
    points: 650,
    hitBehavior: 'cymbal-knockdown',
    fall: { dx: -60, dy: 420, rotateDeg: -150 },
  },
  {
    id: 'guitar',
    rect: { x: 1440, y: 365, width: 180, height: 200 },
    type: 'instrument',
    points: 450,
    hitBehavior: 'drop',
    heldBy: 'guitarist',
    fall: { dx: -150, dy: 215, rotateDeg: -70 },
  },
  {
    id: 'bass',
    rect: { x: 230, y: 445, width: 215, height: 205 },
    type: 'instrument',
    points: 450,
    hitBehavior: 'drop',
    heldBy: 'bassist',
    fall: { dx: 150, dy: 150, rotateDeg: 65 },
  },
]);

export const CROWD_TARGETS: readonly CrowdTargetDefinition[] = Object.freeze([
  ...CROWD_STAGE_TARGETS,
  ...CROWD_PERFORMER_TARGETS,
]);

export function crowdTarget(id: CrowdTargetId): CrowdTargetDefinition {
  const target = CROWD_TARGETS.find((candidate) => candidate.id === id);
  if (!target) throw new Error(`Unknown crowd target: ${id}`);
  return target;
}

export const CROWD_THROW = {
  bottleReady: { x: 960, y: 910 } as CrowdPoint,
  launchRegion: { x: 610, y: 700, width: 700, height: 380 } as CrowdRect,
  /** Absorbs the pointer release that selected Crowd Mode or reset the scene. */
  inputArmDelayMs: 250,
  minimumUpwardPx: 80,
  fullPowerDistancePx: 520,
  projection: 2.05,
  impactBounds: { left: 60, right: 1890, top: 120, bottom: 720 },
  minFlightMs: 620,
  maxFlightMs: 1080,
  minArcHeight: 135,
  maxArcHeight: 255,
  startScale: 1,
  endScale: 0.34,
  minTurns: 1.25,
  maxTurns: 2.5,
  resultHoldMs: 620,
  missPoints: -50,
} as const;

/**
 * The one place that decides what a hit is worth (M29).
 *
 * Props and instruments are one-shot: they stop being targets once resolved,
 * so they cannot be farmed. A performer stays hittable — the bottle has to
 * land somewhere — but only the first hit pays in full.
 */
export const CROWD_SCORING = { performerRepeatPoints: 50 } as const;

export const CROWD_REACTIONS = {
  cymbalWobbleMs: 700,
  fallMs: 520,
  amplifierShakeMs: 450,
  performerHitMs: 600,
} as const;

/**
 * Shared waiter geometry and penalty. Timing is per stage (crowdStages).
 *
 * This is the hit rect, not the drawn figure (rule 17). M32 stood the waiter
 * on the stage front at a foreground scale: the rect now runs from his head
 * to his feet, and keeps its M28 width so a crossing blocks a target for as
 * long as it always did. The wider drawn figure — tray and trailing arm — is
 * `crowdWaiterDrawRect` in crowdArtSlots, and is deliberately forgiving.
 */
export const CROWD_WAITER = {
  id: 'waiter' as const,
  width: 230,
  height: 615,
  y: 255,
  /** Extra run-in and run-out, so the wider drawn figure never pops on or off. */
  overscan: 60,
  penalty: -300,
} as const;

export function pointInRect(point: CrowdPoint, rect: CrowdRect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function scaleRect(rect: CrowdRect, scale: number): CrowdRect {
  const width = rect.width * scale;
  const height = rect.height * scale;
  return {
    x: rect.x + (rect.width - width) / 2,
    y: rect.y + (rect.height - height) / 2,
    width,
    height,
  };
}

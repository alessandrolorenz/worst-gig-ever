/**
 * Pure, elapsed-time Crowd Mode domain: the M27 throw, the M28 challenge, the
 * M29 destruction round and the M30 stage selection. No React, no rendering.
 */
import {
  CROWD_CANVAS,
  CROWD_PERFORMER_TARGET_IDS,
  CROWD_REACTIONS,
  CROWD_SCORING,
  CROWD_STAGE_TARGET_IDS,
  CROWD_TARGETS,
  CROWD_THROW,
  CROWD_WAITER,
  crowdTarget,
  pointInRect,
  scaleRect,
  type CrowdPerformerTargetId,
  type CrowdPoint,
  type CrowdRect,
  type CrowdStageTargetId,
  type CrowdTargetDefinition,
  type CrowdTargetId,
} from './crowdConfig.ts';
import {
  DEFAULT_CROWD_STAGE_ID,
  crowdStage,
  type CrowdStageConfig,
  type CrowdStageId,
  type CrowdWaiterTiming,
} from './crowdStages.ts';

/** `finished` is terminal until a retry: the round has an outcome. */
export type CrowdPhase = 'ready' | 'aiming' | 'flying' | 'result' | 'finished';
export type CrowdOutcome = 'success' | 'failure';
/**
 * A cymbal goes intact → wobbling → falling → down; a dropped instrument
 * intact → falling → down; the amplifier intact → damaged.
 */
export type CrowdPropStatus = 'intact' | 'wobbling' | 'falling' | 'down' | 'damaged';

export interface CrowdProjectile {
  readonly from: CrowdPoint;
  readonly to: CrowdPoint;
  readonly durationMs: number;
  readonly arcHeight: number;
  readonly turns: number;
  elapsedMs: number;
}

export interface CrowdPropState {
  active: boolean;
  status: CrowdPropStatus;
  reactionElapsedMs: number;
}

export type CrowdPropStates = Record<CrowdStageTargetId, CrowdPropState>;

export interface CrowdPerformerState {
  /** Still holding their instrument (the vocalist's is the microphone). */
  armed: boolean;
  /** Direct hits taken this round. */
  hits: number;
  reacting: boolean;
  reactionElapsedMs: number;
}

export type CrowdPerformerStates = Record<CrowdPerformerTargetId, CrowdPerformerState>;

/** What the renderer needs to pick a performer frame. */
export interface CrowdPerformerPose {
  readonly base: 'performing' | 'disarmed';
  /** 0 when not reacting; otherwise 0..1 through the hit reaction. */
  readonly hitProgress: number;
  readonly reacting: boolean;
}

export interface CrowdObjectiveState {
  /** Objectives are one per target, so the target id is the objective id. */
  readonly objectiveId: CrowdTargetId;
  readonly targetId: CrowdTargetId;
  readonly requiredCount: number;
  currentCount: number;
  completed: boolean;
}

export type CrowdFeedback =
  | { readonly type: 'hit'; readonly target: CrowdTargetId; readonly points: number }
  | { readonly type: 'wrong-target'; readonly target: 'waiter'; readonly points: number }
  | { readonly type: 'miss'; readonly points: number }
  | { readonly type: 'invalid' };

export type CrowdImpactFeedback = Exclude<CrowdFeedback, { readonly type: 'invalid' }>;

export interface CrowdState {
  stageId: CrowdStageId;
  phase: CrowdPhase;
  /** Null until the round ends. */
  outcome: CrowdOutcome | null;
  score: number;
  /** Valid throws released this round. */
  throws: number;
  bottlesLeft: number;
  elapsedMs: number;
  gestureStart: CrowdPoint | null;
  gestureCurrent: CrowdPoint | null;
  projectile: CrowdProjectile | null;
  feedback: CrowdFeedback | null;
  resultElapsedMs: number;
  stageProps: CrowdPropStates;
  performers: CrowdPerformerStates;
  objectives: CrowdObjectiveState[];
}

export interface CrowdProjectilePose extends CrowdPoint {
  readonly progress: number;
  readonly scale: number;
  readonly rotation: number;
}

export interface CrowdProjection {
  readonly to: CrowdPoint;
  readonly power: number;
}

export interface CrowdBlockerPose {
  readonly visible: boolean;
  readonly progress: number;
  readonly rect: CrowdRect;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function createPropStates(): CrowdPropStates {
  const states = {} as CrowdPropStates;
  for (const id of CROWD_STAGE_TARGET_IDS) {
    states[id] = { active: true, status: 'intact', reactionElapsedMs: 0 };
  }
  return states;
}

function createPerformerStates(): CrowdPerformerStates {
  const states = {} as CrowdPerformerStates;
  for (const id of CROWD_PERFORMER_TARGET_IDS) {
    states[id] = { armed: true, hits: 0, reacting: false, reactionElapsedMs: 0 };
  }
  return states;
}

function createObjectives(stage: CrowdStageConfig): CrowdObjectiveState[] {
  return stage.objectives.map((targetId) => ({
    objectiveId: targetId,
    targetId,
    requiredCount: 1,
    currentCount: 0,
    completed: false,
  }));
}

export function createCrowdState(stageId: CrowdStageId = DEFAULT_CROWD_STAGE_ID): CrowdState {
  const stage = crowdStage(stageId);
  return {
    stageId,
    phase: 'ready',
    outcome: null,
    score: 0,
    throws: 0,
    bottlesLeft: stage.bottles,
    elapsedMs: 0,
    gestureStart: null,
    gestureCurrent: null,
    projectile: null,
    feedback: null,
    resultElapsedMs: 0,
    stageProps: createPropStates(),
    performers: createPerformerStates(),
    objectives: createObjectives(stage),
  };
}

/** Retry: a fresh round of the stage already selected. */
export function resetCrowd(state: CrowdState): void {
  Object.assign(state, createCrowdState(state.stageId));
}

/** A fresh round of a chosen stage. */
export function selectCrowdStage(state: CrowdState, stageId: CrowdStageId): void {
  Object.assign(state, createCrowdState(stageId));
}

export function crowdObjectivesCompleted(state: CrowdState): number {
  return state.objectives.filter((objective) => objective.completed).length;
}

/** A target's gameplay rect for a stage. Only props and instruments scale. */
export function crowdTargetRect(target: CrowdTargetDefinition, stage: CrowdStageConfig): CrowdRect {
  return target.type === 'performer' ? target.rect : scaleRect(target.rect, stage.targetScale);
}

export function crowdPerformerPose(performer: CrowdPerformerState): CrowdPerformerPose {
  return {
    base: performer.armed ? 'performing' : 'disarmed',
    reacting: performer.reacting,
    hitProgress: performer.reacting
      ? clamp01(performer.reactionElapsedMs / CROWD_REACTIONS.performerHitMs)
      : 0,
  };
}

/** 0 while a prop is still in place, 1 once it has come to rest. */
export function crowdPropFallProgress(prop: CrowdPropState): number {
  if (prop.status === 'down') return 1;
  if (prop.status !== 'falling') return 0;
  return clamp01(prop.reactionElapsedMs / CROWD_REACTIONS.fallMs);
}

export function beginCrowdGesture(state: CrowdState, point: CrowdPoint): void {
  if (state.phase !== 'ready') return;
  if (state.elapsedMs < CROWD_THROW.inputArmDelayMs) return;
  if (!pointInRect(point, CROWD_THROW.launchRegion)) return;
  state.phase = 'aiming';
  state.gestureStart = { ...point };
  state.gestureCurrent = { ...point };
  state.feedback = null;
}

export function moveCrowdGesture(state: CrowdState, point: CrowdPoint): void {
  if (state.phase !== 'aiming') return;
  state.gestureCurrent = { ...point };
}

export function crowdProjectedImpact(start: CrowdPoint, end: CrowdPoint): CrowdProjection {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return {
    power: clamp01(Math.hypot(dx, dy) / CROWD_THROW.fullPowerDistancePx),
    to: {
      x: clamp(
        CROWD_THROW.bottleReady.x + dx * CROWD_THROW.projection,
        CROWD_THROW.impactBounds.left,
        CROWD_THROW.impactBounds.right,
      ),
      y: clamp(
        CROWD_THROW.bottleReady.y + dy * CROWD_THROW.projection,
        CROWD_THROW.impactBounds.top,
        CROWD_THROW.impactBounds.bottom,
      ),
    },
  };
}

/** Short M28 guide: enough to teach direction without revealing the answer. */
export function crowdAimGuidePoints(
  start: CrowdPoint,
  end: CrowdPoint,
  guideProgress: readonly number[] = crowdStage(DEFAULT_CROWD_STAGE_ID).aimGuideProgress,
): readonly CrowdPoint[] {
  const { to, power } = crowdProjectedImpact(start, end);
  const arcHeight = lerp(CROWD_THROW.minArcHeight, CROWD_THROW.maxArcHeight, power);
  return guideProgress.map((progress) => ({
    x: lerp(CROWD_THROW.bottleReady.x, to.x, progress),
    y:
      lerp(CROWD_THROW.bottleReady.y, to.y, progress) -
      Math.sin(Math.PI * progress) * arcHeight,
  }));
}

export function releaseCrowdGesture(state: CrowdState, point: CrowdPoint): boolean {
  if (state.phase !== 'aiming' || state.gestureStart === null) return false;
  const start = state.gestureStart;
  const dx = point.x - start.x;
  const dy = point.y - start.y;
  const upward = -dy;

  state.gestureStart = null;
  state.gestureCurrent = null;
  if (upward < CROWD_THROW.minimumUpwardPx) {
    state.phase = 'ready';
    state.feedback = { type: 'invalid' };
    return false;
  }

  const { power, to } = crowdProjectedImpact(start, point);
  const spinSign = dx < 0 ? -1 : 1;
  state.projectile = {
    from: CROWD_THROW.bottleReady,
    to,
    elapsedMs: 0,
    durationMs: lerp(CROWD_THROW.maxFlightMs, CROWD_THROW.minFlightMs, power),
    arcHeight: lerp(CROWD_THROW.minArcHeight, CROWD_THROW.maxArcHeight, power),
    turns: spinSign * lerp(CROWD_THROW.minTurns, CROWD_THROW.maxTurns, power),
  };
  // A valid throw is the only thing that spends a bottle.
  state.throws += 1;
  state.bottlesLeft -= 1;
  state.phase = 'flying';
  return true;
}

export function crowdProjectilePose(projectile: CrowdProjectile): CrowdProjectilePose {
  const progress = clamp01(projectile.elapsedMs / projectile.durationMs);
  return {
    x: lerp(projectile.from.x, projectile.to.x, progress),
    y:
      lerp(projectile.from.y, projectile.to.y, progress) -
      Math.sin(Math.PI * progress) * projectile.arcHeight,
    progress,
    scale: lerp(CROWD_THROW.startScale, CROWD_THROW.endScale, progress),
    rotation: projectile.turns * Math.PI * 2 * progress,
  };
}

/** One predictable left-to-right crossing followed by a readable pause. */
export function crowdBlockerPose(
  elapsedMs: number,
  timing: CrowdWaiterTiming = crowdStage(DEFAULT_CROWD_STAGE_ID).waiter,
): CrowdBlockerPose {
  const cycleElapsed = Math.max(0, elapsedMs) % timing.cycleMs;
  const moving = cycleElapsed >= timing.initialDelayMs;
  const progress = moving ? clamp01((cycleElapsed - timing.initialDelayMs) / timing.travelMs) : 0;
  const offstage = -CROWD_WAITER.width - CROWD_WAITER.overscan;
  const x = moving
    ? lerp(offstage, CROWD_CANVAS.width + CROWD_WAITER.overscan, progress)
    : offstage;
  return {
    visible: moving && progress < 1,
    progress,
    rect: { x, y: CROWD_WAITER.y, width: CROWD_WAITER.width, height: CROWD_WAITER.height },
  };
}

function targetIsActive(state: CrowdState, target: CrowdTargetDefinition): boolean {
  return target.type === 'performer' || state.stageProps[target.id as CrowdStageTargetId].active;
}

/**
 * What a landed hit pays (M29). Resolved props are no longer targets, so the
 * only repeatable hit is a performer, and only their first one pays in full.
 */
function hitPoints(state: CrowdState, target: CrowdTargetDefinition): number {
  if (target.type !== 'performer') return target.points;
  const performer = state.performers[target.id as CrowdPerformerTargetId];
  return performer.hits === 0 ? target.points : CROWD_SCORING.performerRepeatPoints;
}

/** Blocker first, then props and instruments, then the larger performer marks. */
export function resolveCrowdImpact(state: CrowdState, point: CrowdPoint): CrowdImpactFeedback {
  const stage = crowdStage(state.stageId);
  const waiter = crowdBlockerPose(state.elapsedMs, stage.waiter);
  if (waiter.visible && pointInRect(point, waiter.rect)) {
    return { type: 'wrong-target', target: CROWD_WAITER.id, points: CROWD_WAITER.penalty };
  }
  const target = CROWD_TARGETS.find(
    (candidate) =>
      targetIsActive(state, candidate) && pointInRect(point, crowdTargetRect(candidate, stage)),
  );
  if (target) return { type: 'hit', target: target.id, points: hitPoints(state, target) };
  return { type: 'miss', points: CROWD_THROW.missPoints };
}

/** Objectives hear about gameplay events; they never look at the screen. */
function recordObjectiveHit(state: CrowdState, targetId: CrowdTargetId): void {
  for (const objective of state.objectives) {
    if (objective.targetId !== targetId || objective.completed) continue;
    objective.currentCount += 1;
    objective.completed = objective.currentCount >= objective.requiredCount;
  }
}

function reactToTarget(state: CrowdState, targetId: CrowdTargetId): void {
  const target = crowdTarget(targetId);
  if (target.type === 'performer') {
    const performer = state.performers[target.id as CrowdPerformerTargetId];
    performer.hits += 1;
    performer.reacting = true;
    performer.reactionElapsedMs = 0;
  } else {
    const prop = state.stageProps[target.id as CrowdStageTargetId];
    prop.active = false;
    prop.reactionElapsedMs = 0;
    if (target.hitBehavior === 'cymbal-knockdown') prop.status = 'wobbling';
    if (target.hitBehavior === 'drop') prop.status = 'falling';
    if (target.hitBehavior === 'amplifier-damage') prop.status = 'damaged';
    if (target.heldBy) state.performers[target.heldBy].armed = false;
  }
  recordObjectiveHit(state, targetId);
}

function advanceProp(prop: CrowdPropState, deltaMs: number): void {
  if (prop.status === 'intact' || prop.status === 'down') return;
  prop.reactionElapsedMs += deltaMs;
  if (prop.status === 'wobbling' && prop.reactionElapsedMs >= CROWD_REACTIONS.cymbalWobbleMs) {
    // Carry the overshoot so a coarse step lands where many fine ones would.
    prop.reactionElapsedMs -= CROWD_REACTIONS.cymbalWobbleMs;
    prop.status = 'falling';
  }
  if (prop.status === 'falling' && prop.reactionElapsedMs >= CROWD_REACTIONS.fallMs) {
    prop.status = 'down';
    prop.reactionElapsedMs = 0;
  }
  if (prop.status === 'damaged') {
    prop.reactionElapsedMs = Math.min(prop.reactionElapsedMs, CROWD_REACTIONS.amplifierShakeMs);
  }
}

function advanceSceneClock(state: CrowdState, deltaMs: number): void {
  state.elapsedMs += deltaMs;
  for (const prop of Object.values(state.stageProps)) advanceProp(prop, deltaMs);
  for (const performer of Object.values(state.performers)) {
    if (!performer.reacting) continue;
    performer.reactionElapsedMs += deltaMs;
    if (performer.reactionElapsedMs >= CROWD_REACTIONS.performerHitMs) {
      performer.reacting = false;
      performer.reactionElapsedMs = 0;
    }
  }
}

/** Win on the last objective, lose on the last bottle, otherwise reload. */
function settleThrow(state: CrowdState): void {
  state.projectile = null;
  state.resultElapsedMs = 0;
  if (state.objectives.every((objective) => objective.completed)) {
    state.outcome = 'success';
    state.score += state.bottlesLeft * crowdStage(state.stageId).spareBottleBonus;
    state.phase = 'finished';
  } else if (state.bottlesLeft <= 0) {
    state.outcome = 'failure';
    state.phase = 'finished';
  } else {
    state.phase = 'ready';
  }
}

/** Consume the whole delta across boundaries to preserve time-step independence. */
export function tickCrowd(state: CrowdState, deltaMs: number): void {
  let remaining = Math.max(0, deltaMs);
  while (remaining > 0) {
    if (state.phase === 'flying' && state.projectile !== null) {
      const flightRemaining = state.projectile.durationMs - state.projectile.elapsedMs;
      const step = Math.min(remaining, flightRemaining);
      state.projectile.elapsedMs += step;
      advanceSceneClock(state, step);
      remaining -= step;
      if (state.projectile.elapsedMs >= state.projectile.durationMs) {
        const feedback = resolveCrowdImpact(state, state.projectile.to);
        state.feedback = feedback;
        state.score += feedback.points;
        if (feedback.type === 'hit') reactToTarget(state, feedback.target);
        state.phase = 'result';
        state.resultElapsedMs = 0;
      }
      continue;
    }

    if (state.phase === 'result') {
      const holdRemaining = CROWD_THROW.resultHoldMs - state.resultElapsedMs;
      const step = Math.min(remaining, holdRemaining);
      state.resultElapsedMs += step;
      advanceSceneClock(state, step);
      remaining -= step;
      if (state.resultElapsedMs >= CROWD_THROW.resultHoldMs) settleThrow(state);
      continue;
    }

    advanceSceneClock(state, remaining);
    remaining = 0;
  }
}

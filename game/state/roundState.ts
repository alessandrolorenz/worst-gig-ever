/**
 * Round domain: the round clock, spawning, hit resolution, scoring, combo,
 * Show Integrity, and the state machine.
 *
 * This module owns all gameplay truth. It imports no React and no React
 * Native, so every rule in M1 is testable without rendering
 * (AGENTS.md rule 4). The renderer reads a snapshot of this state; it never
 * stores score, combo, integrity, or round time of its own.
 *
 * Time is milliseconds of gameplay-elapsed time. It advances only in PLAYING
 * and VOCALIST_EVENT, which is what makes pause free of special cases.
 */
import { COMBO_TIERS, SCORING } from '../config/scoring.ts';
import { TARGET_DEFINITIONS } from '../config/targets.ts';
import { STAGE, VOCALIST_BLOCKING_RECT } from '../config/stage.ts';
import { level01, type LevelDefinition, type SpawnPhase } from '../levels/level01.ts';
import { hitRadiusAt, poseAt, progressAt } from '../systems/approach.ts';
import { createRng, nextInt, pick, type RngState } from '../utils/rng.ts';
import type { GameState, TargetKind, TargetStatus } from './gameState.ts';
import type { RoundEvent } from './roundEvents.ts';

/** A resolved target stays in the list this long so the hit/miss read lands. */
export const RESOLVED_LINGER_MS = 260;

/**
 * Largest time step the round will accept in one tick. Without this, a
 * backgrounded app resumes with a multi-second delta and every in-flight
 * target is missed at once.
 */
export const MAX_TICK_DELTA_MS = 100;

/** The vocalist gives up and leaves if the player never swings at them. */
export const VOCALIST_TIMEOUT_MS = 7000;

/** How long the vocalist's reaction plays before normal flow resumes. */
export const VOCALIST_EXIT_MS = 900;

export interface ActiveTarget {
  readonly id: number;
  readonly kind: TargetKind;
  readonly spawnAtMs: number;
  readonly durationMs: number;
  readonly laneX: number;
  status: TargetStatus;
  resolvedAtMs: number | null;
}

export type VocalistStatus = 'idle' | 'blocking' | 'hit';

export interface VocalistState {
  status: VocalistStatus;
  /** The event fires exactly once per round. */
  triggered: boolean;
  startedAtMs: number | null;
  hitAtMs: number | null;
}

export interface RoundState {
  readonly level: LevelDefinition;
  state: GameState;
  /** State to return to when resuming; only meaningful while PAUSED. */
  stateBeforePause: GameState | null;
  elapsedMs: number;
  score: number;
  combo: number;
  bestCombo: number;
  integrity: number;
  targetsDestroyed: number;
  misses: number;
  targets: ActiveTarget[];
  nextTargetId: number;
  nextSpawnAtMs: number | null;
  vocalist: VocalistState;
  rng: RngState;
}

export interface Point2D {
  x: number;
  y: number;
}

export function createRound(level: LevelDefinition = level01): RoundState {
  return {
    level,
    state: 'READY',
    stateBeforePause: null,
    elapsedMs: 0,
    score: SCORING.startingScore,
    combo: SCORING.startingCombo,
    bestCombo: 0,
    integrity: level.startingIntegrity,
    targetsDestroyed: 0,
    misses: 0,
    targets: [],
    nextTargetId: 1,
    nextSpawnAtMs: null,
    vocalist: { status: 'idle', triggered: false, startedAtMs: null, hitAtMs: null },
    rng: createRng(level.randomSeed),
  };
}

/** The combo multiplier for a given combo count (M1, Score). */
export function comboMultiplier(combo: number): number {
  let multiplier = COMBO_TIERS[0].multiplier;
  for (const tier of COMBO_TIERS) {
    if (combo >= tier.minCombo) multiplier = tier.multiplier;
  }
  return multiplier;
}

/** The spawn phase covering a round time, or null between phases. */
export function phaseAt(level: LevelDefinition, elapsedMs: number): SpawnPhase | null {
  for (const phase of level.phases) {
    if (elapsedMs >= phase.fromMs && elapsedMs < phase.toMs) return phase;
  }
  return null;
}

export function isRoundOver(state: RoundState): boolean {
  return state.state === 'SHOW_COMPLETE' || state.state === 'SHOW_RUINED';
}

/** Targets still in flight, i.e. hittable. */
export function activeTargets(state: RoundState): ActiveTarget[] {
  return state.targets.filter((target) => target.status === 'active');
}

export function startRound(state: RoundState): RoundEvent[] {
  if (state.state !== 'READY') return [];
  state.state = 'PLAYING';
  const phase = phaseAt(state.level, 0);
  state.nextSpawnAtMs = phase ? phase.spawnEveryMs : null;
  return [];
}

export function pauseRound(state: RoundState): RoundEvent[] {
  if (state.state !== 'PLAYING' && state.state !== 'VOCALIST_EVENT') return [];
  state.stateBeforePause = state.state;
  state.state = 'PAUSED';
  return [];
}

export function resumeRound(state: RoundState): RoundEvent[] {
  if (state.state !== 'PAUSED') return [];
  state.state = state.stateBeforePause ?? 'PLAYING';
  state.stateBeforePause = null;
  return [];
}

function spawnTarget(state: RoundState, phase: SpawnPhase, atMs: number): RoundEvent {
  const kind = pick(state.rng, phase.kinds);
  const laneX = STAGE.laneXs[nextInt(state.rng, STAGE.laneXs.length)];
  const target: ActiveTarget = {
    id: state.nextTargetId++,
    kind,
    spawnAtMs: atMs,
    durationMs: TARGET_DEFINITIONS[kind].approachDurationMs,
    laneX,
    status: 'active',
    resolvedAtMs: null,
  };
  state.targets.push(target);
  return { type: 'TARGET_SPAWNED', targetId: target.id, kind };
}

function registerMiss(state: RoundState, target: ActiveTarget, events: RoundEvent[]): void {
  target.status = 'missed';
  target.resolvedAtMs = state.elapsedMs;
  state.misses += 1;
  state.integrity -= TARGET_DEFINITIONS[target.kind].integrityCostOnMiss;
  events.push({ type: 'TARGET_MISSED', targetId: target.id, kind: target.kind });
  events.push({ type: 'INTEGRITY_CHANGED', integrity: state.integrity });
  if (state.combo !== 0) {
    state.combo = 0;
    events.push({ type: 'COMBO_CHANGED', combo: 0 });
  }
}

function endVocalistEvent(state: RoundState, wasHit: boolean, events: RoundEvent[]): void {
  state.vocalist.status = 'idle';
  state.vocalist.startedAtMs = null;
  state.vocalist.hitAtMs = null;
  if (state.state === 'VOCALIST_EVENT') state.state = 'PLAYING';
  // Resume the spawn cadence from the current phase rather than catching up.
  const phase = phaseAt(state.level, state.elapsedMs);
  state.nextSpawnAtMs = phase ? state.elapsedMs + phase.spawnEveryMs : null;
  events.push({ type: 'VOCALIST_EVENT_ENDED', wasHit });
}

/**
 * Advances the round by a time step and returns everything that happened.
 *
 * Ticking in READY, PAUSED, or a terminal state is a no-op, so the round
 * clock cannot drift while the player is looking at a menu.
 */
export function tickRound(state: RoundState, rawDeltaMs: number): RoundEvent[] {
  const events: RoundEvent[] = [];
  if (state.state !== 'PLAYING' && state.state !== 'VOCALIST_EVENT') return events;
  if (!(rawDeltaMs > 0)) return events;

  const delta = Math.min(rawDeltaMs, MAX_TICK_DELTA_MS);
  state.elapsedMs = Math.min(state.elapsedMs + delta, state.level.durationMs);

  // Vocalist interruption takes over before any new spawn is scheduled.
  if (!state.vocalist.triggered && state.elapsedMs >= state.level.vocalistEventAtMs) {
    state.vocalist.triggered = true;
    state.vocalist.status = 'blocking';
    state.vocalist.startedAtMs = state.elapsedMs;
    state.state = 'VOCALIST_EVENT';
    events.push({ type: 'VOCALIST_EVENT_STARTED' });
  }

  if (state.state === 'VOCALIST_EVENT' && state.vocalist.startedAtMs !== null) {
    const heldMs = state.elapsedMs - state.vocalist.startedAtMs;
    const hitAgeMs =
      state.vocalist.hitAtMs === null ? null : state.elapsedMs - state.vocalist.hitAtMs;
    if (hitAgeMs !== null && hitAgeMs >= VOCALIST_EXIT_MS) {
      endVocalistEvent(state, true, events);
    } else if (hitAgeMs === null && heldMs >= VOCALIST_TIMEOUT_MS) {
      endVocalistEvent(state, false, events);
    }
  }

  // Spawning pauses while the vocalist blocks the sightline (M1).
  if (state.state === 'PLAYING') {
    const phase = phaseAt(state.level, state.elapsedMs);
    if (phase === null) {
      state.nextSpawnAtMs = null;
    } else {
      if (state.nextSpawnAtMs === null) state.nextSpawnAtMs = state.elapsedMs + phase.spawnEveryMs;
      // A long tick can owe more than one spawn; the cap keeps the screen readable.
      while (
        state.nextSpawnAtMs !== null &&
        state.elapsedMs >= state.nextSpawnAtMs &&
        state.nextSpawnAtMs < phase.toMs
      ) {
        if (activeTargets(state).length < state.level.maxConcurrentTargets) {
          events.push(spawnTarget(state, phase, state.nextSpawnAtMs));
        }
        state.nextSpawnAtMs += phase.spawnEveryMs;
      }
    }
  }

  // Resolve targets that reached the danger line, then drop stale ones.
  for (const target of state.targets) {
    if (target.status !== 'active') continue;
    if (progressAt(state.elapsedMs, target.spawnAtMs, target.durationMs) >= 1) {
      registerMiss(state, target, events);
    }
  }
  state.targets = state.targets.filter(
    (target) =>
      target.status === 'active' ||
      target.resolvedAtMs === null ||
      state.elapsedMs - target.resolvedAtMs < RESOLVED_LINGER_MS,
  );

  // Losing the show takes precedence over finishing it.
  if (state.integrity <= 0) {
    state.integrity = 0;
    state.state = 'SHOW_RUINED';
    events.push({ type: 'SHOW_RUINED' });
  } else if (state.elapsedMs >= state.level.durationMs) {
    state.state = 'SHOW_COMPLETE';
    events.push({ type: 'SHOW_COMPLETED' });
  }

  return events;
}

function pointHitsVocalist(point: Point2D): boolean {
  const r = VOCALIST_BLOCKING_RECT;
  return (
    point.x >= r.x && point.x <= r.x + r.width && point.y >= r.y && point.y <= r.y + r.height
  );
}

/**
 * Resolves a tap in reference-canvas coordinates.
 *
 * One tap resolves at most one thing, and a target can only be resolved while
 * it is `active` — so a target can never score twice, however many touches
 * land on it in the same frame (M1, Hit resolution).
 *
 * The blocking vocalist is in the foreground, so they take priority over any
 * target under the same finger. They do not, however, make targets
 * unhittable: targets already in flight when the interruption starts must
 * stay resolvable, or the player would lose Show Integrity to an event they
 * were given no way to answer. M1 pauses *spawning* during the event, not
 * the player's ability to defend the kit.
 */
export function resolveTap(state: RoundState, point: Point2D): RoundEvent[] {
  const events: RoundEvent[] = [];
  if (state.state !== 'PLAYING' && state.state !== 'VOCALIST_EVENT') return events;

  if (state.vocalist.status === 'blocking' && pointHitsVocalist(point)) {
    state.vocalist.status = 'hit';
    state.vocalist.hitAtMs = state.elapsedMs;
    state.score += SCORING.vocalistEventBonus;
    events.push({ type: 'VOCALIST_HIT', points: SCORING.vocalistEventBonus });
    return events;
  }

  // Prefer the most urgent target under the finger: the closest to the drummer.
  let best: ActiveTarget | null = null;
  let bestProgress = -1;
  let bestPose = { x: 0, y: 0 };

  for (const target of state.targets) {
    if (target.status !== 'active') continue;
    const progress = progressAt(state.elapsedMs, target.spawnAtMs, target.durationMs);
    const pose = poseAt(progress, target.laneX);
    const radius = hitRadiusAt(TARGET_DEFINITIONS[target.kind].hitRadiusAtDangerLine, pose.scale);
    const dx = point.x - pose.x;
    const dy = point.y - pose.y;
    if (dx * dx + dy * dy <= radius * radius && progress > bestProgress) {
      best = target;
      bestProgress = progress;
      bestPose = { x: pose.x, y: pose.y };
    }
  }

  if (best === null) return events;

  best.status = 'hit';
  best.resolvedAtMs = state.elapsedMs;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const multiplier = comboMultiplier(state.combo);
  const points = TARGET_DEFINITIONS[best.kind].basePoints * multiplier;
  state.score += points;
  state.targetsDestroyed += 1;

  events.push({
    type: 'TARGET_HIT',
    targetId: best.id,
    kind: best.kind,
    x: bestPose.x,
    y: bestPose.y,
    points,
    multiplier,
  });
  events.push({ type: 'COMBO_CHANGED', combo: state.combo });
  return events;
}

/** Pose and hitbox for rendering. The renderer derives nothing itself. */
export interface TargetView {
  readonly id: number;
  readonly kind: TargetKind;
  readonly status: TargetStatus;
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly progress: number;
}

export function targetViews(state: RoundState): TargetView[] {
  return state.targets.map((target) => {
    const progress = progressAt(state.elapsedMs, target.spawnAtMs, target.durationMs);
    const pose = poseAt(progress, target.laneX);
    return {
      id: target.id,
      kind: target.kind,
      status: target.status,
      x: pose.x,
      y: pose.y,
      scale: pose.scale,
      progress,
    };
  });
}

export function remainingMs(state: RoundState): number {
  return Math.max(0, state.level.durationMs - state.elapsedMs);
}

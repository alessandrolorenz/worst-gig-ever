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
import { countdownDurationMs } from '../config/rhythm.ts';
import { COMBO_TIERS, SCORING } from '../config/scoring.ts';
import {
  DRINK_MIN_CLOSENESS,
  FASTBALL_CHANCE,
  HIT_FORGIVENESS,
  TARGET_DEFINITIONS,
} from '../config/targets.ts';
import { STAGE, THROW_ORIGIN, VOCALIST_BLOCKING_RECT } from '../config/stage.ts';
import { level01 } from '../levels/level01.ts';
import type { LevelDefinition, RoundCurve, SpawnPhase } from '../levels/levelDefinition.ts';
import { laneDriftRange, volleyTemplate, type VolleyTemplate } from '../levels/volleys.ts';
import {
  closenessAt,
  hitRadiusAt,
  progressAt,
  throwPoseAt,
  type Trajectory,
} from '../systems/approach.ts';
import { createRng, nextFloat, nextInt, pick, type RngState } from '../utils/rng.ts';
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

/**
 * Floor on any approach duration, however hard a level's curve ramps (M17).
 *
 * The same bound `tests/contracts.test.ts` already holds the fast window to.
 * A ramp is a tuning dial and a dial with no stop eventually authors a throw
 * nobody can see, which is not difficulty — it is a different game.
 */
export const MIN_APPROACH_MS = 1000;

/** The vocalist gives up and leaves if the player never swings at them. */
export const VOCALIST_TIMEOUT_MS = 7000;

/** How long the vocalist's reaction plays before normal flow resumes. */
export const VOCALIST_EXIT_MS = 900;

/**
 * A throw that has been fully authored but is not in the air yet (M17).
 *
 * Volleys exist so three bottles *arrive* 360 ms apart, and members therefore
 * have to leave the crowd at different times. Everything about them — kind,
 * lane, duration, trajectory — is drawn at the instant the volley is rolled, so
 * the whole figure is decided by one contiguous run of the round's generator
 * and a seed replays it exactly. Only the release is deferred.
 */
export interface PendingSpawn {
  readonly atMs: number;
  readonly kind: TargetKind;
  readonly laneX: number;
  readonly durationMs: number;
  readonly trajectory: Trajectory;
}

export interface ActiveTarget {
  readonly id: number;
  readonly kind: TargetKind;
  readonly spawnAtMs: number;
  readonly durationMs: number;
  readonly laneX: number;
  /** Authored once at spawn; the whole flight follows from it (M5A). */
  readonly trajectory: Trajectory;
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
  /**
   * Pre-roll clock, in gameplay ms, running 0 -> `countdownDurationMs()` while
   * the state is COUNTDOWN and holding at 0 everywhere else (M13.1).
   *
   * Deliberately a second field rather than a negative `elapsedMs`: the round
   * clock is read by spawning, target flight, the vocalist timeline, and the
   * results screen, and every one of them is entitled to assume it starts at
   * zero and only goes forward.
   */
  countdownMs: number;
  score: number;
  combo: number;
  bestCombo: number;
  integrity: number;
  targetsDestroyed: number;
  misses: number;
  targets: ActiveTarget[];
  /**
   * Volley members authored but not yet released, in ascending time (M17).
   *
   * They count against `maxConcurrentTargets` exactly as targets in flight do,
   * so the ordinary cadence cannot fill the screen in the gap a volley has
   * already reserved.
   */
  pendingSpawns: PendingSpawn[];
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
    countdownMs: 0,
    score: SCORING.startingScore,
    combo: SCORING.startingCombo,
    bestCombo: 0,
    integrity: level.startingIntegrity,
    targetsDestroyed: 0,
    misses: 0,
    targets: [],
    pendingSpawns: [],
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

/** Linear interpolation of a round curve, clamped to its endpoints (M17). */
function curveAt(curve: RoundCurve | undefined, fallback: number, progress: number): number {
  if (curve === undefined) return fallback;
  const t = Math.max(0, Math.min(1, progress));
  return curve.start + t * (curve.end - curve.start);
}

/**
 * The spawn interval a phase is asking for at a given moment (M17).
 *
 * Constant when `spawnEveryToMs` is absent, which is every phase authored
 * before M17 — so this returns exactly `phase.spawnEveryMs` for them and the
 * validated levels keep their schedule throw for throw.
 */
export function spawnIntervalAt(phase: SpawnPhase, atMs: number): number {
  if (phase.spawnEveryToMs === undefined) return phase.spawnEveryMs;
  const span = phase.toMs - phase.fromMs;
  if (!(span > 0)) return phase.spawnEveryMs;
  const progress = (atMs - phase.fromMs) / span;
  return curveAt({ start: phase.spawnEveryMs, end: phase.spawnEveryToMs }, phase.spawnEveryMs, progress);
}

/** Multiplier applied to a drawn approach duration at a round time (M17). */
export function speedScaleAt(level: LevelDefinition, atMs: number): number {
  return curveAt(level.speedCurve, 1, atMs / level.durationMs);
}

/** Probability that a throw is drawn from the fast window at a round time (M17). */
export function fastballChanceAt(level: LevelDefinition, atMs: number): number {
  return curveAt(level.fastballCurve, FASTBALL_CHANCE, atMs / level.durationMs);
}

export function isRoundOver(state: RoundState): boolean {
  return state.state === 'SHOW_COMPLETE' || state.state === 'SHOW_RUINED';
}

/** Targets still in flight, i.e. hittable. */
export function activeTargets(state: RoundState): ActiveTarget[] {
  return state.targets.filter((target) => target.status === 'active');
}

/**
 * Everything the concurrency cap has to account for: what is in the air, plus
 * what a volley has already committed to putting there (M17).
 *
 * Counting the pending members is what stops the ordinary cadence from filling
 * the screen inside the gap a volley has reserved, which would leave the
 * figure's last bottle dropped by the cap and the pattern unreadable.
 */
export function committedTargetCount(state: RoundState): number {
  return activeTargets(state).length + state.pendingSpawns.length;
}

/**
 * Start begins the pre-roll, not the round (M13.1).
 *
 * There is no second confirmation after the countdown: the player pressed
 * Start once and the show begins on `GO` by itself.
 */
export function startRound(state: RoundState): RoundEvent[] {
  if (state.state !== 'READY') return [];
  state.state = 'COUNTDOWN';
  state.countdownMs = 0;
  return [];
}

/**
 * The `GO` boundary: the pre-roll ends and the round actually begins.
 *
 * Everything the round owns starts here and not before — the clock is still at
 * zero, so this is where spawning becomes eligible, and the vocalist timeline
 * and the beat schedule both measure from this instant. `GO` is therefore
 * round beat 0, which is why that beat is not scored
 * (`RHYTHM.unscoredLeadBeats`).
 */
function beginPlaying(state: RoundState): void {
  state.state = 'PLAYING';
  state.countdownMs = 0;
  const phase = phaseAt(state.level, 0);
  state.nextSpawnAtMs = phase ? spawnIntervalAt(phase, 0) : null;
}

/**
 * Abandons an in-progress pre-roll and returns to the title (M13.1).
 *
 * Backgrounding the app halfway through a three-second preparation sequence
 * has nothing worth resuming, and resuming into the middle of it would start
 * the round on a beat the player never heard counted. Nothing has happened yet
 * — no clock, no spawn, no score — so there is nothing to unwind.
 */
export function cancelCountdown(state: RoundState): RoundEvent[] {
  if (state.state !== 'COUNTDOWN') return [];
  state.state = 'READY';
  state.countdownMs = 0;
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

/** Draws a float in [min, max) from the round's seeded generator. */
function between(rng: RngState, min: number, max: number): number {
  return min + nextFloat(rng) * (max - min);
}

/**
 * Authors one throw (M5A, Priority 2).
 *
 * Every value comes from the round's seeded generator, so a seed still replays
 * a round exactly — the throws are varied, not random at runtime. The origin
 * is spread across the crowd line rather than pinned to the vanishing point,
 * which is what makes an object read as thrown by someone instead of sliding
 * out of a hole in the back wall.
 */
function authorTrajectory(rng: RngState, kind: TargetKind, laneX: number): Trajectory {
  const { arc } = TARGET_DEFINITIONS[kind];
  return {
    originX: between(rng, THROW_ORIGIN.minX, THROW_ORIGIN.maxX),
    originY: between(rng, THROW_ORIGIN.minY, THROW_ORIGIN.maxY),
    laneX,
    arcHeightPx: between(rng, arc.minHeightPx, arc.maxHeightPx),
    driftPx: between(rng, -arc.maxDriftPx, arc.maxDriftPx),
    spinTurns: between(rng, -arc.maxSpinTurns, arc.maxSpinTurns),
  };
}

/**
 * Draws one approach duration, ramped and floored (M17).
 *
 * The curve is applied to the *result* of the draw rather than to the window,
 * so the normal and fast windows ramp together and the deliberate gap between
 * them survives at every point — that gap is what makes a fastball read as a
 * different object rather than an ordinary one arriving early.
 */
function drawDuration(state: RoundState, kind: TargetKind, atMs: number, fast: boolean): number {
  const definition = TARGET_DEFINITIONS[kind];
  const window = fast ? definition.fastApproachMs : definition.approachMs;
  const drawn = between(state.rng, window.minMs, window.maxMs);
  return Math.max(MIN_APPROACH_MS, drawn * speedScaleAt(state.level, atMs));
}

function pushTarget(
  state: RoundState,
  kind: TargetKind,
  laneX: number,
  spawnAtMs: number,
  durationMs: number,
  trajectory: Trajectory,
): RoundEvent {
  const target: ActiveTarget = {
    id: state.nextTargetId++,
    kind,
    spawnAtMs,
    durationMs,
    laneX,
    trajectory,
    status: 'active',
    resolvedAtMs: null,
  };
  state.targets.push(target);
  return { type: 'TARGET_SPAWNED', targetId: target.id, kind };
}

function spawnTarget(state: RoundState, phase: SpawnPhase, atMs: number): RoundEvent {
  const kind = pick(state.rng, phase.kinds);
  const laneX = STAGE.laneXs[nextInt(state.rng, STAGE.laneXs.length)];
  // Rolled before the duration is drawn, and always rolled, so the sequence of
  // generator calls per spawn is fixed and a seed replays a round exactly.
  const fast = nextFloat(state.rng) < fastballChanceAt(state.level, atMs);
  const durationMs = drawDuration(state, kind, atMs, fast);
  return pushTarget(state, kind, laneX, atMs, durationMs, authorTrajectory(state.rng, kind, laneX));
}

/**
 * Authors a whole volley, or reports that it did not fit (M17).
 *
 * ## Arrival time, not spawn time
 *
 * The members are staggered so they **arrive** at the authored spacing. Each
 * one keeps its own kind's speed window — a mug still flies like a mug — and
 * its spawn time is worked backwards from the arrival it owes:
 *
 *     spawnAt = baseArrival + arriveAfterMs - durationMs
 *
 * with `baseArrival` set a full slowest-member duration after the scheduled
 * slot, so no member is ever asked to have left before the volley was rolled.
 *
 * This is a deliberate improvement on the M17 spec, which called for one
 * duration shared by the whole volley. Sharing would have made a mug fly at
 * bottle speed; solving for the spawn time instead gives the same exact
 * arrival spacing *and* keeps each object moving the way the player has
 * already learned it moves.
 *
 * ## Whole or nothing
 *
 * If the concurrency cap cannot take every member, nothing is queued and the
 * caller falls back to an ordinary single throw. Half a figure is not an
 * easier figure — it is a different, unreadable one.
 */
function authorVolley(
  state: RoundState,
  template: VolleyTemplate,
  atMs: number,
): PendingSpawn[] | null {
  const laneCount = STAGE.laneXs.length;
  const drift = laneDriftRange(template, laneCount);
  // Always drawn for a drifting template, never for a fixed one, so the call
  // sequence depends only on which template was picked.
  const offset = template.driftLanes
    ? drift.min + nextInt(state.rng, drift.max - drift.min + 1)
    : 0;

  // One roll for the figure rather than one per member: a volley where two
  // bottles are fastballs and one is not does not read as a figure at all.
  const fast = nextFloat(state.rng) < fastballChanceAt(state.level, atMs);

  const durations = template.members.map((member) =>
    drawDuration(state, member.kind, atMs, fast),
  );
  const baseArrivalMs = atMs + Math.max(...durations);

  return template.members.map((member, index) => {
    const laneX = STAGE.laneXs[member.lane + offset];
    return {
      atMs: baseArrivalMs + member.arriveAfterMs - durations[index],
      kind: member.kind,
      laneX,
      durationMs: durations[index],
      trajectory: authorTrajectory(state.rng, member.kind, laneX),
    };
  });
}

/**
 * One scheduled slot: a volley if the phase offers them and the roll lands and
 * it fits, otherwise a single throw (M17).
 *
 * The volley roll happens **only when the phase declares volleys**. A phase
 * without them therefore makes exactly the generator calls it always did,
 * which is what lets `level01` and the other validated levels replay
 * identically rather than merely similarly.
 */
function fillSpawnSlot(state: RoundState, phase: SpawnPhase, atMs: number): RoundEvent[] {
  const volleys = phase.volleys;
  if (volleys !== undefined && nextFloat(state.rng) < volleys.chance) {
    const template = volleyTemplate(pick(state.rng, volleys.templates));
    if (template !== null) {
      const room = state.level.maxConcurrentTargets - committedTargetCount(state);
      if (template.members.length <= room) {
        const members = authorVolley(state, template, atMs);
        if (members !== null) {
          state.pendingSpawns.push(...members);
          state.pendingSpawns.sort((a, b) => a.atMs - b.atMs);
          return [];
        }
      }
    }
  }

  if (committedTargetCount(state) >= state.level.maxConcurrentTargets) return [];
  return [spawnTarget(state, phase, atMs)];
}

/**
 * Releases volley members whose moment has come (M17).
 *
 * The target is created with its **scheduled** spawn time rather than the
 * current clock, so a long frame cannot shift a figure's spacing: the arrival
 * the volley promised is the arrival the player gets, at any tick size.
 */
function releasePendingSpawns(state: RoundState, events: RoundEvent[]): void {
  if (state.pendingSpawns.length === 0) return;
  const due = state.pendingSpawns.filter((pending) => pending.atMs <= state.elapsedMs);
  if (due.length === 0) return;
  state.pendingSpawns = state.pendingSpawns.filter((pending) => pending.atMs > state.elapsedMs);
  for (const pending of due) {
    events.push(
      pushTarget(
        state,
        pending.kind,
        pending.laneX,
        pending.atMs,
        pending.durationMs,
        pending.trajectory,
      ),
    );
  }
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
  state.nextSpawnAtMs = phase
    ? state.elapsedMs + spawnIntervalAt(phase, state.elapsedMs)
    : null;
  events.push({ type: 'VOCALIST_EVENT_ENDED', wasHit });
}

/**
 * Advances the pre-roll, and crosses the `GO` boundary when it runs out.
 *
 * The clock is clamped to the pre-roll length rather than allowed to overshoot,
 * so `GO` happens at exactly `countdownDurationMs()` of countdown time however
 * the ticks were sliced. Whatever fraction of a tick is left over is discarded
 * on purpose: the round's zero point is `GO` itself, and carrying a remainder
 * into `elapsedMs` would make the beat schedule — and therefore every
 * judgement in the round — depend on the frame rate the pre-roll happened to
 * run at (AGENTS.md rule 5).
 */
function tickCountdown(state: RoundState, rawDeltaMs: number): void {
  const delta = Math.min(rawDeltaMs, MAX_TICK_DELTA_MS);
  const total = countdownDurationMs();
  state.countdownMs = Math.min(state.countdownMs + delta, total);
  if (state.countdownMs >= total) beginPlaying(state);
}

/**
 * Advances the round by a time step and returns everything that happened.
 *
 * Ticking in READY, PAUSED, or a terminal state is a no-op, so the round
 * clock cannot drift while the player is looking at a menu.
 */
export function tickRound(state: RoundState, rawDeltaMs: number): RoundEvent[] {
  const events: RoundEvent[] = [];
  if (state.state === 'COUNTDOWN') {
    if (rawDeltaMs > 0) tickCountdown(state, rawDeltaMs);
    /*
     * Nothing else runs during the pre-roll, which is the M13.1 gameplay
     * boundary stated once rather than as a condition repeated down the
     * function: no spawn, no target resolution, no Show Integrity, no vocalist
     * progression. The round is entered on the *next* tick, at elapsed 0.
     */
    return events;
  }
  if (state.state !== 'PLAYING' && state.state !== 'VOCALIST_EVENT') return events;
  if (!(rawDeltaMs > 0)) return events;

  const delta = Math.min(rawDeltaMs, MAX_TICK_DELTA_MS);
  state.elapsedMs = Math.min(state.elapsedMs + delta, state.level.durationMs);

  // Vocalist interruption takes over before any new spawn is scheduled.
  // A level with `vocalistEventAtMs: null` is never interrupted (M15).
  const vocalistAtMs = state.level.vocalistEventAtMs;
  if (vocalistAtMs !== null && !state.vocalist.triggered && state.elapsedMs >= vocalistAtMs) {
    state.vocalist.triggered = true;
    state.vocalist.status = 'blocking';
    state.vocalist.startedAtMs = state.elapsedMs;
    state.state = 'VOCALIST_EVENT';
    /*
     * A volley in mid-flight is abandoned along with the cadence (M17). M1
     * pauses spawning during the interruption, and holding the queue instead
     * would dump the remainder of a figure the instant the singer stepped
     * aside — arriving in a clump, at spacing that no longer means anything,
     * against a player who has just been looking somewhere else.
     */
    state.pendingSpawns = [];
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
    // Volley members first, so the cadence below sees them in the count.
    releasePendingSpawns(state, events);

    const phase = phaseAt(state.level, state.elapsedMs);
    if (phase === null) {
      state.nextSpawnAtMs = null;
    } else {
      if (state.nextSpawnAtMs === null) {
        state.nextSpawnAtMs = state.elapsedMs + spawnIntervalAt(phase, state.elapsedMs);
      }
      // A long tick can owe more than one spawn; the cap keeps the screen readable.
      while (
        state.nextSpawnAtMs !== null &&
        state.elapsedMs >= state.nextSpawnAtMs &&
        state.nextSpawnAtMs < phase.toMs
      ) {
        // Annotated because the assignment below feeds back into the property
        // this reads, and TypeScript cannot infer through that cycle.
        const slotAtMs: number = state.nextSpawnAtMs;
        events.push(...fillSpawnSlot(state, phase, slotAtMs));
        // The interval is read at the slot's own time rather than at the
        // clock's, so a ramped phase advances by the same amounts whatever
        // frame rate the round happened to run at (AGENTS.md rule 5).
        state.nextSpawnAtMs = slotAtMs + spawnIntervalAt(phase, slotAtMs);
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

/**
 * The radius a tap is actually judged against (M5A, Priority 1).
 *
 * The perspective radius is enlarged and then floored, so a target that is
 * still far away stays a mark a thumb can find. Without the floor a freshly
 * spawned bottle is a ~21 px circle on a 1920 px canvas, which is what made
 * the first playtest read as unresponsive.
 */
export function effectiveHitRadius(kind: TargetKind, scale: number): number {
  const perspective = hitRadiusAt(TARGET_DEFINITIONS[kind].hitRadiusAtDangerLine, scale);
  return Math.max(HIT_FORGIVENESS.minRadiusPx, perspective * HIT_FORGIVENESS.radiusMultiplier);
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
 *
 * Resolution is deliberately generous (M5A, Priority 1). A tap inside an
 * enlarged, floored hitbox is a direct hit and the most urgent of those wins.
 * A tap that lands inside nothing still resolves the target it came closest
 * to, measured from the hitbox edge, provided it was within
 * `HIT_FORGIVENESS.assistRadiusPx`. Direct hits always beat assisted ones, so
 * aiming carefully is never punished by the assist.
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
  // Failing that, fall back to whichever target the swing came nearest to.
  let direct: ActiveTarget | null = null;
  let directProgress = -1;
  let directPose = { x: 0, y: 0 };

  let assisted: ActiveTarget | null = null;
  let assistedGap = Number.POSITIVE_INFINITY;
  let assistedProgress = -1;
  let assistedPose = { x: 0, y: 0 };

  for (const target of state.targets) {
    if (target.status !== 'active') continue;
    const progress = progressAt(state.elapsedMs, target.spawnAtMs, target.durationMs);
    const pose = throwPoseAt(progress, target.trajectory);
    const radius = effectiveHitRadius(target.kind, pose.scale);
    const distance = Math.hypot(point.x - pose.x, point.y - pose.y);

    if (distance <= radius) {
      if (progress > directProgress) {
        direct = target;
        directProgress = progress;
        directPose = { x: pose.x, y: pose.y };
      }
      continue;
    }

    // Distance from the hitbox edge, not from the centre: a big near target
    // and a small far one are judged by the same margin of error.
    const gap = distance - radius;
    if (gap > HIT_FORGIVENESS.assistRadiusPx) continue;
    if (gap < assistedGap || (gap === assistedGap && progress > assistedProgress)) {
      assisted = target;
      assistedGap = gap;
      assistedProgress = progress;
      assistedPose = { x: pose.x, y: pose.y };
    }
  }

  const best = direct ?? assisted;
  const bestPose = direct === null ? assistedPose : directPose;
  const bestProgress = direct === null ? assistedProgress : directProgress;

  if (best === null) return events;

  best.status = 'hit';
  best.resolvedAtMs = state.elapsedMs;
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const multiplier = comboMultiplier(state.combo);

  // A mug caught near the drummer is drunk; one swatted while it is still far
  // away breaks with the stick, exactly as it always did (M18). The test is on
  // where the mug *reads* as being, never on elapsed time — see
  // `DRINK_MIN_CLOSENESS`.
  const drunk =
    best.kind === 'beerMug' && closenessAt(bestProgress) >= DRINK_MIN_CLOSENESS;

  // Flat, and added outside the multiplier rather than inside it.
  const points =
    TARGET_DEFINITIONS[best.kind].basePoints * multiplier +
    (drunk ? SCORING.drinkBonus : 0);
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
    drunk,
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
  /** Tumble in radians, so the object looks thrown rather than carried. */
  readonly rotation: number;
  /** The radius a tap actually resolves against, forgiveness included. */
  readonly hitRadius: number;
}

export function targetViews(state: RoundState): TargetView[] {
  return state.targets.map((target) => {
    const progress = progressAt(state.elapsedMs, target.spawnAtMs, target.durationMs);
    const pose = throwPoseAt(progress, target.trajectory);
    return {
      id: target.id,
      kind: target.kind,
      status: target.status,
      x: pose.x,
      y: pose.y,
      scale: pose.scale,
      progress,
      rotation: pose.rotation,
      hitRadius: effectiveHitRadius(target.kind, pose.scale),
    };
  });
}

export function remainingMs(state: RoundState): number {
  return Math.max(0, state.level.durationMs - state.elapsedMs);
}

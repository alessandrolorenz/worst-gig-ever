/**
 * Ambient stage life and performer reactions (M5A, Priorities 3 and 4).
 *
 * Presentation only. Nothing here scores, ends a round, or changes what the
 * player can hit — the vocalist interruption remains the one gameplay-critical
 * band event and it stays in `game/state/roundState.ts`. This module exists so
 * that the stage stops reading as a static diagram.
 *
 * Two independent things live here because they share one clock:
 *
 *  - a per-performer reaction state machine (`idle`, `loopA`, `loopB`,
 *    `hitReaction`, `dodge`), and
 *  - the ambient loop cadence for the band, the crowd, and the stage lights.
 *
 * The clock is its own accumulator rather than the round clock, because the
 * stage must keep breathing on the title and results screens, where round time
 * does not advance. Like the rest of the game it is driven by elapsed
 * milliseconds, never a frame count (AGENTS.md rule 5), and every read is a
 * pure function of it — so the whole module is testable without rendering.
 *
 * `loopA` / `loopB` deliberately match the idle/groove pose pair already
 * declared for the band in `assets/manifest/asset-manifest.json`, so M6 can
 * drop art in without renaming anything.
 */
import { PERFORMER_ANCHORS, STAGE_MOTION } from '../config/stage.ts';
import type { TargetStatus } from '../state/gameState.ts';

export const PERFORMER_POSES = ['idle', 'loopA', 'loopB', 'hitReaction', 'dodge'] as const;

export type PerformerPose = (typeof PERFORMER_POSES)[number];

export const PERFORMER_IDS = ['bassist', 'guitarist', 'vocalist'] as const;

export type PerformerId = (typeof PERFORMER_IDS)[number];

/** Poses that play once and then hand back to the ambient loop. */
export const ONE_SHOT_POSES: readonly PerformerPose[] = ['hitReaction', 'dodge'];

export interface PerformerState {
  readonly id: PerformerId;
  pose: PerformerPose;
  /** Milliseconds left in a one-shot reaction; 0 while looping. */
  reactionMsLeft: number;
  /**
   * Ambient loop clock. Seeded per performer so the band does not bob in
   * lockstep, which reads as a single object rather than three people.
   */
  loopMs: number;
}

export interface StageMotionState {
  /** Ambient presentation clock. Advances in every game state, menus included. */
  elapsedMs: number;
  performers: Record<PerformerId, PerformerState>;
}

/** What the reaction rules need to know about a target in flight. */
export interface ThreatView {
  readonly x: number;
  readonly y: number;
  readonly progress: number;
  readonly status: TargetStatus;
}

/** Milliseconds in one beat at the authored cadence. */
export function beatMs(): number {
  return 60_000 / STAGE_MOTION.bpm;
}

/** Milliseconds in one full ambient loop. */
export function loopMs(): number {
  return beatMs() * STAGE_MOTION.beatsPerLoop;
}

/** Loop phase offsets, so the three performers are never on the same frame. */
const LOOP_PHASE_MS: Record<PerformerId, number> = {
  bassist: 0,
  guitarist: 210,
  vocalist: 430,
};

export function createStageMotion(): StageMotionState {
  return {
    elapsedMs: 0,
    performers: {
      bassist: { id: 'bassist', pose: 'loopA', reactionMsLeft: 0, loopMs: LOOP_PHASE_MS.bassist },
      guitarist: {
        id: 'guitarist',
        pose: 'loopA',
        reactionMsLeft: 0,
        loopMs: LOOP_PHASE_MS.guitarist,
      },
      vocalist: { id: 'vocalist', pose: 'loopA', reactionMsLeft: 0, loopMs: LOOP_PHASE_MS.vocalist },
    },
  };
}

export function clearStageMotion(state: StageMotionState): void {
  const fresh = createStageMotion();
  state.elapsedMs = 0;
  for (const id of PERFORMER_IDS) state.performers[id] = fresh.performers[id];
}

/**
 * Which frame of an N-frame loop is showing.
 *
 * Returns an integer, so animation steps between poses instead of sliding
 * between them. M5A wants low-frame and slightly choppy, not smooth.
 */
export function loopFrameAt(elapsedMs: number, periodMs: number, frames: number): number {
  if (frames <= 1 || periodMs <= 0) return 0;
  const phase = ((elapsedMs % periodMs) + periodMs) % periodMs;
  return Math.min(frames - 1, Math.floor((phase / periodMs) * frames));
}

/**
 * Beat pulse for stage lights: 1 on the beat, decaying to 0 just before the
 * next one. The only continuous value in this module — a light that stepped
 * would read as a fault rather than a pulse.
 */
export function beatPulse(elapsedMs: number): number {
  const period = beatMs();
  const phase = ((elapsedMs % period) + period) % period;
  return 1 - phase / period;
}

/** The pose a performer falls back to once no reaction is playing. */
function ambientPose(performer: PerformerState): PerformerPose {
  return loopFrameAt(performer.loopMs, loopMs(), STAGE_MOTION.loopFrames) === 0 ? 'loopA' : 'loopB';
}

function startReaction(performer: PerformerState, pose: PerformerPose, durationMs: number): void {
  // A reaction already playing is not restarted by a second trigger: the
  // flicker of a re-entered pose reads as a glitch, not as more chaos.
  if (performer.reactionMsLeft > 0) return;
  performer.pose = pose;
  performer.reactionMsLeft = durationMs;
}

/**
 * Flinches the performer nearest an impact, if one is close enough.
 *
 * Returns whoever reacted, so callers can assert on it without reaching into
 * the state.
 */
export function reactToImpact(state: StageMotionState, x: number, y: number): PerformerId | null {
  let nearest: PerformerId | null = null;
  let nearestDistanceSq = STAGE_MOTION.impactReactionRadius ** 2;

  for (const id of PERFORMER_IDS) {
    const anchor = PERFORMER_ANCHORS[id];
    const distanceSq = (x - anchor.x) ** 2 + (y - anchor.y) ** 2;
    if (distanceSq <= nearestDistanceSq) {
      nearest = id;
      nearestDistanceSq = distanceSq;
    }
  }

  if (nearest === null) return null;
  startReaction(state.performers[nearest], 'hitReaction', STAGE_MOTION.hitReactionMs);
  return nearest;
}

/** True while a target is close enough to a performer to be worth ducking. */
function threatens(threat: ThreatView, id: PerformerId): boolean {
  if (threat.status !== 'active') return false;
  if (threat.progress < STAGE_MOTION.dodgeFromProgress) return false;
  if (threat.progress > STAGE_MOTION.dodgeToProgress) return false;
  const anchor = PERFORMER_ANCHORS[id];
  const distanceSq = (threat.x - anchor.x) ** 2 + (threat.y - anchor.y) ** 2;
  return distanceSq <= STAGE_MOTION.dodgeProximity ** 2;
}

/**
 * Advances the ambient clock, expires one-shot reactions, and ducks anyone a
 * target is currently flying past.
 *
 * Dodges are derived from the targets already in flight rather than from a new
 * domain event: the reaction is a read of gameplay state, so it cannot drift
 * out of sync with what the player can see, and M5A adds no event family for
 * presentation alone.
 */
export function tickStageMotion(
  state: StageMotionState,
  threats: readonly ThreatView[],
  deltaMs: number,
): void {
  if (!(deltaMs > 0)) return;
  state.elapsedMs += deltaMs;

  for (const id of PERFORMER_IDS) {
    const performer = state.performers[id];
    performer.loopMs += deltaMs;

    if (performer.reactionMsLeft > 0) {
      performer.reactionMsLeft = Math.max(0, performer.reactionMsLeft - deltaMs);
      if (performer.reactionMsLeft > 0) continue;
    }

    if (threats.some((threat) => threatens(threat, id))) {
      startReaction(performer, 'dodge', STAGE_MOTION.dodgeMs);
      continue;
    }

    performer.pose = ambientPose(performer);
  }
}

export function performerPose(state: StageMotionState, id: PerformerId): PerformerPose {
  return state.performers[id].pose;
}

/** True while the performer is playing a one-shot rather than looping. */
export function isReacting(state: StageMotionState, id: PerformerId): boolean {
  return state.performers[id].reactionMsLeft > 0;
}

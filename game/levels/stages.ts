/**
 * The two stages of the show (M15).
 *
 * Source of truth: docs/specs/M15-story-briefings-and-two-stages.md
 *
 * A *level* is a spawn schedule; a **stage** is a level plus the things that
 * are true around it — which job the stage asks for, what it is called, and
 * what the player is told before it starts. They are separate types on
 * purpose:
 *
 *   - `LevelDefinition` is read by the round domain on every tick. Nothing in
 *     it may depend on how the game is presented.
 *   - `StageDefinition` is read by the flow and the overlays. Nothing in it is
 *     consulted while resolving a tap.
 *
 * The one field that crosses that line is `groove`, and it crosses in exactly
 * one direction: `roundSystem` copies it into the `BeatContext` it builds each
 * frame, and the rhythm domain decides for itself what to do about it. The
 * round domain never sees it at all.
 *
 * Keeping the split this way is also what let Stage 2 stay the *validated*
 * round: `level01` is byte-for-byte the schedule the owner approved at M13.1
 * and M14, and everything M15 adds around it lives here instead.
 */
import { defenseDrill } from './defenseDrill.ts';
import { level01 } from './level01.ts';
import type { LevelDefinition } from './levelDefinition.ts';

export interface StageDefinition {
  readonly id: string;
  /** 1-based, and the number the player is shown. */
  readonly number: number;
  /** Short name on the title screen's stage button. */
  readonly name: string;
  /** One line under the name: what this stage is for. */
  readonly subtitle: string;
  readonly level: LevelDefinition;
  /**
   * Whether the Groove Pad is live this stage.
   *
   * When false the pad is not drawn, the Groove readout is not drawn, no beat
   * is scheduled, scored, or missed, and the results screen reports one
   * performance instead of two. It is a single switch rather than four,
   * because a pad that is drawn but dead — or a Groove column reading 0/0 —
   * would tell the player they had failed at a job they were never given.
   */
  readonly groove: boolean;
  /** The briefing card, one bullet per line, in the order they are read. */
  readonly briefing: readonly string[];
}

/**
 * Stage 1 — one job.
 *
 * The first physical playtest found the dual-task loop fun and hard, and M13.1
 * made it readable. What no version of it has ever done is let the player learn
 * the two jobs one at a time: the very first round they play has always asked
 * for both. This stage is that missing step, and it is a real round rather than
 * a demo — it can be lost.
 */
const stageOne: StageDefinition = {
  id: 'stage-1-defense',
  number: 1,
  name: 'Hold the line',
  subtitle: 'Defense only',
  level: defenseDrill,
  groove: false,
  briefing: [
    'The crowd is throwing what it was drinking.',
    'Tap a bottle or a mug to smash it before it reaches your kit.',
    'Three things get through and the show is over.',
    'No beat to keep yet. Just defend.',
  ],
};

/**
 * Stage 2 — both jobs at once.
 *
 * The validated round, unchanged. Its briefing names only what is *new*, since
 * the player has just spent a stage doing the rest.
 */
const stageTwo: StageDefinition = {
  id: 'stage-2-groove',
  number: 2,
  name: 'Keep the beat',
  subtitle: 'Groove + defense',
  level: level01,
  groove: true,
  briefing: [
    'You are the drummer, so now you have to actually drum.',
    'Tap the pulsing pad on the drum head, on every beat.',
    'Keep smashing the bottles at the same time.',
    'A missed beat costs you the streak. A missed bottle costs the show.',
  ],
};

export const STAGES: readonly StageDefinition[] = [stageOne, stageTwo];

/** The stage the game opens on. */
export const FIRST_STAGE_INDEX = 0;

export function stageAt(index: number): StageDefinition {
  return STAGES[clampStageIndex(index)];
}

/** Index into `STAGES`, clamped so a bad value can never crash a round. */
export function clampStageIndex(index: number): number {
  if (!Number.isFinite(index)) return FIRST_STAGE_INDEX;
  return Math.max(0, Math.min(STAGES.length - 1, Math.floor(index)));
}

/** True if there is another stage after this one. */
export function hasNextStage(index: number): boolean {
  return clampStageIndex(index) < STAGES.length - 1;
}

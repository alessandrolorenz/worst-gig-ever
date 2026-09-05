/**
 * The four stages of the show (M15, M16, M17).
 *
 * Source of truth: docs/specs/M15-story-briefings-and-two-stages.md
 *
 * A *level* is a spawn schedule; a **stage** is a level plus the things that
 * are true around it — which job the stage asks for, and what the player is
 * taught before it starts. They are separate types on purpose:
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
 * Keeping the split this way is also what let Stage 3 stay the *validated*
 * round: `level01` is byte-for-byte the schedule the owner approved at M13.1
 * and M14, and everything M15 adds around it lives here instead.
 *
 * ## No prose lives here (M19)
 *
 * A stage's name, subtitle and briefing used to be English sentences on the
 * objects below. They are now in `game/i18n/catalogues/en.ts`, keyed by the
 * stage `id` — the same way `storyAssets.ts` has always keyed a JPEG by a
 * panel id. What is left describes what a stage *is*, which is the only thing
 * a domain module should have known in the first place.
 */
import type { MusicTrackId } from '../audio/musicCatalogue.ts';
import { defenseDrill } from './defenseDrill.ts';
import { encore } from './encore.ts';
import { findTheBeat } from './findTheBeat.ts';
import { level01 } from './level01.ts';
import type { LevelDefinition } from './levelDefinition.ts';

/**
 * Every stage, as a literal union.
 *
 * It is the key into the string catalogue, so it is a union rather than
 * `string`: a stage added without strings is a type error rather than a blank
 * briefing card discovered in a playtest.
 */
export type StageId = 'stage-1-defense' | 'stage-2-beat' | 'stage-3-groove' | 'stage-4-encore';

export interface StageDefinition {
  readonly id: StageId;
  /** 1-based, and the number the player is shown. */
  readonly number: number;
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
  /**
   * Which bed this stage plays in the **official** show (M16, M24A).
   *
   * Per stage rather than one track for the game, because the stages stopped
   * wanting the same thing the moment one of them existed to *teach* the beat.
   * A stage that scores beats wants a bed that agrees with the beat clock; a
   * stage that scores none can play anything.
   *
   * Still the authored answer after M24A, and deliberately not moved into the
   * setlist module: `OFFICIAL_SETLIST` is derived from this field, so the show
   * the owner approved is defined here and copied nowhere. What changed is that
   * a *run* resolves its music through its setlist rather than reading this
   * directly — see `game/audio/setlist.ts`.
   */
  readonly music: MusicTrackId;
  /**
   * Pictures on the briefing, shown above the bullets (M18.1).
   *
   * The owner asked for the explanation screen to carry images, and the mug
   * rule is why: it is the one rule in the game where the *same* object has
   * two outcomes, and prose describing "close" against "far" is a worse
   * teacher than two pictures of it. Optional, because a stage that teaches
   * nothing new should not pay the vertical space.
   *
   * Ids only. The art is resolved by the renderer and the caption by the
   * catalogue, so a stage names the outcome it is teaching and neither the
   * PNG that shows it nor the English that describes it.
   */
  readonly briefingFigures?: readonly BriefingFigureId[];
}

export type BriefingFigureId = 'smash' | 'drink';

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
  level: defenseDrill,
  groove: false,
  /*
   * The rock loop keeps this stage, and the fact that it is a 120 BPM track
   * against a 90 BPM clock does not matter here: no beat is scheduled, scored,
   * or missed on this stage, so there is no clock for the music to disagree
   * with. It is also the track the game has always opened on.
   */
  music: 'showTheme',
  briefingFigures: ['smash', 'drink'],
};

/**
 * Stage 2 — the other job, on its own (M16).
 *
 * M15 taught the objects and then asked for both jobs at once, which meant the
 * first round that ever asked the player to keep time was also the first round
 * that asked them to do it under pressure. This is the missing middle step,
 * and it is where the teaching order the owner asked for is actually
 * satisfied: objects, then beats, then both.
 *
 * The Groove is on, and for twelve seconds it is the only thing on screen.
 */
const stageTwo: StageDefinition = {
  id: 'stage-2-beat',
  number: 2,
  level: findTheBeat,
  groove: true,
  /*
   * The generated 90 BPM bed. This is the one stage where the music absolutely
   * must not drift — twelve of its thirty-five seconds are nothing but the
   * beat, and a bed sliding out of phase underneath would teach the player the
   * opposite of the lesson.
   */
  music: 'grooveBed',
};

/**
 * Stage 3 — both jobs at once.
 *
 * The validated round, unchanged. Its briefing names only what is *new*, since
 * the player has now spent two stages doing the rest.
 */
const stageThree: StageDefinition = {
  id: 'stage-3-groove',
  number: 3,
  level: level01,
  groove: true,
  /*
   * The generated show bed, which closes the last open piece of M16. The show
   * scores beats, so its bed has to agree with them; the rock loop it used to
   * play never did, because it is at 120 BPM rather than drifting at 90.
   */
  music: 'showBed',
};

/**
 * Stage 4 — the escalation (M17).
 *
 * Where the difficulty curve and the throw patterns actually get played. It
 * exists as its own stage rather than as a retune of the show because
 * `level01` is still the subject of an open performance retest, and changing
 * it mid-measurement would cost the project its only physical baseline.
 *
 * It is the first round that gets harder *continuously* — cadence ramps inside
 * every phase, throws speed up across the whole round, fastballs go from one in
 * twenty to better than one in three — and the first that throws authored
 * figures instead of independent objects.
 */
const stageFour: StageDefinition = {
  id: 'stage-4-encore',
  number: 4,
  level: encore,
  groove: true,
  /*
   * The show bed, as this stage's own comment promised it would take as soon
   * as one existed. It had been playing the *teaching* bed — the right
   * property and the wrong music, since an encore backed by four bars of
   * kick-snare-root is an anticlimax.
   */
  music: 'showBed',
};

export const STAGES: readonly StageDefinition[] = [stageOne, stageTwo, stageThree, stageFour];

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

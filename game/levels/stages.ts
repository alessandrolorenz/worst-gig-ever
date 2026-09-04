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
import type { MusicKey } from '../audio/audioMix.ts';
import { defenseDrill } from './defenseDrill.ts';
import { encore } from './encore.ts';
import { findTheBeat } from './findTheBeat.ts';
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
  /**
   * Which bed this stage plays (M16).
   *
   * Per stage rather than one track for the game, because the stages stopped
   * wanting the same thing the moment one of them existed to *teach* the beat.
   * A stage that scores beats wants a bed that agrees with the beat clock; a
   * stage that scores none can play anything.
   */
  readonly music: MusicKey;
  /** The briefing card, one bullet per line, in the order they are read. */
  readonly briefing: readonly string[];
  /**
   * Pictures on the briefing, shown above the bullets (M18.1).
   *
   * The owner asked for the explanation screen to carry images, and the mug
   * rule is why: it is the one rule in the game where the *same* object has
   * two outcomes, and prose describing "close" against "far" is a worse
   * teacher than two pictures of it. Optional, because a stage that teaches
   * nothing new should not pay the vertical space.
   */
  readonly briefingFigures?: readonly BriefingFigure[];
}

/** One captioned picture on a briefing card. Art is resolved by the renderer. */
export interface BriefingFigure {
  readonly id: BriefingFigureId;
  readonly caption: string;
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
  name: 'Hold the line',
  subtitle: 'Defense only',
  level: defenseDrill,
  groove: false,
  /*
   * The rock loop, and its 417 ms-per-loop drift against 90 BPM does not
   * matter here: no beat is scheduled, scored, or missed on this stage, so
   * there is no clock for the music to disagree with.
   */
  music: 'showTheme',
  briefing: [
    'The crowd is throwing what it was drinking.',
    'Tap a bottle or a mug to smash it before it reaches your kit.',
    'A mug is different, and the timing is the whole rule: hit it while it is',
    'still far away and it smashes like anything else. Let it come all the way',
    'in — close enough to reach — and the drummer catches it and drinks it,',
    'which is worth more.',
    'Three things get through and the show is over.',
    'No beat to keep yet. That is the next stage. Just defend.',
  ],
  briefingFigures: [
    { id: 'smash', caption: 'Still far away:\nit smashes' },
    { id: 'drink', caption: 'Within arm’s reach:\nhe drinks it' },
  ],
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
  name: 'Find the beat',
  subtitle: 'Groove first',
  level: findTheBeat,
  groove: true,
  /*
   * The generated 90 BPM bed. This is the one stage where the music absolutely
   * must not drift — twelve of its thirty-five seconds are nothing but the
   * beat, and a bed sliding out of phase underneath would teach the player the
   * opposite of the lesson.
   */
  music: 'grooveBed',
  briefing: [
    'You are the drummer. Before anything gets thrown, find the beat.',
    'Two marks slide together on the pad. Tap the pad when they touch.',
    'Count it: one, two, three, four.',
    'Bottles start halfway through — smash them, or the show is over.',
  ],
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
  name: 'Keep the beat',
  subtitle: 'Groove + defense',
  level: level01,
  groove: true,
  /*
   * Still the rock loop, and this is the **one open piece of M16**: the show
   * scores beats, so its bed should be tempo-locked too, and this one is not.
   * The click carries the beat here in the meantime. Replacing it is a music
   * choice that belongs to the owner rather than to a generator — see
   * `docs/specs/M16-beat-clarity-and-progressive-teaching.md`, section E.
   */
  music: 'showTheme',
  briefing: [
    'Now both jobs at once, and the crowd has warmed up.',
    'Keep the beat on the pad while you clear what comes at the kit.',
    'Mugs are back: let one reach you and you drink it instead of smashing it.',
    'A missed beat costs you the streak. A missed bottle costs the show.',
    'Someone may get in your way. Deal with them.',
  ],
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
  name: 'Encore',
  subtitle: 'It keeps escalating',
  level: encore,
  groove: true,
  /*
   * The teaching bed, because it is the only tempo-locked one that exists and
   * a stage that scores beats must not play music that drifts against them.
   * It is the wrong music for an encore and it is the right *property*; when
   * the show gets a tempo-locked bed of its own, this stage takes it.
   */
  music: 'grooveBed',
  briefing: [
    'The crowd wants one more song. They brought more bottles.',
    'It starts easy and it does not stay that way: faster, and closer together.',
    'They come in threes now — same spot, or side to side. Smash all of them.',
    'Keep the beat on the pad. Three through the kit and the show is over.',
  ],
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

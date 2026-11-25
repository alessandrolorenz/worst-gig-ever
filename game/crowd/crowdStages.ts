/**
 * M30 Crowd difficulty stages.
 *
 * One venue, one band, one waiter: a stage is only data. Everything a stage
 * may change is a field here, so a difference between two stages is always a
 * visible, testable number rather than a branch somewhere in the domain.
 */
import type { MusicTrackId } from '../audio/musicCatalogue.ts';
import type { CrowdTargetId } from './crowdConfig.ts';

export const CROWD_STAGE_IDS = ['warmUp', 'gettingWorse', 'destroyTheGig'] as const;
export type CrowdStageId = (typeof CROWD_STAGE_IDS)[number];

export interface CrowdWaiterTiming {
  /** Pause before the waiter appears, at the start of every cycle. */
  readonly initialDelayMs: number;
  /** Time to cross the canvas, left to right. */
  readonly travelMs: number;
  /** Full period; the remainder after the crossing is an open stage. */
  readonly cycleMs: number;
}

export interface CrowdStageConfig {
  readonly id: CrowdStageId;
  /** One objective per target, each resolved by a single hit. */
  readonly objectives: readonly CrowdTargetId[];
  readonly bottles: number;
  /** Fractions of the flight path the aim guide reveals. Never the landing. */
  readonly aimGuideProgress: readonly number[];
  readonly waiter: CrowdWaiterTiming;
  /** Scales prop and instrument hit rects about their centres. */
  readonly targetScale: number;
  /** Paid per unused bottle when the gig is ruined. */
  readonly spareBottleBonus: number;
  /**
   * What the band is playing while it is being ruined (M32). One track per
   * stage, as data: a later song choice replaces the read of this field, not
   * the audio path.
   */
  readonly music: MusicTrackId;
}

export const CROWD_STAGES: Readonly<Record<CrowdStageId, CrowdStageConfig>> = Object.freeze({
  warmUp: {
    id: 'warmUp',
    objectives: ['microphone', 'crashCymbal', 'amplifier', 'vocalist'],
    bottles: 10,
    aimGuideProgress: [0.11, 0.22, 0.33, 0.44, 0.55],
    waiter: { initialDelayMs: 4000, travelMs: 8000, cycleMs: 13000 },
    targetScale: 1.2,
    spareBottleBonus: 50,
    music: 'showTheme',
  },
  gettingWorse: {
    id: 'gettingWorse',
    objectives: [
      'microphone',
      'crashCymbal',
      'rideCymbal',
      'amplifier',
      'guitar',
      'bass',
      'vocalist',
    ],
    bottles: 11,
    aimGuideProgress: [0.15, 0.3, 0.45],
    waiter: { initialDelayMs: 2200, travelMs: 6200, cycleMs: 9000 },
    targetScale: 1,
    spareBottleBonus: 100,
    music: 'grooveBed',
  },
  destroyTheGig: {
    id: 'destroyTheGig',
    objectives: [
      'microphone',
      'crashCymbal',
      'rideCymbal',
      'amplifier',
      'guitar',
      'bass',
      'vocalist',
      'guitarist',
      'bassist',
    ],
    bottles: 12,
    aimGuideProgress: [0.2, 0.4],
    waiter: { initialDelayMs: 1200, travelMs: 4600, cycleMs: 6200 },
    targetScale: 0.85,
    spareBottleBonus: 200,
    music: 'showBed',
  },
});

export const DEFAULT_CROWD_STAGE_ID: CrowdStageId = 'warmUp';

export function crowdStage(id: CrowdStageId): CrowdStageConfig {
  return CROWD_STAGES[id];
}

/** The stage after this one, or null after the last. Every stage is open. */
export function nextCrowdStageId(id: CrowdStageId): CrowdStageId | null {
  return CROWD_STAGE_IDS[CROWD_STAGE_IDS.indexOf(id) + 1] ?? null;
}

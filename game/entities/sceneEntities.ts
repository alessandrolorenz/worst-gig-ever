/**
 * The React Native Game Engine entity map.
 *
 * Built exactly once per mounted game and then mutated in place by the
 * systems. It is never constructed during a render: the template's habit of
 * calling `entities()` from the component body rebuilt a Matter engine on
 * every React render (ADR 0001), which is both a leak and a source of dropped
 * physics state.
 */
import type React from 'react';

import type { AudioService } from '../audio/audioService.ts';
import { createEffects, type EffectsState } from '../systems/effects.ts';
import { createShards, type ShardsState } from '../systems/shards.ts';
import { createStageMotion, type StageMotionState } from '../systems/stageMotion.ts';
import { createViewport, type Viewport } from '../rendering/layout.ts';
import { createRhythm, type RhythmState } from '../state/rhythmState.ts';
import { createRound, type RoundState } from '../state/roundState.ts';
import { createAppFlow, type AppFlowState } from '../state/appFlow.ts';
import { createStory, type StoryState } from '../state/storyState.ts';
import type { GameState } from '../state/gameState.ts';
import { stageAt, FIRST_STAGE_INDEX, type StageDefinition } from '../levels/stages.ts';
import { OFFICIAL_SETLIST, trackForStage } from '../audio/setlist.ts';
import type { MusicTrackId } from '../audio/musicCatalogue.ts';
import { DEFAULT_LOCALE, type Locale } from '../i18n/locales.ts';

export interface SceneEntity {
  round: RoundState;
  /** Groove truth: beat judgements, Groove score, streak (M10). */
  rhythm: RhythmState;
  /**
   * The stage the mounted round belongs to (M15).
   *
   * Held next to the round rather than looked up from `flow` on demand, so the
   * systems that drive a round never have to know an app flow exists: a round
   * and the stage it came from are set together, and `roundSystem` reads
   * `stage.groove` without importing a screen.
   */
  stage: StageDefinition;
  /**
   * The track this round plays, resolved from the run's setlist (M24A).
   *
   * Held next to `stage` and set with it, for exactly the reason `stage` is
   * held next to `round`: the two are decided together, and the alternative is
   * `GameEngine` reaching into the flow at the moment it starts the music —
   * which is how the wrong bed comes up when a screen transition and a round
   * start disagree about which stage is current.
   */
  music: MusicTrackId;
  /** Which screen the player is on: story, title, briefing, or round (M15). */
  flow: AppFlowState;
  /** The opening story's own clock, ticked by `flowSystem` (M15). */
  story: StoryState;
  effects: EffectsState;
  shards: ShardsState;
  /** Ambient band/crowd motion and performer reactions. Presentation only. */
  stageMotion: StageMotionState;
  audio: AudioService;
  viewport: Viewport;
  /** Notified when the domain state changes, so React can swap overlays. */
  onStateChange: ((state: GameState) => void) | null;
  /**
   * Notified when the app flow or the story panel changes.
   *
   * Deliberately argument-free. React re-reads the flow off the entity when it
   * fires, so there is exactly one copy of the flow and a notification cannot
   * carry a stale one.
   */
  onFlowChange: (() => void) | null;
  renderer: React.ComponentType<never>;
}

export interface GameEntities {
  scene: SceneEntity;
  [key: string]: SceneEntity;
}

/**
 * The entity map for a fresh game.
 *
 * `initialLocale` is a parameter rather than a device read so this stays
 * callable from a test: `detectLocale()` is a native call and lives in
 * `GameEngine`, which is the boundary that already owns the device.
 */
export function createSceneEntities(
  audio: AudioService,
  renderer: React.ComponentType<never>,
  initialLocale: Locale = DEFAULT_LOCALE,
): GameEntities {
  const stage = stageAt(FIRST_STAGE_INDEX);
  return {
    scene: {
      round: createRound(stage.level),
      rhythm: createRhythm(),
      stage,
      music: trackForStage(OFFICIAL_SETLIST, FIRST_STAGE_INDEX),
      flow: createAppFlow(initialLocale),
      story: createStory(),
      effects: createEffects(),
      shards: createShards(),
      stageMotion: createStageMotion(),
      audio,
      viewport: createViewport(),
      onStateChange: null,
      onFlowChange: null,
      renderer,
    },
  };
}

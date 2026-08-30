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
import { createViewport, type Viewport } from '../rendering/layout.ts';
import { createRound, type RoundState } from '../state/roundState.ts';
import type { GameState } from '../state/gameState.ts';
import { level01 } from '../levels/level01.ts';

export interface SceneEntity {
  round: RoundState;
  effects: EffectsState;
  shards: ShardsState;
  audio: AudioService;
  viewport: Viewport;
  /** Notified when the domain state changes, so React can swap overlays. */
  onStateChange: ((state: GameState) => void) | null;
  renderer: React.ComponentType<never>;
}

export interface GameEntities {
  scene: SceneEntity;
  [key: string]: SceneEntity;
}

export function createSceneEntities(
  audio: AudioService,
  renderer: React.ComponentType<never>,
): GameEntities {
  return {
    scene: {
      round: createRound(level01),
      effects: createEffects(),
      shards: createShards(),
      audio,
      viewport: createViewport(),
      onStateChange: null,
      renderer,
    },
  };
}

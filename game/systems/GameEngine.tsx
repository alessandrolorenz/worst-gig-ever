/**
 * Host component for the vertical slice.
 *
 * Owns the engine loop, the audio lifecycle, and the overlays — and nothing
 * else. Score, combo, Show Integrity, the round clock, and every state
 * transition live in `game/state/roundState.ts`; the only thing mirrored into
 * React state here is which overlay to show, which is a projection of the
 * domain rather than a second copy of the truth.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { GameEngine as ReactGameEngine } from 'react-native-game-engine';
import { GameEngine as WebGameEngine } from 'react-game-engine';

import { createAudioService, type AudioService } from '../audio/audioService.ts';
import { createSceneEntities, type GameEntities } from '../entities/sceneEntities.ts';
import { Overlays } from '../rendering/Overlays.tsx';
import { SceneRenderer } from '../rendering/SceneRenderer.tsx';
import { THEME } from '../rendering/theme.ts';
import { level01 } from '../levels/level01.ts';
import type { GameState } from '../state/gameState.ts';
import { clearRhythm } from '../state/rhythmState.ts';
import {
  cancelCountdown,
  createRound,
  pauseRound,
  resumeRound,
  startRound,
} from '../state/roundState.ts';
import { clearEffects } from './effects.ts';
import { clearShards } from './shards.ts';
import { clearStageMotion } from './stageMotion.ts';
import { roundSystem } from './roundSystem.ts';

const EngineComponent = Platform.OS === 'web' ? WebGameEngine : ReactGameEngine;

export default function GameEngine() {
  // Created once per mount and mutated in place. In particular the Matter
  // world behind the shard debris must survive re-renders (ADR 0001).
  const audioRef = useRef<AudioService | null>(null);
  if (audioRef.current === null) audioRef.current = createAudioService();

  const entitiesRef = useRef<GameEntities | null>(null);
  if (entitiesRef.current === null) {
    entitiesRef.current = createSceneEntities(
      audioRef.current,
      SceneRenderer as unknown as React.ComponentType<never>,
    );
  }

  const entities = entitiesRef.current;
  const audio = audioRef.current;
  const [uiState, setUiState] = useState<GameState>(entities.scene.round.state);

  // The domain decides when a round ends; React only follows.
  useEffect(() => {
    const scene = entities.scene;
    scene.onStateChange = (state) => setUiState(state);
    return () => {
      scene.onStateChange = null;
    };
  }, [entities]);

  // Release players on unmount, so a quit or reload cannot leave music running.
  useEffect(() => () => audio.dispose(), [audio]);

  /**
   * Start opens the `3 -> 2 -> 1 -> GO` pre-roll rather than the round itself
   * (M13.1). The music starts here rather than on `GO` because it was never
   * the rhythm clock and is not being made into one — it simply plays under
   * the count, exactly as it played under M10's count-in.
   */
  const handleStart = useCallback(() => {
    startRound(entities.scene.round);
    audio.playMusic();
    setUiState(entities.scene.round.state);
  }, [audio, entities]);

  const handlePause = useCallback(() => {
    pauseRound(entities.scene.round);
    audio.pauseMusic();
    setUiState(entities.scene.round.state);
  }, [audio, entities]);

  const handleResume = useCallback(() => {
    resumeRound(entities.scene.round);
    audio.resumeMusic();
    setUiState(entities.scene.round.state);
  }, [audio, entities]);

  const resetScene = useCallback(() => {
    const scene = entities.scene;
    scene.round = createRound(level01);
    // Restart resets both dimensions. The Groove is cleared in place rather
    // than replaced, because the entity map is built once per mount and the
    // renderer holds this exact object (ADR 0001).
    clearRhythm(scene.rhythm);
    clearEffects(scene.effects);
    clearShards(scene.shards);
    clearStageMotion(scene.stageMotion);
  }, [entities]);

  const handleRestart = useCallback(() => {
    resetScene();
    startRound(entities.scene.round);
    audio.restartMusic();
    setUiState(entities.scene.round.state);
  }, [audio, entities, resetScene]);

  const handleQuit = useCallback(() => {
    audio.stopMusic();
    resetScene();
    setUiState(entities.scene.round.state);
  }, [audio, entities, resetScene]);

  // Leaving the app mid-show must not keep the clock or the music running.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') {
        const round = entities.scene.round;
        if (round.state === 'PLAYING' || round.state === 'VOCALIST_EVENT') {
          pauseRound(round);
          audio.pauseMusic();
          setUiState(round.state);
        } else if (round.state === 'COUNTDOWN') {
          /*
           * A pre-roll is not worth resuming: three seconds of preparation
           * resumed from the middle teaches the player nothing and would drop
           * them into the round on a beat they never heard counted. Nothing
           * has happened yet, so going back to the title costs nothing — and
           * the music has to stop with it, because the title's Start button
           * plays it again from the top (M13.1, background during countdown).
           */
          cancelCountdown(round);
          audio.stopMusic();
          setUiState(round.state);
        }
      }
    });
    return () => subscription.remove();
  }, [audio, entities]);

  return (
    <View style={styles.root}>
      <EngineComponent
        systems={[roundSystem]}
        entities={entities}
        running
        style={styles.engine}
      >
        <Overlays
          state={uiState}
          round={entities.scene.round}
          rhythm={entities.scene.rhythm}
          audioAvailable={audio.available}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={handleQuit}
        />
      </EngineComponent>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: THEME.letterbox,
  },
  engine: {
    flex: 1,
  },
});

/**
 * Host component for the game.
 *
 * Owns the engine loop, the audio lifecycle, and the overlays — and nothing
 * else. Score, combo, Show Integrity, the round clock, and every state
 * transition live in `game/state/roundState.ts`; which screen is up lives in
 * `game/state/appFlow.ts`; the only thing mirrored into React state here is
 * enough to re-render, which is a projection of those domains rather than a
 * second copy of the truth.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Share, StyleSheet, View } from 'react-native';
import { GameEngine as ReactGameEngine } from 'react-native-game-engine';
import { GameEngine as WebGameEngine } from 'react-game-engine';

import { createAudioService, type AudioService } from '../audio/audioService.ts';
import { createSceneEntities, type GameEntities } from '../entities/sceneEntities.ts';
import { Overlays } from '../rendering/Overlays.tsx';
import { SceneRenderer } from '../rendering/SceneRenderer.tsx';
import { THEME } from '../rendering/theme.ts';
import { detectLocale } from '../i18n/deviceLocale.ts';
import { LocaleProvider } from '../i18n/LocaleContext.tsx';
import { stringsFor } from '../i18n/catalogue.ts';
import { format } from '../i18n/format.ts';
import { PRODUCT_TITLE } from '../config/product.ts';
import { emptyRecords, recordRound, type Records } from '../state/records.ts';
import { SCHEMA_VERSION, type UnknownFields } from '../state/persistence.ts';
import { loadSave, writeSave } from '../state/storage.ts';
import { stageAt } from '../levels/stages.ts';
import type { GameState } from '../state/gameState.ts';
import {
  advanceToNextStage,
  beginRound,
  cycleLocale,
  setLocale,
  finishIntro,
  recordStageCleared,
  replayIntro,
  returnToTitle,
  showBriefing,
  startStage,
  toggleClick,
} from '../state/appFlow.ts';
import { advanceStory, clearStory, skipStory } from '../state/storyState.ts';
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
import { flowSystem } from './flowSystem.ts';
import { roundSystem } from './roundSystem.ts';

const EngineComponent = Platform.OS === 'web' ? WebGameEngine : ReactGameEngine;

export default function GameEngine() {
  // Created once per mount and mutated in place. In particular the Matter
  // world behind the shard debris must survive re-renders (ADR 0001).
  const audioRef = useRef<AudioService | null>(null);
  if (audioRef.current === null) audioRef.current = createAudioService();

  const entitiesRef = useRef<GameEntities | null>(null);
  if (entitiesRef.current === null) {
    /*
     * The device's language is read once, here, at the boundary that already
     * owns the device — not inside `createAppFlow`, which stays pure so the
     * domain tests can build a flow without a native module (M19).
     */
    entitiesRef.current = createSceneEntities(
      audioRef.current,
      SceneRenderer as unknown as React.ComponentType<never>,
      detectLocale(),
    );
  }

  const entities = entitiesRef.current;
  const audio = audioRef.current;
  const [uiState, setUiState] = useState<GameState>(entities.scene.round.state);
  /*
   * A counter rather than a copy of the flow. The flow is mutated in place on
   * the entity — that is what lets a system advance it without React — so the
   * only thing React needs is to be told to look again. Copying it into state
   * would create a second flow that could disagree with the first.
   */
  const [, setFlowVersion] = useState(0);
  const refreshFlow = useCallback(() => setFlowVersion((version) => version + 1), []);

  /* ---- saved state (M22) ---- */

  /*
   * Records live in React rather than on the entity map: nothing in the game
   * loop reads them, and the overlays are the only thing that draws them. The
   * ref beside the state is what lets the round-ended effect read the current
   * value without listing it as a dependency and re-running on every change.
   */
  const [records, setRecordsState] = useState<Records>(emptyRecords());
  const recordsRef = useRef<Records>(emptyRecords());
  const applyRecords = useCallback((next: Records) => {
    recordsRef.current = next;
    setRecordsState(next);
  }, []);

  /** True when the round just finished set a best. Cleared when one starts. */
  const [beatRecord, setBeatRecord] = useState(false);

  /**
   * What the file carried that this build has no opinion about, plus whether
   * it was readable at all.
   *
   * An unreadable file is never overwritten. It is the only evidence of
   * whatever went wrong, and a high score is not worth destroying it.
   */
  const savedRef = useRef<{ unknown: UnknownFields; unreadable: boolean }>({
    unknown: {},
    unreadable: false,
  });

  /*
   * Whether the player has chosen a language, as opposed to being given one by
   * their phone. Only a choice is persisted: saving the detected locale would
   * freeze the game into whatever the device said the first time it ran, and a
   * player who later changes their phone's language would not see the game
   * follow.
   */
  const localeChosenRef = useRef(false);

  const persist = useCallback(
    (nextRecords: Records) => {
      if (savedRef.current.unreadable) return;
      const { flow } = entitiesRef.current!.scene;
      void writeSave(
        {
          schemaVersion: SCHEMA_VERSION,
          records: nextRecords,
          bestStageCleared: flow.bestStageCleared,
          clickEnabled: flow.clickEnabled,
          locale: localeChosenRef.current ? flow.locale : null,
        },
        savedRef.current.unknown,
      );
    },
    [],
  );

  // The domain decides when a round ends; React only follows.
  useEffect(() => {
    const scene = entities.scene;
    scene.onStateChange = (state) => setUiState(state);
    scene.onFlowChange = refreshFlow;
    return () => {
      scene.onStateChange = null;
      scene.onFlowChange = null;
    };
  }, [entities, refreshFlow]);

  // Release players on unmount, so a quit or reload cannot leave music running.
  useEffect(() => () => audio.dispose(), [audio]);

  /**
   * Load the save, once, and apply it when it arrives (M22).
   *
   * Deliberately **not** awaited before the first render. Blocking the opening
   * frame on a disk read is the most literal possible way to break the rule
   * that session progress must never gate a cold start (M15, restated in the
   * V2 plan) — so the game starts on defaults and this lands a few frames into
   * the story screen.
   *
   * The one visible cost is a player who chose a language seeing the first
   * frames in their device's language instead. That is the right side of the
   * trade against a game that will not open because a file is slow.
   */
  useEffect(() => {
    let cancelled = false;
    void loadSave().then((loaded) => {
      if (cancelled) return;
      savedRef.current = { unknown: loaded.unknown, unreadable: loaded.unreadable };

      const { flow } = entities.scene;
      // Highest of the two, so a save cannot take away progress made in the
      // seconds before it arrived.
      flow.bestStageCleared = Math.max(flow.bestStageCleared, loaded.state.bestStageCleared);
      flow.clickEnabled = loaded.state.clickEnabled;
      if (loaded.state.locale !== null) {
        setLocale(flow, loaded.state.locale);
        localeChosenRef.current = true;
      }
      applyRecords(loaded.state.records);
      refreshFlow();
    });
    return () => {
      cancelled = true;
    };
  }, [applyRecords, entities, refreshFlow]);

  /**
   * Rebuilds the round for the stage the flow currently points at.
   *
   * Every field is cleared in place where the entity map holds the object
   * identity (ADR 0001) and replaced where it does not. The stage is stored
   * next to the round so `roundSystem` can read `stage.groove` without
   * knowing an app flow exists.
   */
  const resetScene = useCallback(() => {
    const scene = entities.scene;
    const stage = stageAt(scene.flow.stageIndex);
    scene.stage = stage;
    scene.round = createRound(stage.level);
    clearRhythm(scene.rhythm);
    clearEffects(scene.effects);
    clearShards(scene.shards);
    clearStageMotion(scene.stageMotion);
  }, [entities]);

  /* ---- story ---- */

  const handleStoryAdvance = useCallback(() => {
    const scene = entities.scene;
    const events = advanceStory(scene.story);
    if (events.some((event) => event.type === 'STORY_FINISHED')) finishIntro(scene.flow);
    refreshFlow();
  }, [entities, refreshFlow]);

  const handleStorySkip = useCallback(() => {
    const scene = entities.scene;
    skipStory(scene.story);
    finishIntro(scene.flow);
    refreshFlow();
  }, [entities, refreshFlow]);

  const handleReplayStory = useCallback(() => {
    const scene = entities.scene;
    clearStory(scene.story);
    replayIntro(scene.flow);
    refreshFlow();
  }, [entities, refreshFlow]);

  /* ---- title and briefing ---- */

  const handleSelectStage = useCallback(
    (index: number) => {
      startStage(entities.scene.flow, index);
      // The scene is rebuilt now rather than on Start, so the briefing sits in
      // front of the stage the player just chose instead of the previous one.
      resetScene();
      setUiState(entities.scene.round.state);
      refreshFlow();
    },
    [entities, refreshFlow, resetScene],
  );

  const handleShowBriefing = useCallback(() => {
    showBriefing(entities.scene.flow);
    refreshFlow();
  }, [entities, refreshFlow]);

  /**
   * The click switch (M16).
   *
   * It flips a flag on the flow and nothing else — no audio call, no round
   * touched. `roundSystem` reads the flag at the moment it would play the
   * sound, so this cannot get out of step with a round in progress and cannot
   * affect one that is.
   */
  const handleToggleClick = useCallback(() => {
    toggleClick(entities.scene.flow);
    persist(recordsRef.current);
    refreshFlow();
  }, [entities, persist, refreshFlow]);

  /**
   * The language control (M19).
   *
   * Exactly the shape of the click switch above: it flips a field on the flow
   * and nothing else. No round is touched, no audio call is made, and nothing
   * is reset — a player switching language mid-pause resumes the same round,
   * reading it in the other language.
   */
  const handleCycleLocale = useCallback(() => {
    cycleLocale(entities.scene.flow);
    localeChosenRef.current = true;
    persist(recordsRef.current);
    refreshFlow();
  }, [entities, persist, refreshFlow]);

  const handleBackToTitle = useCallback(() => {
    returnToTitle(entities.scene.flow);
    refreshFlow();
  }, [entities, refreshFlow]);

  /**
   * The briefing's Start opens the `3 -> 2 -> 1 -> GO` pre-roll rather than the
   * round itself (M13.1). The music starts here rather than on `GO` because it
   * was never the rhythm clock and is not being made into one — it simply
   * plays under the count, exactly as it played under M10's count-in.
   *
   * The bed is the stage's own since M16: `grooveBed` under the stage that
   * teaches the beat, the rock loop elsewhere.
   */
  const handleBeginRound = useCallback(() => {
    const scene = entities.scene;
    setBeatRecord(false);
    beginRound(scene.flow);
    startRound(scene.round);
    audio.playMusic(scene.stage.music);
    setUiState(scene.round.state);
    refreshFlow();
  }, [audio, entities, refreshFlow]);

  /* ---- in-round ---- */

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

  const handleRestart = useCallback(() => {
    const scene = entities.scene;
    resetScene();
    startRound(scene.round);
    audio.restartMusic();
    setUiState(scene.round.state);
  }, [audio, entities, resetScene]);

  /**
   * "Next stage" on the results screen: straight into the next briefing.
   *
   * The music is stopped rather than carried over. `SHOW_COMPLETED` already
   * stopped it and played the applause, and starting the next stage's track
   * before the player has read its briefing would put a round's music under a
   * menu.
   */
  const handleNextStage = useCallback(() => {
    const scene = entities.scene;
    if (!advanceToNextStage(scene.flow)) return;
    audio.stopMusic();
    resetScene();
    setUiState(scene.round.state);
    refreshFlow();
  }, [audio, entities, refreshFlow, resetScene]);

  const handleQuit = useCallback(() => {
    const scene = entities.scene;
    audio.stopMusic();
    returnToTitle(scene.flow);
    resetScene();
    setUiState(scene.round.state);
    refreshFlow();
  }, [audio, entities, refreshFlow, resetScene]);

  /**
   * Clearing a stage is recorded once, when the round reports it.
   *
   * Driven off `uiState` rather than from inside a handler, because the round
   * decides it has been completed on a tick and the player presses nothing to
   * make that happen. `recordStageCleared` only ever raises the high-water
   * mark, so running it again on a re-render costs nothing.
   */
  useEffect(() => {
    if (uiState !== 'SHOW_COMPLETE' && uiState !== 'SHOW_RUINED') return;
    const scene = entities.scene;

    // Only a completed show is progress; a ruined one is a retry.
    if (uiState === 'SHOW_COMPLETE') recordStageCleared(scene.flow);

    /*
     * A ruined show still scored, so it still counts for a record. Losing on
     * the last object with the best Defense run of the player's life should
     * not throw that number away.
     */
    const update = recordRound(recordsRef.current, scene.stage.id, {
      defenseScore: scene.round.score,
      grooveScore: scene.stage.groove ? scene.rhythm.score : null,
    });
    setBeatRecord(update.beatDefense || update.beatGroove);
    if (update.records !== recordsRef.current) applyRecords(update.records);
    persist(update.records);
    refreshFlow();
  }, [applyRecords, entities, persist, refreshFlow, uiState]);

  /**
   * The share sheet (M22).
   *
   * React Native's own `Share`, not `expo-sharing`: the built-in one already
   * opens the OS sheet with a line of text, and a new native module for that
   * would fail AGENTS.md rule 18.
   *
   * The strings come from `stringsFor(flow.locale)` rather than a hook, because
   * this component renders the `LocaleProvider` and is therefore above it. The
   * product name is interpolated from the constant, never translated.
   */
  const handleShare = useCallback(() => {
    const scene = entities.scene;
    const strings = stringsFor(scene.flow.locale);
    const parameters = {
      title: PRODUCT_TITLE,
      stage: strings.stages[scene.stage.id].name,
      defense: scene.round.score,
      groove: scene.rhythm.score,
    };
    const message = scene.stage.groove
      ? format(strings.share.withGroove, parameters)
      : format(strings.share.defenseOnly, parameters);

    // A cancelled share sheet rejects on some platforms. Nothing to report.
    void Share.share({ message }).catch(() => undefined);
  }, [entities]);

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
           * has happened yet, so going back to the briefing costs nothing —
           * and the music has to stop with it, because Start plays it again
           * from the top (M13.1, background during countdown).
           */
          cancelCountdown(round);
          audio.stopMusic();
          showBriefing(entities.scene.flow);
          setUiState(round.state);
          refreshFlow();
        }
      }
    });
    return () => subscription.remove();
  }, [audio, entities, refreshFlow]);

  const scene = entities.scene;

  return (
    <LocaleProvider locale={scene.flow.locale}>
      <View style={styles.root}>
        <EngineComponent
          systems={[flowSystem, roundSystem]}
          entities={entities}
          running
          style={styles.engine}
        >
          <Overlays
            flow={scene.flow}
            stage={scene.stage}
            state={uiState}
            round={scene.round}
            rhythm={scene.rhythm}
            story={scene.story}
            audioAvailable={audio.available}
            onStoryAdvance={handleStoryAdvance}
            onStorySkip={handleStorySkip}
            onSelectStage={handleSelectStage}
            onReplayStory={handleReplayStory}
            onShowBriefing={handleShowBriefing}
            onBeginRound={handleBeginRound}
            onBackToTitle={handleBackToTitle}
            onPause={handlePause}
            onResume={handleResume}
            onRestart={handleRestart}
            onNextStage={handleNextStage}
            onQuit={handleQuit}
            onToggleClick={handleToggleClick}
            onCycleLocale={handleCycleLocale}
            records={records}
            beatRecord={beatRecord}
            onShare={handleShare}
          />
        </EngineComponent>
      </View>
    </LocaleProvider>
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

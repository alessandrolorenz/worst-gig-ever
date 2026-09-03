/**
 * M15 — the story runs on the engine loop, and only where it should.
 *
 * `storyIntro.test.ts` holds the story domain; this file holds the wiring: the
 * story must advance from the engine's elapsed-time delta while the story
 * screen is up, and must not advance anywhere else. Both halves matter — a
 * story that keeps ticking behind the title would finish invisibly and a
 * replay would open on the last panel.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import type { AudioService } from '../game/audio/audioService.ts';
import { createSceneEntities, type GameEntities } from '../game/entities/sceneEntities.ts';
import { flowSystem } from '../game/systems/flowSystem.ts';
import { roundSystem } from '../game/systems/roundSystem.ts';
import { STORY_PANELS } from '../game/state/storyState.ts';
import { STAGES, stageAt } from '../game/levels/stages.ts';
import { isRoundOver, startRound, targetViews } from '../game/state/roundState.ts';
import { createRhythm } from '../game/state/rhythmState.ts';
import { canvasToScreen, fitCanvas } from '../game/rendering/layout.ts';
import { skipStory } from '../game/state/storyState.ts';
import {
  advanceToNextStage,
  beginRound,
  finishIntro,
  recordStageCleared,
  startStage,
} from '../game/state/appFlow.ts';
import type { GameState } from '../game/state/gameState.ts';

function silentAudio(): AudioService {
  return {
    available: false,
    failureReason: null,
    playMusic: () => {},
    pauseMusic: () => {},
    resumeMusic: () => {},
    stopMusic: () => {},
    restartMusic: () => {},
    playSfx: () => {},
    dispose: () => {},
  };
}

function setup(): GameEntities {
  return createSceneEntities(silentAudio(), null as never);
}

function step(entities: GameEntities, deltaMs = 16): void {
  flowSystem(entities, { time: { delta: deltaMs } });
  roundSystem(entities, { time: { delta: deltaMs }, touches: [], input: [] });
}

test('a fresh game opens on the story, before the title', () => {
  const entities = setup();
  assert.equal(entities.scene.flow.screen, 'STORY');
  assert.equal(entities.scene.story.index, 0);
});

test('the story advances on engine time and ends on the title', () => {
  const entities = setup();
  const scene = entities.scene;
  let notifications = 0;
  scene.onFlowChange = () => {
    notifications += 1;
  };

  for (let guard = 0; guard < 20_000 && scene.flow.screen === 'STORY'; guard += 1) {
    step(entities, 16);
  }

  assert.equal(scene.flow.screen, 'TITLE', 'the story never reached the title');
  assert.equal(scene.story.finished, true);
  assert.equal(scene.flow.introSeen, true);
  assert.ok(
    notifications >= STORY_PANELS.length,
    `React was told about ${notifications} changes for ${STORY_PANELS.length} panels`,
  );
});

test('the story does not run while any other screen is up', () => {
  const entities = setup();
  const scene = entities.scene;

  // Two panels in, then leave the story exactly as the title would.
  for (let i = 0; i < 5000 && scene.story.index < 2; i += 1) step(entities, 16);
  assert.equal(scene.story.index, 2, 'the story never reached the third panel');

  scene.flow.screen = 'TITLE';
  const frozen = { ...scene.story };
  for (let i = 0; i < 2000; i += 1) step(entities, 16);

  assert.deepEqual({ ...scene.story }, frozen, 'the story kept playing behind the title');
  assert.equal(scene.flow.screen, 'TITLE');
});

test('the round does not start itself while the story is playing', () => {
  const entities = setup();
  for (let i = 0; i < 2000; i += 1) step(entities, 16);

  // Whatever screen the story left us on, no round has begun on its own.
  assert.equal(entities.scene.round.elapsedMs, 0);
  assert.equal(entities.scene.round.targets.length, 0);
  assert.equal(entities.scene.round.score, 0);
});

test('the engine opens pointed at stage one, and its round matches', () => {
  const entities = setup();
  assert.equal(entities.scene.stage, STAGES[0]);
  assert.equal(entities.scene.round.level, STAGES[0].level);
  assert.equal(entities.scene.stage.groove, false);
});

test('a defense-only stage plays out without touching the Groove', () => {
  const entities = setup();
  const scene = entities.scene;
  scene.flow.screen = 'ROUND';
  scene.round.state = 'PLAYING';

  /*
   * Nobody defends, so the drill ends in SHOW_RUINED well before its duration
   * — which is the point: this is a real, losable round (M15) and not a demo.
   * Either terminal state proves the round ran; what is being asserted is what
   * the Groove did while it ran, which is nothing.
   */
  for (let guard = 0; guard < 20_000; guard += 1) {
    step(entities, 50);
    if (isRoundOver(scene.round)) break;
  }

  assert.equal(scene.round.state as GameState, 'SHOW_RUINED', 'an undefended drill should be lost');
  assert.ok(scene.round.misses >= scene.round.level.startingIntegrity);
  assert.ok(scene.round.elapsedMs > 0, 'the round clock never moved');

  // Beats went by the whole time and the Groove recorded none of them.
  assert.ok(
    scene.round.elapsedMs > 2000,
    'the round must outlast at least a few beats for this to mean anything',
  );
  assert.equal(scene.rhythm.hits, 0);
  assert.equal(scene.rhythm.misses, 0);
  assert.equal(scene.rhythm.score, 0);
  assert.equal(scene.rhythm.streak, 0);
  assert.equal(scene.rhythm.nextBeatToFinalize, 0, 'the beat clock ran on a defense-only stage');
});

// ---------------------------------------------------------------------------
// The progression the owner asked for, end to end
// ---------------------------------------------------------------------------

const SCREEN = { width: 2340, height: 1080 };

/** A native touch at a canvas point, as react-native-game-engine delivers it. */
function touch(entities: GameEntities, x: number, y: number) {
  const fit = fitCanvas(entities.scene.viewport.width, entities.scene.viewport.height);
  const point = canvasToScreen(fit, x, y);
  return {
    type: 'start',
    event: {
      pageX: point.x + entities.scene.viewport.pageX,
      pageY: point.y + entities.scene.viewport.pageY,
    },
  };
}

function stepWithTouches(entities: GameEntities, deltaMs: number, touches: unknown[]): void {
  flowSystem(entities, { time: { delta: deltaMs } });
  roundSystem(entities, {
    touches: touches as never,
    input: [],
    time: { delta: deltaMs },
  });
}

/**
 * Plays a round to its end, breaking whatever is in flight.
 *
 * Deliberately drives the *real* input pipeline rather than calling
 * `resolveTap` — the point is that a stage can actually be cleared by a player
 * tapping the screen, not merely by the domain agreeing that it could be.
 */
function playRoundOut(entities: GameEntities): void {
  const scene = entities.scene;
  for (let guard = 0; guard < 20_000 && !isRoundOver(scene.round); guard += 1) {
    const target = targetViews(scene.round).find((view) => view.status === 'active');
    stepWithTouches(entities, 16, target ? [touch(entities, target.x, target.y)] : []);
  }
}

test('Stage 1 can be cleared, and clearing it leads into Stage 2', () => {
  const entities = setup();
  const scene = entities.scene;
  scene.viewport.width = SCREEN.width;
  scene.viewport.height = SCREEN.height;

  // Skip the story and take the stage the title offers first.
  skipStory(scene.story);
  finishIntro(scene.flow);
  startStage(scene.flow, 0);
  assert.equal(scene.stage.groove, false, 'the first stage on offer must be the drill');

  beginRound(scene.flow);
  startRound(scene.round);
  playRoundOut(entities);

  assert.equal(scene.round.state as GameState, 'SHOW_COMPLETE', 'the drill could not be cleared');
  assert.equal(scene.round.integrity, scene.round.level.startingIntegrity);
  assert.ok(scene.round.targetsDestroyed > 0);
  // The Groove sat out the whole stage, as Stage 1 promises.
  assert.deepEqual(scene.rhythm, createRhythm());

  // What the results screen then does.
  assert.deepEqual(recordStageCleared(scene.flow), { hasNext: true });
  assert.equal(advanceToNextStage(scene.flow), true);
  assert.equal(scene.flow.screen, 'BRIEFING');

  // And what GameEngine's resetScene does for the stage now selected.
  const nextStage = stageAt(scene.flow.stageIndex);
  assert.equal(nextStage.groove, true, 'Stage 2 must be the one that adds the Groove');
  assert.equal(nextStage.level, STAGES[1].level);
});

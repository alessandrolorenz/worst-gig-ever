/**
 * Integration test for the engine-facing glue layer.
 *
 * Drives `roundSystem` exactly as react-native-game-engine would — synthetic
 * touches and a time delta — with a recording stand-in for audio. This runs in
 * plain Node because nothing below the host component imports React, which is
 * the architectural claim M4 is supposed to deliver (AGENTS.md rule 4). Matter
 * is exercised for real here; only the audio device is faked.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import type { AudioService } from '../game/audio/audioService.ts';
import { createSceneEntities, type GameEntities } from '../game/entities/sceneEntities.ts';
import { canvasToScreen, fitCanvas } from '../game/rendering/layout.ts';
import { roundSystem } from '../game/systems/roundSystem.ts';
import { startRound, targetViews } from '../game/state/roundState.ts';
import { VOCALIST_BLOCKING_RECT } from '../game/config/stage.ts';
import { level01 } from '../game/levels/level01.ts';

interface RecordingAudio extends AudioService {
  readonly calls: string[];
}

function createRecordingAudio(): RecordingAudio {
  const calls: string[] = [];
  return {
    calls,
    available: true,
    failureReason: null,
    playMusic: () => void calls.push('playMusic'),
    pauseMusic: () => void calls.push('pauseMusic'),
    resumeMusic: () => void calls.push('resumeMusic'),
    stopMusic: () => void calls.push('stopMusic'),
    restartMusic: () => void calls.push('restartMusic'),
    playSfx: (key) => void calls.push(`sfx:${key}`),
    dispose: () => void calls.push('dispose'),
  };
}

const SCREEN = { width: 2340, height: 1080 };

function setup() {
  const audio = createRecordingAudio();
  const entities = createSceneEntities(audio, null as never);
  entities.scene.viewport.width = SCREEN.width;
  entities.scene.viewport.height = SCREEN.height;
  startRound(entities.scene.round);
  return { audio, entities };
}

/** A native touch-down at a canvas position, as the engine would deliver it. */
function touchAtCanvas(entities: GameEntities, x: number, y: number) {
  const fit = fitCanvas(entities.scene.viewport.width, entities.scene.viewport.height);
  const screen = canvasToScreen(fit, x, y);
  return [{ type: 'start', event: { locationX: screen.x, locationY: screen.y } }];
}

function step(entities: GameEntities, deltaMs = 16, touches: unknown[] = []) {
  roundSystem(entities, {
    touches: touches as never,
    time: { delta: deltaMs },
  });
}

test('a touch in device coordinates resolves a hit in canvas space', () => {
  const { audio, entities } = setup();

  let guard = 0;
  while (targetViews(entities.scene.round).length === 0 && guard < 1000) {
    step(entities);
    guard += 1;
  }
  const view = targetViews(entities.scene.round).find((v) => v.status === 'active');
  assert.ok(view, 'no target to aim at');

  step(entities, 16, touchAtCanvas(entities, view.x, view.y));

  assert.equal(entities.scene.round.targetsDestroyed, 1);
  assert.ok(audio.calls.includes('sfx:glassBreak'));
  assert.ok(audio.calls.includes('sfx:stickWhoosh'));
});

test('a hit produces strike, burst, and physical debris', () => {
  const { entities } = setup();
  let guard = 0;
  while (targetViews(entities.scene.round).length === 0 && guard < 1000) {
    step(entities);
    guard += 1;
  }
  const view = targetViews(entities.scene.round).find((v) => v.status === 'active');
  assert.ok(view);

  step(entities, 16, touchAtCanvas(entities, view.x, view.y));

  assert.equal(entities.scene.effects.strikes.length, 1);
  assert.equal(entities.scene.effects.bursts.length, 1);
  assert.ok(entities.scene.shards.shards.length > 0, 'no debris spawned');

  // Debris is driven by Matter and must actually move, then be cleaned up.
  const start = entities.scene.shards.shards[0].body.position.y;
  for (let i = 0; i < 12; i += 1) step(entities);
  const moved = entities.scene.shards.shards[0]?.body.position.y ?? start + 1;
  assert.notEqual(moved, start, 'shards did not simulate');

  for (let i = 0; i < 120; i += 1) step(entities);
  assert.equal(entities.scene.shards.shards.length, 0, 'debris was never released');
  assert.equal(entities.scene.effects.strikes.length, 0);
  assert.equal(entities.scene.effects.bursts.length, 0);
});

test('a tap on empty canvas produces no feedback at all', () => {
  const { audio, entities } = setup();
  step(entities, 16, touchAtCanvas(entities, 30, 1040));
  assert.equal(entities.scene.effects.strikes.length, 0);
  assert.equal(entities.scene.shards.shards.length, 0);
  assert.deepEqual(audio.calls, []);
});

test('a missed target reports an impact on the kit', () => {
  const { audio, entities } = setup();
  for (let i = 0; i < 400 && entities.scene.round.misses === 0; i += 1) step(entities);
  assert.equal(entities.scene.round.misses, 1);
  assert.ok(audio.calls.includes('sfx:impactThwack'));
});

test('a full played round reaches SHOW_COMPLETE and cues the crowd once', () => {
  const { audio, entities } = setup();

  let guard = 0;
  while (entities.scene.round.state !== 'SHOW_COMPLETE' && guard < 8000) {
    const round = entities.scene.round;
    assert.notEqual(round.state, 'SHOW_RUINED', 'perfect play still ruined the show');

    const target = targetViews(round).find((v) => v.status === 'active');
    const vocalist = round.vocalist.status === 'blocking';
    const touches = vocalist
      ? touchAtCanvas(
          entities,
          VOCALIST_BLOCKING_RECT.x + VOCALIST_BLOCKING_RECT.width / 2,
          VOCALIST_BLOCKING_RECT.y + VOCALIST_BLOCKING_RECT.height / 2,
        )
      : target
        ? touchAtCanvas(entities, target.x, target.y)
        : [];

    step(entities, 16, touches);
    guard += 1;
  }

  const round = entities.scene.round;
  assert.equal(round.state, 'SHOW_COMPLETE');
  assert.equal(round.elapsedMs, level01.durationMs);
  assert.ok(round.score > 0);
  assert.ok(round.vocalist.triggered, 'the vocalist never appeared');
  assert.equal(audio.calls.filter((c) => c === 'sfx:crowdApplause').length, 1);
  assert.equal(audio.calls.filter((c) => c === 'stopMusic').length, 1);
});

test('the system keeps running for a full round without a single throw', () => {
  const { entities } = setup();
  assert.doesNotThrow(() => {
    for (let i = 0; i < 4000; i += 1) {
      // Mash the screen at a fixed spot regardless of what is happening.
      step(entities, 16, i % 3 === 0 ? touchAtCanvas(entities, 960, 700) : []);
    }
  });
});

/**
 * M33 — Follow the beat: the beat is optional from Stage 3.
 *
 * Source of truth: docs/specs/M33-crowd-checklist-and-optional-beat.md
 *
 * Driven through `roundSystem` exactly as the engine would, so "off" is
 * proven against the round the player actually plays — taps routed to both
 * resolvers, the beat clock ticking, the click deciding whether to sound —
 * rather than against a flag that merely hides the pad.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { AudioService } from '../game/audio/audioService.ts';
import {
  createSceneEntities,
  toggleFollowBeatInScene,
  type GameEntities,
} from '../game/entities/sceneEntities.ts';
import {
  STAGES,
  isGrooveActive,
  offersFollowBeat,
  type StageDefinition,
} from '../game/levels/stages.ts';
import { canvasToScreen, fitCanvas } from '../game/rendering/layout.ts';
import { roundSystem } from '../game/systems/roundSystem.ts';
import { createRound, pauseRound, resumeRound, startRound } from '../game/state/roundState.ts';
import {
  createRhythm,
  joinGrooveAt,
  judgedBeats,
  resolvePadTap,
  tickRhythm,
  type BeatContext,
} from '../game/state/rhythmState.ts';
import {
  GROOVE_PAD,
  RHYTHM,
  beatTimeMs,
  isUnscoredLeadBeat,
  scheduledBeatCount,
} from '../game/config/rhythm.ts';
import { createAppFlow, toggleFollowBeat } from '../game/state/appFlow.ts';
import { emptySave, parseSave, serializeSave } from '../game/state/persistence.ts';
import { allCatalogues, briefingLines } from '../game/i18n/catalogue.ts';
import type { StageStrings } from '../game/i18n/catalogues/en.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

interface RecordingAudio extends AudioService {
  readonly calls: string[];
}

function createRecordingAudio(): RecordingAudio {
  const calls: string[] = [];
  return {
    calls,
    available: true,
    failureReason: null,
    preloadSetlist: () => void calls.push('preloadSetlist'),
    playMusic: () => void calls.push('playMusic'),
    pauseMusic: () => void calls.push('pauseMusic'),
    resumeMusic: () => void calls.push('resumeMusic'),
    stopMusic: () => void calls.push('stopMusic'),
    restartMusic: () => void calls.push('restartMusic'),
    playSfx: (key) => void calls.push(`sfx:${key}`),
    dispose: () => void calls.push('dispose'),
  };
}

const clicks = (audio: RecordingAudio) => audio.calls.filter((c) => c === 'sfx:beatClick').length;

const STAGE_ONE = STAGES[0];
const STAGE_TWO = STAGES[1];
const STAGE_THREE = STAGES[2];
const STAGE_FOUR = STAGES[3];

/**
 * A scene on a given stage, as `GameEngine`'s stage selection builds it.
 *
 * Nothing here defends the kit, so on the real integrity a round is ruined in
 * seconds and every comparison would stop there. The round gets integrity it
 * cannot run out of instead: the schedule, the seed and the duration — which
 * is what decides every beat — are the stage's own, and Defense still counts
 * every miss, so the comparisons below cover the whole stretch asked for.
 */
function sceneOn(stage: StageDefinition, followBeat: boolean) {
  const audio = createRecordingAudio();
  const entities = createSceneEntities(audio, null as never);
  entities.scene.stage = stage;
  entities.scene.round = createRound({ ...stage.level, startingIntegrity: 1_000 });
  entities.scene.flow.followBeat = followBeat;
  entities.scene.viewport.width = 2340;
  entities.scene.viewport.height = 1080;
  return { audio, entities };
}

function step(entities: GameEntities, deltaMs = 16, touches: unknown[] = []) {
  roundSystem(entities, { touches: touches as never, time: { delta: deltaMs } });
}

function padTouch(entities: GameEntities) {
  const fit = fitCanvas(entities.scene.viewport.width, entities.scene.viewport.height);
  const point = canvasToScreen(fit, GROOVE_PAD.centerX, GROOVE_PAD.centerY);
  return { type: 'start', event: { pageX: point.x, pageY: point.y } };
}

function startAndCount(entities: GameEntities): void {
  startRound(entities.scene.round);
  for (let guard = 0; guard < 1000 && entities.scene.round.state === 'COUNTDOWN'; guard += 1) {
    step(entities);
  }
  assert.equal(entities.scene.round.state, 'PLAYING', 'the countdown never reached GO');
}

/**
 * Plays until `untilMs`, tapping the pad exactly on every beat when asked.
 * Nothing else is ever tapped, so any Defense difference between two runs is
 * the Groove leaking into it.
 */
function playUntil(entities: GameEntities, untilMs: number, tapPad: boolean): void {
  let nextBeat = Math.max(1, Math.ceil(entities.scene.round.elapsedMs / beatTimeMs(1)));
  for (let guard = 0; guard < 100_000; guard += 1) {
    const round = entities.scene.round;
    if (round.elapsedMs >= untilMs || (round.state !== 'PLAYING' && round.state !== 'VOCALIST_EVENT')) {
      return;
    }
    const due = beatTimeMs(nextBeat);
    if (tapPad && round.elapsedMs >= due) {
      step(entities, 16, [padTouch(entities)]);
      nextBeat += 1;
      continue;
    }
    step(entities, tapPad ? Math.min(16, Math.max(1, due - round.elapsedMs)) : 16);
  }
  throw new Error('the round never reached the time asked for');
}

function defenseOf(entities: GameEntities) {
  const round = entities.scene.round;
  return {
    state: round.state,
    score: round.score,
    integrity: round.integrity,
    destroyed: round.targetsDestroyed,
    misses: round.misses,
    bestCombo: round.bestCombo,
    beers: round.beersDrunk,
  };
}

// ---------------------------------------------------------------------------
// The stage table: who offers the choice
// ---------------------------------------------------------------------------

test('M33: Stages 1 and 2 offer no choice; Stage 3 onward does', () => {
  assert.equal(offersFollowBeat(STAGE_ONE), false, 'Stage 1 is defense only and has nothing to follow');
  assert.equal(offersFollowBeat(STAGE_TWO), false, 'Stage 2 teaches the beat and must keep it');
  for (const stage of STAGES.slice(2)) {
    assert.equal(stage.groove, true, `stage ${stage.number} lost its Groove`);
    assert.equal(offersFollowBeat(stage), true, `stage ${stage.number} does not offer the choice`);
  }
});

test('M33: the switch decides the Groove only where the stage offers it', () => {
  for (const followBeat of [false, true]) {
    assert.equal(isGrooveActive(STAGE_ONE, followBeat), false, 'Stage 1 grew a beat');
    assert.equal(isGrooveActive(STAGE_TWO, followBeat), true, 'Stage 2 lost its beat');
    assert.equal(isGrooveActive(STAGE_THREE, followBeat), followBeat);
    assert.equal(isGrooveActive(STAGE_FOUR, followBeat), followBeat);
  }
});

test('M33: Follow the beat is off by default, toggles, and is saved', () => {
  const flow = createAppFlow();
  assert.equal(flow.followBeat, false, 'the accessible mode must be the default');
  toggleFollowBeat(flow);
  assert.equal(flow.followBeat, true);
  toggleFollowBeat(flow);
  assert.equal(flow.followBeat, false);

  assert.equal(emptySave().followBeat, false);
  assert.equal(parseSave(null).state.followBeat, false, 'a fresh install starts with it off');
  assert.equal(parseSave('{"followBeat":true}').state.followBeat, true);
  // Strict, like `adsRemoved`: a corrupt value is the default, not a guess.
  assert.equal(parseSave('{"followBeat":"true"}').state.followBeat, false);
  assert.equal(parseSave('{"followBeat":1}').state.followBeat, false);
  const written = serializeSave({ ...emptySave(), followBeat: true });
  assert.equal(parseSave(written).state.followBeat, true, 'the choice did not survive a round trip');
  assert.equal(parseSave(written).state.schemaVersion, 1, 'an additive field must not bump the schema');
});

// ---------------------------------------------------------------------------
// Standard Mode: off means off, not hidden
// ---------------------------------------------------------------------------

test('M33: Stage 3 with Follow the beat off judges no beat, misses none, clicks none', () => {
  // Tapping the pad on every beat, so "nothing scored" cannot be a missed tap.
  const off = sceneOn(STAGE_THREE, false);
  startAndCount(off.entities);
  playUntil(off.entities, 20_000, true);

  assert.ok(off.entities.scene.round.elapsedMs >= 20_000, 'the round ended early');
  assert.deepEqual(
    off.entities.scene.rhythm,
    createRhythm(),
    'the beat clock ran on a round with Follow the beat off',
  );
  assert.equal(clicks(off.audio), 0, 'the click sounded with no beat to follow');
});

test('M33: off removes the penalty — ignoring the beat costs nothing; on restores it', () => {
  const ignoredOff = sceneOn(STAGE_THREE, false);
  startAndCount(ignoredOff.entities);
  playUntil(ignoredOff.entities, 20_000, false);
  assert.equal(ignoredOff.entities.scene.rhythm.misses, 0, 'an ignored beat was still counted');

  const ignoredOn = sceneOn(STAGE_THREE, true);
  startAndCount(ignoredOn.entities);
  playUntil(ignoredOn.entities, 20_000, false);
  assert.ok(
    ignoredOn.entities.scene.rhythm.misses > 20,
    'with Follow the beat on, ignoring the beat must still cost what it always did',
  );
  assert.ok(clicks(ignoredOn.audio) > 0, 'the Rhythm Challenge lost its click');
});

test('M33: the Defense round is the same round with the beat on or off', () => {
  for (const stage of [STAGE_THREE, STAGE_FOUR]) {
    for (const tapPad of [false, true]) {
      const on = sceneOn(stage, true);
      const off = sceneOn(stage, false);
      startAndCount(on.entities);
      startAndCount(off.entities);
      playUntil(on.entities, 30_000, tapPad);
      playUntil(off.entities, 30_000, tapPad);

      assert.deepEqual(
        defenseOf(off.entities),
        defenseOf(on.entities),
        `stage ${stage.number}${tapPad ? ', tapping the pad' : ''}: switching the beat off changed the Defense`,
      );
      if (tapPad) {
        assert.ok(on.entities.scene.rhythm.hits > 0, 'the on run never scored, so it proves nothing');
      }
    }
  }
});

test('M33: Stages 1 and 2 play identically whatever the switch says', () => {
  for (const stage of [STAGE_ONE, STAGE_TWO]) {
    const on = sceneOn(stage, true);
    const off = sceneOn(stage, false);
    startAndCount(on.entities);
    startAndCount(off.entities);
    playUntil(on.entities, 15_000, false);
    playUntil(off.entities, 15_000, false);

    assert.deepEqual(off.entities.scene.rhythm, on.entities.scene.rhythm, `stage ${stage.number}`);
    assert.deepEqual(defenseOf(off.entities), defenseOf(on.entities), `stage ${stage.number}`);
    assert.equal(clicks(off.audio), clicks(on.audio), `stage ${stage.number} click`);
  }
  // And the rule each one teaches is still the rule.
  const two = sceneOn(STAGE_TWO, false);
  startAndCount(two.entities);
  playUntil(two.entities, 10_000, false);
  assert.ok(two.entities.scene.rhythm.misses > 0, 'Stage 2 stopped asking for the beat');
});

// ---------------------------------------------------------------------------
// Switching mid-round, from the pause screen
// ---------------------------------------------------------------------------

/** Scored beats whose windows close in (fromMs, toMs]: what may count as missed. */
function beatsClosingBetween(fromMs: number, toMs: number, durationMs: number): number {
  let count = 0;
  for (let index = 0; index < scheduledBeatCount(durationMs); index += 1) {
    if (isUnscoredLeadBeat(index)) continue;
    const closes = beatTimeMs(index) + RHYTHM.goodWindowMs;
    if (closes > fromMs && closes <= toMs) count += 1;
  }
  return count;
}

test('M33: switching it on in a pause judges the beats from then on, never the ones before', () => {
  const { entities } = sceneOn(STAGE_THREE, false);
  startAndCount(entities);
  playUntil(entities, 12_000, false);

  pauseRound(entities.scene.round);
  toggleFollowBeatInScene(entities);
  const joinedAt = entities.scene.round.elapsedMs;
  // A pause frame, as the engine would run it, must not file a backlog either.
  step(entities);
  assert.equal(entities.scene.rhythm.misses, 0, 'the beats played with it off were counted');
  resumeRound(entities.scene.round);

  playUntil(entities, 18_000, false);
  const rhythm = entities.scene.rhythm;
  const durationMs = entities.scene.round.level.durationMs;
  assert.equal(
    rhythm.misses,
    beatsClosingBetween(joinedAt, entities.scene.round.elapsedMs, durationMs),
    'only beats after the switch may count as missed',
  );
  assert.ok(rhythm.misses > 0, 'the penalty did not come back with the switch');

  // And it scores: the next beat, tapped on time.
  playUntil(entities, 22_000, true);
  assert.ok(rhythm.hits > 0, 'a beat tapped after switching on did not score');
});

test('M33: switching it off in a pause stops the beat where it stood', () => {
  const { audio, entities } = sceneOn(STAGE_THREE, true);
  startAndCount(entities);
  playUntil(entities, 8_000, true);
  const scoredBefore = entities.scene.rhythm.score;
  assert.ok(scoredBefore > 0);

  pauseRound(entities.scene.round);
  toggleFollowBeatInScene(entities);
  resumeRound(entities.scene.round);
  const before = { ...entities.scene.rhythm };
  const clicksBefore = clicks(audio);

  playUntil(entities, 20_000, false);
  assert.deepEqual({ ...entities.scene.rhythm, lastPulsedBeatIndex: null }, {
    ...before,
    lastPulsedBeatIndex: null,
  }, 'the beat clock kept judging after it was switched off');
  assert.equal(clicks(audio), clicksBefore, 'the click kept sounding after it was switched off');
});

test('M33: joining is free when nothing was skipped, and leaves an open beat hittable', () => {
  const durationMs = STAGE_THREE.level.durationMs;
  const context = (elapsedMs: number): BeatContext => ({
    elapsedMs,
    durationMs,
    state: 'PLAYING',
    grooveEnabled: true,
  });

  // At the start of a round there is nothing to skip.
  const fresh = createRhythm();
  joinGrooveAt(fresh, 0, durationMs);
  assert.deepEqual(fresh, createRhythm());

  // Live and up to date: switching off and on inside one pause costs nothing.
  const live = createRhythm();
  for (let beat = 1; beat <= 4; beat += 1) resolvePadTap(live, context(beatTimeMs(beat)));
  tickRhythm(live, context(beatTimeMs(4) + 10));
  assert.equal(live.streak, 4);
  const snapshot = { ...live };
  joinGrooveAt(live, beatTimeMs(4) + 10, durationMs);
  assert.deepEqual(live, snapshot, 'an off-and-on with nothing missed broke the streak');

  // Skipping beats ends a streak, but counts nothing against the player.
  joinGrooveAt(live, beatTimeMs(10), durationMs);
  assert.equal(live.streak, 0, 'a streak spanned beats nobody played');
  assert.equal(live.misses, 0, 'skipped beats were counted as missed');
  assert.equal(judgedBeats(live), 4);

  // Beat 10's window is still open at its own instant: the player can take it.
  const events = resolvePadTap(live, context(beatTimeMs(10) + 20));
  assert.equal(events.at(-1)?.type, 'BEAT_HIT', 'the open beat was skipped along with the closed ones');
  assert.equal(live.misses, 0);
});

// ---------------------------------------------------------------------------
// The words, and the one place the decision is made
// ---------------------------------------------------------------------------

test('M33: an optional stage briefs the round it is about to play, in every locale', () => {
  for (const [locale, strings] of allCatalogues()) {
    for (const stage of STAGES) {
      const stageStrings: StageStrings = strings.stages[stage.id];
      if (!offersFollowBeat(stage)) {
        assert.equal(
          stageStrings.briefingWithoutBeat,
          undefined,
          `${locale}: stage ${stage.number} has a beat-free briefing it can never show`,
        );
        assert.equal(briefingLines(stageStrings, false), stageStrings.briefing);
        continue;
      }
      const without = stageStrings.briefingWithoutBeat;
      assert.ok(without !== undefined && without.length > 0, `${locale}: stage ${stage.number}`);
      assert.equal(briefingLines(stageStrings, true), stageStrings.briefing);
      assert.equal(briefingLines(stageStrings, false), without);
      if (locale === 'en') {
        // The same teaching rule hudContract applies to every briefing.
        const text = without.join(' ').toLowerCase();
        assert.equal(/pad/.test(text), false, `stage ${stage.number} points at a pad it does not draw`);
        assert.ok(/bottle|mug/.test(text) && /smash|break|tap/.test(text));
        assert.ok(/kit|show|integrity|over/.test(text));
      }
    }
  }
});

test('M33: nothing outside stages.ts decides the Groove from `stage.groove` alone', () => {
  const offenders: string[] = [];
  const walk = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      if (!/\.tsx?$/.test(path)) continue;
      const shown = relative(repoRoot, path);
      if (shown === 'game/levels/stages.ts') continue;
      const code = readFileSync(path, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '');
      if (/\bstage\.groove\b|\.stage\.groove\b/.test(code)) offenders.push(shown);
    }
  };
  walk(join(repoRoot, 'game'));
  assert.deepEqual(offenders, [], 'a reader bypassed isGrooveActive and will ignore the switch');

  for (const file of [
    'game/systems/roundSystem.ts',
    'game/rendering/SceneRenderer.tsx',
    'game/rendering/Overlays.tsx',
    'game/systems/GameEngine.tsx',
  ]) {
    assert.match(readFileSync(join(repoRoot, file), 'utf8'), /isGrooveActive\(/, file);
  }

  const overlays = readFileSync(join(repoRoot, 'game/rendering/Overlays.tsx'), 'utf8');
  const briefing = overlays.slice(overlays.indexOf('function BriefingCard('));
  assert.match(briefing.slice(0, 6000), /<FollowBeatToggle/, 'the briefing lost its switch');
  const paused = overlays.slice(overlays.indexOf("if (state === 'PAUSED')"));
  assert.match(paused.slice(0, 1500), /<FollowBeatToggle/, 'the pause screen lost its switch');
  const toggle = overlays.slice(overlays.indexOf('function FollowBeatToggle('));
  assert.match(
    toggle.slice(0, 600),
    /if \(!offersFollowBeat\(stage\)\) return null;/,
    'the switch must not be drawn on Stages 1 and 2',
  );
});

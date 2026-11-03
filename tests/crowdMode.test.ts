/** M26–M30 — dual-mode entry, deterministic throwing, challenge, destruction round and stages. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isMusicTrackId } from '../game/audio/musicCatalogue.ts';
import { CROWD_ART_SLOTS, crowdWaiterDrawRect } from '../game/crowd/crowdArtSlots.ts';
import { en } from '../game/i18n/catalogues/en.ts';
import { ptBR } from '../game/i18n/catalogues/pt-BR.ts';

import {
  CROWD_PERFORMER_TARGETS,
  CROWD_REACTIONS,
  CROWD_SCORING,
  CROWD_STAGE_TARGETS,
  CROWD_TARGET_IDS,
  CROWD_THROW,
  CROWD_WAITER,
  crowdTarget,
  pointInRect,
  type CrowdPoint,
  type CrowdRect,
  type CrowdTargetId,
} from '../game/crowd/crowdConfig.ts';
import {
  CROWD_STAGES,
  CROWD_STAGE_IDS,
  DEFAULT_CROWD_STAGE_ID,
  crowdStage,
  nextCrowdStageId,
  type CrowdStageId,
} from '../game/crowd/crowdStages.ts';
import {
  beginCrowdGesture,
  createCrowdState,
  crowdAimGuidePoints,
  crowdBlockerPose,
  crowdObjectivesCompleted,
  crowdPerformerPose,
  crowdProjectedImpact,
  crowdProjectilePose,
  crowdPropFallProgress,
  crowdTargetRect,
  releaseCrowdGesture,
  resetCrowd,
  resolveCrowdImpact,
  selectCrowdStage,
  tickCrowd,
  type CrowdState,
} from '../game/crowd/crowdState.ts';
import {
  createAppFlow,
  finishIntro,
  gameMode,
  openBandMode,
  openCrowdMode,
  returnToTitle,
  showCrowdBriefing,
  startCrowdRound,
} from '../game/state/appFlow.ts';

const DEFAULT_WAITER = crowdStage(DEFAULT_CROWD_STAGE_ID).waiter;

function swipeFor(targetX: number, targetY: number): CrowdPoint {
  const start = CROWD_THROW.bottleReady;
  return {
    x: start.x + (targetX - start.x) / CROWD_THROW.projection,
    y: start.y + (targetY - start.y) / CROWD_THROW.projection,
  };
}

function throwAt(targetX: number, targetY: number, state = createCrowdState()): CrowdState {
  if (state.elapsedMs < CROWD_THROW.inputArmDelayMs) {
    tickCrowd(state, CROWD_THROW.inputArmDelayMs - state.elapsedMs);
  }
  beginCrowdGesture(state, CROWD_THROW.bottleReady);
  assert.equal(releaseCrowdGesture(state, swipeFor(targetX, targetY)), true);
  return state;
}

/** How long a throw at this point stays in the air. */
function flightMs(point: CrowdPoint): number {
  const { power } = crowdProjectedImpact(CROWD_THROW.bottleReady, swipeFor(point.x, point.y));
  return CROWD_THROW.maxFlightMs + (CROWD_THROW.minFlightMs - CROWD_THROW.maxFlightMs) * power;
}

/**
 * Plays one whole throw the way a patient player would: wait for the reload,
 * wait for the waiter to be out of the line of fire, throw, and let the
 * result hold run out.
 */
function throwWhenClear(state: CrowdState, point: CrowdPoint): void {
  const waiter = crowdStage(state.stageId).waiter;
  if (state.elapsedMs < CROWD_THROW.inputArmDelayMs) tickCrowd(state, CROWD_THROW.inputArmDelayMs);
  for (let guard = 0; guard < 1000; guard += 1) {
    const atImpact = crowdBlockerPose(state.elapsedMs + flightMs(point), waiter);
    if (!atImpact.visible || !pointInRect(point, atImpact.rect)) break;
    tickCrowd(state, 100);
  }
  throwAt(point.x, point.y, state);
  tickCrowd(state, state.projectile!.durationMs + CROWD_THROW.resultHoldMs + SETTLE_MS);
}

function land(state: CrowdState, targetId: CrowdTargetId): void {
  throwWhenClear(state, aimPoint(targetId));
}

/** A bottle that lands on the drum riser, which is nobody's target. */
function miss(state: CrowdState): void {
  throwWhenClear(state, EMPTY_STAGE);
}

const EMPTY_STAGE: CrowdPoint = { x: 1150, y: 650 };
/** Clears floating-point residue at a phase boundary; far below any tuning value. */
const SETTLE_MS = 1;

/**
 * Where a player aims: the middle of a prop, the head of a performer. A
 * performer's middle is their instrument, which is a target of its own.
 */
function aimPoint(targetId: CrowdTargetId): CrowdPoint {
  const target = crowdTarget(targetId);
  const middle = centre(target.rect);
  return target.type === 'performer' ? { x: middle.x, y: target.rect.y + 40 } : middle;
}

function centre(rect: CrowdRect): CrowdPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function rectanglesOverlap(a: CrowdRect, b: CrowdRect): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

test('M26: the title enters either perspective and both return to the same selector', () => {
  const flow = createAppFlow();
  finishIntro(flow);
  assert.equal(gameMode(flow), null);
  openBandMode(flow);
  assert.equal(flow.screen, 'BAND_SELECT');
  assert.equal(gameMode(flow), 'band');
  returnToTitle(flow);
  openCrowdMode(flow);
  assert.equal(flow.screen, 'CROWD_SELECT');
  assert.equal(gameMode(flow), 'crowd');
  showCrowdBriefing(flow);
  assert.equal(flow.screen, 'CROWD_BRIEFING');
  assert.equal(gameMode(flow), 'crowd');
  startCrowdRound(flow);
  assert.equal(flow.screen, 'CROWD');
  assert.equal(gameMode(flow), 'crowd');
  returnToTitle(flow);
  assert.equal(flow.screen, 'TITLE');
});

test('M27: a short or downward gesture does not spend a bottle', () => {
  const state = createCrowdState();
  tickCrowd(state, CROWD_THROW.inputArmDelayMs);
  beginCrowdGesture(state, CROWD_THROW.bottleReady);
  assert.equal(releaseCrowdGesture(state, { x: 1000, y: 860 }), false);
  assert.equal(state.phase, 'ready');
  assert.equal(state.throws, 0);
  assert.equal(state.bottlesLeft, crowdStage(state.stageId).bottles);
  assert.deepEqual(state.feedback, { type: 'invalid' });
});

test('M27: a menu tap cannot become a throw when the Crowd screen opens', () => {
  const state = createCrowdState();
  beginCrowdGesture(state, { x: 1500, y: 120 });
  assert.equal(state.phase, 'ready');
  assert.equal(releaseCrowdGesture(state, { x: 1500, y: 120 }), false);
  assert.equal(state.feedback, null);
});

test('M27: a throw shrinks, rises and spins toward a fixed target-plane point', () => {
  const state = throwAt(960, 430);
  const projectile = state.projectile!;
  const start = crowdProjectilePose(projectile);
  projectile.elapsedMs = projectile.durationMs / 2;
  const middle = crowdProjectilePose(projectile);
  projectile.elapsedMs = projectile.durationMs;
  const end = crowdProjectilePose(projectile);
  assert.equal(start.scale, CROWD_THROW.startScale);
  assert.ok(middle.y < (start.y + end.y) / 2);
  assert.ok(middle.scale < start.scale && middle.scale > end.scale);
  assert.notEqual(middle.rotation, 0);
  assert.ok(Math.abs(end.x - 960) < 0.001);
  assert.ok(Math.abs(end.y - 430) < 0.001);
});

test('M27: all three musician targets retain their authored scores', () => {
  for (const target of CROWD_PERFORMER_TARGETS) {
    const point = aimPoint(target.id);
    const state = throwAt(point.x, point.y);
    tickCrowd(state, state.projectile!.durationMs);
    assert.deepEqual(state.feedback, { type: 'hit', target: target.id, points: target.points });
    assert.equal(state.score, target.points);
  }
});

test('M27: an empty part of the stage remains a miss and costs 50', () => {
  const state = throwAt(EMPTY_STAGE.x, EMPTY_STAGE.y);
  tickCrowd(state, state.projectile!.durationMs);
  assert.deepEqual(state.feedback, { type: 'miss', points: -50 });
  assert.equal(state.score, -50);
});

test('M28: each secondary target resolves first and rewards its configured precision score', () => {
  for (const target of CROWD_STAGE_TARGETS) {
    const point = centre(target.rect);
    const state = throwAt(point.x, point.y);
    tickCrowd(state, state.projectile!.durationMs);
    assert.deepEqual(state.feedback, { type: 'hit', target: target.id, points: target.points });
    assert.equal(state.score, target.points);
  }
});

test('M28: secondary target centres are unique and their regions never overlap at any stage scale', () => {
  for (const stageId of CROWD_STAGE_IDS) {
    const stage = crowdStage(stageId);
    for (let left = 0; left < CROWD_STAGE_TARGETS.length; left += 1) {
      const target = CROWD_STAGE_TARGETS[left];
      const hit = resolveCrowdImpact(createCrowdState(stageId), centre(target.rect));
      assert.deepEqual(hit, { type: 'hit', target: target.id, points: target.points });
      for (let right = left + 1; right < CROWD_STAGE_TARGETS.length; right += 1) {
        assert.equal(
          rectanglesOverlap(
            crowdTargetRect(target, stage),
            crowdTargetRect(CROWD_STAGE_TARGETS[right], stage),
          ),
          false,
          `${stageId}: ${target.id} overlaps ${CROWD_STAGE_TARGETS[right].id}`,
        );
      }
    }
  }
});

test('M28/M29: every prop can be reached by a legal throw', () => {
  const { impactBounds } = CROWD_THROW;
  for (const target of CROWD_STAGE_TARGETS) {
    const point = centre(target.rect);
    assert.ok(point.x > impactBounds.left && point.x < impactBounds.right, target.id);
    assert.ok(point.y > impactBounds.top && point.y < impactBounds.bottom, target.id);
    const { to } = crowdProjectedImpact(CROWD_THROW.bottleReady, swipeFor(point.x, point.y));
    assert.ok(Math.hypot(to.x - point.x, to.y - point.y) < 0.001, target.id);
  }
});

test('M28/M29: props react deterministically and every one is a one-shot target', () => {
  const micState = createCrowdState();
  const microphone = centre(crowdTarget('microphone').rect);
  throwAt(microphone.x, microphone.y, micState);
  tickCrowd(micState, micState.projectile!.durationMs);
  assert.equal(micState.stageProps.microphone.status, 'falling');
  assert.equal(micState.stageProps.microphone.active, false);
  tickCrowd(micState, CROWD_REACTIONS.fallMs / 2);
  const midFall = crowdPropFallProgress(micState.stageProps.microphone);
  assert.ok(midFall > 0.4 && midFall < 0.6);
  tickCrowd(micState, CROWD_REACTIONS.fallMs / 2);
  assert.equal(micState.stageProps.microphone.status, 'down');
  assert.equal(crowdPropFallProgress(micState.stageProps.microphone), 1);

  const ampState = createCrowdState();
  const amplifier = centre(crowdTarget('amplifier').rect);
  throwAt(amplifier.x, amplifier.y, ampState);
  tickCrowd(ampState, ampState.projectile!.durationMs);
  assert.equal(ampState.stageProps.amplifier.status, 'damaged');
  assert.equal(ampState.stageProps.amplifier.active, false);
  tickCrowd(ampState, 5000);
  assert.equal(ampState.stageProps.amplifier.status, 'damaged');

  const cymbalState = createCrowdState();
  const cymbal = centre(crowdTarget('crashCymbal').rect);
  throwAt(cymbal.x, cymbal.y, cymbalState);
  tickCrowd(cymbalState, cymbalState.projectile!.durationMs);
  assert.equal(cymbalState.stageProps.crashCymbal.status, 'wobbling');
  assert.equal(cymbalState.stageProps.crashCymbal.active, false);
  tickCrowd(cymbalState, CROWD_REACTIONS.cymbalWobbleMs);
  assert.equal(cymbalState.stageProps.crashCymbal.status, 'falling');
  tickCrowd(cymbalState, CROWD_REACTIONS.fallMs);
  assert.equal(cymbalState.stageProps.crashCymbal.status, 'down');
  assert.equal(cymbalState.stageProps.rideCymbal.status, 'intact');
});

test('M28: reset restores every reactive prop as well as score and timing', () => {
  const microphone = CROWD_STAGE_TARGETS.find((target) => target.id === 'microphone')!;
  const state = throwAt(centre(microphone.rect).x, centre(microphone.rect).y);
  tickCrowd(state, state.projectile!.durationMs);
  resetCrowd(state);
  assert.deepEqual(state, createCrowdState());
});

test('M28: waiter motion is deterministic, readable and frame-step independent', () => {
  assert.equal(crowdBlockerPose(DEFAULT_WAITER.initialDelayMs - 1).visible, false);
  const early = crowdBlockerPose(DEFAULT_WAITER.initialDelayMs + 300);
  const middle = crowdBlockerPose(DEFAULT_WAITER.initialDelayMs + DEFAULT_WAITER.travelMs / 2);
  const late = crowdBlockerPose(DEFAULT_WAITER.initialDelayMs + DEFAULT_WAITER.travelMs - 300);
  assert.ok(early.visible && middle.visible && late.visible);
  assert.ok(early.rect.x < middle.rect.x && middle.rect.x < late.rect.x);

  const coarse = createCrowdState();
  const fine = createCrowdState();
  tickCrowd(coarse, 7500);
  for (let step = 0; step < 150; step += 1) tickCrowd(fine, 50);
  assert.equal(crowdBlockerPose(coarse.elapsedMs).visible, true);
  assert.ok(Math.abs(coarse.elapsedMs - fine.elapsedMs) < 0.001);
  assert.deepEqual(crowdBlockerPose(coarse.elapsedMs), crowdBlockerPose(fine.elapsedMs));
});

test('M28: hitting the waiter penalizes once and blocks a musician behind them', () => {
  const vocalist = CROWD_PERFORMER_TARGETS.find((target) => target.id === 'vocalist')!;
  const point = centre(vocalist.rect);
  const desiredWaiterX = point.x - CROWD_WAITER.width / 2;
  const offstage = CROWD_WAITER.width + CROWD_WAITER.overscan;
  const progress = (desiredWaiterX + offstage) / (1920 + offstage + CROWD_WAITER.overscan);
  const impactTime = DEFAULT_WAITER.initialDelayMs + progress * DEFAULT_WAITER.travelMs;
  const state = throwAt(point.x, point.y);
  state.elapsedMs = impactTime - state.projectile!.durationMs;
  tickCrowd(state, state.projectile!.durationMs);
  assert.deepEqual(state.feedback, {
    type: 'wrong-target',
    target: 'waiter',
    points: CROWD_WAITER.penalty,
  });
  assert.equal(state.score, CROWD_WAITER.penalty);
  assert.equal(state.throws, 1);
  assert.equal(state.performers.vocalist.hits, 0);
  assert.equal(crowdObjectivesCompleted(state), 0);
});

test('M28: waiting for the waiter to pass restores the musician hit', () => {
  const vocalist = CROWD_PERFORMER_TARGETS.find((target) => target.id === 'vocalist')!;
  const point = centre(vocalist.rect);
  const state = createCrowdState();
  state.elapsedMs = DEFAULT_WAITER.cycleMs - 100;
  assert.deepEqual(resolveCrowdImpact(state, point), {
    type: 'hit',
    target: 'vocalist',
    points: vocalist.points,
  });
});

test('M28: aim assistance shows only a short launch segment, never the landing point', () => {
  const impact = { x: 1180, y: 300 };
  const end = {
    x: CROWD_THROW.bottleReady.x + (impact.x - CROWD_THROW.bottleReady.x) / CROWD_THROW.projection,
    y: CROWD_THROW.bottleReady.y + (impact.y - CROWD_THROW.bottleReady.y) / CROWD_THROW.projection,
  };
  for (const stageId of CROWD_STAGE_IDS) {
    const progress = crowdStage(stageId).aimGuideProgress;
    const guide = crowdAimGuidePoints(CROWD_THROW.bottleReady, end, progress);
    assert.equal(guide.length, progress.length);
    assert.ok(Math.max(...progress) <= 0.5, `${stageId} reveals more than half the flight`);
    assert.ok(guide.at(-1)!.y > impact.y);
    assert.notDeepEqual(guide.at(-1), impact);
  }
});

test('M27/M28: flight, reaction and reload depend on elapsed time, not frame count', () => {
  const target = CROWD_STAGE_TARGETS.find((candidate) => candidate.id === 'crashCymbal')!;
  const point = centre(target.rect);
  const coarse = throwAt(point.x, point.y);
  const fine = throwAt(point.x, point.y);
  const total = coarse.projectile!.durationMs + CROWD_THROW.resultHoldMs + 280;
  tickCrowd(coarse, total);
  for (let frame = 0; frame < 60; frame += 1) tickCrowd(fine, total / 60);
  assert.equal(coarse.stageProps.crashCymbal.status, 'falling');
  assert.ok(
    Math.abs(
      crowdPropFallProgress(coarse.stageProps.crashCymbal) -
        crowdPropFallProgress(fine.stageProps.crashCymbal),
    ) < 0.001,
  );
  assert.equal(coarse.phase, fine.phase);
  assert.equal(coarse.score, fine.score);
  assert.equal(coarse.throws, fine.throws);
  assert.ok(Math.abs(coarse.elapsedMs - fine.elapsedMs) < 0.001);
  assert.equal(coarse.stageProps.crashCymbal.status, fine.stageProps.crashCymbal.status);
});

/* ---------------------------------------------------------------- M29 */

test('M29: a valid throw spends exactly one bottle, on release', () => {
  const state = createCrowdState();
  const bottles = crowdStage(state.stageId).bottles;
  throwAt(EMPTY_STAGE.x, EMPTY_STAGE.y, state);
  assert.equal(state.bottlesLeft, bottles - 1);
  assert.equal(state.throws, 1);
  tickCrowd(state, state.projectile!.durationMs + CROWD_THROW.resultHoldMs + SETTLE_MS);
  assert.equal(state.bottlesLeft, bottles - 1);
  assert.equal(state.phase, 'ready');
});

test('M29: objectives start incomplete and progress only from the matching gameplay hit', () => {
  const state = createCrowdState('warmUp');
  assert.deepEqual(
    state.objectives.map((objective) => objective.targetId),
    CROWD_STAGES.warmUp.objectives,
  );
  assert.ok(state.objectives.every((o) => !o.completed && o.currentCount === 0 && o.requiredCount === 1));

  miss(state);
  assert.equal(crowdObjectivesCompleted(state), 0);
  // The bassist is a target but not a warm-up objective.
  land(state, 'bassist');
  assert.equal(crowdObjectivesCompleted(state), 0);
  land(state, 'crashCymbal');
  assert.equal(crowdObjectivesCompleted(state), 1);
  const crash = state.objectives.find((objective) => objective.targetId === 'crashCymbal')!;
  assert.deepEqual(
    { count: crash.currentCount, completed: crash.completed },
    { count: 1, completed: true },
  );
});

test('M29: the singer loses the microphone, then takes a direct hit and recovers', () => {
  const state = createCrowdState('gettingWorse');
  assert.deepEqual(crowdPerformerPose(state.performers.vocalist), {
    base: 'performing',
    reacting: false,
    hitProgress: 0,
  });

  land(state, 'microphone');
  assert.deepEqual(state.feedback, { type: 'hit', target: 'microphone', points: 500 });
  assert.equal(state.performers.vocalist.armed, false);
  assert.equal(state.performers.vocalist.hits, 0);
  assert.equal(crowdPerformerPose(state.performers.vocalist).base, 'disarmed');
  assert.equal(state.stageProps.microphone.status, 'down');

  // The microphone is gone, so the same throw now reaches the singer behind it.
  const point = centre(crowdTarget('microphone').rect);
  throwAt(point.x, point.y, state);
  tickCrowd(state, state.projectile!.durationMs);
  assert.deepEqual(state.feedback, { type: 'hit', target: 'vocalist', points: 500 });
  tickCrowd(state, CROWD_REACTIONS.performerHitMs / 2);
  const reacting = crowdPerformerPose(state.performers.vocalist);
  assert.equal(reacting.base, 'disarmed');
  assert.equal(reacting.reacting, true);
  assert.ok(reacting.hitProgress > 0.4 && reacting.hitProgress < 0.6);
  tickCrowd(state, CROWD_REACTIONS.performerHitMs);
  assert.deepEqual(crowdPerformerPose(state.performers.vocalist), {
    base: 'disarmed',
    reacting: false,
    hitProgress: 0,
  });
});

test('M29: the guitarist and bassist are disarmed by their instruments, not by a body hit', () => {
  for (const [instrument, performer] of [
    ['guitar', 'guitarist'],
    ['bass', 'bassist'],
  ] as const) {
    assert.equal(crowdTarget(instrument).heldBy, performer);
    const state = createCrowdState('gettingWorse');
    land(state, performer);
    assert.equal(state.performers[performer].hits, 1);
    assert.equal(state.performers[performer].armed, true);

    land(state, instrument);
    assert.equal(state.performers[performer].armed, false);
    assert.equal(state.stageProps[instrument].status, 'down');
    assert.equal(state.stageProps[instrument].active, false);
    assert.ok(state.objectives.find((objective) => objective.targetId === instrument)!.completed);
  }
});

test('M29: destruction pays once — a resolved prop cannot be farmed, a performer repeat pays little', () => {
  const state = createCrowdState('destroyTheGig');
  land(state, 'bass');
  assert.equal(state.score, crowdTarget('bass').points);
  // Same spot again: the bass is gone, so this is the bassist's first hit.
  land(state, 'bass');
  assert.deepEqual(state.feedback, { type: 'hit', target: 'bassist', points: 300 });
  // And again: now a repeat.
  land(state, 'bass');
  assert.deepEqual(state.feedback, {
    type: 'hit',
    target: 'bassist',
    points: CROWD_SCORING.performerRepeatPoints,
  });
  assert.equal(state.score, 450 + 300 + CROWD_SCORING.performerRepeatPoints);
  assert.ok(CROWD_SCORING.performerRepeatPoints < 100);

  // A wrecked amplifier in the corner has nobody behind it: a plain miss.
  land(state, 'amplifier');
  const before = state.score;
  land(state, 'amplifier');
  assert.deepEqual(state.feedback, { type: 'miss', points: CROWD_THROW.missPoints });
  assert.equal(state.score, before + CROWD_THROW.missPoints);
});

test('M29: completing every objective ruins the gig and banks the spare bottles', () => {
  const state = createCrowdState('warmUp');
  const stage = crowdStage('warmUp');
  let expected = 0;
  for (const targetId of stage.objectives) {
    assert.equal(state.phase, 'ready');
    assert.equal(state.outcome, null);
    land(state, targetId);
    expected += crowdTarget(targetId).points;
  }
  const spare = stage.bottles - stage.objectives.length;
  assert.equal(state.phase, 'finished');
  assert.equal(state.outcome, 'success');
  assert.equal(state.bottlesLeft, spare);
  assert.equal(state.throws, stage.objectives.length);
  assert.equal(crowdObjectivesCompleted(state), stage.objectives.length);
  assert.equal(state.score, expected + spare * stage.spareBottleBonus);

  // A finished round takes no more throws and pays no more bonus.
  tickCrowd(state, 5000);
  beginCrowdGesture(state, CROWD_THROW.bottleReady);
  assert.equal(state.phase, 'finished');
  assert.equal(releaseCrowdGesture(state, swipeFor(960, 400)), false);
  assert.equal(state.score, expected + spare * stage.spareBottleBonus);
});

test('M29: the winning hit is seen before the result — the round ends after the hold', () => {
  const state = createCrowdState('warmUp');
  const objectives = crowdStage('warmUp').objectives;
  for (const targetId of objectives.slice(0, -1)) land(state, targetId);
  const last = aimPoint(objectives.at(-1)!);
  throwAt(last.x, last.y, state);
  tickCrowd(state, state.projectile!.durationMs + SETTLE_MS);
  assert.equal(state.phase, 'result');
  assert.equal(state.outcome, null);
  assert.equal(crowdObjectivesCompleted(state), objectives.length);
  tickCrowd(state, CROWD_THROW.resultHoldMs);
  assert.equal(state.phase, 'finished');
});

test('M29: running out of bottles with objectives left means the show survived', () => {
  const state = createCrowdState('warmUp');
  const bottles = crowdStage('warmUp').bottles;
  land(state, 'microphone');
  for (let thrown = 1; thrown < bottles; thrown += 1) {
    assert.equal(state.phase, 'ready');
    miss(state);
  }
  assert.equal(state.phase, 'finished');
  assert.equal(state.outcome, 'failure');
  assert.equal(state.bottlesLeft, 0);
  assert.equal(state.throws, bottles);
  assert.equal(crowdObjectivesCompleted(state), 1);
  assert.equal(state.score, 500 + (bottles - 1) * CROWD_THROW.missPoints);
});

test('M29: the last bottle can still win', () => {
  const state = createCrowdState('warmUp');
  const stage = crowdStage('warmUp');
  for (let wasted = 0; wasted < stage.bottles - stage.objectives.length; wasted += 1) miss(state);
  for (const targetId of stage.objectives) land(state, targetId);
  assert.equal(state.bottlesLeft, 0);
  assert.equal(state.outcome, 'success');
});

test('M29: retry restores bottles, objectives, performers, props and score', () => {
  const state = createCrowdState('gettingWorse');
  land(state, 'guitar');
  land(state, 'vocalist');
  land(state, 'rideCymbal');
  resetCrowd(state);
  assert.deepEqual(state, createCrowdState('gettingWorse'));

  for (let thrown = 0; thrown < crowdStage('gettingWorse').bottles; thrown += 1) miss(state);
  assert.equal(state.outcome, 'failure');
  resetCrowd(state);
  assert.deepEqual(state, createCrowdState('gettingWorse'));
});

test('M29: a whole round reaches the same state in coarse and fine time steps', () => {
  const script: readonly CrowdTargetId[] = ['crashCymbal', 'guitar', 'vocalist', 'amplifier'];
  const run = (stepMs: number): CrowdState => {
    const state = createCrowdState('gettingWorse');
    tickCrowd(state, CROWD_THROW.inputArmDelayMs);
    for (const targetId of script) {
      const point = aimPoint(targetId);
      throwAt(point.x, point.y, state);
      // 1800 ms: flight, result hold and reload, in whole steps of either size.
      for (let elapsed = 0; elapsed < 1800; elapsed += stepMs) tickCrowd(state, stepMs);
    }
    return state;
  };
  const coarse = run(900);
  const fine = run(12.5);
  assert.equal(coarse.score, fine.score);
  assert.equal(coarse.phase, fine.phase);
  assert.equal(coarse.bottlesLeft, fine.bottlesLeft);
  assert.deepEqual(coarse.objectives, fine.objectives);
  assert.ok(Math.abs(coarse.elapsedMs - fine.elapsedMs) < 0.001);
  for (const id of ['crashCymbal', 'guitar', 'amplifier'] as const) {
    assert.equal(coarse.stageProps[id].status, fine.stageProps[id].status, id);
  }
  assert.equal(coarse.stageProps.crashCymbal.status, 'down');
});

/* ---------------------------------------------------------------- M30 */

test('M30: three stages, each a valid and winnable objective set', () => {
  assert.deepEqual(CROWD_STAGE_IDS, ['warmUp', 'gettingWorse', 'destroyTheGig']);
  for (const stageId of CROWD_STAGE_IDS) {
    const stage = crowdStage(stageId);
    assert.equal(stage.id, stageId);
    assert.equal(new Set(stage.objectives).size, stage.objectives.length, 'duplicate objective');
    for (const targetId of stage.objectives) assert.ok(CROWD_TARGET_IDS.includes(targetId));
    assert.ok(stage.bottles > stage.objectives.length, `${stageId} leaves no room for a miss`);
  }
  assert.deepEqual(CROWD_STAGES.warmUp.objectives, [
    'microphone',
    'crashCymbal',
    'amplifier',
    'vocalist',
  ]);
  assert.equal(CROWD_STAGES.gettingWorse.objectives.length, 7);
  assert.deepEqual([...CROWD_STAGES.destroyTheGig.objectives].sort(), [...CROWD_TARGET_IDS].sort());
});

test('M30: every lever tightens from stage to stage, on purpose', () => {
  const [easy, medium, hard] = CROWD_STAGE_IDS.map(crowdStage);
  for (const [gentler, harsher] of [
    [easy, medium],
    [medium, hard],
  ] as const) {
    assert.ok(gentler.objectives.length < harsher.objectives.length);
    // Spare bottles: the room for error is what shrinks, not the raw count.
    assert.ok(
      gentler.bottles - gentler.objectives.length > harsher.bottles - harsher.objectives.length,
    );
    assert.ok(gentler.targetScale > harsher.targetScale);
    assert.ok(gentler.aimGuideProgress.length > harsher.aimGuideProgress.length);
    assert.ok(Math.max(...gentler.aimGuideProgress) > Math.max(...harsher.aimGuideProgress));
    assert.ok(gentler.waiter.travelMs > harsher.waiter.travelMs);
    assert.ok(gentler.waiter.cycleMs > harsher.waiter.cycleMs);
    assert.ok(gentler.waiter.initialDelayMs > harsher.waiter.initialDelayMs);
    assert.ok(gentler.spareBottleBonus < harsher.spareBottleBonus);
  }
  assert.deepEqual(
    [easy, medium, hard].map((stage) => stage.bottles - stage.objectives.length),
    [6, 4, 3],
  );
  for (const stage of [easy, medium, hard]) {
    assert.ok(stage.waiter.initialDelayMs + stage.waiter.travelMs <= stage.waiter.cycleMs);
  }
});

test('M30: selecting a stage starts its round, and retry keeps the stage', () => {
  const state = createCrowdState();
  assert.equal(state.stageId, DEFAULT_CROWD_STAGE_ID);
  for (const stageId of CROWD_STAGE_IDS) {
    land(state, 'vocalist');
    selectCrowdStage(state, stageId);
    assert.deepEqual(state, createCrowdState(stageId));
    assert.equal(state.bottlesLeft, crowdStage(stageId).bottles);
    assert.equal(state.objectives.length, crowdStage(stageId).objectives.length);
    miss(state);
    resetCrowd(state);
    assert.equal(state.stageId, stageId);
    assert.deepEqual(state, createCrowdState(stageId));
  }
});

test('M30: target scale changes what a near miss is', () => {
  const amplifier = crowdTarget('amplifier');
  // Just above the authored rect: inside it at 1.2x, outside at 1x and 0.85x.
  const nearMiss = { x: centre(amplifier.rect).x, y: amplifier.rect.y - 15 };
  const result = (stageId: CrowdStageId) => resolveCrowdImpact(createCrowdState(stageId), nearMiss).type;
  assert.equal(result('warmUp'), 'hit');
  assert.equal(result('gettingWorse'), 'miss');
  assert.equal(result('destroyTheGig'), 'miss');

  // Performers are never scaled: a stage changes precision, not the band.
  for (const stageId of CROWD_STAGE_IDS) {
    for (const performer of CROWD_PERFORMER_TARGETS) {
      assert.deepEqual(crowdTargetRect(performer, crowdStage(stageId)), performer.rect);
    }
  }
});

test('M30: each stage runs its own waiter, and the domain resolves hits against it', () => {
  const at = 3000;
  assert.equal(crowdBlockerPose(at, CROWD_STAGES.warmUp.waiter).visible, false);
  assert.equal(crowdBlockerPose(at, CROWD_STAGES.gettingWorse.waiter).visible, true);
  assert.equal(crowdBlockerPose(at, CROWD_STAGES.destroyTheGig.waiter).visible, true);
  assert.ok(
    crowdBlockerPose(at, CROWD_STAGES.destroyTheGig.waiter).rect.x >
      crowdBlockerPose(at, CROWD_STAGES.gettingWorse.waiter).rect.x,
  );

  // The same throw at the same moment: blocked on the hard stage, clean on the easy one.
  const hardWaiter = crowdBlockerPose(at, CROWD_STAGES.destroyTheGig.waiter).rect;
  const behindWaiter = centre(hardWaiter);
  const hard = createCrowdState('destroyTheGig');
  hard.elapsedMs = at;
  assert.equal(resolveCrowdImpact(hard, behindWaiter).type, 'wrong-target');
  const easy = createCrowdState('warmUp');
  easy.elapsedMs = at;
  assert.notEqual(resolveCrowdImpact(easy, behindWaiter).type, 'wrong-target');
});

test('M30: every stage can be played to a win and to a loss', () => {
  for (const stageId of CROWD_STAGE_IDS) {
    const stage = crowdStage(stageId);
    const won = createCrowdState(stageId);
    for (const targetId of stage.objectives) land(won, targetId);
    assert.equal(won.outcome, 'success', stageId);
    assert.equal(won.bottlesLeft, stage.bottles - stage.objectives.length);

    const lost = createCrowdState(stageId);
    for (let thrown = 0; thrown < stage.bottles; thrown += 1) miss(lost);
    assert.equal(lost.outcome, 'failure', stageId);
    assert.equal(lost.score, stage.bottles * CROWD_THROW.missPoints);
  }
});

test('M32: the waiter stands on the stage front and is hittable from head to feet', () => {
  const pose = crowdBlockerPose(DEFAULT_WAITER.initialDelayMs + DEFAULT_WAITER.travelMs / 2);
  const feet = pose.rect.y + pose.rect.height;
  // In front of the band means lower on the canvas than any performer mark.
  for (const performer of CROWD_PERFORMER_TARGETS) {
    assert.ok(feet >= performer.rect.y + performer.rect.height, performer.id);
  }
  // His head no longer sits below a standing performer's shoulders.
  assert.ok(pose.rect.y <= 270);
  // The M28 width is unchanged, so a crossing blocks a target for no longer.
  assert.equal(pose.rect.width, 230);

  const drawn = crowdWaiterDrawRect(pose.rect);
  assert.equal(drawn.y + drawn.height, feet, 'drawn on the hit rect feet line');
  assert.ok(drawn.x < pose.rect.x && drawn.x + drawn.width > pose.rect.x + pose.rect.width);
  // The existing sprite, scaled uniformly: no stretch.
  const authored = CROWD_ART_SLOTS.waiter.box;
  assert.ok(Math.abs(drawn.width / drawn.height - authored.width / authored.height) < 0.005);
});

test('M32: the drawn waiter is fully off-canvas at both ends of a crossing', () => {
  for (const stage of Object.values(CROWD_STAGES)) {
    const start = crowdBlockerPose(stage.waiter.initialDelayMs, stage.waiter);
    const end = crowdBlockerPose(stage.waiter.initialDelayMs + stage.waiter.travelMs - 0.001, stage.waiter);
    const first = crowdWaiterDrawRect(start.rect);
    const last = crowdWaiterDrawRect(end.rect);
    assert.ok(first.x + first.width <= 0, stage.id);
    assert.ok(last.x >= 1920 - 1, stage.id);
  }
});

test('M32: a ruined gig leads on to the next stage, and the last stage leads nowhere', () => {
  assert.equal(nextCrowdStageId('warmUp'), 'gettingWorse');
  assert.equal(nextCrowdStageId('gettingWorse'), 'destroyTheGig');
  assert.equal(nextCrowdStageId('destroyTheGig'), null);

  const state = createCrowdState('warmUp');
  state.score = 900;
  selectCrowdStage(state, nextCrowdStageId(state.stageId)!);
  assert.deepEqual(state, createCrowdState('gettingWorse'));
});

test('M32: every Crowd stage names a registered music track', () => {
  for (const stage of Object.values(CROWD_STAGES)) {
    assert.ok(isMusicTrackId(stage.music), `${stage.id}: ${stage.music}`);
  }
});

test('M32: the round HUD carries no standing instructions, and the how-to card does', () => {
  const overlays = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'game/rendering/Overlays.tsx'),
    'utf8',
  );
  const hud = overlays.slice(overlays.indexOf('function CrowdHud('), overlays.indexOf('function CrowdHud(') + 3000);
  assert.doesNotMatch(hud, /howTo|instruction|crowd\.ready|crowd\.aiming/);
  assert.match(overlays, /function CrowdBriefing\(/);
  for (const catalogue of [en, ptBR]) {
    assert.ok(catalogue.crowd.howTo.waiter.includes('{penalty}'));
    assert.ok(catalogue.crowd.howTo.swipe.length > 0 && catalogue.crowd.howTo.goal.length > 0);
    assert.ok(catalogue.crowd.spareWaiter.length > 0);
    assert.ok(catalogue.crowd.result.nextStage.length > 0);
  }
});

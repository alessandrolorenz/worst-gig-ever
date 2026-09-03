/**
 * Ambient stage motion and performer reactions (M5A, Priorities 3 and 4).
 *
 * These run with no renderer, which is the point: the choreography is a pure
 * function of elapsed time and the targets in flight, so "the stage is alive"
 * is an assertion rather than an opinion (AGENTS.md rule 4).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  beatMs,
  beatPulse,
  clearStageMotion,
  createStageMotion,
  isReacting,
  loopFrameAt,
  loopMs,
  ONE_SHOT_POSES,
  PERFORMER_IDS,
  performerPose,
  reactToImpact,
  tickStageMotion,
  type StageMotionState,
  type ThreatView,
} from '../game/systems/stageMotion.ts';
import { PERFORMER_ANCHORS, STAGE_MOTION } from '../game/config/stage.ts';

function threatAt(x: number, y: number, progress = 0.5): ThreatView {
  return { x, y, progress, status: 'active' };
}

/** Advances the stage in frame-sized steps. */
function advance(state: StageMotionState, totalMs: number, threats: ThreatView[] = [], stepMs = 16) {
  let remaining = totalMs;
  while (remaining > 0) {
    const step = Math.min(stepMs, remaining);
    tickStageMotion(state, threats, step);
    remaining -= step;
  }
}

test('the cadence derives from the configured tempo', () => {
  assert.equal(beatMs(), 60_000 / STAGE_MOTION.bpm);
  assert.equal(loopMs(), beatMs() * STAGE_MOTION.beatsPerLoop);
  assert.ok(beatMs() > 0);
});

test('a loop steps between whole frames rather than sliding between them', () => {
  const period = 1000;
  assert.equal(loopFrameAt(0, period, 2), 0);
  assert.equal(loopFrameAt(499, period, 2), 0);
  assert.equal(loopFrameAt(500, period, 2), 1);
  assert.equal(loopFrameAt(999, period, 2), 1);
  assert.equal(loopFrameAt(1000, period, 2), 0, 'the loop must wrap');
  assert.equal(loopFrameAt(3200, period, 2), 0);

  // Three-frame loops are supported; M3's art contract may want the extra pose.
  assert.equal(loopFrameAt(0, period, 3), 0);
  assert.equal(loopFrameAt(400, period, 3), 1);
  assert.equal(loopFrameAt(800, period, 3), 2);
});

test('a degenerate loop holds a single frame instead of dividing by zero', () => {
  assert.equal(loopFrameAt(1234, 0, 2), 0);
  assert.equal(loopFrameAt(1234, 1000, 1), 0);
  assert.equal(loopFrameAt(1234, 1000, 0), 0);
});

test('the beat pulse peaks on the beat and bottoms out between two', () => {
  assert.ok(Math.abs(beatPulse(0) - 1) < 1e-9);
  assert.ok(beatPulse(beatMs() * 0.5) < 0.01, 'the pulse should be dark halfway through a beat');
  assert.ok(beatPulse(beatMs() * 0.25) > 0.49 && beatPulse(beatMs() * 0.25) < 0.51);
  assert.ok(Math.abs(beatPulse(beatMs() * 3) - 1) < 1e-9, 'the pulse must repeat every beat');
  for (const t of [0, 137, 999, 5000, 61_234]) {
    const pulse = beatPulse(t);
    assert.ok(pulse >= 0 && pulse <= 1, `pulse out of range at ${t}`);
  }
});

test('the beat pulse never jumps, so the lights breathe instead of strobing', () => {
  // The defect this guards: a pulse that ramped down and snapped back to 1 on
  // every beat made a full-canvas light overlay flash rather than pulse.
  const step = 4;
  let previous = beatPulse(0);
  for (let t = step; t <= beatMs() * 4; t += step) {
    const pulse = beatPulse(t);
    assert.ok(
      Math.abs(pulse - previous) < 0.05,
      `the pulse jumped ${Math.abs(pulse - previous).toFixed(3)} in ${step}ms at ${t}`,
    );
    previous = pulse;
  }
});

test('a fresh stage is already looping, not standing still', () => {
  const stage = createStageMotion();
  assert.equal(stage.elapsedMs, 0);
  for (const id of PERFORMER_IDS) {
    assert.ok(!ONE_SHOT_POSES.includes(performerPose(stage, id)));
    assert.equal(isReacting(stage, id), false);
  }
});

test('the band does not bob in lockstep', () => {
  const stage = createStageMotion();
  const seen = new Set<string>();
  for (let i = 0; i < 60; i += 1) {
    advance(stage, 40);
    seen.add(PERFORMER_IDS.map((id) => performerPose(stage, id)).join('|'));
  }
  assert.ok(seen.size > 1, 'the stage never changed pose');
  assert.ok(
    [...seen].some((combination) => new Set(combination.split('|')).size > 1),
    'all three performers were always on the same frame',
  );
});

test('every performer visits all three Pack 1 ambient poses within a few loops', () => {
  const stage = createStageMotion();
  const poses: Record<string, Set<string>> = {};
  for (const id of PERFORMER_IDS) poses[id] = new Set();
  for (let i = 0; i < 400; i += 1) {
    advance(stage, 16);
    for (const id of PERFORMER_IDS) poses[id].add(performerPose(stage, id));
  }
  for (const id of PERFORMER_IDS) {
    assert.ok(poses[id].has('idle'), `${id} never played idle`);
    assert.ok(poses[id].has('loopA'), `${id} never played loopA`);
    assert.ok(poses[id].has('loopB'), `${id} never played loopB`);
  }
});

test('the ambient clock runs regardless of round state, and a zero tick is inert', () => {
  const stage = createStageMotion();
  advance(stage, 1000);
  assert.equal(stage.elapsedMs, 1000);

  tickStageMotion(stage, [], 0);
  tickStageMotion(stage, [], -50);
  assert.equal(stage.elapsedMs, 1000, 'a non-positive tick moved the stage');
});

test('an impact next to a performer makes them flinch', () => {
  const stage = createStageMotion();
  const reacted = reactToImpact(stage, PERFORMER_ANCHORS.guitarist.x, PERFORMER_ANCHORS.guitarist.y);
  assert.equal(reacted, 'guitarist');
  assert.equal(performerPose(stage, 'guitarist'), 'hitReaction');
  assert.ok(isReacting(stage, 'guitarist'));
  assert.notEqual(performerPose(stage, 'bassist'), 'hitReaction');
});

test('an impact across the stage reaches nobody', () => {
  const stage = createStageMotion();
  assert.equal(reactToImpact(stage, 960, 1060), null);
  for (const id of PERFORMER_IDS) assert.equal(isReacting(stage, id), false);
});

test('the nearest performer takes the reaction when two are in range', () => {
  const stage = createStageMotion();
  const midpoint = (PERFORMER_ANCHORS.bassist.x + PERFORMER_ANCHORS.vocalist.x) / 2;
  const nearBassist = midpoint - (midpoint - PERFORMER_ANCHORS.bassist.x) * 0.9;
  assert.equal(reactToImpact(stage, nearBassist, PERFORMER_ANCHORS.bassist.y), 'bassist');
});

test('a reaction plays out and then hands back to the ambient loop', () => {
  const stage = createStageMotion();
  reactToImpact(stage, PERFORMER_ANCHORS.bassist.x, PERFORMER_ANCHORS.bassist.y);
  assert.equal(performerPose(stage, 'bassist'), 'hitReaction');

  advance(stage, STAGE_MOTION.hitReactionMs - 32);
  assert.equal(performerPose(stage, 'bassist'), 'hitReaction', 'the reaction was cut short');

  advance(stage, 64);
  assert.equal(isReacting(stage, 'bassist'), false);
  assert.ok(['idle', 'loopA', 'loopB'].includes(performerPose(stage, 'bassist')));
});

test('a reaction already playing is not restarted by a second impact', () => {
  const stage = createStageMotion();
  reactToImpact(stage, PERFORMER_ANCHORS.bassist.x, PERFORMER_ANCHORS.bassist.y);
  advance(stage, STAGE_MOTION.hitReactionMs - 48);
  reactToImpact(stage, PERFORMER_ANCHORS.bassist.x, PERFORMER_ANCHORS.bassist.y);
  advance(stage, 64);
  assert.equal(isReacting(stage, 'bassist'), false, 'the reaction was re-entered and flickered');
});

test('a performer ducks a target flying past them', () => {
  const stage = createStageMotion();
  const anchor = PERFORMER_ANCHORS.guitarist;
  tickStageMotion(stage, [threatAt(anchor.x + 40, anchor.y)], 16);
  assert.equal(performerPose(stage, 'guitarist'), 'dodge');
  assert.notEqual(performerPose(stage, 'bassist'), 'dodge', 'the whole band ducked one bottle');
  assert.notEqual(performerPose(stage, 'vocalist'), 'dodge');
});

test('a target too far away, resolved, or out of the passing window is ignored', () => {
  const anchor = PERFORMER_ANCHORS.bassist;
  const cases: [string, ThreatView][] = [
    ['too far', threatAt(anchor.x + STAGE_MOTION.dodgeProximity + 40, anchor.y)],
    ['not yet close enough', threatAt(anchor.x, anchor.y, STAGE_MOTION.dodgeFromProgress - 0.05)],
    ['already past', threatAt(anchor.x, anchor.y, STAGE_MOTION.dodgeToProgress + 0.05)],
    ['already resolved', { x: anchor.x, y: anchor.y, progress: 0.5, status: 'hit' }],
    ['already missed', { x: anchor.x, y: anchor.y, progress: 0.5, status: 'missed' }],
  ];
  for (const [label, threat] of cases) {
    const stage = createStageMotion();
    tickStageMotion(stage, [threat], 16);
    assert.notEqual(performerPose(stage, 'bassist'), 'dodge', `dodged a target that was ${label}`);
  }
});

test('a dodge ends even while the target is still overhead, so nobody freezes mid-duck', () => {
  const stage = createStageMotion();
  const anchor = PERFORMER_ANCHORS.vocalist;
  const threat = threatAt(anchor.x, anchor.y);

  advance(stage, STAGE_MOTION.dodgeMs + 32, [threat]);
  // The duck may immediately retrigger, but it must have completed once.
  assert.ok(stage.performers.vocalist.reactionMsLeft <= STAGE_MOTION.dodgeMs);

  advance(stage, STAGE_MOTION.dodgeMs * 2 + 64, []);
  assert.equal(isReacting(stage, 'vocalist'), false);
  assert.ok(['idle', 'loopA', 'loopB'].includes(performerPose(stage, 'vocalist')));
});

test('a hit reaction outranks a dodge while it is playing', () => {
  const stage = createStageMotion();
  const anchor = PERFORMER_ANCHORS.guitarist;
  reactToImpact(stage, anchor.x, anchor.y);
  tickStageMotion(stage, [threatAt(anchor.x, anchor.y)], 16);
  assert.equal(performerPose(stage, 'guitarist'), 'hitReaction');
});

test('the stage is deterministic: the same elapsed time gives the same poses', () => {
  const coarse = createStageMotion();
  const fine = createStageMotion();
  advance(coarse, 5000, [], 50);
  advance(fine, 5000, [], 10);
  assert.equal(coarse.elapsedMs, fine.elapsedMs);
  for (const id of PERFORMER_IDS) {
    assert.equal(performerPose(coarse, id), performerPose(fine, id), `${id} diverged`);
  }
});

test('clearing the stage returns it to a fresh one', () => {
  const stage = createStageMotion();
  advance(stage, 3000);
  reactToImpact(stage, PERFORMER_ANCHORS.bassist.x, PERFORMER_ANCHORS.bassist.y);

  clearStageMotion(stage);
  assert.deepEqual(stage, createStageMotion());
});

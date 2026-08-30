/**
 * Pseudo-perspective motion tests (M1, M2).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { clamp01, farScale, hitRadiusAt, poseAt, progressAt } from '../game/systems/approach.ts';
import { STAGE } from '../game/config/stage.ts';

test('progress is derived from elapsed time and clamped to 0..1', () => {
  assert.equal(progressAt(0, 0, 2000), 0);
  assert.equal(progressAt(1000, 0, 2000), 0.5);
  assert.equal(progressAt(2000, 0, 2000), 1);
  assert.equal(progressAt(9999, 0, 2000), 1, 'progress ran past the danger line');
  assert.equal(progressAt(-500, 0, 2000), 0);
  assert.equal(progressAt(500, 1000, 2000), 0, 'a target cannot move before it spawns');
});

test('a zero-duration target is immediately at the danger line', () => {
  assert.equal(progressAt(0, 0, 0), 1);
});

test('clamp01 keeps values inside the unit range', () => {
  assert.equal(clamp01(-3), 0);
  assert.equal(clamp01(0.42), 0.42);
  assert.equal(clamp01(9), 1);
});

test('a target spawns small at the vanishing point and arrives full size on its lane', () => {
  const lane = STAGE.laneXs[0];

  const spawn = poseAt(0, lane);
  assert.equal(spawn.x, STAGE.vanishingPoint.x);
  assert.equal(spawn.y, STAGE.vanishingPoint.y);
  assert.ok(Math.abs(spawn.scale - farScale()) < 1e-9);
  assert.ok(spawn.scale < 0.3, 'spawn scale should read as distant');

  const arrival = poseAt(1, lane);
  assert.ok(Math.abs(arrival.x - lane) < 1e-9);
  assert.ok(Math.abs(arrival.y - STAGE.dangerLineY) < 1e-9);
  assert.ok(Math.abs(arrival.scale - 1) < 1e-9);
});

test('approach is monotonic: a target never grows smaller or drifts backwards', () => {
  const lane = STAGE.laneXs[4];
  let previous = poseAt(0, lane);
  for (let step = 1; step <= 100; step += 1) {
    const pose = poseAt(step / 100, lane);
    assert.ok(pose.scale > previous.scale, `scale regressed at ${step}`);
    assert.ok(pose.y > previous.y, `vertical travel regressed at ${step}`);
    assert.ok(pose.x > previous.x, `lateral travel regressed at ${step}`);
    previous = pose;
  }
});

test('perspective accelerates: the last half covers more ground than the first', () => {
  const lane = STAGE.laneXs[0];
  const firstHalf = poseAt(0.5, lane).y - poseAt(0, lane).y;
  const secondHalf = poseAt(1, lane).y - poseAt(0.5, lane).y;
  assert.ok(secondHalf > firstHalf, 'approach should rush the final stretch');
});

test('a centre-lane target travels straight down the sightline', () => {
  const centre = STAGE.vanishingPoint.x;
  assert.ok(STAGE.laneXs.includes(centre), 'expected a lane on the centre line');
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    assert.ok(Math.abs(poseAt(p, centre).x - centre) < 1e-9);
  }
});

test('the hitbox scales with apparent size, so distant targets are smaller marks', () => {
  assert.equal(hitRadiusAt(100, 1), 100);
  assert.equal(hitRadiusAt(100, 0.5), 50);
  assert.ok(hitRadiusAt(90, poseAt(0, 430).scale) < hitRadiusAt(90, poseAt(1, 430).scale));
});

test('pose depends only on progress, never on how many steps got there', () => {
  const lane = STAGE.laneXs[2];
  const coarse = poseAt(progressAt(1200, 0, 2400), lane);
  const fine = poseAt(progressAt(1200, 0, 2400), lane);
  assert.deepEqual(coarse, fine);
});

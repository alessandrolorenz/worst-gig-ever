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

/* --- M5A: arc-based throws --- */

import { arcShape, closenessAt, scaleAt, throwPoseAt, type Trajectory } from '../game/systems/approach.ts';

/** A representative throw: off-centre origin, high arc, drift, and spin. */
const THROW: Trajectory = {
  originX: 1300,
  originY: 460,
  laneX: STAGE.laneXs[0],
  arcHeightPx: 260,
  driftPx: 70,
  spinTurns: 1.75,
};

test('the arc weighting is zero at both ends and peaks at mid-flight', () => {
  assert.equal(arcShape(0), 0);
  assert.equal(arcShape(1), 0);
  assert.equal(arcShape(0.5), 1);
  assert.ok(arcShape(0.25) > 0 && arcShape(0.25) < 1);
  // Symmetric, and clamped like every other progress input.
  assert.ok(Math.abs(arcShape(0.3) - arcShape(0.7)) < 1e-12);
  assert.equal(arcShape(-2), 0);
  assert.equal(arcShape(4), 0);
});

test('a throw starts where it was thrown from and lands exactly on its lane', () => {
  const spawn = throwPoseAt(0, THROW);
  assert.ok(Math.abs(spawn.x - THROW.originX) < 1e-9);
  assert.ok(Math.abs(spawn.y - THROW.originY) < 1e-9);
  assert.ok(Math.abs(spawn.scale - farScale()) < 1e-9);
  assert.equal(spawn.rotation, 0);

  // The endpoints are the perspective model's, untouched by the arc: an
  // object must still arrive at the danger line at full size, or hit
  // resolution and the miss rule would disagree with what is drawn.
  const arrival = throwPoseAt(1, THROW);
  assert.ok(Math.abs(arrival.x - THROW.laneX) < 1e-9);
  assert.ok(Math.abs(arrival.y - STAGE.dangerLineY) < 1e-9);
  assert.ok(Math.abs(arrival.scale - 1) < 1e-9);
});

test('a throw rises above the straight line before falling to the kit', () => {
  const straight = (p: number) =>
    THROW.originY + (STAGE.dangerLineY - THROW.originY) * closenessAt(p);

  let liftedSomewhere = false;
  for (let step = 1; step < 100; step += 1) {
    const p = step / 100;
    const y = throwPoseAt(p, THROW).y;
    assert.ok(y <= straight(p) + 1e-9, `throw dipped below the straight line at ${p}`);
    if (straight(p) - y > 1) liftedSomewhere = true;
  }
  assert.ok(liftedSomewhere, 'the throw never left the straight line');

  // The point of the arc: it goes up first.
  const apex = Math.min(...Array.from({ length: 101 }, (_, i) => throwPoseAt(i / 100, THROW).y));
  assert.ok(apex < THROW.originY, 'the object never rose above its release point');
});

test('a throw still rushes the drummer at the end', () => {
  const firstHalf = throwPoseAt(0.5, THROW).y - throwPoseAt(0, THROW).y;
  const secondHalf = throwPoseAt(1, THROW).y - throwPoseAt(0.5, THROW).y;
  assert.ok(secondHalf > firstHalf, 'the final stretch should still dominate');
});

test('apparent size grows monotonically even though the path curves', () => {
  let previous = throwPoseAt(0, THROW).scale;
  for (let step = 1; step <= 100; step += 1) {
    const scale = throwPoseAt(step / 100, THROW).scale;
    assert.ok(scale > previous, `scale regressed at ${step}`);
    previous = scale;
  }
});

test('drift and lift stay inside their configured budget', () => {
  const straightX = (p: number) => THROW.originX + (THROW.laneX - THROW.originX) * closenessAt(p);
  for (let step = 0; step <= 100; step += 1) {
    const p = step / 100;
    const pose = throwPoseAt(p, THROW);
    assert.ok(
      Math.abs(pose.x - straightX(p)) <= Math.abs(THROW.driftPx) + 1e-9,
      `drift exceeded its budget at ${p}`,
    );
  }
});

test('the object tumbles the whole way and the spin is signed', () => {
  const forward = throwPoseAt(1, THROW).rotation;
  assert.ok(Math.abs(forward - THROW.spinTurns * 2 * Math.PI) < 1e-9);

  const backward = throwPoseAt(1, { ...THROW, spinTurns: -THROW.spinTurns }).rotation;
  assert.ok(backward < 0, 'a negative spin should tumble the other way');

  // Rotation is a function of progress, so it never jitters between frames.
  assert.equal(throwPoseAt(0.4, THROW).rotation, throwPoseAt(0.4, THROW).rotation);
});

test('a flat, driftless, spinless throw is exactly the straight perspective path', () => {
  const flat: Trajectory = {
    originX: STAGE.vanishingPoint.x,
    originY: STAGE.vanishingPoint.y,
    laneX: STAGE.laneXs[3],
    arcHeightPx: 0,
    driftPx: 0,
    spinTurns: 0,
  };
  for (const p of [0, 0.2, 0.5, 0.8, 1]) {
    const arc = throwPoseAt(p, flat);
    const straight = poseAt(p, flat.laneX);
    assert.ok(Math.abs(arc.x - straight.x) < 1e-9, `x diverged at ${p}`);
    assert.ok(Math.abs(arc.y - straight.y) < 1e-9, `y diverged at ${p}`);
    assert.equal(arc.scale, straight.scale);
  }
});

test('a throw pose depends only on progress, never on how it got there', () => {
  assert.deepEqual(throwPoseAt(progressAt(900, 0, 2200), THROW), throwPoseAt(900 / 2200, THROW));
});

test('scale and closeness agree with the depth model at both ends', () => {
  assert.ok(Math.abs(scaleAt(0) - farScale()) < 1e-12);
  assert.equal(scaleAt(1), 1);
  assert.ok(Math.abs(closenessAt(0)) < 1e-12);
  assert.ok(Math.abs(closenessAt(1) - 1) < 1e-12);
});

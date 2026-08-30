/**
 * Canvas fitting and tap mapping (M3 reference canvas).
 *
 * If these are wrong, taps land somewhere other than where the player saw the
 * target, and every judgement about "does hitting feel good" is meaningless.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { canvasToScreen, createViewport, fitCanvas, screenToCanvas } from '../game/rendering/layout.ts';
import { REFERENCE_CANVAS } from '../game/config/stage.ts';

test('an exactly 16:9 surface needs no letterbox', () => {
  const fit = fitCanvas(1920, 1080);
  assert.equal(fit.scale, 1);
  assert.equal(fit.offsetX, 0);
  assert.equal(fit.offsetY, 0);
});

test('the whole canvas stays visible on a taller-than-16:9 surface', () => {
  const fit = fitCanvas(1600, 1200);
  assert.equal(fit.scale, 1600 / REFERENCE_CANVAS.width);
  assert.equal(fit.offsetX, 0);
  assert.ok(fit.offsetY > 0, 'expected horizontal letterbox bars');
  assert.ok(fit.height <= 1200);
});

test('the whole canvas stays visible on a wider-than-16:9 surface', () => {
  const fit = fitCanvas(2400, 1080);
  assert.equal(fit.scale, 1080 / REFERENCE_CANVAS.height);
  assert.ok(fit.offsetX > 0, 'expected vertical letterbox bars');
  assert.equal(fit.offsetY, 0);
  assert.ok(fit.width <= 2400);
});

test('a degenerate surface falls back to the reference canvas instead of dividing by zero', () => {
  const fit = fitCanvas(0, 0);
  assert.equal(fit.scale, 1);
  assert.ok(Number.isFinite(fit.offsetX));
  assert.ok(Number.isFinite(fit.offsetY));
});

test('screen and canvas coordinates round-trip on real phone sizes', () => {
  for (const [w, h] of [
    [2340, 1080],
    [1920, 1080],
    [1600, 720],
    [2778, 1284],
    [1024, 768],
  ]) {
    const fit = fitCanvas(w, h);
    for (const [cx, cy] of [
      [0, 0],
      [960, 540],
      [1920, 1080],
      [430, 880],
    ]) {
      const screen = canvasToScreen(fit, cx, cy);
      const back = screenToCanvas(fit, screen.x, screen.y);
      assert.ok(Math.abs(back.x - cx) < 1e-6, `x drifted at ${w}x${h}`);
      assert.ok(Math.abs(back.y - cy) < 1e-6, `y drifted at ${w}x${h}`);
    }
  }
});

test('the centre of the surface is the centre of the canvas', () => {
  const fit = fitCanvas(2340, 1080);
  const centre = screenToCanvas(fit, 2340 / 2, 1080 / 2);
  assert.ok(Math.abs(centre.x - REFERENCE_CANVAS.width / 2) < 1e-6);
  assert.ok(Math.abs(centre.y - REFERENCE_CANVAS.height / 2) < 1e-6);
});

test('a fresh viewport is inert rather than zero-sized', () => {
  const viewport = createViewport();
  assert.equal(viewport.width, REFERENCE_CANVAS.width);
  assert.equal(viewport.height, REFERENCE_CANVAS.height);
  assert.equal(viewport.pageX, 0);
  assert.equal(viewport.pageY, 0);
});

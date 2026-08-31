/**
 * Pack 1 scene composition (M6B).
 *
 * These are presentation rules, but they decide whether the player can see the
 * thing they are supposed to hit, so they are worth asserting without a
 * renderer. Nothing here may become gameplay truth: the tests check that the
 * composition follows the domain's anchors, never the other way round.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CROWD_BACK_RECT,
  CROWD_FRONT_RECT,
  DRUM_KIT_RECT,
  PERFORMER_BASELINE_Y,
  PERFORMER_FRAME,
  absolute,
  isNearField,
  partitionByDepth,
  performerRect,
} from '../game/rendering/composition.ts';
import {
  PERFORMER_ANCHORS,
  REFERENCE_CANVAS,
  STAGE,
  VOCALIST_BLOCKING_RECT,
} from '../game/config/stage.ts';
import { PERFORMER_IDS } from '../game/systems/stageMotion.ts';
import { createRound, startRound, targetViews, tickRound } from '../game/state/roundState.ts';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

test('a rect becomes an absolutely positioned style, not a bare x/y object', () => {
  assert.deepEqual(absolute({ x: 12, y: 34, width: 56, height: 78 }), {
    position: 'absolute',
    left: 12,
    top: 34,
    width: 56,
    height: 78,
  });
});

test('no layer is handed to a style as a bare rect', () => {
  // The defect this guards, seen on device: React Native ignores `x`/`y` and
  // lays an image out in flow without `position: 'absolute'`, so the two crowd
  // bands and the drum kit stacked down the screen instead of being placed.
  const renderer = readFileSync(join(repoRoot, 'game/rendering/SceneRenderer.tsx'), 'utf8');
  const bare = [...renderer.matchAll(/style=\{([A-Z][A-Z0-9_]*)\}/g)].map((match) => match[1]);
  assert.deepEqual(bare, [], `these rects need absolute(): ${bare.join(', ')}`);
});

test('the band shares one floor line, so nobody floats above the stage', () => {
  for (const id of PERFORMER_IDS) {
    const rect = performerRect(id);
    assert.equal(rect.y + rect.height, PERFORMER_BASELINE_Y, `${id} stands off the shared floor`);
  }
});

test('a performer frame is centred on the anchor that reaction proximity uses', () => {
  for (const id of PERFORMER_IDS) {
    const rect = performerRect(id);
    assert.equal(rect.x + rect.width / 2, PERFORMER_ANCHORS[id].x);
  }
});

test('the performer frame keeps the authored 640x900 aspect, so nobody is squashed', () => {
  const authored = 640 / 900;
  const drawn = PERFORMER_FRAME.width / PERFORMER_FRAME.height;
  assert.ok(Math.abs(drawn - authored) < 0.005, `frame aspect ${drawn} is not ${authored}`);
});

test('the idle vocalist stays inside the drum kit sightline', () => {
  const rect = performerRect('vocalist');
  assert.ok(rect.x >= 700 && rect.x + rect.width <= 1150, 'vocalist spills out of the corridor');
});

test('the blocking vocalist covers the tap region the domain owns', () => {
  // The event visual must not be smaller than the rectangle hit resolution
  // reads, or the player swings at empty stage and it counts.
  assert.ok(VOCALIST_BLOCKING_RECT.height >= performerRect('vocalist').height);
});

test('the drum kit sits on the bottom edge at the size the art was authored at', () => {
  assert.equal(DRUM_KIT_RECT.x, 0);
  assert.equal(DRUM_KIT_RECT.width, REFERENCE_CANVAS.width);
  assert.equal(DRUM_KIT_RECT.y + DRUM_KIT_RECT.height, REFERENCE_CANVAS.height);
});

test('the crowd layers span the canvas and stay behind the drummer', () => {
  for (const rect of [CROWD_BACK_RECT, CROWD_FRONT_RECT]) {
    assert.equal(rect.x, 0);
    assert.equal(rect.width, REFERENCE_CANVAS.width);
    assert.ok(rect.y < STAGE.dangerLineY);
  }
  assert.ok(CROWD_FRONT_RECT.y > CROWD_BACK_RECT.y, 'the front crowd should sit nearer');
});

test('the near line is between the throw origin and the danger line', () => {
  assert.ok(STAGE.drumkitNearY > STAGE.vanishingPoint.y);
  assert.ok(STAGE.drumkitNearY < STAGE.dangerLineY);
});

test('a target arriving at the drummer is in front of the kit, a far one behind it', () => {
  assert.equal(isNearField(STAGE.dangerLineY), true);
  assert.equal(isNearField(STAGE.vanishingPoint.y), false);
});

test('the split keeps every item exactly once and preserves order', () => {
  const items = [{ y: 100 }, { y: 900 }, { y: 200 }, { y: 800 }];
  const { far, near } = partitionByDepth(items, (item) => item.y);
  assert.deepEqual(far, [{ y: 100 }, { y: 200 }]);
  assert.deepEqual(near, [{ y: 900 }, { y: 800 }]);
  assert.equal(far.length + near.length, items.length);
});

test('the last stretch of every flight is drawn in front of the kit', () => {
  // The defect this rule exists for: with the whole projectile layer behind
  // the kit, the biggest, nearest, most urgent moment of a throw was hidden.
  const round = createRound();
  startRound(round);
  const lateAndFar: string[] = [];
  for (let elapsed = 0; elapsed < 60_000; elapsed += 16) {
    tickRound(round, 16);
    round.integrity = round.level.startingIntegrity;
    if (round.state === 'SHOW_RUINED') round.state = 'PLAYING';
    for (const view of targetViews(round)) {
      if (view.status === 'active' && view.progress > 0.95 && !isNearField(view.y)) {
        lateAndFar.push(`${view.kind} at y=${view.y.toFixed(0)}`);
      }
    }
  }
  assert.deepEqual(lateAndFar, [], 'an arriving target would still be hidden by the kit');
});

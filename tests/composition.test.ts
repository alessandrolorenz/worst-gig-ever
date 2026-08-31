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
  DRUM_KIT_DROP,
  DRUM_KIT_RECT,
  PERFORMER_BASELINE_Y,
  PERFORMER_FRAME,
  absolute,
  isNearField,
  partitionByDepth,
  performerRect,
  targetVisibleReach,
} from '../game/rendering/composition.ts';
import {
  PERFORMER_ANCHORS,
  REFERENCE_CANVAS,
  STAGE,
  VOCALIST_BLOCKING_RECT,
} from '../game/config/stage.ts';
import { PERFORMER_IDS } from '../game/systems/stageMotion.ts';
import {
  createRound,
  effectiveHitRadius,
  startRound,
  targetViews,
  tickRound,
} from '../game/state/roundState.ts';

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

test('the drum kit spans the canvas at the size the art was authored at', () => {
  assert.equal(DRUM_KIT_RECT.x, 0);
  assert.equal(DRUM_KIT_RECT.width, REFERENCE_CANVAS.width);
  assert.equal(DRUM_KIT_RECT.height, 700);
});

test('the crowd runs in depth order behind the band: front row, then rear', () => {
  // The defect this guards: placed flush, the band's feet sat *above* both
  // crowd rows and the front row's above the rear row's, so the nearer
  // figures read as standing on the heads of the ones behind them. Whoever is
  // nearer stands lower on screen.
  //
  // The front row's lower edge is the one exception, and it is padding rather
  // than a ground line: the row is drawn taller than the rear one and its box
  // hangs past the band's floor into the strip the foreground kit covers, so
  // the figures inside it stop well above the edge. Its *top* is what orders
  // it against the rear row.
  const bandFloor = PERFORMER_BASELINE_Y;
  const frontFloor = CROWD_FRONT_RECT.y + CROWD_FRONT_RECT.height;
  const backFloor = CROWD_BACK_RECT.y + CROWD_BACK_RECT.height;
  assert.ok(bandFloor > backFloor, `band floor ${bandFloor} is not below the rear crowd`);
  assert.ok(
    CROWD_FRONT_RECT.y > CROWD_BACK_RECT.y,
    `front crowd top ${CROWD_FRONT_RECT.y} is not below the rear crowd's`,
  );
  assert.ok(frontFloor > backFloor, `front crowd floor ${frontFloor} is not below the rear crowd`);
});

test('the band stands on the stage and the crowd starts beyond its lip', () => {
  // The wooden stage in `stage_bg_base.png` starts around y=828. Both rows
  // begin above it, out on the venue floor; only the rear row's box edge
  // reaches past it, into the band's own feet, where the bitmap's transparent
  // padding is all that is left of it.
  const stageLipY = 828;
  assert.ok(PERFORMER_BASELINE_Y > stageLipY, 'the band is standing in the pit');
  for (const rect of [CROWD_BACK_RECT, CROWD_FRONT_RECT]) {
    assert.ok(rect.y < stageLipY, `a crowd row starts at ${rect.y}, on the stage boards`);
  }
  assert.ok(
    CROWD_BACK_RECT.y + CROWD_BACK_RECT.height <= PERFORMER_BASELINE_Y,
    'the rear crowd stands lower than the band',
  );
});

test('the crowd layers span the canvas and stay behind the drummer', () => {
  for (const rect of [CROWD_BACK_RECT, CROWD_FRONT_RECT]) {
    assert.equal(rect.x, 0);
    assert.equal(rect.width, REFERENCE_CANVAS.width);
    assert.ok(rect.y < STAGE.dangerLineY);
  }
  assert.ok(CROWD_FRONT_RECT.y > CROWD_BACK_RECT.y, 'the front crowd should sit nearer');
});

test('a target is never drawn larger than the circle that can be tapped', () => {
  // The rule this enforces: art may be enlarged for readability, but the
  // moment visible pixels reach outside the tap radius the player is aiming
  // at something that is not there. Hit radii stay in `game/config`; this only
  // holds the drawing to them (M6B, "visual asset bounds must not silently
  // alter difficulty").
  for (const kind of ['beerBottle', 'beerMug'] as const) {
    for (let scale = 0.2; scale <= 1.001; scale += 0.05) {
      const reach = targetVisibleReach(kind, scale);
      const radius = effectiveHitRadius(kind, scale);
      assert.ok(
        reach <= radius,
        `${kind} at scale ${scale.toFixed(2)}: art reaches ${reach.toFixed(1)}px, ` +
          `tap radius is ${radius.toFixed(1)}px`,
      );
    }
  }
});

test('the mug is drawn bigger than the bottle, as its hit radius already says', () => {
  assert.ok(
    targetVisibleReach('beerMug', 1) > targetVisibleReach('beerBottle', 1),
    'the bigger target should not be the smaller drawing',
  );
});

test('the drum kit is dropped below the canvas and the near line follows it', () => {
  assert.ok(DRUM_KIT_DROP > 0, 'the kit should sit lower than a flush bottom anchor');
  assert.equal(DRUM_KIT_RECT.y, REFERENCE_CANVAS.height - 700 + DRUM_KIT_DROP);
  assert.ok(
    DRUM_KIT_RECT.y + DRUM_KIT_RECT.height > REFERENCE_CANVAS.height,
    'the nearest shells should run off the bottom edge',
  );
  // The kit's solid mass begins ~362px into the art. The near line has to sit
  // at or above it, or an arriving object is drawn inside the drums.
  assert.ok(
    STAGE.drumkitNearY <= DRUM_KIT_RECT.y + 360,
    'the near line is below the drums, so an arriving target would be hidden',
  );
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
  const far1 = { y: STAGE.drumkitNearY - 200 };
  const far2 = { y: STAGE.drumkitNearY - 1 };
  const near1 = { y: STAGE.drumkitNearY };
  const near2 = { y: STAGE.drumkitNearY + 40 };
  const { far, near } = partitionByDepth([far1, near1, far2, near2], (item) => item.y);
  assert.deepEqual(far, [far1, far2]);
  assert.deepEqual(near, [near1, near2]);
  assert.equal(far.length + near.length, 4);
});

test('every flight crosses into the near field before it reaches the drummer', () => {
  // The defect this rule exists for: with the whole projectile layer behind
  // the kit, the biggest, nearest, most urgent moment of a throw was hidden.
  // What matters is that the swap has happened by the time the object arrives,
  // so the decisive moment is drawn in front of the kit rather than inside it.
  const round = createRound();
  startRound(round);
  const deepestY = new Map<number, number>();
  const landed = new Set<number>();
  for (let elapsed = 0; elapsed < 60_000; elapsed += 16) {
    tickRound(round, 16);
    round.integrity = round.level.startingIntegrity;
    if (round.state === 'SHOW_RUINED') round.state = 'PLAYING';
    for (const view of targetViews(round)) {
      if (view.status === 'active') {
        deepestY.set(view.id, Math.max(deepestY.get(view.id) ?? 0, view.y));
      } else {
        // Only completed flights can be judged; whatever is still in the air
        // when the clock runs out simply never got there.
        landed.add(view.id);
      }
    }
  }
  assert.ok(landed.size > 10, 'expected a round to land a useful number of targets');
  const stranded = [...deepestY.entries()]
    .filter(([id, y]) => landed.has(id) && !isNearField(y))
    .map(([id, y]) => `target ${id} only reached y=${y.toFixed(0)}`);
  assert.deepEqual(stranded, [], 'a target arrived while still drawn behind the kit');
});

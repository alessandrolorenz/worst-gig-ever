import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';

import { GROOVE_PAD } from '../game/config/rhythm.ts';
import { REFERENCE_CANVAS } from '../game/config/stage.ts';
import { PAD_SURFACE } from '../game/rendering/hudLayout.ts';
import { TARGET_DRAW_SIZE } from '../game/rendering/composition.ts';
import { spriteTransform } from '../game/rendering/spriteTransform.ts';

test('pad surface includes the full hit ellipse plus all pulse/flash strokes', () => {
  assert.equal(PAD_SURFACE.x + PAD_SURFACE.width / 2, GROOVE_PAD.centerX);
  assert.equal(PAD_SURFACE.y + PAD_SURFACE.height / 2, GROOVE_PAD.centerY);
  assert.ok(PAD_SURFACE.width / 2 >= GROOVE_PAD.halfWidthPx + 5);
  assert.ok(PAD_SURFACE.height / 2 >= GROOVE_PAD.halfHeightPx + 5);
});

test('pad raster surface uses less than 8% of a full reference canvas', () => {
  assert.ok(PAD_SURFACE.width * PAD_SURFACE.height < REFERENCE_CANVAS.width * REFERENCE_CANVAS.height * 0.08);
});

test('pad viewBox preserves canvas coordinates in the tight native surface', () => {
  const source = readFileSync(new URL('../game/rendering/GroovePad.tsx', import.meta.url), 'utf8');
  assert.match(source, /width=\{PAD_SURFACE.width\}/);
  assert.match(source, /height=\{PAD_SURFACE.height\}/);
  assert.match(source, /viewBox=\{`\$\{PAD_SURFACE.x\} \$\{PAD_SURFACE.y\}/);
  assert.match(source, /absolute\(PAD_SURFACE\)/);
});

test('moving and scaling targets leaves native layout boxes constant', () => {
  for (const size of Object.values(TARGET_DRAW_SIZE)) {
    for (const scale of [0.2, 0.45, 0.5, 1, 1.3]) {
      const style = spriteTransform(975, 650, size.width, size.height, scale, 1.7);
      assert.equal(style.width, size.width);
      assert.equal(style.height, size.height);
      assert.equal(style.left, -size.width / 2);
      assert.equal(style.top, -size.height / 2);
      assert.deepEqual(style.transform, [{ translateX: 975 }, { translateY: 650 }, { rotate: '1.7rad' }, { scale }]);
    }
  }
});

test('transform composition preserves every target corner at all scales and rotations', () => {
  for (const size of Object.values(TARGET_DRAW_SIZE)) {
    for (const scale of [0.2, 0.45, 0.5, 1]) {
      for (const angle of [-3, -1, 0, 1.5, 3]) {
        const style = spriteTransform(650, 740, size.width, size.height, scale, angle);
        const cos = Math.cos(angle), sin = Math.sin(angle);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
          // Original: resized layout box, centered at world x/y, then rotated.
          const oldX = 650 + cos * sx * size.width * scale / 2 - sin * sy * size.height * scale / 2;
          const oldY = 740 + sin * sx * size.width * scale / 2 + cos * sy * size.height * scale / 2;
          // New: fixed box centered at zero, scaled and rotated, then translated.
          const localX = sx * style.width / 2 * scale;
          const localY = sy * style.height / 2 * scale;
          assert.ok(Math.abs(oldX - (650 + cos * localX - sin * localY)) < 1e-9);
          assert.ok(Math.abs(oldY - (740 + sin * localX + cos * localY)) < 1e-9);
        }
      }
    }
  }
});

test('pose memo boundaries receive scalar values, not mutable domain objects', () => {
  const source = readFileSync(new URL('../game/rendering/SceneRenderer.tsx', import.meta.url), 'utf8');
  for (const name of ['FrameStack', 'BandMember', 'Vocalist', 'DrumKit', 'StageBackground', 'BackCrowd', 'FrontCrowd']) {
    assert.ok(source.includes(`const ${name} = memo(function ${name}`), `${name} must not rerender every engine tick`);
  }
  assert.match(source, /<Vocalist status=\{round.vocalist.status\}/);
  assert.doesNotMatch(source, /<Vocalist round=/);
  assert.match(source, /<FrontCrowd frame=\{ambientFrame\(crowdFrame\)\}/);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { TARGET_DRAW_SIZE, targetVisibleSize } from '../game/rendering/composition.ts';

test('runtime target content measurements match the production PNG pixels', () => {
  for (const [kind, file] of [['beerBottle', 'beer_bottle'], ['beerMug', 'beer_mug']]) {
    const png = PNG.sync.read(readFileSync(`assets/art/props/${file}.png`));
    let left = png.width, top = png.height, right = -1, bottom = -1;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        if (png.data[(y * png.width + x) * 4 + 3] <= 8) continue;
        left = Math.min(left, x); right = Math.max(right, x);
        top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    const box = TARGET_DRAW_SIZE[kind];
    const fit = Math.min(box.width / png.width, box.height / png.height);
    assert.deepEqual(targetVisibleSize(kind, 1), {
      width: (right - left + 1) * fit,
      height: (bottom - top + 1) * fit,
    }, kind);
  }
});

test('art continuity gate rejects a fully transparent frame', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wge-art-gate-'));
  try {
    mkdirSync(join(dir, 'band'));
    writeFileSync(join(dir, 'band/vocalist_idle.png'), PNG.sync.write(new PNG({ width: 640, height: 900 })));
    const run = spawnSync(process.execPath, ['scripts/measure-art-bounds.mjs', '--overlay-root', dir, '--require-continuity'], { encoding: 'utf8' });
    assert.equal(run.status, 1);
    assert.match(run.stdout, /vocalist.*FAIL.*fully transparent/);
    assert.doesNotMatch(run.stdout, /PASS_AMBIENT_LOOP_READY/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('art measurement rejects an overlay flag without a directory', () => {
  const run = spawnSync(process.execPath, ['scripts/measure-art-bounds.mjs', '--overlay-root', '--require-continuity'], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /requires a directory/);
});

test('PNG enlargement clamps edge samples without color extrapolation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'wge-art-resize-'));
  try {
    const source = new PNG({ width: 2, height: 1 });
    source.data.set([100, 100, 100, 255, 200, 200, 200, 255]);
    const input = join(dir, 'input.png');
    const output = join(dir, 'output.png');
    writeFileSync(input, PNG.sync.write(source));
    const run = spawnSync(process.execPath, ['scripts/resize-png.mjs', '--input', input, '--output', output, '--width', '4', '--height', '2'], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    const resized = PNG.sync.read(readFileSync(output));
    assert.deepEqual([...resized.data.subarray(0, 4)], [100, 100, 100, 255]);
    assert.deepEqual([...resized.data.subarray(12, 16)], [200, 200, 200, 255]);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/** M29 — the Crowd Mode art-slot manifest, its placeholders and its written contract. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from 'image-size';

import {
  CROWD_ART_DIRECTORY,
  CROWD_ART_SLOTS,
  type CrowdArtSlot,
} from '../game/crowd/crowdArtSlots.ts';
import { CROWD_CANVAS, CROWD_STAGE_TARGETS } from '../game/crowd/crowdConfig.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nodeRequire = createRequire(import.meta.url);
const { PNG } = nodeRequire('pngjs') as {
  PNG: { sync: { read: (bytes: Buffer) => { data: Buffer } } };
};
const slots: readonly (readonly [string, CrowdArtSlot])[] = Object.entries(CROWD_ART_SLOTS);
const placeholders = readFileSync(join(repoRoot, 'game/crowd/CrowdPlaceholders.tsx'), 'utf8');
const contract = readFileSync(
  join(repoRoot, 'docs/assets/CROWD-MODE-ASSET-CONTRACT.md'),
  'utf8',
);
const registry = readFileSync(join(repoRoot, 'game/crowd/crowdArt.ts'), 'utf8');
const scene = readFileSync(join(repoRoot, 'game/crowd/CrowdScene.tsx'), 'utf8');
const requiredSlots = slots.filter(([, slot]) => slot.required);

test('M29 art slots: every slot names one unique file in the Crowd Mode art directory', () => {
  const files = slots.map(([, slot]) => slot.expectedFile);
  assert.equal(new Set(files).size, files.length);
  for (const [id, slot] of slots) {
    assert.ok(slot.expectedFile.startsWith(`${CROWD_ART_DIRECTORY}/`), id);
    assert.match(slot.expectedFile, slot.transparent ? /\.png$/ : /\.jpg$/, id);
  }
});

test('M29 art slots: a file on disk and a slot status never disagree', () => {
  for (const [id, slot] of slots) {
    const present = existsSync(join(repoRoot, slot.expectedFile));
    assert.equal(
      present,
      slot.status === 'integrated',
      `${id}: ${slot.expectedFile} is ${present ? 'present' : 'absent'} but the slot says ${slot.status}`,
    );
  }
});

test('M29 art slots: every box is drawn on the canvas and every anchor is inside its box', () => {
  for (const [id, slot] of slots) {
    assert.ok(slot.box.width > 0 && slot.box.height > 0, id);
    assert.ok(slot.box.x >= 0 && slot.box.x + slot.box.width <= CROWD_CANVAS.width, id);
    assert.ok(slot.box.y >= 0 && slot.box.y + slot.box.height <= CROWD_CANVAS.height, id);
    assert.ok(slot.anchor.x >= 0 && slot.anchor.x <= 1 && slot.anchor.y >= 0 && slot.anchor.y <= 1, id);
  }
});

test('M29 art slots: every placeholder a slot names exists, in the one placeholder file', () => {
  for (const [id, slot] of slots) {
    if (!slot.placeholder.startsWith('Crowd')) continue;
    assert.ok(
      placeholders.includes(`export function ${slot.placeholder}(`),
      `${id}: ${slot.placeholder} is not exported by CrowdPlaceholders.tsx`,
    );
  }
});

test('M29 art slots: every destructible target has art to fall, wobble or break', () => {
  const covered = JSON.stringify(slots.map(([, slot]) => slot.shownWhen));
  for (const target of CROWD_STAGE_TARGETS) {
    assert.ok(covered.includes(target.id), `${target.id} has no art slot`);
  }
});

test('M29 art slots: the written contract covers every slot by id and by file name', () => {
  for (const [id, slot] of slots) {
    assert.ok(contract.includes(`\`${id}\``), `contract does not name slot ${id}`);
    assert.ok(contract.includes(slot.expectedFile.split('/').at(-1)!), `contract omits ${slot.expectedFile}`);
  }
});

test('M31 art: every required runtime file has its exact authored size and real transparency', () => {
  assert.equal(requiredSlots.length, 15);
  for (const [id, slot] of requiredSlots) {
    const filePath = join(repoRoot, slot.expectedFile);
    const dimensions = imageSize(readFileSync(filePath));
    assert.equal(dimensions.width, slot.box.width, `${id} width`);
    assert.equal(dimensions.height, slot.box.height, `${id} height`);
    if (!slot.transparent) continue;
    const png = PNG.sync.read(readFileSync(filePath));
    let transparentPixels = 0;
    for (let index = 3; index < png.data.length; index += 4) {
      if (png.data[index] === 0) transparentPixels += 1;
    }
    assert.ok(transparentPixels > 0, `${id} has no fully transparent pixels`);
  }
});

test('M31 art: Metro statically registers every required Crowd file', () => {
  for (const [id, slot] of requiredSlots) {
    assert.ok(
      registry.includes(`'../../${slot.expectedFile}'`),
      `${id}: ${slot.expectedFile} is not statically required`,
    );
  }
});

test('M31 art: production Crowd rendering no longer borrows the story still or knockout patches', () => {
  assert.doesNotMatch(placeholders, /STORY_ART|CrowdKnockoutPatch|knockout/);
  assert.doesNotMatch(scene, /CrowdKnockoutPatch/);
  assert.match(placeholders, /CROWD_ART\.stagePlate/);
});

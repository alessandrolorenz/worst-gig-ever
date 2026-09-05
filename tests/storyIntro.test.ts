/**
 * M15 — the opening story.
 *
 * The story is a pure domain ticked by the engine, so its pacing, its skip
 * behaviour and its end condition are all assertable without a renderer
 * (AGENTS.md rule 4). What is deliberately *not* asserted here is the
 * crossfade: it is a native-driven animation with no domain consequence.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  advanceStory,
  clearStory,
  createStory,
  currentPanel,
  MAX_STORY_TICK_MS,
  skipStory,
  storyProgress,
  STORY_PANELS,
  tickStory,
} from '../game/state/storyState.ts';
import { en } from '../game/i18n/catalogues/en.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// The sequence
// ---------------------------------------------------------------------------

test('the story is the five owner-supplied beats, in narrative order', () => {
  assert.deepEqual(
    STORY_PANELS.map((panel) => panel.id),
    ['poster', 'arrival', 'setup', 'performance', 'soundDesk'],
  );
});

test('every panel has a caption and a positive hold', () => {
  // M19: the caption moved to the catalogue, keyed by the same panel id the
  // JPEG registry uses. The pairing is what is asserted; the panel itself no
  // longer carries English.
  for (const panel of STORY_PANELS) {
    assert.ok(en.story[panel.id].trim().length > 0, `${panel.id} has no caption`);
    assert.ok(panel.holdMs > 0, `${panel.id} would never advance`);
  }
});

test('a fresh story starts on the first panel with nothing elapsed', () => {
  const story = createStory();
  assert.equal(story.index, 0);
  assert.equal(story.panelElapsedMs, 0);
  assert.equal(story.finished, false);
  assert.equal(currentPanel(story)?.id, 'poster');
});

test('a panel holds for its full duration and not a tick less', () => {
  const story = createStory();
  const hold = STORY_PANELS[0].holdMs;

  // Run to one millisecond short of the deadline, in legal steps.
  let elapsed = 0;
  while (elapsed < hold - 1) {
    const slice = Math.min(MAX_STORY_TICK_MS, hold - 1 - elapsed);
    tickStory(story, slice);
    elapsed += slice;
  }
  assert.equal(story.index, 0, 'the panel advanced early');

  tickStory(story, 1);
  assert.equal(story.index, 1, 'the panel did not advance on its own deadline');
});

test('the story plays through to the end by itself', () => {
  const story = createStory();
  const seen: string[] = [];

  for (let guard = 0; guard < 10_000 && !story.finished; guard += 1) {
    const panel = currentPanel(story);
    if (panel !== null && seen[seen.length - 1] !== panel.id) seen.push(panel.id);
    tickStory(story, 16);
  }

  assert.equal(story.finished, true, 'the story never ended');
  assert.deepEqual(seen, STORY_PANELS.map((panel) => panel.id), 'a panel was skipped');
  assert.equal(storyProgress(story), 1);
});

test('finishing emits exactly one STORY_FINISHED, however long the tail tick is', () => {
  const story = createStory();
  let finishes = 0;
  for (let guard = 0; guard < 10_000; guard += 1) {
    finishes += tickStory(story, 40).filter((event) => event.type === 'STORY_FINISHED').length;
  }
  assert.equal(finishes, 1, 'the end of the story fired more than once');
});

// ---------------------------------------------------------------------------
// Tick size must not change what the player sees
// ---------------------------------------------------------------------------

test('one tick can never advance more than one panel', () => {
  const story = createStory();
  // Far longer than every panel put together. The cap alone would hold it, and
  // `goToNextPanel` is called at most once per tick regardless.
  tickStory(story, 60_000);
  assert.ok(story.index <= 1, 'a slow frame ate panels the player never saw');
  assert.equal(story.finished, false);
});

test('a backgrounded app cannot run the story while it is away', () => {
  const story = createStory();
  // A single enormous delta, as the engine delivers after a long background.
  tickStory(story, 5 * 60_000);

  assert.equal(story.index, 0, 'the story advanced while the app was not visible');
  assert.equal(
    story.panelElapsedMs,
    MAX_STORY_TICK_MS,
    'the step was not clamped to the tick cap',
  );
  assert.ok(
    MAX_STORY_TICK_MS <= 100,
    'the story cap must stay at or under the round clock cap',
  );
});

test('the same story reaches the same panel at any tick size', () => {
  const stepSizes = [8, 16, 33, 50, 97];
  const results = stepSizes.map((step) => {
    const story = createStory();
    let elapsed = 0;
    // Run to a fixed point three panels in, in different-sized steps.
    const target = STORY_PANELS[0].holdMs + STORY_PANELS[1].holdMs + 100;
    while (elapsed < target) {
      const slice = Math.min(step, target - elapsed);
      tickStory(story, slice);
      elapsed += slice;
    }
    return story.index;
  });
  assert.equal(new Set(results).size, 1, `panel index depended on tick size: ${results}`);
  assert.equal(results[0], 2);
});

// ---------------------------------------------------------------------------
// The player's controls
// ---------------------------------------------------------------------------

test('a tap shows the next panel immediately', () => {
  const story = createStory();
  tickStory(story, 100);
  const events = advanceStory(story);

  assert.equal(story.index, 1);
  assert.equal(story.panelElapsedMs, 0, 'the new panel inherited the old one`s elapsed time');
  assert.deepEqual(events, [{ type: 'PANEL_CHANGED', index: 1 }]);
});

test('tapping through the last panel finishes the story', () => {
  const story = createStory();
  for (let i = 0; i < STORY_PANELS.length - 1; i += 1) advanceStory(story);
  assert.equal(story.finished, false, 'the story ended a panel early');

  const events = advanceStory(story);
  assert.equal(story.finished, true);
  assert.deepEqual(events, [{ type: 'STORY_FINISHED' }]);
});

test('skip ends the story from anywhere, exactly once', () => {
  const story = createStory();
  tickStory(story, 500);

  assert.deepEqual(skipStory(story), [{ type: 'STORY_FINISHED' }]);
  assert.equal(story.finished, true);
  assert.equal(currentPanel(story), null);

  // A second skip is inert rather than a second finish.
  assert.deepEqual(skipStory(story), []);
});

test('a finished story ignores ticks and taps', () => {
  const story = createStory();
  skipStory(story);
  const snapshot = { ...story };

  assert.deepEqual(tickStory(story, 5000), []);
  assert.deepEqual(advanceStory(story), []);
  assert.deepEqual({ ...story }, snapshot, 'a finished story changed');
});

test('clearing restores a story in place, so replay starts at the poster', () => {
  const story = createStory();
  skipStory(story);
  clearStory(story);

  assert.deepEqual(story, createStory());
  assert.equal(currentPanel(story)?.id, 'poster');
});

// ---------------------------------------------------------------------------
// The stills themselves
// ---------------------------------------------------------------------------

/*
 * Read as source text rather than imported. `storyAssets.ts` is the module
 * that names files with Metro's static `require`, which does not exist in the
 * ESM test runner — the same reason `artAssets.ts` is not imported by a test
 * either. The pairing is still what is being asserted.
 */
test('every panel has a still, and no still is orphaned', () => {
  const source = readFileSync(join(repoRoot, 'game/rendering/storyAssets.ts'), 'utf8');
  const registry = source.slice(source.indexOf('export const STORY_ART'));
  const registered = [...registry.matchAll(/^\s{2}(\w+):\s*require\(/gm)].map((m) => m[1]);

  assert.deepEqual(
    [...registered].sort(),
    STORY_PANELS.map((panel) => panel.id).sort(),
    'the panel list and the image registry have drifted apart',
  );
});

test('the story stills are on disk at the size the screen was designed for', () => {
  const files = [
    '01_poster.jpg',
    '02_arrival.jpg',
    '03_setup.jpg',
    '04_performance.jpg',
    '05_sound_desk.jpg',
  ];

  for (const file of files) {
    const bytes = readFileSync(join(repoRoot, 'assets/art/story', file));
    // JPEG SOI marker.
    assert.equal(bytes[0], 0xff, `${file} is not a JPEG`);
    assert.equal(bytes[1], 0xd8, `${file} is not a JPEG`);

    const { width, height } = readJpegSize(bytes, file);
    assert.equal(width, 1600, `${file} is ${width} wide`);
    assert.equal(height, 900, `${file} is ${height} tall`);
    // 16:9, matching the reference canvas the rest of the game is authored to.
    assert.ok(Math.abs(width / height - 16 / 9) < 0.01, `${file} is not 16:9`);

    /*
     * A budget rather than a measurement: these five are the largest files in
     * the bundle and they exist only to be looked at for four seconds each.
     * The PNG originals were 2.3 MB *apiece*.
     */
    assert.ok(bytes.length < 800_000, `${file} is ${bytes.length} bytes, over the 800 KB budget`);
  }
});

test('the manifest records every still, and records it correctly', () => {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, 'assets/manifest/asset-manifest.json'), 'utf8'),
  ) as {
    assets: Record<string, unknown>;
    story: { frame: { width: number; height: number }; panels: Record<string, {
      path: string;
      width: number;
      height: number;
      format: string;
      transparency: string;
      source: string;
      provenance: string;
    }> };
  };

  assert.deepEqual(
    Object.keys(manifest.story.panels).sort(),
    STORY_PANELS.map((panel) => panel.id).sort(),
    'the manifest and the story disagree about which panels exist',
  );

  for (const [id, entry] of Object.entries(manifest.story.panels)) {
    assert.equal(entry.width, manifest.story.frame.width, `${id} declares an off-frame width`);
    assert.equal(entry.height, manifest.story.frame.height, `${id} declares an off-frame height`);
    assert.equal(entry.format, 'jpeg');
    assert.equal(entry.transparency, 'opaque');
    // AGENTS.md rules 13 and 14: every asset names its source and its record.
    assert.ok(entry.source.length > 0, `${id} has no source image recorded`);
    assert.ok(entry.provenance.length > 0, `${id} has no provenance record`);
    assert.ok(readFileSync(join(repoRoot, entry.path)).length > 0, `${id} is not on disk`);
  }
});

/*
 * The story stills must stay out of the Pack 1 gameplay contract. That map is
 * asserted at exactly 35 production entries by `assetsContract.test.ts` and is
 * validated as PNG by `validate:art`; a JPEG narrative still in it would fail
 * one gate and silently weaken the other.
 */
test('the story stills are not part of the Pack 1 asset contract', () => {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, 'assets/manifest/asset-manifest.json'), 'utf8'),
  ) as { assets: Record<string, { path?: string }> };

  for (const [key, entry] of Object.entries(manifest.assets)) {
    assert.ok(
      entry.path === undefined || !entry.path.startsWith('assets/art/story/'),
      `${key} put a story still into the Pack 1 contract`,
    );
  }
});

/** Minimal JPEG dimension reader: walk the segments to the frame header. */
function readJpegSize(bytes: Buffer, file: string): { width: number; height: number } {
  let offset = 2;
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xff) throw new Error(`${file}: lost segment alignment`);
    const marker = bytes[offset + 1];
    // SOF0..SOF3 and SOF5..SOF15 carry the frame dimensions; DHT/DAC/DRI do not.
    const isFrameHeader =
      marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    const length = bytes.readUInt16BE(offset + 2);
    if (isFrameHeader) {
      return { height: bytes.readUInt16BE(offset + 5), width: bytes.readUInt16BE(offset + 7) };
    }
    offset += 2 + length;
  }
  throw new Error(`${file}: no frame header found`);
}

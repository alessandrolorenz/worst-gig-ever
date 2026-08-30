/**
 * Spec-contract tests.
 *
 * These lock the declared M1/M2/M3 contracts (round schedule, scoring table,
 * asset naming) against the specs. They contain no gameplay behavior; M4 adds
 * behavioral tests for state transitions, scoring, and the round clock.
 *
 * Run with `npm test` (node:test with native TypeScript type stripping).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

import { level01 } from '../game/levels/level01.ts';
import { COMBO_TIERS, SCORING } from '../game/config/scoring.ts';
import { TARGET_DEFINITIONS } from '../game/config/targets.ts';
import { GAME_STATES, TARGET_KINDS, TARGET_STATUSES } from '../game/state/gameState.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('M1: level01 matches the MVP 01 round configuration', () => {
  assert.equal(level01.durationMs, 60_000);
  assert.equal(level01.startingIntegrity, 3);
  assert.equal(level01.maxConcurrentTargets, 4);
  assert.equal(SCORING.startingScore, 0);
  assert.equal(SCORING.startingCombo, 0);
});

test('M1: the vocalist event is scheduled inside the 38-45s window', () => {
  assert.ok(
    level01.vocalistEventAtMs >= 38_000 && level01.vocalistEventAtMs <= 45_000,
    `vocalistEventAtMs ${level01.vocalistEventAtMs} is outside the specified window`,
  );
  assert.ok(level01.vocalistEventAtMs < level01.durationMs);
});

test('M1: spawn phases are ordered, non-overlapping, and inside the round', () => {
  let previousEnd = 0;
  for (const phase of level01.phases) {
    assert.ok(phase.fromMs >= previousEnd, `phase ${phase.fromMs} overlaps the previous phase`);
    assert.ok(phase.toMs > phase.fromMs, `phase ${phase.fromMs} ends before it starts`);
    assert.ok(phase.toMs <= level01.durationMs, `phase ${phase.fromMs} runs past the round`);
    assert.ok(phase.spawnEveryMs > 0);
    assert.ok(phase.kinds.length > 0);
    previousEnd = phase.toMs;
  }
});

test('M1: spawn pressure increases as the show progresses', () => {
  const intervals = level01.phases.map((phase) => phase.spawnEveryMs);
  const descending = intervals.every((value, i) => i === 0 || value < intervals[i - 1]);
  assert.ok(descending, `spawn intervals should shorten over time, got ${intervals.join(', ')}`);
});

test('M1: target definitions match the specified point values and miss cost', () => {
  assert.equal(TARGET_DEFINITIONS.beerBottle.basePoints, 100);
  assert.equal(TARGET_DEFINITIONS.beerMug.basePoints, 75);
  for (const kind of TARGET_KINDS) {
    assert.equal(TARGET_DEFINITIONS[kind].integrityCostOnMiss, 1);
    assert.ok(TARGET_DEFINITIONS[kind].hitRadiusAtDangerLine > 0);
    assert.ok(TARGET_DEFINITIONS[kind].approachDurationMs > 0);
  }
  // The mug is the wider, slower target (M1, Target types).
  assert.ok(
    TARGET_DEFINITIONS.beerMug.hitRadiusAtDangerLine >
      TARGET_DEFINITIONS.beerBottle.hitRadiusAtDangerLine,
  );
  assert.ok(
    TARGET_DEFINITIONS.beerMug.approachDurationMs >
      TARGET_DEFINITIONS.beerBottle.approachDurationMs,
  );
});

test('M1: the combo table is ordered and matches the specified multipliers', () => {
  assert.deepEqual(
    COMBO_TIERS.map((tier) => [tier.minCombo, tier.multiplier]),
    [
      [0, 1],
      [5, 2],
      [10, 3],
      [20, 4],
    ],
  );
  assert.equal(SCORING.vocalistEventBonus, 500);
});

test('M1/M2: the declared state and target vocabularies are complete', () => {
  assert.deepEqual([...GAME_STATES], [
    'READY',
    'PLAYING',
    'PAUSED',
    'VOCALIST_EVENT',
    'SHOW_COMPLETE',
    'SHOW_RUINED',
  ]);
  assert.deepEqual([...TARGET_KINDS], ['beerBottle', 'beerMug']);
  assert.deepEqual([...TARGET_STATUSES], ['active', 'hit', 'missed']);
});

interface AssetManifest {
  referenceCanvas: { width: number; height: number; orientation: string };
  assets: Record<string, { path: string; kind: string; requiredForMvp: boolean }>;
  audio: Record<string, { path?: string; sourceMidi?: string; runtime?: string; requiredForMvp: boolean }>;
}

const manifest = JSON.parse(
  readFileSync(join(repoRoot, 'assets/manifest/asset-manifest.json'), 'utf8'),
) as AssetManifest;

test('M3: the asset manifest declares a landscape reference canvas', () => {
  assert.equal(manifest.referenceCanvas.width, 1920);
  assert.equal(manifest.referenceCanvas.height, 1080);
  assert.equal(manifest.referenceCanvas.orientation, 'landscape');
});

test('M3: every manifest path is unique and lives under assets/', () => {
  const paths = [
    ...Object.values(manifest.assets).map((entry) => entry.path),
    ...Object.values(manifest.audio).flatMap((entry) =>
      [entry.path, entry.sourceMidi, entry.runtime].filter((p): p is string => Boolean(p)),
    ),
  ];
  for (const path of paths) {
    assert.ok(path.startsWith('assets/'), `${path} is outside assets/`);
  }
  assert.equal(new Set(paths).size, paths.length, 'manifest contains duplicate paths');
});

test('M0-M2: every audio file declared by the manifest is present on disk', () => {
  for (const [key, entry] of Object.entries(manifest.audio)) {
    for (const path of [entry.path, entry.sourceMidi, entry.runtime].filter(
      (p): p is string => Boolean(p),
    )) {
      assert.ok(existsSync(join(repoRoot, path)), `${key}: missing audio file ${path}`);
    }
  }
});

test('M2: no MIDI file is referenced as a runtime asset', () => {
  for (const [key, entry] of Object.entries(manifest.audio)) {
    for (const path of [entry.path, entry.runtime].filter((p): p is string => Boolean(p))) {
      assert.ok(!path.endsWith('.mid'), `${key}: MIDI must not be a runtime asset (${path})`);
    }
  }
});

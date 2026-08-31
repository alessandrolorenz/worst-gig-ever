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
import { FASTBALL_CHANCE, HIT_FORGIVENESS, TARGET_DEFINITIONS } from '../game/config/targets.ts';
import {
  PERFORMER_ANCHORS,
  REFERENCE_CANVAS,
  STAGE,
  STAGE_MOTION,
  THROW_ORIGIN,
} from '../game/config/stage.ts';
import { PERFORMER_IDS } from '../game/systems/stageMotion.ts';
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
    const approach = TARGET_DEFINITIONS[kind].approachMs;
    assert.ok(approach.minMs > 0);
    assert.ok(approach.maxMs > approach.minMs, `${kind} should throw at a range of speeds`);
  }
  // The mug is the wider, slower target (M1, Target types).
  assert.ok(
    TARGET_DEFINITIONS.beerMug.hitRadiusAtDangerLine >
      TARGET_DEFINITIONS.beerBottle.hitRadiusAtDangerLine,
  );
  // Slower at both ends of the range, so the mug is never the faster kind on
  // average however the draw falls.
  assert.ok(TARGET_DEFINITIONS.beerMug.approachMs.minMs > TARGET_DEFINITIONS.beerBottle.approachMs.minMs);
  assert.ok(TARGET_DEFINITIONS.beerMug.approachMs.maxMs > TARGET_DEFINITIONS.beerBottle.approachMs.maxMs);
});

test('2026-08-31 tuning: every kind has a separate, distinctly faster window', () => {
  assert.ok(
    FASTBALL_CHANCE > 0 && FASTBALL_CHANCE < 1,
    'a fastball must be possible, and must not be the normal case',
  );
  for (const kind of TARGET_KINDS) {
    const { approachMs, fastApproachMs } = TARGET_DEFINITIONS[kind];
    assert.ok(fastApproachMs.minMs > 0);
    assert.ok(fastApproachMs.maxMs > fastApproachMs.minMs, `${kind} fastballs never vary`);
    // Separated rather than overlapping: a fastball has to read as a different
    // throw, not as an ordinary one arriving slightly early.
    assert.ok(
      fastApproachMs.maxMs < approachMs.minMs,
      `${kind}'s fast window overlaps its normal one`,
    );
  }
  // The mug stays the slower kind in the fast window too, as it is in the
  // normal one (M1, Target types).
  assert.ok(
    TARGET_DEFINITIONS.beerMug.fastApproachMs.minMs >
      TARGET_DEFINITIONS.beerBottle.fastApproachMs.minMs,
  );
  assert.ok(
    TARGET_DEFINITIONS.beerMug.fastApproachMs.maxMs >
      TARGET_DEFINITIONS.beerBottle.fastApproachMs.maxMs,
  );
  // Harder, not impossible. The whole flight is the player's reaction window,
  // and a throw that crosses the room in under a second is not a difficulty
  // setting, it is a coin toss.
  const fastest = Math.min(...TARGET_KINDS.map((k) => TARGET_DEFINITIONS[k].fastApproachMs.minMs));
  assert.ok(fastest >= 1000, `the hardest throw crosses in ${fastest}ms, inside human reaction`);
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
  assets: Record<
    string,
    { path?: string; aliasOf?: string; kind: string; requiredForMvp: boolean }
  >;
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
    ...Object.values(manifest.assets).flatMap((entry) => (entry.path ? [entry.path] : [])),
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

/* --- M5A: first tuning pass --- */

test('M5A: hit forgiveness is generous but bounded', () => {
  assert.ok(HIT_FORGIVENESS.radiusMultiplier >= 1, 'forgiveness must not shrink a hitbox');
  assert.ok(HIT_FORGIVENESS.minRadiusPx > 0);
  assert.ok(HIT_FORGIVENESS.assistRadiusPx > 0);
  assert.ok(HIT_FORGIVENESS.duplicateTapDistancePx > 0);

  // Generosity has a ceiling: a swing aimed at one lane must never be able to
  // reach an object two lanes away, or the player stops choosing a target.
  const lanePitch = Math.min(
    ...STAGE.laneXs.slice(1).map((x, i) => Math.abs(x - STAGE.laneXs[i])),
  );
  for (const kind of TARGET_KINDS) {
    const reach =
      TARGET_DEFINITIONS[kind].hitRadiusAtDangerLine * HIT_FORGIVENESS.radiusMultiplier +
      HIT_FORGIVENESS.assistRadiusPx;
    assert.ok(reach < lanePitch * 2, `a ${kind} swing reaches two lanes over`);
  }
  assert.ok(HIT_FORGIVENESS.minRadiusPx < lanePitch, 'the floor is wider than a whole lane');
});

test('M5A: every target kind declares a real throw arc', () => {
  for (const kind of TARGET_KINDS) {
    const { arc } = TARGET_DEFINITIONS[kind];
    assert.ok(arc.minHeightPx > 0, `${kind} can still be thrown flat`);
    assert.ok(arc.maxHeightPx >= arc.minHeightPx, `${kind} arc range is inverted`);
    assert.ok(arc.maxDriftPx >= 0);
    assert.ok(arc.maxSpinTurns >= 0);
  }
  // The heavier object lobs flatter and tumbles less than the bottle.
  assert.ok(TARGET_DEFINITIONS.beerMug.arc.maxHeightPx < TARGET_DEFINITIONS.beerBottle.arc.maxHeightPx);
  assert.ok(TARGET_DEFINITIONS.beerMug.arc.maxSpinTurns < TARGET_DEFINITIONS.beerBottle.arc.maxSpinTurns);
});

test('M5A: objects are thrown from the crowd, above the danger line', () => {
  assert.ok(THROW_ORIGIN.minX < THROW_ORIGIN.maxX);
  assert.ok(THROW_ORIGIN.minY < THROW_ORIGIN.maxY);
  assert.ok(THROW_ORIGIN.minX >= 0 && THROW_ORIGIN.maxX <= REFERENCE_CANVAS.width);
  assert.ok(THROW_ORIGIN.maxY < STAGE.dangerLineY, 'objects must be thrown from behind the kit');
  assert.ok(
    THROW_ORIGIN.maxX - THROW_ORIGIN.minX > REFERENCE_CANVAS.width / 2,
    'the throw origin is too narrow to read as a crowd',
  );
});

test('M5A: the ambient stage cadence is playable data, not magic numbers', () => {
  assert.ok(STAGE_MOTION.bpm > 0);
  assert.ok(STAGE_MOTION.loopFrames >= 2 && STAGE_MOTION.loopFrames <= 3, 'M5A wants low-frame loops');
  assert.ok(STAGE_MOTION.beatsPerLoop >= 1);
  assert.ok(STAGE_MOTION.hitReactionMs > 0);
  assert.ok(STAGE_MOTION.dodgeMs > 0);
  assert.ok(STAGE_MOTION.dodgeFromProgress < STAGE_MOTION.dodgeToProgress);
  assert.ok(STAGE_MOTION.dodgeFromProgress >= 0 && STAGE_MOTION.dodgeToProgress <= 1);
});

test('M5A: every performer has an anchor on the stage', () => {
  for (const id of PERFORMER_IDS) {
    const anchor = PERFORMER_ANCHORS[id];
    assert.ok(anchor, `${id} has no anchor`);
    assert.ok(anchor.x >= 0 && anchor.x <= REFERENCE_CANVAS.width, `${id} is off the canvas`);
    assert.ok(anchor.y >= 0 && anchor.y < STAGE.dangerLineY, `${id} stands behind the drummer`);
  }
  const xs = PERFORMER_IDS.map((id) => PERFORMER_ANCHORS[id].x);
  assert.equal(new Set(xs).size, xs.length, 'two performers share a position');
});

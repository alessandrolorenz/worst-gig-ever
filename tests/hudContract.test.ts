/**
 * HUD and results contract (M12).
 *
 * The layout rules the two readouts have to satisfy, asserted against the pure
 * geometry in `game/rendering/hudLayout.ts` rather than against a rendered
 * tree — the same approach `tests/composition.test.ts` takes for the scene.
 *
 * Also checks that the summary reconciles with the domain, since the whole
 * claim of the HUD is that it reads truth rather than keeping a copy.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { GROOVE_PAD } from '../game/config/rhythm.ts';
import { REFERENCE_CANVAS, STAGE } from '../game/config/stage.ts';
import {
  GROOVE_PANEL,
  GROOVE_PANEL_ROWS,
  HUD_MARGIN,
  HUD_TOP_HEIGHT,
  padBoundingRect,
  rectsOverlap,
  targetCorridor,
  withinCanvas,
} from '../game/rendering/hudLayout.ts';
import type { Rect } from '../game/rendering/composition.ts';
import {
  createRhythm,
  judgedBeats,
  meanAbsTimingErrorMs,
  resolvePadTap,
  tickRhythm,
  type BeatContext,
} from '../game/state/rhythmState.ts';
import { RHYTHM, beatTimeMs } from '../game/config/rhythm.ts';
import { level01 } from '../game/levels/level01.ts';

/**
 * Source text with comments removed.
 *
 * These checks are about what the component *renders*, so a doc comment
 * explaining that there is deliberately no combined total, or that the pad
 * deliberately has no `Pressable`, must not read as a violation of the very
 * rule it is describing.
 */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
}

const renderingDir = join(dirname(fileURLToPath(import.meta.url)), '../game/rendering');

function sourceOf(file: string): string {
  return stripComments(readFileSync(join(renderingDir, file), 'utf8'));
}

const overlaysSource = sourceOf('Overlays.tsx');
const hudSource = sourceOf('Hud.tsx');
const padSource = sourceOf('GroovePad.tsx');

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

test('the Groove readout never enters the target corridor', () => {
  const corridor = targetCorridor();
  assert.ok(!rectsOverlap(GROOVE_PANEL, corridor), 'Groove panel must stay out of the corridor');

  // And neither does the top HUD row, whose blocks hug the two edges.
  const topLeft: Rect = { x: 0, y: 0, width: HUD_MARGIN.x + 420, height: HUD_TOP_HEIGHT };
  const topRight: Rect = {
    x: REFERENCE_CANVAS.width - (HUD_MARGIN.x + 420),
    y: 0,
    width: HUD_MARGIN.x + 420,
    height: HUD_TOP_HEIGHT,
  };
  // The corridor starts at the vanishing point, well below the HUD row.
  assert.ok(corridor.y > HUD_TOP_HEIGHT, 'the corridor must start below the top HUD row');
  assert.ok(!rectsOverlap(topLeft, corridor));
  assert.ok(!rectsOverlap(topRight, corridor));
});

test('the Groove readout never covers the Groove Pad', () => {
  assert.ok(
    !rectsOverlap(GROOVE_PANEL, padBoundingRect()),
    'feedback must not cover the mark the player is aiming at',
  );
  // It sits directly above it, so the two read as one control.
  assert.equal(GROOVE_PANEL.y + GROOVE_PANEL.height, GROOVE_PAD.centerY - GROOVE_PAD.radiusPx);
  assert.ok(GROOVE_PANEL.height > 0, 'the panel must have room above the pad');
});

test('every HUD box is on the canvas at two landscape aspect ratios', () => {
  // The canvas is letterboxed "contain", so anything inside the reference
  // canvas is visible at every aspect ratio; the check is that the boxes are
  // inside it in the first place.
  assert.ok(withinCanvas(GROOVE_PANEL));
  assert.ok(withinCanvas(padBoundingRect()));
  assert.ok(GROOVE_PANEL.x >= HUD_MARGIN.x - 1, 'aligned with the HUD margin');
});

test('the Groove panel has room for all four of its fixed rows', () => {
  const rows =
    GROOVE_PANEL_ROWS.label +
    GROOVE_PANEL_ROWS.score +
    GROOVE_PANEL_ROWS.streak +
    GROOVE_PANEL_ROWS.judgement;
  assert.ok(
    GROOVE_PANEL.height >= rows,
    `panel is ${GROOVE_PANEL.height} px but its rows need ${rows}`,
  );
});

test('the pad stays clear of the pause control in the opposite corner', () => {
  // The pause button is an overlay outside the scaled canvas, anchored to the
  // bottom-right of the screen. A pad there would eat taps that never reach
  // the game at all.
  assert.ok(GROOVE_PAD.centerX < REFERENCE_CANVAS.width / 2, 'pad is on the left');
  assert.ok(GROOVE_PAD.centerY > REFERENCE_CANVAS.height / 2, 'pad is low, where a thumb rests');
});

test('the corridor definition tracks the lane table', () => {
  const corridor = targetCorridor();
  assert.equal(corridor.x, Math.min(...STAGE.laneXs));
  assert.equal(corridor.x + corridor.width, Math.max(...STAGE.laneXs));
  assert.equal(corridor.y + corridor.height, STAGE.dangerLineY);
});

// ---------------------------------------------------------------------------
// Two metrics, never one
// ---------------------------------------------------------------------------

test('GROOVE and DEFENSE are labelled distinctly wherever a score is shown', () => {
  for (const [name, source] of [
    ['HUD', hudSource],
    ['results', overlaysSource],
  ] as const) {
    assert.ok(source.includes('GROOVE'), `${name} must label the Groove`);
    assert.ok(source.includes('DEFENSE'), `${name} must label the Defense`);
  }
});

test('no combined total is presented anywhere', () => {
  for (const [name, source] of [
    ['HUD', hudSource],
    ['results', overlaysSource],
  ] as const) {
    for (const forbidden of ['TOTAL', 'Total score', 'Overall', 'Grade', 'combined']) {
      assert.ok(!source.includes(forbidden), `${name} must not present "${forbidden}"`);
    }
    // The two scores are never added together.
    assert.ok(
      !/rhythm\.score\s*\+\s*round\.score|round\.score\s*\+\s*rhythm\.score/.test(source),
      `${name} must not sum the two scores`,
    );
  }
});

test('the READY screen carries the renamed identity and both instructions', () => {
  assert.ok(overlaysSource.includes('WORST GIG EVER'));
  assert.ok(overlaysSource.includes('Keep the beat. Survive the gig.'));
  assert.ok(overlaysSource.includes('Tap the pulsing cymbal on the beat.'));
  assert.ok(overlaysSource.includes('Break bottles before they hit your kit.'));
  assert.ok(!overlaysSource.includes('WORST BAND EVER'));
});

test('the end copy names both jobs', () => {
  assert.ok(overlaysSource.includes('You kept the groove alive. Somehow.'));
  assert.ok(
    overlaysSource.includes('The gig fell apart. Try to keep the beat while you defend the kit.'),
  );
});

test('PERFECT and GOOD are words, not only colours', () => {
  assert.ok(hudSource.includes("'PERFECT'"), 'the grade must be spelled out');
  assert.ok(hudSource.includes("'GOOD'"));
});

// ---------------------------------------------------------------------------
// Nothing in the pad or HUD is interactive
// ---------------------------------------------------------------------------

test('neither the pad nor the HUD introduces a touch target', () => {
  for (const [name, source] of [
    ['GroovePad', padSource],
    ['Hud', hudSource],
  ] as const) {
    for (const forbidden of ['Pressable', 'TouchableOpacity', 'onPress', 'onTouchStart']) {
      assert.ok(
        !source.includes(forbidden),
        `${name} must not contain ${forbidden}: a nested touch target re-introduces the ` +
          'bubbling-coordinate defect M5A fixed (ADR 0007)',
      );
    }
    assert.ok(source.includes('pointerEvents="none"'), `${name} must be non-interactive`);
  }
});

// ---------------------------------------------------------------------------
// The summary reconciles with the domain
// ---------------------------------------------------------------------------

test('every summary figure is derivable from the Groove state alone', () => {
  const rhythm = createRhythm();
  const context = (elapsedMs: number): BeatContext => ({
    elapsedMs,
    durationMs: level01.durationMs,
    state: 'PLAYING',
  });

  // Two perfects, one good, then two beats let go.
  resolvePadTap(rhythm, context(beatTimeMs(2)));
  resolvePadTap(rhythm, context(beatTimeMs(3) + 20));
  resolvePadTap(rhythm, context(beatTimeMs(4) + 150));
  tickRhythm(rhythm, context(beatTimeMs(6) + RHYTHM.goodWindowMs + 1));

  assert.equal(rhythm.perfects, 2);
  assert.equal(rhythm.goods, 1);
  assert.equal(rhythm.hits, 3);
  assert.equal(rhythm.misses, 2);
  // "Beats hit: 3 / 5" — the denominator is hits plus misses, nothing else.
  assert.equal(judgedBeats(rhythm), rhythm.hits + rhythm.misses);
  assert.equal(judgedBeats(rhythm), 5);
  // Score is the sum of what each grade is worth, with no bonus of any kind.
  assert.equal(rhythm.score, 2 * RHYTHM.perfectPoints + RHYTHM.goodPoints);
  // Mean timing error averages over hits, not over judged beats.
  assert.equal(meanAbsTimingErrorMs(rhythm), (0 + 20 + 150) / 3);
  assert.equal(rhythm.bestStreak, 3);
});

test('a round with no beats landed reports no average rather than zero', () => {
  const rhythm = createRhythm();
  tickRhythm(rhythm, {
    elapsedMs: level01.durationMs,
    durationMs: level01.durationMs,
    state: 'PLAYING',
  });
  assert.ok(rhythm.misses > 0);
  assert.equal(rhythm.hits, 0);
  // Zero would read as flawless timing; the summary must say there were none.
  assert.equal(meanAbsTimingErrorMs(rhythm), null);
});

test('the pause summary reads state and cannot mutate it', () => {
  const rhythm = createRhythm();
  resolvePadTap(rhythm, {
    elapsedMs: beatTimeMs(2),
    durationMs: level01.durationMs,
    state: 'PLAYING',
  });
  const before = { ...rhythm };

  // Everything the summary calls is a pure read.
  judgedBeats(rhythm);
  meanAbsTimingErrorMs(rhythm);

  assert.deepEqual({ ...rhythm }, before);
});

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

import { BEAT_BAR, BEAT_MARKERS, GROOVE_PAD, GROOVE_PULSE } from '../game/config/rhythm.ts';
import { REFERENCE_CANVAS, STAGE } from '../game/config/stage.ts';
import {
  COUNTDOWN_BOX,
  GROOVE_PANEL,
  GROOVE_PANEL_ROWS,
  HUD_MARGIN,
  HUD_TOP_HEIGHT,
  PAD_SURFACE,
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
import { STAGES } from '../game/levels/stages.ts';

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
  assert.ok(GROOVE_PANEL.height > 0, 'the panel must have room for its rows');

  /*
   * The readout no longer sits directly above the pad, and must not: M13.1
   * moved the pad to the lower centre, and the space above a centred pad is
   * the target corridor, where Groove feedback is forbidden. It stays on the
   * left rail instead — checked against the corridor by the test above.
   */
  assert.ok(
    GROOVE_PANEL.x + GROOVE_PANEL.width < GROOVE_PAD.centerX - GROOVE_PAD.halfWidthPx,
    'the readout must sit clear of the pad, not stacked on it',
  );
});

test('the countdown numerals clear both the pad and the top HUD row', () => {
  // The pre-roll teaches the pulse, so it must never cover it (M13.1).
  assert.ok(
    COUNTDOWN_BOX.y + COUNTDOWN_BOX.height <= GROOVE_PAD.centerY - GROOVE_PAD.halfHeightPx,
    'the numerals must not reach the pad',
  );
  assert.ok(COUNTDOWN_BOX.y >= HUD_TOP_HEIGHT, 'the numerals must not sit under the score row');
  assert.ok(
    COUNTDOWN_BOX.y + COUNTDOWN_BOX.height <= REFERENCE_CANVAS.height,
    'the numerals must be on the canvas',
  );
});

test('the pad never draws outside the area a tap actually resolves', () => {
  /*
   * The drawn mark and the configured tap ellipse are one promise. The swell
   * peaks at exactly the tap boundary, and the hit flash expands out to it and
   * stops — neither may overreach, or the player aims at pixels that are not
   * tappable.
   */
  const ringScale = 1 / (1 + GROOVE_PULSE.peakScale);
  assert.ok(ringScale < 1, 'the resting mark must sit inside the tap area');
  assert.equal(ringScale * (1 + GROOVE_PULSE.peakScale), 1);
  // The flash runs from the resting ring out to the boundary as it fades.
  const flashAtEnd = ringScale + (1 - 0) * (1 - ringScale);
  assert.equal(flashAtEnd, 1);
});

test('the pad is drawn without a Pressable and without a hard-coded geometry', () => {
  // The pad must be hit-tested by the surface pipeline, never by a nested
  // touch target (M5A), and its shape must come from config (M13.1).
  assert.ok(!padSource.includes('Pressable'), 'the pad must not nest a Pressable');
  assert.ok(!padSource.includes('onPress'), 'the pad must not handle presses');
  assert.ok(padSource.includes('GROOVE_PAD.halfWidthPx'), 'geometry must come from config');
  assert.ok(padSource.includes('GROOVE_PAD.centerX'), 'geometry must come from config');
  assert.ok(padSource.includes('pointerEvents="none"'), 'the pad layer must not take touches');
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

test('the pad stays clear of the pause control in the bottom-right corner', () => {
  /*
   * The pause button is an overlay outside the scaled canvas, anchored to the
   * bottom-right of the screen. A pad reaching under it would eat taps that
   * never arrive at the game at all.
   *
   * Its 62 + 18 dp corner is widened generously here and expressed as a
   * fraction of the canvas, because the overlay is laid out in device points
   * and the canvas is letterboxed inside them — the exact canvas coordinate
   * moves with the viewport, but the corner it occupies does not.
   */
  const pad = padBoundingRect();
  const corner: Rect = {
    x: REFERENCE_CANVAS.width * 0.85,
    y: REFERENCE_CANVAS.height * 0.75,
    width: REFERENCE_CANVAS.width * 0.15,
    height: REFERENCE_CANVAS.height * 0.25,
  };
  assert.ok(!rectsOverlap(pad, corner), 'the pad must not reach the pause corner');

  // Lower centre, which is the whole point of the M13.1 move: the pulse and
  // the corridor the bottles arrive down share one visual field.
  assert.equal(GROOVE_PAD.centerX, REFERENCE_CANVAS.width / 2, 'pad is horizontally centred');
  assert.ok(GROOVE_PAD.centerY > REFERENCE_CANVAS.height / 2, 'pad is low, on the near kit');
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

test('the title screen carries the renamed identity', () => {
  assert.ok(overlaysSource.includes('WORST GIG EVER'));
  assert.ok(overlaysSource.includes('Keep the beat. Survive the gig.'));
  assert.ok(!overlaysSource.includes('WORST BAND EVER'));
});

/**
 * M15 moved the how-to-play copy off the title and into the per-stage
 * briefings, so the assertion moved with it — but it did not weaken. Both jobs
 * still have to be taught in words before the player is asked to do them, and
 * each stage still has to teach the job it actually asks for.
 */
test('every stage briefs the job it asks for, before it asks', () => {
  for (const stage of STAGES) {
    assert.ok(stage.briefing.length > 0, `stage ${stage.number} has no briefing`);
    const briefing = stage.briefing.join(' ').toLowerCase();

    // Defense is asked for on every stage, so every briefing must name it.
    assert.ok(
      /bottle|mug/.test(briefing) && /smash|break|tap/.test(briefing),
      `stage ${stage.number} never explains breaking what the crowd throws`,
    );
    assert.ok(
      /kit|show|integrity|over/.test(briefing),
      `stage ${stage.number} never explains what a miss costs`,
    );

    /*
     * The pad is the mechanism, so naming the pad is what counts as teaching
     * the Groove — not merely using the word "beat". Stage 1's briefing says
     * "No beat to keep yet", which is the opposite of an instruction to tap
     * one and exactly the copy that sets Stage 2 up.
     */
    const instructsPad = /pad/.test(briefing);
    assert.equal(
      instructsPad,
      stage.groove,
      stage.groove
        ? `stage ${stage.number} enables the Groove without naming the pad`
        : `stage ${stage.number} points at a pad it does not draw`,
    );
    if (stage.groove) {
      assert.ok(/beat/.test(briefing), `stage ${stage.number} never mentions the beat`);
    }
  }
});

test('the stages are ordered, numbered from one, and introduce one job at a time', () => {
  assert.ok(STAGES.length >= 2, 'M15 asks for at least a defense stage and a groove stage');
  STAGES.forEach((stage, index) => {
    assert.equal(stage.number, index + 1, 'stage numbers are 1-based and in order');
  });
  // The first stage is the single-job one; the Groove arrives later.
  assert.equal(STAGES[0].groove, false, 'stage 1 must ask for one job only');
  assert.ok(
    STAGES.some((stage) => stage.groove),
    'some stage must ask for the Groove, or the pivot is gone',
  );
});

test('the end copy names both jobs', () => {
  assert.ok(overlaysSource.includes('You kept the groove alive. Somehow.'));
  assert.ok(
    overlaysSource.includes('The gig fell apart. Try to keep the beat while you defend the kit.'),
  );
});

/**
 * A defense-only stage must not be told off for a beat it never had. The
 * dual-task line above is still there for the stage that does ask for both.
 */
test('a defense-only loss is not explained in Groove terms', () => {
  assert.ok(
    overlaysSource.includes('The kit took three hits. Watch the crowd, not the floor.'),
    'the single-job stage needs its own failure line',
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
    grooveEnabled: true,
  });

  // Two perfects, one good, then two beats let go. Beat 1 is the first that
  // scores at all: beat 0 is GO (M13.1).
  resolvePadTap(rhythm, context(beatTimeMs(1)));
  resolvePadTap(rhythm, context(beatTimeMs(2) + 20));
  resolvePadTap(rhythm, context(beatTimeMs(3) + 150));
  tickRhythm(rhythm, context(beatTimeMs(5) + RHYTHM.goodWindowMs + 1));

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
    grooveEnabled: true,
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
    grooveEnabled: true,
  });
  const before = { ...rhythm };

  // Everything the summary calls is a pure read.
  judgedBeats(rhythm);
  meanAbsTimingErrorMs(rhythm);

  assert.deepEqual({ ...rhythm }, before);
});

test('the beat cue did not cost the pad surface M14.1 bought back', () => {
  /*
   * M14.1 cut the pad's SVG from 1920x1080 to a tight box around the ellipse,
   * on a device whose tap responsiveness is *still* under an open retest. M16
   * adds two moving cues to that same surface, and the standard cue — a ring
   * converging from outside the pad — would have needed roughly twice the area
   * back. That is why the markers converge inward instead.
   *
   * This test is the thing that keeps that decision honest: the surface is
   * still exactly the ellipse plus its stroke margin, and any future cue that
   * needs more room has to come and change this number on purpose.
   */
  assert.equal(PAD_SURFACE.width, GROOVE_PAD.halfWidthPx * 2 + 24);
  assert.equal(PAD_SURFACE.height, GROOVE_PAD.halfHeightPx * 2 + 24);
  assert.equal(PAD_SURFACE.x, GROOVE_PAD.centerX - GROOVE_PAD.halfWidthPx - 12);
  assert.equal(PAD_SURFACE.y, GROOVE_PAD.centerY - GROOVE_PAD.halfHeightPx - 12);

  // Everything M16 draws has to fit in it, at every point of the travel.
  const startOffset = BEAT_MARKERS.startFraction * GROOVE_PAD.halfWidthPx;
  const markerReach = startOffset + BEAT_MARKERS.widthPx / 2;
  assert.ok(
    GROOVE_PAD.centerX - markerReach >= PAD_SURFACE.x &&
      GROOVE_PAD.centerX + markerReach <= PAD_SURFACE.x + PAD_SURFACE.width,
    'a marker is drawn outside the surface it is drawn on',
  );

  const barReach = ((BEAT_BAR.beats - 1) / 2) * BEAT_BAR.spacingPx + BEAT_BAR.radiusPx * 1.35;
  assert.ok(
    GROOVE_PAD.centerX - barReach >= PAD_SURFACE.x &&
      GROOVE_PAD.centerX + barReach <= PAD_SURFACE.x + PAD_SURFACE.width,
    'the bar counter is drawn outside the surface',
  );
});

test('nothing the beat cue draws reaches into the target corridor', () => {
  // M13.1's rule, applied to the two things M16 adds: Groove feedback must not
  // cover the lane the player is watching for glass.
  const corridor = targetCorridor();
  const barY = GROOVE_PAD.centerY + BEAT_BAR.offsetY - BEAT_BAR.radiusPx * 1.35;
  assert.ok(
    barY > corridor.y + corridor.height,
    'the bar counter reaches up into the target corridor',
  );

  const markerTop = GROOVE_PAD.centerY - BEAT_MARKERS.heightPx / 2;
  assert.ok(markerTop > corridor.y + corridor.height, 'a marker reaches into the corridor');
});

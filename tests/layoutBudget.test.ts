/**
 * M20 — does the text fit, in every language the game has?
 *
 * Source of truth: docs/specs/M20-translation-safe-layout.md
 *
 * This replaces the height proxy that used to live in `tests/mugDrink.test.ts`.
 * That one compared an estimated briefing height against `viewport * 1.6` — a
 * budget that permits 60% overflow — and it passed a card that was clipping
 * the mug rule in English on a real device. The lesson is not that models are
 * useless; it is that a model with a dishonest budget is worse than no model,
 * because it is mistaken for a guarantee.
 *
 * Two rules, and which one applies is a property of the surface:
 *
 *   - a **fixed box** cannot scroll, so its text must fit;
 *   - a **scrollable** surface may overflow, but must say so visibly.
 *
 * Everything is checked in every locale, the pseudo one included. That is the
 * point: it says something about a translation before the translation exists.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allCatalogues, type Catalogue } from '../game/i18n/catalogue.ts';
import { PSEUDO_EXPANSION } from '../game/i18n/catalogues/pseudo.ts';
import { format } from '../game/i18n/format.ts';
import { STAGES } from '../game/levels/stages.ts';
import {
  BRIEFING,
  BRIEFING_TEXT_WIDTH,
  BUTTON,
  STAGE_CARD_TEXT_WIDTH,
  SUMMARY,
  SUMMARY_LABEL_WIDTH,
  briefingCardHeight,
} from '../game/rendering/overlayLayout.ts';
import { GROOVE_PANEL, HUD_TYPE } from '../game/rendering/hudLayout.ts';
import {
  MIN_VIEWPORT,
  fitsOnOneLine,
  stackHeight,
  textHeight,
  wrappedLines,
} from '../game/rendering/textMetrics.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const overlaysSource = readFileSync(join(repoRoot, 'game/rendering/Overlays.tsx'), 'utf8');

const locales = allCatalogues();

/** Numbers wide enough to be realistic without being absurd. */
const SAMPLE = { count: 99, multiplier: 4, seconds: 35, hits: 88, judged: 89, ms: 120, left: 3, total: 3, number: 4 };

// ---------------------------------------------------------------------------
// The briefing card: scrollable, so the rule is that it grows and tells you
// ---------------------------------------------------------------------------

test('M20: the briefing card takes the height the screen has', () => {
  assert.ok(
    !/briefingScroll:\s*\{[^}]*maxHeight/.test(overlaysSource),
    'a fixed maxHeight is an English-length assumption — it is what left 75 dp ' +
      'of empty screen below the buttons while the mug rule sat under the fold',
  );
  assert.ok(
    /briefingScroll:\s*\{[^}]*flexShrink:\s*1/.test(overlaysSource),
    'the card must shrink to the screen rather than be sized by a constant',
  );
});

test('M20: an overflowing briefing says so without being touched', () => {
  assert.ok(
    /persistentScrollbar/.test(overlaysSource),
    'Android fades the scroll indicator, so a card with more below looks ' +
      'identical to one without. That is the silent clipping this milestone removes.',
  );

  /*
   * And the scrollbar is not enough on its own. On the emulator it draws dark
   * grey on a near-black scrim: present, persistent, and invisible to anyone
   * who does not already know it is there. The cue is the same information in
   * the card's own accent colour.
   */
  assert.ok(/onContentSizeChange/.test(overlaysSource), 'the card must measure its content');
  assert.ok(/onLayout/.test(overlaysSource), 'and measure itself');
  assert.ok(/hasMore/.test(overlaysSource), 'and say when the first is bigger than the second');
  assert.ok(
    /moreCueRow:\s*\{[^}]*height/.test(overlaysSource),
    'the cue row must reserve its height, or the card jumps when the measurement lands',
  );
});

/** Height of one stage's briefing content, figures included. */
function briefingContentHeight(catalogue: Catalogue, stageId: string, hasFigures: boolean): number {
  const bullets = stackHeight(
    catalogue.stages[stageId as keyof Catalogue['stages']].briefing,
    { ...BRIEFING.bullet, maxWidth: BRIEFING_TEXT_WIDTH },
    BRIEFING.bullet.gap,
  );

  if (!hasFigures) return bullets + BRIEFING.list.paddingBottom;

  const caption = Math.max(
    ...Object.values(catalogue.briefingFigures).map((text) =>
      textHeight(text, { ...BRIEFING.figure.caption, maxWidth: BRIEFING.figure.width }),
    ),
  );
  const figures =
    BRIEFING.figure.artHeight +
    BRIEFING.figure.caption.paddingTop +
    caption +
    BRIEFING.figure.rowPaddingBottom;

  return figures + bullets + BRIEFING.list.paddingBottom;
}

/**
 * **The words fit; the pictures may scroll.**
 *
 * This is the rule M20 settled on after the emulator run, and it is weaker
 * than the one first written here — "the whole card fits in English" — on
 * purpose. Satisfying that one would have meant either cutting the owner's
 * copy or shrinking the figures to the point of uselessness, and the spec is
 * explicit that no sentence is shortened to make a layout constant work.
 *
 * What a player actually needs is that the *rules* are readable in one
 * screenful. The two captioned pictures are an illustration of the third
 * bullet, they sit above it, and scrolling them away costs nothing. So the
 * budget is on the bullets, and the figures are allowed to push them.
 */
test('M20: the briefing sentences fit the card, in every locale', () => {
  const available = briefingCardHeight(MIN_VIEWPORT.height);

  for (const [locale, strings] of locales) {
    for (const stage of STAGES) {
      const bullets = stackHeight(
        strings.stages[stage.id].briefing,
        { ...BRIEFING.bullet, maxWidth: BRIEFING_TEXT_WIDTH },
        BRIEFING.bullet.gap,
      ) + BRIEFING.list.paddingBottom;

      assert.ok(
        bullets <= available,
        `${locale}: stage ${stage.number} needs ${Math.round(bullets)} dp of sentences in a ` +
          `${Math.round(available)} dp card on the smallest supported screen. The briefing is the ` +
          'one place a rule is ever explained, so the rules themselves must be reachable ' +
          'in a single screenful.',
      );
    }
  }
});

test('M20: the pictures push the sentences, but not off a cliff', () => {
  /*
   * Figures and bullets together are allowed to exceed the card — that is what
   * the scroll and the cue are for. What must stay bounded is how far: a card
   * needing several screenfuls would mean a player scrolling blind to find the
   * one rule the stage exists to teach, and at that point the copy is the
   * problem rather than the layout.
   */
  const available = briefingCardHeight(MIN_VIEWPORT.height);

  for (const [locale, strings] of locales) {
    for (const stage of STAGES) {
      const height = briefingContentHeight(strings, stage.id, stage.briefingFigures !== undefined);
      assert.ok(
        height <= available * 2,
        `${locale}: stage ${stage.number} is ${Math.round(height)} dp against a ` +
          `${Math.round(available)} dp card — more than two screenfuls at ${PSEUDO_EXPANSION}x`,
      );
    }
  }
});

// ---------------------------------------------------------------------------
// Fixed boxes: they cannot scroll, so they have to fit
// ---------------------------------------------------------------------------

test('M20: every HUD row fits on one line, in every locale', () => {
  /*
   * The HUD's rows are fixed-height on purpose (M12: a score gaining a digit
   * must not move anything). That makes wrapping equivalent to deleting the
   * second line, so these have to fit rather than merely be preferred to.
   */
  for (const [locale, strings] of locales) {
    const single: Array<[string, string, number, number]> = [
      ['hud.defense', strings.hud.defense, HUD_TYPE.label.fontSize, HUD_TYPE.columnMaxWidth],
      ['hud.showIntegrity', strings.hud.showIntegrity, HUD_TYPE.label.fontSize, HUD_TYPE.columnMaxWidth],
      ['hud.combo', format(strings.hud.combo, SAMPLE), HUD_TYPE.combo.fontSize, HUD_TYPE.columnMaxWidth],
      ['hud.comboMultiplied', format(strings.hud.comboMultiplied, SAMPLE), HUD_TYPE.combo.fontSize, HUD_TYPE.columnMaxWidth],
      ['hud.secondsLeft', format(strings.hud.secondsLeft, SAMPLE), 56, HUD_TYPE.columnMaxWidth],
      ['hud.groove', strings.hud.groove, HUD_TYPE.groove.label.fontSize, GROOVE_PANEL.width],
      ['hud.beatStreak', format(strings.hud.beatStreak, SAMPLE), HUD_TYPE.groove.streak.fontSize, GROOVE_PANEL.width],
      ['hud.getReady', strings.hud.getReady, HUD_TYPE.groove.leadIn.fontSize, GROOVE_PANEL.width],
      ['hud.perfect', strings.hud.perfect, HUD_TYPE.groove.judgement.fontSize, GROOVE_PANEL.width],
      ['hud.good', strings.hud.good, HUD_TYPE.groove.judgement.fontSize, GROOVE_PANEL.width],
    ];

    for (const [name, text, fontSize, maxWidth] of single) {
      assert.ok(
        fitsOnOneLine(text, fontSize, maxWidth),
        `${locale}: "${text}" (${name}) needs ${wrappedLines(text, fontSize, maxWidth)} lines in a ` +
          `${maxWidth} px fixed-height row. A second line in the HUD is not drawn.`,
      );
    }
  }
});

test('M20: a summary label never pushes its number out of the column', () => {
  for (const [locale, strings] of locales) {
    const labels = [
      strings.summary.grooveScore,
      strings.summary.beatsHit,
      strings.summary.perfect,
      strings.summary.good,
      strings.summary.beatsMissed,
      strings.summary.bestBeatStreak,
      strings.summary.defenseScore,
      strings.summary.objectsDestroyed,
      strings.summary.objectsMissed,
      strings.summary.bestHitCombo,
      strings.summary.best,
    ];

    for (const label of labels) {
      const lines = wrappedLines(label, SUMMARY.label.fontSize, SUMMARY_LABEL_WIDTH);
      assert.ok(
        lines <= 2,
        `${locale}: "${label}" wraps to ${lines} lines in ${SUMMARY_LABEL_WIDTH} px. ` +
          'Past two the two columns stop lining up with each other.',
      );
    }
  }

  // The mechanism that makes the above true at runtime rather than only on paper.
  assert.ok(
    /summaryLabel:\s*\{[^}]*flexShrink:\s*1/.test(overlaysSource),
    'the label must shrink, or it pushes the value out of the column',
  );
  assert.ok(
    /summaryValue:\s*\{[\s\S]*?flexShrink:\s*0/.test(overlaysSource),
    'the value must not shrink, or the number wraps instead of the label',
  );
});

test('M22: the new-best line fits under the outcome', () => {
  /*
   * It sits between the outcome line and the summary on a results screen that
   * is already measured against 411 dp, so it has to be one line.
   */
  for (const [locale, strings] of locales) {
    const lines = wrappedLines(strings.results.newBest, 14, MIN_VIEWPORT.width - 56);
    assert.ok(lines <= 1, `${locale}: "${strings.results.newBest}" takes ${lines} lines`);
  }
});

test('M20: the summary detail lines fit their column', () => {
  for (const [locale, strings] of locales) {
    for (const [name, text] of [
      ['noBeatsLanded', strings.summary.noBeatsLanded],
      ['averageTiming', format(strings.summary.averageTiming, SAMPLE)],
      ['integrityLeft', format(strings.summary.integrityLeft, SAMPLE)],
    ] as const) {
      const lines = wrappedLines(text, SUMMARY.detail.fontSize, SUMMARY.columnMinWidth);
      assert.ok(lines <= 2, `${locale}: summary.${name} wraps to ${lines} lines`);
    }
  }
});

test('M20: a stage card holds its own name and subtitle', () => {
  for (const [locale, strings] of locales) {
    for (const stage of STAGES) {
      const entry = strings.stages[stage.id];
      const nameLines = wrappedLines(entry.name, 18, STAGE_CARD_TEXT_WIDTH);
      const subtitleLines = wrappedLines(entry.subtitle, 12, STAGE_CARD_TEXT_WIDTH);
      assert.ok(
        nameLines <= 2,
        `${locale}: stage ${stage.number} name "${entry.name}" takes ${nameLines} lines`,
      );
      assert.ok(
        subtitleLines <= 2,
        `${locale}: stage ${stage.number} subtitle takes ${subtitleLines} lines`,
      );
    }
  }
});

test('M20: every button label fits its button', () => {
  const inner = BUTTON.maxWidth - BUTTON.paddingHorizontal * 2;
  const compactInner = BUTTON.maxWidth - BUTTON.compactPaddingHorizontal * 2;

  for (const [locale, strings] of locales) {
    const full: Array<[string, string]> = [
      ['briefing.start', strings.briefing.start],
      ['pause.resume', strings.pause.resume],
      ['results.nextStage', strings.results.nextStage],
      ['results.playAgain', strings.results.playAgain],
      ['results.retryStage', strings.results.retryStage],
      ['common.quitToTitle', strings.common.quitToTitle],
    ];
    const compact: Array<[string, string]> = [
      ['results.share', strings.results.share],
      ['common.back', strings.common.back],
      ['title.howToPlay', strings.title.howToPlay],
      ['title.story', strings.title.story],
      ['title.clickOn', strings.title.clickOn],
      ['title.clickOff', strings.title.clickOff],
    ];

    for (const [name, label] of full) {
      const lines = wrappedLines(label, BUTTON.fontSize, inner);
      assert.ok(lines <= 2, `${locale}: button ${name} "${label}" takes ${lines} lines`);
    }
    for (const [name, label] of compact) {
      const lines = wrappedLines(label, BUTTON.compactFontSize, compactInner);
      assert.ok(lines <= 2, `${locale}: compact button ${name} "${label}" takes ${lines} lines`);
    }
  }
});

// ---------------------------------------------------------------------------
// The model itself
// ---------------------------------------------------------------------------

test('M20: the wrapping model agrees with what the device did', () => {
  /*
   * The one measurement this model is calibrated against. On the Pixel_9
   * emulator on 2026-09-05, stage 1's third bullet — 209 characters — wrapped
   * to three lines in the briefing's text column at 15 dp type: about 0.52 em
   * of advance width per character.
   *
   * The model is deliberately pessimistic, so it is allowed to predict three or
   * four. Predicting two would mean it under-estimates wrapping, which is the
   * direction that lets text disappear.
   */
  const bullet = STAGES[0];
  const english = locales.find(([locale]) => locale === 'en');
  assert.ok(english);
  const third = english[1].stages[bullet.id].briefing[2];
  assert.equal(third?.length, 209, 'the calibration string changed — re-measure on a device');

  const predicted = wrappedLines(third, BRIEFING.bullet.fontSize, BRIEFING_TEXT_WIDTH);
  assert.ok(
    predicted >= 3 && predicted <= 4,
    `model predicts ${predicted} lines; the device drew 3. Under-predicting is the ` +
      'direction that lets text vanish, so the model must not go below it.',
  );
});

test('M20: the old 1.6x proxy is gone rather than loosened', () => {
  // Comments stripped: the note left where the budget used to be names it, and
  // recording why a gate was deleted is documentation rather than a second gate.
  const mugDrink = readFileSync(join(repoRoot, 'tests/mugDrink.test.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
  assert.ok(
    !/VIEWPORT_PX/.test(mugDrink),
    'two overlapping budgets with different numbers make it unclear which is the contract',
  );
});

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
import { SETLIST_SLOTS } from '../game/audio/setlist.ts';
import {
  BRIEFING,
  BRIEFING_TEXT_WIDTH,
  BUTTON,
  OVERLAY_PADDING,
  SETLIST,
  SETLIST_SLOT_TEXT_WIDTH,
  SETLIST_TRACK_TEXT_WIDTH,
  STAGE_CARD_TEXT_WIDTH,
  SUMMARY,
  SUMMARY_LABEL_WIDTH,
  briefingCardHeight,
  setlistColumnHeight,
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
      /* The way into the builder, from the title and from the results (M24C). */
      ['setlist.open', strings.setlist.open],
    ];

    full.push(['setlist.start', strings.setlist.start]);

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
// The setlist builder (M24C): one fixed column, one that scrolls
// ---------------------------------------------------------------------------

/** Every song title, which is the same list in every locale but pseudo. */
function songTitles(strings: Catalogue): string[] {
  return Object.values(strings.music);
}

test('M24C: a chosen song fits its slot on one line, in every locale', () => {
  /*
   * The slot column **does not scroll**, so this is the fixed-box rule: what is
   * in it has to fit. One line rather than two, and that is not tidiness — four
   * rows at two lines each is 72 dp the column does not have, which is checked
   * in the height test below.
   *
   * Every song title is measured, plus the placeholder an empty slot shows,
   * because the placeholder is the widest thing on a fresh screen and it is
   * translated where the titles are not.
   */
  for (const [locale, strings] of locales) {
    const candidates: Array<[string, string]> = [
      ['setlist.empty', strings.setlist.empty],
      ...songTitles(strings).map((title): [string, string] => [`music "${title}"`, title]),
    ];
    for (const [name, text] of candidates) {
      const lines = wrappedLines(text, SETLIST.slot.title.fontSize, SETLIST_SLOT_TEXT_WIDTH);
      assert.equal(
        lines,
        1,
        `${locale}: setlist slot ${name} takes ${lines} lines in a row that cannot grow`,
      );
    }
  }
});

test('M24C: a song fits its row in the library, in every locale', () => {
  for (const [locale, strings] of locales) {
    for (const title of songTitles(strings)) {
      const lines = wrappedLines(title, SETLIST.track.title.fontSize, SETLIST_TRACK_TEXT_WIDTH);
      assert.equal(lines, 1, `${locale}: library row "${title}" takes ${lines} lines`);
    }
  }
});

test('M24C: the four slots fit the screen without scrolling', () => {
  /*
   * The fixed-box budget, at the smallest viewport the overlays are designed
   * against — 923 x 411 dp, a 1080p phone in landscape at 420 dpi.
   *
   * A slot row is its two lines of type at 1.2 em plus its padding and the gap
   * to the next one. If this fails, either the type came up or the chrome did,
   * and the answer is one of those rather than a scroll: a setlist you have to
   * scroll to see is not a setlist you can read at a glance.
   */
  const row =
    SETLIST.slot.number.fontSize * 1.2 +
    SETLIST.slot.title.fontSize * 1.2 +
    SETLIST.slot.paddingVertical * 2 +
    SETLIST.slot.marginBottom;
  const column = row * SETLIST_SLOTS;
  const available = setlistColumnHeight(MIN_VIEWPORT.height);

  assert.ok(
    column <= available,
    `the ${String(SETLIST_SLOTS)} slots need ${column.toFixed(0)} dp and the column has ` +
      `${String(available)} dp`,
  );
});

test('M24C: the library column scrolls, and says so when there is more', () => {
  /*
   * The scrollable rule, and the pair of facts that make it honest — the same
   * pair the briefing card is held to.
   *
   * Eleven rows genuinely do not fit: at these sizes they need about 317 dp and
   * the column has 248. So the surface must scroll **and** it must say it is
   * scrolling, because Android's indicator is dark grey on a near-black scrim
   * and a player will not see it. `persistentScrollbar` is necessary and is not
   * sufficient; the measured `▾` is what makes the overflow visible.
   */
  assert.match(
    overlaysSource,
    /style=\{styles\.setlistLibraryScroll\}/,
    'the library column is no longer a scrolling surface',
  );
  assert.match(
    overlaysSource,
    /setlistLibraryScroll[\s\S]{0,120}flexShrink: 1/,
    'the library column no longer shrinks to the space it has',
  );
  for (const needle of ['persistentScrollbar', 'onContentSizeChange', 'setContentHeight']) {
    assert.ok(
      overlaysSource.includes(needle),
      `the library column no longer ${needle === 'persistentScrollbar' ? 'keeps its scrollbar drawn' : 'measures its own content'}`,
    );
  }
  assert.match(
    overlaysSource,
    /const hasMore = columnHeight > 0 && contentHeight > columnHeight \+ 1;/,
    'the builder no longer works out whether there is more below',
  );

  // And the arithmetic that makes the cue load-bearing rather than decorative.
  const row =
    SETLIST.track.title.fontSize * 1.2 +
    SETLIST.track.paddingVertical * 2 +
    SETLIST.track.marginBottom;
  const heading = SETLIST.libraryHeading.fontSize * 1.2 + SETLIST.libraryHeading.marginBottom;
  const needed = heading + row * songTitles(locales[0][1]).length;
  assert.ok(
    needed > setlistColumnHeight(MIN_VIEWPORT.height),
    'the library now fits without scrolling, so the overflow cue is untested by this budget',
  );
});

test('M24C: a library row has room for the title, the ▶ and the ✓', () => {
  /*
   * The preview control costs the title 34 dp of the row, so the wrapping
   * budget above is measured against what is left rather than against the
   * whole row. This is the arithmetic that keeps those two facts attached: if
   * the gutters ever grow past the row, the titles start wrapping and the
   * fixed-height rows clip.
   */
  const inner = SETLIST.track.width - SETLIST.track.paddingHorizontal * 2;
  const gutters = SETLIST.track.previewGutter + SETLIST.track.chosenGutter;
  assert.equal(
    SETLIST_TRACK_TEXT_WIDTH,
    inner - gutters,
    'the text column no longer accounts for both controls on the row',
  );
  assert.ok(
    SETLIST_TRACK_TEXT_WIDTH > gutters,
    'the controls now take more of the row than the song title does',
  );

  /*
   * And the touch target. The row is deliberately short so eleven songs are one
   * scroll rather than three, which puts the ▶'s own box well under the ~44 dp
   * a thumb wants — `hitSlop` is what buys the rest, and it has to be enough to
   * matter.
   */
  const { top, bottom } = SETLIST.track.previewHitSlop;
  const rowHeight =
    SETLIST.track.title.fontSize * 1.2 + SETLIST.track.paddingVertical * 2;
  assert.ok(
    rowHeight + top + bottom >= 40,
    `the preview target is ${(rowHeight + top + bottom).toFixed(0)} dp tall, which is not a thumb`,
  );
});

test('M24C: the two columns fit side by side on the narrowest screen', () => {
  const used =
    SETLIST.slot.width + SETLIST.columnGap + SETLIST.track.width + OVERLAY_PADDING.horizontal * 2;
  assert.ok(
    used <= MIN_VIEWPORT.width,
    `the builder needs ${String(used)} dp of width and the screen has ` +
      `${String(MIN_VIEWPORT.width)} dp`,
  );
});

test('M24C: the builder’s heading and tagline fit above the columns', () => {
  /*
   * Both are single-purpose lines above a two-column layout, so they may wrap
   * once and no further — a third line comes straight out of the columns'
   * height, which the fixed-box test above has already spent.
   */
  const width = MIN_VIEWPORT.width - OVERLAY_PADDING.horizontal * 2;
  for (const [locale, strings] of locales) {
    for (const [name, text, fontSize] of [
      ['setlist.title', strings.setlist.title, SETLIST.title.fontSize],
      ['setlist.tagline', strings.setlist.tagline, SETLIST.tagline.fontSize],
      ['setlist.library', strings.setlist.library, SETLIST.libraryHeading.fontSize],
      ['setlist.unlocked', strings.setlist.unlocked, 16],
      ['setlist.tonight', strings.setlist.tonight, 11],
    ] as const) {
      const lines = wrappedLines(text, fontSize, width);
      assert.ok(lines <= 1, `${locale}: ${name} "${text}" takes ${lines} lines`);
    }
  }
});

test('M24C: the run’s four songs fit one line under the results', () => {
  /*
   * `TONIGHT'S SETLIST` is one line on purpose (§22): the results screen has
   * 411 dp and the two score columns already claim most of it. Four titles and
   * three separators is the longest it can ever be, so that is what is
   * measured — in every locale, pseudo included, where the titles are longest.
   */
  const separator = '  ·  ';
  for (const [locale, strings] of locales) {
    const longest = songTitles(strings)
      .slice()
      .sort((a, b) => b.length - a.length)
      .slice(0, SETLIST_SLOTS)
      .join(separator);
    const lines = wrappedLines(longest, 12, 760);
    assert.ok(lines <= 2, `${locale}: the run's setlist line takes ${lines} lines`);
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

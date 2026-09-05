/**
 * M19 — the locale foundation contract.
 *
 * Source of truth: docs/specs/M19-locale-foundation.md
 *
 * The milestone's claim is that **every user-visible string in the game now
 * comes out of a catalogue**. That is not a claim a normal test can make, so
 * most of what follows reads the sources and asserts the absence of the thing
 * it replaced: a component that renders a word it made up itself.
 *
 * The rest holds the catalogue to a shape a second locale can be checked
 * against. That half looks close to trivial while `SUPPORTED_LOCALES` has one
 * entry in it, and it is the half that has to already exist on the day pt-BR
 * lands — a translation that silently drops a `{count}` is a defect nobody
 * finds by playing in English.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { en } from '../game/i18n/catalogues/en.ts';
import { allCatalogues, stringsFor } from '../game/i18n/catalogue.ts';
import { format, placeholdersIn } from '../game/i18n/format.ts';
import {
  DEFAULT_LOCALE,
  LOCALE_ENDONYMS,
  SUPPORTED_LOCALES,
  hasLocaleChoice,
  isLocale,
  nextLocale,
  resolveLocale,
  type Locale,
} from '../game/i18n/locales.ts';
import { PRODUCT_TITLE } from '../game/config/product.ts';
import { STAGES } from '../game/levels/stages.ts';
import { STORY_PANELS } from '../game/state/storyState.ts';
import { createAppFlow, cycleLocale, setLocale } from '../game/state/appFlow.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Reading the sources
// ---------------------------------------------------------------------------

function collect(dir: string, extension: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) collect(path, extension, found);
    else if (path.endsWith(extension)) found.push(path);
  }
  return found;
}

/**
 * A component's source with everything that cannot render text taken out.
 *
 * Comments go first, so a doc comment quoting the copy it is explaining does
 * not read as a violation of the rule it describes. Imports go because a path
 * is a string. Everything from `StyleSheet.create(` onwards goes because a
 * stylesheet is hundreds of keyword literals and none of them is a word the
 * player reads.
 */
function renderableSource(path: string): string {
  const source = readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ')
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?$/gm, ' ');
  const styles = source.indexOf('StyleSheet.create(');
  return styles < 0 ? source : source.slice(0, styles);
}

/** Every component in the app, including the root. */
function componentFiles(): string[] {
  return [...collect(join(repoRoot, 'game'), '.tsx'), join(repoRoot, 'App.tsx')];
}

const STRING_LITERAL = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`/g;

/**
 * String literals in an expression that would actually reach the screen.
 *
 * A literal on the right of `===` is a comparison — `judgement.grade ===
 * 'perfect'` picks *which* catalogue string to draw and is never drawn itself
 * — so it is not a string the player reads and not this test's business.
 */
function renderedLiterals(expression: string): string[] {
  const found: string[] = [];
  for (const match of expression.matchAll(STRING_LITERAL)) {
    const before = expression.slice(0, match.index).replace(/\s+$/, '');
    if (/[=!]==?$/.test(before)) continue;
    if (/[A-Za-z]/.test(match[0])) found.push(match[0]);
  }
  return found;
}

/**
 * The index of the `>` that closes a JSX opening tag starting at `from`.
 *
 * Scanned rather than matched with `[^>]*>`, because a prop value can hold a
 * `>` of its own — `{count > 1 ? a : b}` in an opening tag would end the match
 * in the middle of the tag and quietly stop checking the rest of the element.
 */
function tagEnd(source: string, from: number): number | null {
  let depth = 0;
  let quote: string | null = null;
  for (let i = from; i < source.length; i += 1) {
    const char = source[i];
    if (quote !== null) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === '>' && depth === 0) return i;
  }
  return null;
}

/**
 * The index of the `}` that closes the `{` at `open`.
 *
 * A prop's expression ends at its own brace, not at the end of the tag: read
 * to the tag's `>` instead and `label={x}` swallows every prop after it, so
 * `tone="secondary"` reads as a button captioned "secondary".
 */
function expressionEnd(source: string, open: number): number {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < source.length; i += 1) {
    const char = source[i];
    if (quote !== null) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') quote = char;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return source.length;
}

/** The children of every `<Text>…</Text>` element in a source. */
function textChildren(source: string): string[] {
  const children: string[] = [];
  for (const match of source.matchAll(/<Text\b/g)) {
    const open = tagEnd(source, match.index + match[0].length);
    if (open === null) continue;
    if (source[open - 1] === '/') continue; // self-closing, so no children
    const close = source.indexOf('</Text>', open);
    if (close < 0) continue;
    children.push(source.slice(open + 1, close));
  }
  return children;
}

/** Splits children into the `{expressions}` and the bare text around them. */
function splitChildren(children: string): { text: string; expressions: string[] } {
  const expressions: string[] = [];
  let text = '';
  let depth = 0;
  let start = 0;
  for (let i = 0; i < children.length; i += 1) {
    const char = children[i];
    if (char === '{') {
      if (depth === 0) start = i + 1;
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) expressions.push(children.slice(start, i));
    } else if (depth === 0) {
      text += char;
    }
  }
  // Nested elements are their own `<Text>` and are checked on their own pass.
  return { text: text.replace(/<[^>]*>/g, ' '), expressions };
}

// ---------------------------------------------------------------------------
// Nothing in a component says a word of its own
// ---------------------------------------------------------------------------

test('M19: no <Text> in the app renders a word the component wrote itself', () => {
  for (const path of componentFiles()) {
    const source = renderableSource(path);
    const file = relative(repoRoot, path);

    for (const children of textChildren(source)) {
      const { text, expressions } = splitChildren(children);

      assert.ok(
        !/[A-Za-z]/.test(text),
        `${file}: <Text> renders the literal ${JSON.stringify(text.trim())}. ` +
          'Every word on screen comes out of game/i18n/catalogues/.',
      );

      for (const expression of expressions) {
        const literals = renderedLiterals(expression);
        assert.deepEqual(
          literals,
          [],
          `${file}: <Text> renders ${literals.join(', ')} from a literal rather than ` +
            'from the catalogue',
        );
      }
    }
  }
});

/**
 * The props that put text on screen without a `<Text>` of their own.
 *
 * `label` is this app's button caption; the accessibility props are read aloud
 * by a screen reader, which makes them exactly as user-visible as anything
 * drawn — and exactly as easy to leave in English by accident.
 */
const TEXT_PROPS = ['label', 'accessibilityLabel', 'accessibilityHint', 'title', 'placeholder'];

test('M19: no text-bearing prop is passed a literal', () => {
  for (const path of componentFiles()) {
    const source = renderableSource(path);
    const file = relative(repoRoot, path);

    for (const prop of TEXT_PROPS) {
      const pattern = new RegExp(`\\s${prop}=(?:(["'])((?:[^\\\\]|\\\\.)*?)\\1|\\{)`, 'g');
      for (const match of source.matchAll(pattern)) {
        if (match[2] !== undefined) {
          assert.fail(
            `${file}: ${prop}="${match[2]}" is a literal. Pass a catalogue string.`,
          );
        }
        // `prop={…}`: read that expression, and only that one.
        const open = match.index + match[0].length - 1;
        const expression = source.slice(open + 1, expressionEnd(source, open));
        const literals = renderedLiterals(expression);
        assert.deepEqual(
          literals,
          [],
          `${file}: ${prop} is given ${literals.join(', ')} rather than a catalogue string`,
        );
      }
    }
  }
});

/**
 * Values that read as prose but are not, listed one by one.
 *
 * The allowlist is the deliberate part of this test, and it is meant to stay
 * this short. A new entry is a claim that a multi-word string in a component
 * is not something the player reads — cheap to add and, because it has to be
 * added on purpose, impossible to add by accident.
 */
const NON_TEXT_PROSE = new Set([
  // CSS transform-origin on the vocalist sprite.
  "'left center'",
]);

test('M19: no component holds a sentence', () => {
  for (const path of componentFiles()) {
    const source = renderableSource(path);
    const file = relative(repoRoot, path);

    for (const match of source.matchAll(STRING_LITERAL)) {
      const literal = match[0];
      if (!/[A-Za-z]\s+[A-Za-z]/.test(literal)) continue;
      assert.ok(
        NON_TEXT_PROSE.has(literal),
        `${file}: ${literal} is prose living in a component. Move it to the ` +
          'catalogue, or add it to NON_TEXT_PROSE with a reason.',
      );
    }
  }
});

test('M19: the domain modules carry ids, not English', () => {
  /*
   * `stages.ts` and `storyState.ts` used to hold every briefing sentence and
   * every story caption. AGENTS.md rule 4 keeps them renderer-free; M19 makes
   * them language-free for the same reason — a module the tests import without
   * a screen has no business knowing what language the screen is in.
   *
   * An id has no spaces. Prose does.
   */
  for (const file of ['game/levels/stages.ts', 'game/state/storyState.ts']) {
    const source = readFileSync(join(repoRoot, file), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/^\s*\/\/.*$/gm, ' ')
      .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?$/gm, ' ');

    for (const match of source.matchAll(STRING_LITERAL)) {
      assert.ok(
        !/\s/.test(match[0].slice(1, -1)),
        `${file}: ${match[0]} is not an identifier. Prose belongs in the catalogue.`,
      );
    }
  }
});

test('M19: only the adapter knows the device exists', () => {
  // Comments stripped first: `locales.ts` says in prose that it deliberately
  // does *not* import the module, and that sentence is not an import.
  const importers = [...collect(join(repoRoot, 'game'), '.ts'), ...componentFiles()].filter(
    (path) =>
      readFileSync(path, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, ' ')
        .replace(/^\s*\/\/.*$/gm, ' ')
        .includes('expo-localization'),
  );
  assert.deepEqual(
    importers.map((path) => relative(repoRoot, path)),
    ['game/i18n/deviceLocale.ts'],
    'the native dependency has one boundary, so the resolution rule stays testable',
  );
});

// ---------------------------------------------------------------------------
// The catalogue
// ---------------------------------------------------------------------------

/** Every leaf in a catalogue as `path -> value`, arrays indexed by position. */
function leaves(value: unknown, prefix = '', into = new Map<string, string>()): Map<string, string> {
  if (typeof value === 'string') {
    into.set(prefix, value);
    return into;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => leaves(entry, `${prefix}[${index}]`, into));
    return into;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      leaves(entry, prefix === '' ? key : `${prefix}.${key}`, into);
    }
  }
  return into;
}

const englishLeaves = leaves(en);

test('M19: every catalogue has the shape of the English one', () => {
  const expected = [...englishLeaves.keys()].sort();

  for (const [locale, catalogue] of allCatalogues()) {
    const actual = [...leaves(catalogue).keys()].sort();
    assert.deepEqual(
      actual,
      expected,
      `${locale} does not have the same strings as English. A missing key renders ` +
        'as nothing and an extra one is never read.',
    );
  }
});

test('M19: a translation cannot drop or invent a placeholder', () => {
  for (const [locale, catalogue] of allCatalogues()) {
    for (const [path, value] of leaves(catalogue)) {
      const english = englishLeaves.get(path);
      assert.ok(english !== undefined, `${locale}: ${path} has no English original`);
      assert.deepEqual(
        placeholdersIn(value).sort(),
        placeholdersIn(english).sort(),
        `${locale}: "${path}" does not interpolate the same values as English. ` +
          'A dropped {placeholder} renders as a sentence with a number missing.',
      );
    }
  }
});

test('M19: no catalogue string is left empty', () => {
  for (const [locale, catalogue] of allCatalogues()) {
    for (const [path, value] of leaves(catalogue)) {
      assert.ok(value.trim().length > 0, `${locale}: ${path} is blank`);
    }
  }
});

test('M19: every stage, panel and figure has strings, and none is orphaned', () => {
  assert.deepEqual(
    Object.keys(en.stages).sort(),
    STAGES.map((stage) => stage.id).sort(),
    'the stage list and the catalogue have drifted apart',
  );
  assert.deepEqual(
    Object.keys(en.story).sort(),
    STORY_PANELS.map((panel) => panel.id).sort(),
    'the story and the catalogue have drifted apart',
  );

  const figuresUsed = new Set(STAGES.flatMap((stage) => stage.briefingFigures ?? []));
  assert.deepEqual(
    Object.keys(en.briefingFigures).sort(),
    [...figuresUsed].sort(),
    'a briefing figure has a caption nothing draws, or draws a caption it has not got',
  );

  for (const stage of STAGES) {
    const strings = en.stages[stage.id];
    assert.ok(strings.name.trim().length > 0, `${stage.id} has no name`);
    assert.ok(strings.subtitle.trim().length > 0, `${stage.id} has no subtitle`);
    assert.ok(strings.briefing.length > 0, `${stage.id} has no briefing`);
  }
});

test('M19: the product name is not translatable', () => {
  // docs/release/product-identity.md: the title is lettered into the opening
  // poster and is the store identity. A catalogue entry would eventually be
  // translated; a constant cannot be without deleting a documented contract.
  assert.equal(PRODUCT_TITLE, 'WORST GIG EVER');
  assert.ok(!JSON.stringify(en).includes(PRODUCT_TITLE));
});

// ---------------------------------------------------------------------------
// Choosing a locale
// ---------------------------------------------------------------------------

test('M19: every supported locale has a catalogue and a name of its own', () => {
  assert.ok(SUPPORTED_LOCALES.includes(DEFAULT_LOCALE), 'the fallback must be shippable');
  assert.deepEqual(
    allCatalogues().map(([locale]) => locale).sort(),
    [...SUPPORTED_LOCALES].sort(),
    'a supported locale without a catalogue would render an English game silently',
  );
  for (const locale of SUPPORTED_LOCALES) {
    assert.ok(LOCALE_ENDONYMS[locale]?.trim().length > 0, `${locale} has no endonym`);
    assert.ok(isLocale(locale));
  }
  assert.ok(!isLocale('klingon'));
});

test('M19: the language control appears exactly when there is a choice', () => {
  assert.equal(
    hasLocaleChoice(),
    SUPPORTED_LOCALES.length > 1,
    'one language draws no control; two draw one',
  );
});

test('M19: cycling the language visits every locale and comes back', () => {
  const seen: Locale[] = [];
  let locale = DEFAULT_LOCALE;
  for (let i = 0; i < SUPPORTED_LOCALES.length; i += 1) {
    seen.push(locale);
    locale = nextLocale(locale);
  }
  assert.deepEqual(seen.sort(), [...SUPPORTED_LOCALES].sort(), 'a locale is unreachable');
  assert.equal(locale, DEFAULT_LOCALE, 'cycling must wrap rather than stop');
});

/**
 * The device's preference, resolved.
 *
 * Written against the locale list that is *coming* rather than the one that
 * exists, because that is the rule being asserted: it decides nothing while
 * English is the only option, and it decides everything the day pt-BR ships.
 */
const FUTURE_LOCALES = ['en', 'pt-BR'] as unknown as readonly Locale[];

test('M19: the device language decides, and English catches everything else', () => {
  assert.equal(resolveLocale(['en-US'], FUTURE_LOCALES), 'en');
  assert.equal(resolveLocale(['pt-BR'], FUTURE_LOCALES), 'pt-BR');

  // A device asking for plain `pt`, or for European Portuguese, gets the
  // Portuguese we have. Serving it is a small wrong; serving English is larger.
  assert.equal(resolveLocale(['pt'], FUTURE_LOCALES), 'pt-BR');
  assert.equal(resolveLocale(['pt-PT'], FUTURE_LOCALES), 'pt-BR');
  assert.equal(resolveLocale(['PT_br'], FUTURE_LOCALES), 'pt-BR', 'tags are not case-sensitive');

  // Order is the device's, not ours.
  assert.equal(resolveLocale(['ja', 'pt-BR', 'en'], FUTURE_LOCALES), 'pt-BR');
  assert.equal(resolveLocale(['ja', 'en', 'pt-BR'], FUTURE_LOCALES), 'en');

  // Nothing we have, nothing usable, nothing at all.
  assert.equal(resolveLocale(['ja', 'ko'], FUTURE_LOCALES), 'en');
  assert.equal(resolveLocale([]), DEFAULT_LOCALE);
  assert.equal(resolveLocale(['', '   ']), DEFAULT_LOCALE);
});

test('M19: an unknown locale still gets a playable game', () => {
  // The types are supposed to prevent this. If one ever gets through, the
  // right outcome in a player's hands is an English game, not no game.
  assert.equal(stringsFor('klingon' as Locale), en);
});

// ---------------------------------------------------------------------------
// The flow holds the choice
// ---------------------------------------------------------------------------

test('M19: a fresh flow opens in the locale it is given', () => {
  assert.equal(createAppFlow().locale, DEFAULT_LOCALE, 'a test never needs a device');
  assert.equal(createAppFlow('en').locale, 'en');
});

test('M19: switching language changes nothing else about the session', () => {
  const flow = createAppFlow();
  flow.stageIndex = 2;
  flow.bestStageCleared = 1;
  flow.introSeen = true;
  flow.clickEnabled = false;
  flow.screen = 'ROUND';

  cycleLocale(flow);
  setLocale(flow, DEFAULT_LOCALE);

  assert.equal(flow.locale, DEFAULT_LOCALE);
  assert.equal(flow.stageIndex, 2, 'switching language must not move the player');
  assert.equal(flow.bestStageCleared, 1, 'nor forget what they cleared');
  assert.equal(flow.introSeen, true);
  assert.equal(flow.clickEnabled, false, 'nor undo another preference');
  assert.equal(flow.screen, 'ROUND', 'nor throw them out of a round');
});

test('M19: the language control is wired to the flow and drawn in two places', () => {
  const overlays = readFileSync(join(repoRoot, 'game/rendering/Overlays.tsx'), 'utf8');
  const engine = readFileSync(join(repoRoot, 'game/systems/GameEngine.tsx'), 'utf8');

  assert.equal(
    (overlays.match(/<LanguageToggle/g) ?? []).length,
    2,
    'the title and the pause overlay, and nowhere else — the V2 plan rules out a HUD flourish',
  );
  assert.ok(engine.includes('cycleLocale('), 'the control must reach the flow');
  assert.ok(
    engine.includes('<LocaleProvider locale={scene.flow.locale}>'),
    'the tree must read the flow rather than keep a second copy of the locale',
  );
});

// ---------------------------------------------------------------------------
// Interpolation
// ---------------------------------------------------------------------------

test('M19: placeholders are filled, and a missing one is visible rather than silent', () => {
  assert.equal(format('{count} HIT COMBO', { count: 4 }), '4 HIT COMBO');
  assert.equal(
    format(en.summary.integrityLeft, { left: 2, total: 3 }),
    'Show Integrity left: 2 of 3.',
  );
  assert.equal(format('nothing to fill', { count: 1 }), 'nothing to fill');

  // A visible `{count}` is a bug anyone can report. A blank is one that reads
  // as a zero.
  assert.equal(format('{count} left', {}), '{count} left');

  // A translation is free to move a placeholder, which is why they are named.
  assert.equal(format('{multiplier}x, {count} acertos', { count: 4, multiplier: 2 }), '2x, 4 acertos');
});

test('M19: placeholdersIn reports each name once, in order', () => {
  assert.deepEqual(placeholdersIn(en.hud.comboMultiplied), ['count', 'multiplier']);
  assert.deepEqual(placeholdersIn('{a} {b} {a}'), ['a', 'b']);
  assert.deepEqual(placeholdersIn(en.pause.title), []);
});

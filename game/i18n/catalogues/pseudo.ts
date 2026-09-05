/**
 * The development pseudo-locale (M20).
 *
 * Source of truth: docs/specs/M20-translation-safe-layout.md
 *
 * Generated from English rather than written, so it is structurally identical
 * to the source catalogue for free and can never drift from it. Every string is
 * accented and lengthened; nothing is translated.
 *
 * It exists to answer a question that cannot otherwise be asked before a
 * translation exists: **does this screen still work when the words get
 * longer?** Portuguese runs 15-25% longer than English for the same meaning and
 * German and French are worse, so the expansion target has margin in it rather
 * than being a prediction.
 *
 * ## Why the accents
 *
 * They are not decoration and they are not a joke. Two jobs:
 *
 * 1. **A string that is still plain English is a string that was missed.** In a
 *    fully accented screen an untranslated label is the one you can read, which
 *    makes the eye do the work a test cannot.
 * 2. **They prove the font has the glyphs.** pt-BR is made of ã, ç, õ and é. A
 *    missing diacritic renders as a box, and finding that out in M21 with a
 *    translation already written is finding out too late.
 *
 * ## It cannot ship
 *
 * `pseudo` is not in `SUPPORTED_LOCALES`. A release build has no way to select
 * it, and the language control stays invisible in production exactly as M19
 * left it. See `locales.ts`, `DEV_LOCALES`.
 */
import { en } from './en.ts';
import type { Catalogue } from '../catalogue.ts';

/**
 * How much longer the pseudo-locale is than English.
 *
 * 1.4 rather than the 1.25 that pt-BR would justify: the gate is meant to hold
 * for the locales after the first one too, and a layout with no margin is a
 * layout that fails on the next language instead of this one.
 */
export const PSEUDO_EXPANSION = 1.4;

/** Accented stand-ins, chosen to stay recognisable as the letter they replace. */
const ACCENTS: Record<string, string> = {
  a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', c: 'ç', n: 'ñ', y: 'ý',
  A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú', C: 'Ç', N: 'Ñ', Y: 'Ý',
};

/** Padding appended to reach the expansion target. Vowels, so it still reads. */
const PADDING = 'áéíóú';

/**
 * `{name}` placeholders, which must survive untouched.
 *
 * Accenting the inside of one would break `format()` silently — the string
 * would render with a literal `{çóúñt}` in it — so they are cut out, the text
 * around them is transformed, and they are put back exactly as they were.
 */
const PLACEHOLDER = /(\{\w+\})/g;

/**
 * The same pattern without `g`, for testing a single part.
 *
 * A global regex carries `lastIndex` between calls, so `.test()` on one
 * alternates true and false over a list — which would accent every other
 * placeholder and leave `{çóúñt}` in the catalogue. Splitting the two uses
 * apart is cheaper than remembering to reset it.
 */
const IS_PLACEHOLDER = /^\{\w+\}$/;

function accent(text: string): string {
  return [...text].map((char) => ACCENTS[char] ?? char).join('');
}

/**
 * Sentence-ending punctuation, with any closing quote or bracket after it.
 *
 * The padding is inserted *before* this rather than after, so a pseudo string
 * is still a sentence. It is not a cosmetic point: `tests/mugDrink.test.ts`
 * requires every briefing entry to end in a full stop — the rule that caught
 * the mug rule being written as four fragments — and a generator that appends
 * padding past the full stop fails a real contract with a fake string.
 */
const SENTENCE_END = /([.!?…]+["'”’)\]]*)$/;

/**
 * Lengthens one string to roughly `PSEUDO_EXPANSION` times its length.
 *
 * The padding goes at the **end of the words**, after a space, rather than
 * being woven through: a longer last word is what stresses wrapping, and it
 * keeps the original sentence readable enough to tell which string you are
 * looking at. Terminal punctuation stays terminal.
 *
 * Explicit newlines are expanded per line, so a caption written as two
 * deliberate lines stays two deliberate — and longer — lines.
 */
function expandLine(line: string): string {
  if (line.trim() === '') return line;

  const transformed = line
    .split(PLACEHOLDER)
    .map((part) => (IS_PLACEHOLDER.test(part) ? part : accent(part)))
    .join('');

  const target = Math.ceil(line.length * PSEUDO_EXPANSION);
  const needed = target - transformed.length;
  if (needed <= 0) return transformed;

  let padding = '';
  while (padding.length < needed) padding += PADDING;
  const tail = padding.slice(0, needed).trim();

  const ending = SENTENCE_END.exec(transformed);
  if (ending === null) return `${transformed} ${tail}`;

  const body = transformed.slice(0, ending.index);
  return `${body} ${tail}${ending[1]}`;
}

function pseudoString(value: string): string {
  return value.split('\n').map(expandLine).join('\n');
}

/** Walks a catalogue, rewriting every leaf string and nothing else. */
function pseudoize<T>(value: T): T {
  if (typeof value === 'string') return pseudoString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((entry) => pseudoize(entry)) as unknown as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) out[key] = pseudoize(entry);
    return out as T;
  }
  return value;
}

export const pseudo: Catalogue = pseudoize(en);

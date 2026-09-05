/**
 * The catalogue registry: locale in, strings out.
 *
 * Source of truth: docs/specs/M19-locale-foundation.md
 *
 * `Catalogue` is the *type of the English catalogue*, which is what makes a
 * locale's completeness a compile-time property instead of a runtime one. A
 * `pt-BR.ts` missing `results.retryStage`, or spelling it `retry_stage`, or
 * turning a briefing's list of sentences into one long string, fails in `tsc`
 * before anything is built.
 *
 * That is the whole reason M19 adds no i18n runtime (AGENTS.md rule 18). What
 * a library would bring — plural rules, gender, date and number formatting,
 * lazy loading — this game does not have a use for. What it would give up is
 * the guarantee above.
 */
import { DEFAULT_LOCALE, type Locale } from './locales.ts';
import { en } from './catalogues/en.ts';

export type Catalogue = typeof en;

/**
 * Every catalogue, keyed by locale.
 *
 * `Record<Locale, Catalogue>` in both directions: a locale in
 * `SUPPORTED_LOCALES` without an entry here is a type error, and an entry here
 * for a locale that is not supported is one too.
 */
const CATALOGUES: Record<Locale, Catalogue> = {
  en,
};

/**
 * The strings for a locale.
 *
 * Falls back rather than throwing. A locale that got this far without a
 * catalogue is a bug the types were supposed to prevent, and the right
 * behaviour in a player's hands is an English game rather than no game.
 */
export function stringsFor(locale: Locale): Catalogue {
  return CATALOGUES[locale] ?? CATALOGUES[DEFAULT_LOCALE];
}

/** Every catalogue, for the contract test that compares their shapes. */
export function allCatalogues(): ReadonlyArray<readonly [Locale, Catalogue]> {
  return Object.entries(CATALOGUES) as Array<[Locale, Catalogue]>;
}

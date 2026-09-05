/**
 * Which languages exist, and how a device's preference becomes one of them.
 *
 * Source of truth: docs/specs/M19-locale-foundation.md
 *
 * Pure data and pure functions. Nothing here reads a device, imports React, or
 * touches `expo-localization` — that is `deviceLocale.ts`, and it is the only
 * file in the repository that does. The split is what lets the resolution rule
 * below be tested in Node without an emulator.
 */

/**
 * Every locale the game ships strings for.
 *
 * M19 ships one. Adding `'pt-BR'` here is a compile error until
 * `catalogues/pt-BR.ts` exists and is complete, which is the whole point of
 * typing the catalogue off the English one.
 */
export const SUPPORTED_LOCALES = ['en'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** The locale every fallback lands on, and the one the catalogue is typed by. */
export const DEFAULT_LOCALE: Locale = 'en';

/**
 * What each language calls itself.
 *
 * Endonyms, and held once rather than once per catalogue: a language is called
 * the same thing in every language. It is also what makes the language control
 * label itself without needing a translation of the word "language".
 */
export const LOCALE_ENDONYMS: Record<Locale, string> = {
  en: 'English',
};

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** The base language of a BCP 47 tag: `pt-BR` -> `pt`, `en` -> `en`. */
function baseLanguage(tag: string): string {
  return tag.trim().toLowerCase().split(/[-_]/)[0] ?? '';
}

/**
 * The device's preferred languages, in order, resolved to a locale we have.
 *
 * Matching is on the base language in both directions, so a device asking for
 * `pt` gets `pt-BR` and a device asking for `pt-PT` gets it too. Serving
 * Brazilian Portuguese to someone who asked for European Portuguese is a small
 * wrong; serving them English is a larger one.
 *
 * Order is the device's, not ours: a player whose first preference is Spanish
 * and whose second is Portuguese must not be given Portuguese because it
 * happens to appear earlier in `SUPPORTED_LOCALES`.
 */
export function resolveLocale(
  preferredTags: readonly string[],
  supported: readonly Locale[] = SUPPORTED_LOCALES,
): Locale {
  for (const tag of preferredTags) {
    if (typeof tag !== 'string' || tag.trim() === '') continue;

    const exact = supported.find((locale) => locale.toLowerCase() === tag.trim().toLowerCase());
    if (exact !== undefined) return exact;

    const language = baseLanguage(tag);
    if (language === '') continue;
    const byLanguage = supported.find((locale) => baseLanguage(locale) === language);
    if (byLanguage !== undefined) return byLanguage;
  }
  return supported.includes(DEFAULT_LOCALE) ? DEFAULT_LOCALE : (supported[0] ?? DEFAULT_LOCALE);
}

/**
 * The next locale in the list, wrapping.
 *
 * The language control is a cycling button rather than a picker because there
 * is one row of buttons to put it in and, for the foreseeable number of
 * locales, a list would be a screen. It becomes a picker when it stops being
 * reasonable, which is not at two.
 */
export function nextLocale(current: Locale): Locale {
  const index = SUPPORTED_LOCALES.indexOf(current);
  if (index < 0) return DEFAULT_LOCALE;
  return SUPPORTED_LOCALES[(index + 1) % SUPPORTED_LOCALES.length] ?? DEFAULT_LOCALE;
}

/** True when there is a choice to offer. See M19: one locale draws no control. */
export function hasLocaleChoice(): boolean {
  return SUPPORTED_LOCALES.length > 1;
}

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
 * M19 shipped one and M21 added the second. Adding a locale here is a compile
 * error until its catalogue exists and is complete, which is the whole point of
 * typing the catalogue off the English one — `pt-BR` was registered by writing
 * the file until `tsc` stopped complaining, and there was never a moment where
 * a missing key could have reached a screen.
 */
export const SUPPORTED_LOCALES = ['en', 'pt-BR'] as const;

/**
 * Locales that exist for development and can never ship (M20).
 *
 * `pseudo` is English, accented and 1.4x longer, generated rather than written
 * — see `catalogues/pseudo.ts`. It is the only way to ask whether a screen
 * survives a longer language before that language has been written.
 *
 * Kept out of `SUPPORTED_LOCALES` rather than flagged inside it, so that every
 * shipping question — what the device can resolve to, whether the language
 * control is drawn, what a release build can select — reads the shippable list
 * and gets the right answer without knowing this list exists.
 */
export const DEV_LOCALES = ['pseudo'] as const;

export type ShippableLocale = (typeof SUPPORTED_LOCALES)[number];
export type DevLocale = (typeof DEV_LOCALES)[number];
export type Locale = ShippableLocale | DevLocale;

/** The locale every fallback lands on, and the one the catalogue is typed by. */
export const DEFAULT_LOCALE: ShippableLocale = 'en';

/**
 * What each language calls itself.
 *
 * Endonyms, and held once rather than once per catalogue: a language is called
 * the same thing in every language. It is also what makes the language control
 * label itself without needing a translation of the word "language".
 */
export const LOCALE_ENDONYMS: Record<Locale, string> = {
  en: 'English',
  'pt-BR': 'Português (BR)',
  /* Not an endonym. Nothing calls itself this, which is the point. */
  pseudo: 'Pseúdó',
};

/**
 * True in a development build.
 *
 * `__DEV__` is React Native's global and does not exist under `node --test`,
 * so the `typeof` guard is doing real work rather than being defensive for its
 * own sake: a test that did not ask for dev locales gets the shipping answer.
 */
export function isDevelopmentBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

/**
 * The locales a player can actually choose from, here, now.
 *
 * `includeDev` is a parameter with a default rather than a read of `__DEV__`
 * inside the function, so a test can ask both questions — what ships, and what
 * a developer sees — without pretending to be a bundler.
 */
export function availableLocales(
  includeDev: boolean = isDevelopmentBuild(),
): readonly Locale[] {
  return includeDev ? [...SUPPORTED_LOCALES, ...DEV_LOCALES] : [...SUPPORTED_LOCALES];
}

export function isLocale(value: string): value is Locale {
  return (
    (SUPPORTED_LOCALES as readonly string[]).includes(value) ||
    (DEV_LOCALES as readonly string[]).includes(value)
  );
}

/** True for a locale that must never reach a player. */
export function isDevLocale(value: Locale): value is DevLocale {
  return (DEV_LOCALES as readonly string[]).includes(value);
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
  supported: readonly ShippableLocale[] = SUPPORTED_LOCALES,
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
export function nextLocale(current: Locale, available = availableLocales()): Locale {
  const index = available.indexOf(current);
  if (index < 0) return DEFAULT_LOCALE;
  return available[(index + 1) % available.length] ?? DEFAULT_LOCALE;
}

/**
 * True when there is a choice to offer.
 *
 * M19: one locale draws no control. M20 does not change that for a player —
 * `pseudo` only exists in a development build, so a release still has one
 * locale and still draws nothing.
 */
export function hasLocaleChoice(available = availableLocales()): boolean {
  return available.length > 1;
}

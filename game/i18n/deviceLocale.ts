/**
 * The device's language, resolved to one this game has strings for.
 *
 * **This is the only file in the repository that imports `expo-localization`**,
 * and that is deliberate. The rule that decides which locale wins lives in
 * `locales.ts` as `resolveLocale`, a pure function over a list of language
 * tags, so it is unit-tested in Node without an emulator; this file is the
 * adapter that goes and gets the tags.
 *
 * Keeping the two apart is the same separation AGENTS.md rule 4 applies to
 * gameplay: the decision is testable without the device that supplies its
 * input.
 */
import { getLocales } from 'expo-localization';

import { DEFAULT_LOCALE, resolveLocale, type Locale } from './locales.ts';

/**
 * The device's preferred languages, most-preferred first.
 *
 * Wrapped, because this is a native call on a platform boundary and the app
 * must open in English rather than not open at all if it ever fails.
 */
function preferredLanguageTags(): string[] {
  try {
    return getLocales()
      .map((locale) => locale.languageTag)
      .filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
  } catch {
    return [];
  }
}

/** The locale the game should open in on this device. */
export function detectLocale(): Locale {
  const tags = preferredLanguageTags();
  return tags.length === 0 ? DEFAULT_LOCALE : resolveLocale(tags);
}

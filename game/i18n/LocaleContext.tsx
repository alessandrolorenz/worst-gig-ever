/**
 * How a component reads a string.
 *
 * Source of truth: docs/specs/M19-locale-foundation.md
 *
 * The authoritative locale is `flow.locale` on the app flow entity, exactly
 * like `clickEnabled` — a player choice about the whole session, held as pure
 * data that the domain tests can read without React. This context is not a
 * second copy of it: `GameEngine` provides the flow's value, so there is one
 * locale and the tree merely reads it.
 *
 * Context rather than props because the text surfaces are not all in one
 * subtree the overlays own. `Hud`, `Countdown` and `SceneRenderer` are
 * rendered by the game engine from the entity map, and threading a locale
 * through the entity map would put a presentation concern into the domain
 * objects the systems mutate every frame.
 *
 * It costs nothing per frame: reading a context is not a subscription that
 * re-renders on every tick, and the value changes only when a player switches
 * language.
 */
import React, { createContext, useContext, useMemo } from 'react';

import { stringsFor, type Catalogue } from './catalogue.ts';
import { DEFAULT_LOCALE, type Locale } from './locales.ts';

interface LocaleContextValue {
  readonly locale: Locale;
  readonly strings: Catalogue;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  strings: stringsFor(DEFAULT_LOCALE),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, strings: stringsFor(locale) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/** The strings for the current locale. */
export function useStrings(): Catalogue {
  return useContext(LocaleContext).strings;
}

/** The current locale itself, for the language control's own label. */
export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

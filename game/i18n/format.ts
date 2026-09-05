/**
 * Placeholder interpolation for catalogue strings.
 *
 * `'{count} HIT COMBO'` with `{ count: 4 }` is `'4 HIT COMBO'`.
 *
 * Named placeholders rather than positional ones, and data rather than
 * functions in the catalogue, because the owner is writing pt-BR (V2 plan,
 * open question 3). A translator can move `{count}` to the other end of the
 * sentence, which is the whole reason the placeholder is named; they cannot
 * usefully edit an arrow function.
 *
 * A placeholder with no matching parameter is left standing rather than
 * replaced with an empty string. A visible `{count}` on the HUD is a bug
 * anyone can see and report; a silently missing number is a bug that looks
 * like a zero.
 */

export type FormatParams = Readonly<Record<string, string | number>>;

/** Matches `{name}` — letters, digits and underscores only. */
const PLACEHOLDER = /\{(\w+)\}/g;

export function format(template: string, params: FormatParams): string {
  return template.replace(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}

/**
 * The placeholder names a string uses, in order of first appearance.
 *
 * Used by the catalogue contract test: a translation that drops `{count}` or
 * invents `{contagem}` is a string that will render wrong in exactly one
 * locale, which is the kind of defect nobody finds by playing in English.
 */
export function placeholdersIn(template: string): string[] {
  const found: string[] = [];
  for (const match of template.matchAll(PLACEHOLDER)) {
    const name = match[1];
    if (name !== undefined && !found.includes(name)) found.push(name);
  }
  return found;
}

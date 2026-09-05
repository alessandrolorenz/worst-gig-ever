/**
 * The product's own name, which is not a translatable string.
 *
 * Source of truth: `docs/release/product-identity.md`, "Title translation
 * policy". *Worst Gig Ever* is the canonical title in every locale.
 *
 * It lives here rather than in the localization catalogue on purpose. A string
 * in a catalogue is an invitation to translate it, and the next person adding
 * a locale would translate this one — at a cost of regenerating
 * `assets/art/story/01_poster.jpg`, which has the title hand-lettered into it,
 * once per market, and of fragmenting the name people search for in a store.
 *
 * A constant cannot be translated without deleting a documented contract,
 * which is exactly the amount of friction this decision deserves.
 */

/** As drawn on the title screen: the poster's own lettering, in caps. */
export const PRODUCT_TITLE = 'WORST GIG EVER';

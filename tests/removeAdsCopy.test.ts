/** M23: the Remove Ads surface says the same things in every language. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { allCatalogues } from '../game/i18n/catalogue.ts';
import { PURCHASE_OUTCOMES } from '../game/state/entitlement.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const overlaysSource = readFileSync(join(repoRoot, 'game/rendering/Overlays.tsx'), 'utf8');

/** The body of one function in `Overlays.tsx`, up to the next one. */
function functionBody(name: string): string {
  const start = overlaysSource.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} is not in Overlays.tsx`);
  const rest = overlaysSource.slice(start);
  const end = rest.indexOf('\nfunction ');
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Every line the support screen can show.
 *
 * Listed here rather than derived from the English catalogue so that deleting
 * a key is a failing test rather than a quietly smaller list.
 */
const REQUIRED_KEYS = [
  'entry',
  'heading',
  'description',
  'buy',
  'restore',
  'privacyOptions',
  'owned',
  'pending',
  'cancelled',
  'unavailable',
  'error',
  'restoring',
  'nothingToRestore',
] as const;

test('M23: every locale supplies all monetization copy', () => {
  for (const [locale, strings] of allCatalogues()) {
    const section: Record<string, string> | undefined = strings.removeAds;
    assert.notEqual(section, undefined, `${locale} has no removeAds section`);

    for (const key of REQUIRED_KEYS) {
      const value: string | undefined = (section as Record<string, string>)[key];
      assert.equal(typeof value, 'string', `${locale}.removeAds.${key} is missing`);
      assert.ok((value as string).trim().length > 0, `${locale}.removeAds.${key} is empty`);
    }
  }
});

test('M23: the product price is store metadata, not a catalogue literal', () => {
  // Google Play supplies the price already formatted for the buyer's country
  // and currency. A number written here would be wrong in some market on day
  // one, and wrong in a way nobody in this repository would ever see.
  //
  // Scoped to removeAds on purpose: the fictional gig payout in `results` is
  // deliberately a catalogue literal with a currency symbol, because it is a
  // joke about a bar paying a band and not a price anybody is charged.
  const priceLike = /[$€£¥]|R\$|\d+[.,]\d{2}/;

  for (const [locale, strings] of allCatalogues()) {
    const section = strings.removeAds as Record<string, string>;

    for (const [key, value] of Object.entries(section)) {
      if (key === 'buy') continue;
      assert.ok(
        !priceLike.test(value),
        `${locale}.removeAds.${key} looks like it hard-codes a price: ${value}`,
      );
    }

    assert.ok(
      section.buy.includes('{price}'),
      `${locale}.removeAds.buy must take the store's price as a placeholder`,
    );
    assert.ok(
      !priceLike.test(section.buy.replace('{price}', '')),
      `${locale}.removeAds.buy hard-codes a currency around the placeholder: ${section.buy}`,
    );
  }
});

test('M23: every store outcome the player can reach has a line to show', () => {
  // A new PurchaseOutcome must arrive with copy, in every language, rather
  // than falling through to a blank screen or an English default.
  const outcomeCopy: Record<string, string> = {
    purchased: 'owned',
    alreadyOwned: 'owned',
    pending: 'pending',
    cancelled: 'cancelled',
    unavailable: 'unavailable',
    error: 'error',
  };

  assert.deepEqual(
    Object.keys(outcomeCopy).sort(),
    [...PURCHASE_OUTCOMES].sort(),
    'an outcome was added or removed without deciding what the player is told',
  );

  for (const [locale, strings] of allCatalogues()) {
    const section = strings.removeAds as Record<string, string>;
    for (const key of Object.values(outcomeCopy)) {
      assert.ok(section[key], `${locale}.removeAds.${key} is missing`);
    }
  }
});

test('M23: the surface never implies that paying changes the game', () => {
  // M23: "The surface does not imply that purchasing changes gameplay or buys
  // currency." The words below are the ones that would break it — an unlock, a
  // reward, a boost, a coin. Checked in both languages because a translator
  // reaching for a livelier verb is exactly how this rule gets broken.
  const forbidden = [
    /\bunlock/i,
    /\bbonus\b/i,
    /\bboost/i,
    /\bcoins?\b/i,
    /\bcredits?\b/i,
    /\bdesbloque/i,
    /\bmoeda/i,
    /\brecompensa/i,
    /\bvantagem/i,
  ];

  for (const [locale, strings] of allCatalogues()) {
    const section = strings.removeAds as Record<string, string>;
    for (const [key, value] of Object.entries(section)) {
      for (const pattern of forbidden) {
        assert.ok(
          !pattern.test(value),
          `${locale}.removeAds.${key} implies the purchase changes the game: ${value}`,
        );
      }
    }
  }
});

// ---------------------------------------------------------------------------
// The screen itself (M23, piece 6)
// ---------------------------------------------------------------------------

/**
 * **The promise this one holds is a published one.**
 *
 * Section 4 of the privacy policy at
 * https://alessandrolorenz.github.io/worst-gig-ever/ tells players the privacy
 * choices control lives inside the Remove Ads screen. The M23 spec says that
 * makes the screen a release blocker for the Play listing rather than a
 * nicety: what the page claims must be what the uploaded artifact does.
 *
 * The specific way this breaks is not that someone deletes the button. It is
 * that someone hides the whole Remove Ads entry once the product is owned —
 * which looks like tidiness and takes the privacy form away from exactly the
 * European players entitled to one, since buying Remove Ads removes ads and
 * not the right to change a privacy choice (ADR 0015).
 */
test('M23: a player who bought Remove Ads can still reach their privacy choices', () => {
  const screen = functionBody('RemoveAdsScreen');

  assert.ok(
    /privacyOptionsRequired\s*&&/.test(screen),
    'the privacy control must be drawn from the consent SDK\'s own answer',
  );
  assert.ok(
    !/owned[^\n]*privacyOptions|privacyOptions[^\n]*\bowned\b/.test(screen),
    'the privacy control must not depend on whether the product is owned',
  );

  // And the way in from the title is not conditional either.
  const overlays = functionBody('Overlays');
  const entry = overlays.slice(overlays.indexOf('onOpenRemoveAds'));
  assert.ok(
    overlays.includes('onOpenRemoveAds'),
    'the title screen has no way into the Remove Ads screen',
  );
  assert.ok(
    !/isCustomSetlistUnlocked|removeAds\.owned|\bowned\s*&&/.test(entry.slice(0, 200)),
    'the title entry is gated on something; it must be reachable to everyone',
  );
});

test('M23: Buy is never drawn without a price the store supplied', () => {
  /*
   * The catalogue rule above says the price may not be a literal. This is the
   * other half of it: a null price must remove the button rather than render
   * `'Buy — {price}'` with an empty substitution, which is a button that looks
   * bought-from and cannot be.
   */
  const screen = functionBody('RemoveAdsScreen');
  assert.ok(
    /\{!view\.owned && view\.price !== null && \(/.test(screen),
    'Buy must be drawn only when the product is unowned and the store gave a price',
  );
  /*
   * Inlined rather than hoisted into a `canBuy`, so TypeScript narrows
   * `view.price` to a string for the `format` call below it. A hoisted boolean
   * does not narrow, and the cast it forces is the kind that survives the
   * condition being changed out from under it.
   */
  assert.ok(
    !/price: view\.price as/.test(screen),
    'the price reaches format() by narrowing, not by a cast',
  );
});

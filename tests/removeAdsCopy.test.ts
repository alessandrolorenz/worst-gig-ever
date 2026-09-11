/** M23: the Remove Ads surface says the same things in every language. */
import test from 'node:test';
import assert from 'node:assert/strict';

import { allCatalogues } from '../game/i18n/catalogue.ts';
import { PURCHASE_OUTCOMES } from '../game/state/entitlement.ts';

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

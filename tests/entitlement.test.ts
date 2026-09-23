/** M23: what grants the remove_ads entitlement, and what can never revoke it. */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PURCHASE_OUTCOMES,
  REMOVE_ADS_MESSAGES,
  applyStoreReport,
  canRequestAds,
  emptyEntitlement,
  entitlementToSave,
  removeAdsMessage,
  restoreCachedEntitlement,
  type PurchaseOutcome,
} from '../game/state/entitlement.ts';
import { allCatalogues } from '../game/i18n/catalogue.ts';

/** Apply a finished report, the common case. */
function report(outcome: PurchaseOutcome, finished = true) {
  return { outcome, finished };
}

test('M23: a fresh install owns nothing and has nothing pending', () => {
  const state = emptyEntitlement();
  assert.deepEqual(state, { adsRemoved: false, purchasePending: false, grantCount: 0 });
});

test('M23: a finished purchase grants the entitlement', () => {
  const state = applyStoreReport(emptyEntitlement(), report('purchased'));
  assert.equal(state.adsRemoved, true);
  assert.equal(state.grantCount, 1);
  assert.equal(state.purchasePending, false);
});

test('M23: an already-owned product grants, exactly like a purchase', () => {
  const state = applyStoreReport(emptyEntitlement(), report('alreadyOwned'));
  assert.equal(state.adsRemoved, true);
  assert.equal(state.grantCount, 1);
});

test('M23: pending purchases do not grant entitlement', () => {
  const state = applyStoreReport(emptyEntitlement(), report('pending'));

  assert.equal(state.adsRemoved, false, 'nothing has been charged yet');
  assert.equal(state.purchasePending, true, 'and the player must be told it is in flight');
  assert.equal(state.grantCount, 0);
});

test('M23: an unfinished purchase does not grant, however it is labelled', () => {
  // Google Play auto-refunds an unacknowledged purchase after three days.
  // Granting from one shows the player an ad-free game that silently reverts.
  for (const outcome of ['purchased', 'alreadyOwned'] as const) {
    const state = applyStoreReport(emptyEntitlement(), report(outcome, false));
    assert.equal(state.adsRemoved, false, `${outcome} must be finished before it grants`);
    assert.equal(state.grantCount, 0);
  }
});

test('M23: purchased and restored non-consumables grant exactly once', () => {
  const state = emptyEntitlement();

  applyStoreReport(state, report('purchased'));
  applyStoreReport(state, report('alreadyOwned'));
  applyStoreReport(state, report('alreadyOwned'));
  applyStoreReport(state, report('purchased'));

  assert.equal(state.adsRemoved, true);
  assert.equal(state.grantCount, 1, 'a store repeating itself is still one grant');
});

test('M23: the entitlement is monotonic — nothing revokes it', () => {
  const state = applyStoreReport(emptyEntitlement(), report('purchased'));

  // Every outcome a store can produce, including the ones that look like a
  // failure or a refund, applied against an already-granted entitlement.
  for (const outcome of PURCHASE_OUTCOMES) {
    for (const finished of [true, false]) {
      applyStoreReport(state, report(outcome, finished));
      assert.equal(
        state.adsRemoved,
        true,
        `${outcome} (finished=${finished}) must not turn ads back on`,
      );
    }
  }
  assert.equal(state.grantCount, 1);
});

test('M23: cancellation is not an error and clears the pending flow', () => {
  const state = applyStoreReport(emptyEntitlement(), report('pending'));
  assert.equal(state.purchasePending, true);

  applyStoreReport(state, report('cancelled'));
  assert.equal(state.purchasePending, false, 'the flow is over');
  assert.equal(state.adsRemoved, false, 'and nothing was bought');
});

test('M23: unavailable and error end the flow without granting', () => {
  for (const outcome of ['unavailable', 'error'] as const) {
    const state = applyStoreReport(emptyEntitlement(), report('pending'));
    applyStoreReport(state, report(outcome));

    assert.equal(state.purchasePending, false);
    assert.equal(state.adsRemoved, false);
    assert.equal(state.grantCount, 0);
  }
});

test('M23: a pending report never clears an existing grant', () => {
  const state = applyStoreReport(emptyEntitlement(), report('purchased'));
  applyStoreReport(state, report('pending'));

  assert.equal(state.adsRemoved, true);
  assert.equal(state.purchasePending, true, 'a second, unrelated purchase may be in flight');
});

test('M23: the cached entitlement may only ever say "already owned"', () => {
  const owned = restoreCachedEntitlement(true);
  assert.equal(owned.adsRemoved, true, 'an offline returning player does not see ads');
  assert.equal(owned.grantCount, 1);

  // false is also what a fresh install and a corrupt save look like, so it is
  // not evidence — the session starts unowned and lets the store answer.
  const unowned = restoreCachedEntitlement(false);
  assert.equal(unowned.adsRemoved, false);
  assert.equal(unowned.grantCount, 0);
});

test('M23: only the confirmed fact is durable', () => {
  const pending = applyStoreReport(emptyEntitlement(), report('pending'));
  assert.equal(entitlementToSave(pending), false, 'a pending purchase must not survive a relaunch');

  const owned = applyStoreReport(emptyEntitlement(), report('purchased'));
  assert.equal(entitlementToSave(owned), true);

  // Round-trip: what is saved is what comes back.
  assert.equal(restoreCachedEntitlement(entitlementToSave(owned)).adsRemoved, true);
});

test('M23: ad requests fail closed when consent is not established', () => {
  const unowned = emptyEntitlement();
  assert.equal(canRequestAds(unowned, true), true);
  assert.equal(canRequestAds(unowned, false), false, 'no consent means no request');

  // "They bought it" and "we could not ask" both mean no, for unrelated reasons.
  const owned = applyStoreReport(emptyEntitlement(), report('purchased'));
  assert.equal(canRequestAds(owned, true), false);
  assert.equal(canRequestAds(owned, false), false);
});

test('M23: every store outcome is handled, not defaulted', () => {
  // Guards the list itself. A new outcome added to PURCHASE_OUTCOMES must be
  // considered here rather than falling into whatever branch happens to catch it.
  assert.deepEqual(
    [...PURCHASE_OUTCOMES],
    ['purchased', 'pending', 'cancelled', 'alreadyOwned', 'unavailable', 'error'],
  );

  for (const outcome of PURCHASE_OUTCOMES) {
    const state = applyStoreReport(emptyEntitlement(), report(outcome));
    const grants = outcome === 'purchased' || outcome === 'alreadyOwned';

    assert.equal(state.adsRemoved, grants, `${outcome} grant expectation`);
    assert.equal(state.purchasePending, outcome === 'pending', `${outcome} pending expectation`);
  }
});

// ---------------------------------------------------------------------------
// What the screen says about it (M23, piece 6)
// ---------------------------------------------------------------------------

test('M23: every store outcome produces a sentence, in every locale', () => {
  /*
   * The failure this rules out is a blank screen on a stranger's handset: an
   * outcome with no message, or a message with no copy behind it. Both are
   * invisible until the exact store condition that produces them happens, and
   * neither would fail any other test in this file.
   */
  for (const outcome of PURCHASE_OUTCOMES) {
    for (const finished of [true, false]) {
      const message = removeAdsMessage({ outcome, finished });
      assert.ok(
        REMOVE_ADS_MESSAGES.includes(message),
        `${outcome}/${finished} produced "${message}", which is not a message`,
      );
      for (const [locale, strings] of allCatalogues()) {
        const line: string | undefined = (strings.removeAds as Record<string, string>)[message];
        assert.equal(typeof line, 'string', `${locale} has no removeAds.${message}`);
      }
    }
  }
});

test('M23: the sentence agrees with what the entitlement decided', () => {
  /*
   * The property that matters is not which words appear, it is that the words
   * and the rule never disagree: "Ads removed. Thank you." must appear if and
   * only if `applyStoreReport` actually granted. A screen that thanks a player
   * whose purchase did not land is the one failure here that costs money.
   */
  for (const outcome of PURCHASE_OUTCOMES) {
    for (const finished of [true, false]) {
      const report = { outcome, finished };
      const granted = applyStoreReport(emptyEntitlement(), report).adsRemoved;
      assert.equal(
        removeAdsMessage(report) === 'owned',
        granted,
        `${outcome}/${finished}: the screen and the rule disagree`,
      );
    }
  }
});

test('M23: an unacknowledged purchase is never reported as a failure', () => {
  /*
   * Google Play refunds an unacknowledged purchase after three days, so it
   * does not grant — but money has moved, and `error` promises "Nothing was
   * charged", which would be false. `pending` is the only true line available.
   */
  for (const outcome of ['purchased', 'alreadyOwned'] as const) {
    assert.equal(removeAdsMessage({ outcome, finished: false }), 'pending');
  }
});

test('M23: a restore that found nothing is not the same as no store', () => {
  /*
   * Both arrive as `unavailable`, because an empty CustomerInfo and a dead
   * billing client are the same absence of an entitlement. Only `completed`
   * separates them, and getting it wrong tells a player with no Play Store
   * that the purchase they are looking for does not exist.
   */
  const absent = { outcome: 'unavailable', finished: false } as const;

  assert.equal(
    removeAdsMessage(absent, { completed: true, found: false }),
    'nothingToRestore',
    'a restore that ran and found nothing',
  );
  assert.equal(
    removeAdsMessage(absent, { completed: false, found: false }),
    'unavailable',
    'a restore that never ran',
  );
  assert.equal(
    removeAdsMessage({ outcome: 'purchased', finished: true }, { completed: true, found: true }),
    'owned',
    'a restore that found the purchase',
  );
});

test('M23: restoring twice says "owned" twice and grants once', () => {
  // The screen repeating itself must not be able to move the entitlement.
  const state = emptyEntitlement();
  const found = { outcome: 'purchased', finished: true } as const;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    applyStoreReport(state, found);
    assert.equal(removeAdsMessage(found, { completed: true, found: true }), 'owned');
  }
  assert.equal(state.grantCount, 1, 'three restores granted more than once');
});

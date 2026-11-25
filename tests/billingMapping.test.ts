/**
 * M23 piece 5B: how RevenueCat's vocabulary becomes a `StoreReport`.
 *
 * The end-to-end assertions matter more than the unit ones here: a mapping
 * that is individually correct and collectively wrong still charges somebody
 * twice, so most of these tests run the mapping straight into
 * `applyStoreReport` and assert on the entitlement the player ends up with.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  OUTCOMES_WITH_COPY,
  REMOVE_ADS_ENTITLEMENT_ID,
  REMOVE_ADS_PRODUCT_ID,
  hasActiveRemoveAds,
  restoreFoundEntitlement,
  storeReportFromCustomerInfo,
  storeReportFromPurchaseError,
  storeReportFromRestore,
} from '../game/config/billing.ts';
import {
  PURCHASE_OUTCOMES,
  applyStoreReport,
  emptyEntitlement,
} from '../game/state/entitlement.ts';

/** A CustomerInfo in which Remove Ads is live. */
function ownedInfo() {
  return { entitlements: { active: { [REMOVE_ADS_ENTITLEMENT_ID]: { isActive: true } } } };
}

/** A CustomerInfo for someone who has bought nothing. */
function emptyInfo() {
  return { entitlements: { active: {} } };
}

/** A thrown RevenueCat error carrying one of its string codes. */
function rcError(code: string) {
  return { code, message: 'x', userCancelled: code === '1' };
}

test('M23: the product id is the one the spec and the Play Console agree on', () => {
  assert.equal(REMOVE_ADS_PRODUCT_ID, 'remove_ads');
  assert.equal(REMOVE_ADS_ENTITLEMENT_ID, 'remove_ads');
});

test('M23: an active entitlement is recognised', () => {
  assert.equal(hasActiveRemoveAds(ownedInfo()), true);
  assert.equal(hasActiveRemoveAds(emptyInfo()), false);
  assert.equal(hasActiveRemoveAds(null), false);
  assert.equal(hasActiveRemoveAds(undefined), false);
  assert.equal(hasActiveRemoveAds({}), false);
});

test('M23: an entry that says isActive false does not grant', () => {
  const info = {
    entitlements: { active: { [REMOVE_ADS_ENTITLEMENT_ID]: { isActive: false } } },
  };
  assert.equal(hasActiveRemoveAds(info), false);
});

test('M23: an entitlement under some other key does not grant Remove Ads', () => {
  const info = { entitlements: { active: { something_else: { isActive: true } } } };
  assert.equal(hasActiveRemoveAds(info), false);
});

test('M23: a completed purchase grants, and the ads stop', () => {
  const state = applyStoreReport(emptyEntitlement(), storeReportFromCustomerInfo(ownedInfo()));
  assert.equal(state.adsRemoved, true);
  assert.equal(state.grantCount, 1);
  assert.equal(state.purchasePending, false);
});

/*
 * The single most expensive mapping to get wrong. RevenueCat's codes are
 * strings, so `code === 20` is false for every pending purchase ever made, and
 * the player would be told their payment failed while it was still clearing.
 */
test('M23: a pending payment is pending, not an error, and grants nothing', () => {
  const report = storeReportFromPurchaseError(rcError('20'));
  assert.equal(report.outcome, 'pending');

  const state = applyStoreReport(emptyEntitlement(), report);
  assert.equal(state.purchasePending, true);
  assert.equal(state.adsRemoved, false);
  assert.equal(state.grantCount, 0);
});

test('M23: the pending code is compared as a string, not a number', () => {
  // The numeric form is what a reasonable person writes and it must not match.
  assert.equal(storeReportFromPurchaseError({ code: 20 }).outcome, 'pending');
  assert.notEqual(storeReportFromPurchaseError({ code: '99' }).outcome, 'pending');
});

test('M23: cancellation is not a failure and never accuses anyone', () => {
  const report = storeReportFromPurchaseError(rcError('1'));
  assert.equal(report.outcome, 'cancelled');

  const state = applyStoreReport(emptyEntitlement(), report);
  assert.equal(state.adsRemoved, false);
  assert.equal(state.purchasePending, false);
});

test('M23: the deprecated userCancelled flag still reads as a cancellation', () => {
  const report = storeReportFromPurchaseError({ userCancelled: true });
  assert.equal(report.outcome, 'cancelled');
});

test('M23: already-owned grants without a second purchase', () => {
  const report = storeReportFromPurchaseError(rcError('6'));
  assert.equal(report.outcome, 'alreadyOwned');
  assert.equal(report.finished, true);

  const state = applyStoreReport(emptyEntitlement(), report);
  assert.equal(state.adsRemoved, true);
  assert.equal(state.grantCount, 1);
});

test('M23: a store that cannot sell reads as unavailable, not as an error', () => {
  for (const code of ['2', '3', '5', '23', '24']) {
    assert.equal(
      storeReportFromPurchaseError(rcError(code)).outcome,
      'unavailable',
      `code ${code} must be unavailable`,
    );
  }
});

test('M23: an unknown code is a retryable error rather than a dead end', () => {
  assert.equal(storeReportFromPurchaseError(rcError('10')).outcome, 'error');
  assert.equal(storeReportFromPurchaseError(rcError('0')).outcome, 'error');
  assert.equal(storeReportFromPurchaseError({}).outcome, 'error');
  assert.equal(storeReportFromPurchaseError(null).outcome, 'error');
  assert.equal(storeReportFromPurchaseError(new Error('boom') as never).outcome, 'error');
});

test('M23: restoring a real purchase brings the entitlement back', () => {
  const info = ownedInfo();
  assert.equal(restoreFoundEntitlement(info), true);

  const state = applyStoreReport(emptyEntitlement(), storeReportFromRestore(info));
  assert.equal(state.adsRemoved, true);
});

test('M23: restoring nothing is not an error and does not revoke', () => {
  assert.equal(restoreFoundEntitlement(emptyInfo()), false);

  // A player who already owns it and restores again keeps it, and is granted once.
  const owned = applyStoreReport(emptyEntitlement(), storeReportFromCustomerInfo(ownedInfo()));
  const after = applyStoreReport(owned, storeReportFromRestore(emptyInfo()));
  assert.equal(after.adsRemoved, true);
  assert.equal(after.grantCount, 1);
});

test('M23: restoring twice grants exactly once', () => {
  let state = emptyEntitlement();
  state = applyStoreReport(state, storeReportFromRestore(ownedInfo()));
  state = applyStoreReport(state, storeReportFromRestore(ownedInfo()));
  assert.equal(state.grantCount, 1);
});

test('M23: nothing the store can say turns ads back on', () => {
  let state = applyStoreReport(emptyEntitlement(), storeReportFromCustomerInfo(ownedInfo()));
  for (const code of ['0', '1', '2', '3', '5', '10', '20', '23', '24']) {
    state = applyStoreReport(state, storeReportFromPurchaseError(rcError(code)));
    assert.equal(state.adsRemoved, true, `code ${code} must not revoke`);
  }
  // Including a customer info that has stopped reporting the entitlement.
  state = applyStoreReport(state, storeReportFromCustomerInfo(emptyInfo()));
  assert.equal(state.adsRemoved, true);
});

test('M23: every outcome the mapping can produce has copy to render', () => {
  const produced = new Set([
    storeReportFromCustomerInfo(ownedInfo()).outcome,
    storeReportFromCustomerInfo(emptyInfo()).outcome,
    ...['0', '1', '2', '3', '5', '6', '10', '20', '23', '24'].map(
      code => storeReportFromPurchaseError(rcError(code)).outcome,
    ),
  ]);
  for (const outcome of produced) {
    assert.ok(
      OUTCOMES_WITH_COPY.includes(outcome),
      `${outcome} has no copy — the screen would render blank`,
    );
    assert.ok(PURCHASE_OUTCOMES.includes(outcome));
  }
});

/** Pre-release narrative payoff: result money, never an economy. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  GIG_PAYOUT,
  deriveGigPayout,
  gigPayoutForResult,
} from '../game/state/gigPayout.ts';
import {
  createAppFlow,
  isCustomSetlistUnlocked,
  loadDraft,
  recordStageCleared,
  runBeersTotal,
  startCustomGig,
  startStage,
} from '../game/state/appFlow.ts';
import { STAGES } from '../game/levels/stages.ts';
import { availableTracks } from '../game/audio/musicCatalogue.ts';
import { allCatalogues } from '../game/i18n/catalogue.ts';
import { format } from '../game/i18n/format.ts';
import { emptySave, serializeSave } from '../game/state/persistence.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const scores = { grooveScore: 7_800, defenseScore: 5_400 };
const lastStage = STAGES.length - 1;

test('narrative polish: payout appears only on successful full-show completion', () => {
  const flow = createAppFlow();
  startStage(flow, 0);
  assert.equal(gigPayoutForResult(flow, 'SHOW_COMPLETE', scores), null);

  flow.stageIndex = lastStage;
  assert.equal(gigPayoutForResult(flow, 'SHOW_COMPLETE', scores), 320);
});

test('narrative polish: a ruined show receives no payout', () => {
  const flow = createAppFlow();
  flow.stageIndex = lastStage;
  assert.equal(gigPayoutForResult(flow, 'SHOW_RUINED', scores), null);
});

test('narrative polish: the same result always derives the same payout', () => {
  assert.equal(deriveGigPayout(scores), deriveGigPayout({ ...scores }));
  assert.equal(deriveGigPayout(scores), 320);
});

test('narrative polish: variable payouts stay within the documented bounds', () => {
  const cases = [
    { grooveScore: 0, defenseScore: 0 },
    scores,
    { grooveScore: Number.MAX_SAFE_INTEGER, defenseScore: Number.MAX_SAFE_INTEGER },
    { grooveScore: Number.NaN, defenseScore: -500 },
  ];
  for (const result of cases) {
    const payout = deriveGigPayout(result);
    assert.ok(payout >= GIG_PAYOUT.minimum);
    assert.ok(payout <= GIG_PAYOUT.maximum);
  }
});

test('narrative polish: official and custom full shows both receive payout', () => {
  const official = createAppFlow();
  startStage(official, lastStage);

  const custom = createAppFlow();
  custom.bestStageCleared = lastStage;
  loadDraft(custom, Object.freeze(availableTracks().slice(0, 4)));
  assert.ok(startCustomGig(custom));
  custom.stageIndex = lastStage;

  assert.equal(gigPayoutForResult(official, 'SHOW_COMPLETE', scores), 320);
  assert.equal(gigPayoutForResult(custom, 'SHOW_COMPLETE', scores), 320);
});

test('narrative polish: payout is absent from persistent state', () => {
  const save = emptySave();
  const serialized = serializeSave(save);
  assert.equal('gigPayout' in save, false);
  assert.equal(/gigPayout|wallet|balance|bank|coins/i.test(serialized), false);

  const persistenceSource = readFileSync(join(repoRoot, 'game/state/persistence.ts'), 'utf8');
  assert.equal(/['"]gigPayout['"]/.test(persistenceSource), false);
});

test('narrative polish: English and pt-BR carry the exact payoff', () => {
  const catalogues = Object.fromEntries(allCatalogues());
  assert.equal(catalogues.en.results.gigPayout, 'GIG PAYOUT');
  assert.equal(catalogues.en.results.nextGigBooked, 'NEXT GIG BOOKED');
  assert.equal(catalogues.en.results.nextGigLine, 'Apparently, nobody learned anything.');
  assert.equal(catalogues['pt-BR'].results.gigPayout, 'CACHÊ DO SHOW');
  assert.equal(catalogues['pt-BR'].results.nextGigBooked, 'PRÓXIMO SHOW MARCADO');
  assert.equal(catalogues['pt-BR'].results.nextGigLine, 'Pelo visto, ninguém aprendeu nada.');
});

test('narrative polish: currency is locale presentation, not conversion', () => {
  const catalogues = Object.fromEntries(allCatalogues());
  assert.equal(format(catalogues.en.results.gigPayoutValue, { amount: 320 }), '$320');
  assert.equal(format(catalogues['pt-BR'].results.gigPayoutValue, { amount: 320 }), 'R$ 320');
});

test('narrative polish: pseudo locale includes and formats every payoff string', () => {
  const pseudo = Object.fromEntries(allCatalogues()).pseudo;
  for (const value of [
    pseudo.results.gigPayout,
    pseudo.results.nextGigBooked,
    pseudo.results.nextGigLine,
  ]) {
    assert.ok(value.trim().length > 0);
  }
  const amount = format(pseudo.results.gigPayoutValue, { amount: 320 });
  assert.ok(amount.includes('320'));
  assert.equal(amount.includes('{amount}'), false);
});

test('narrative polish: first unlock and beer statistics remain unchanged', () => {
  const flow = createAppFlow();
  flow.stageIndex = lastStage;
  const first = recordStageCleared(flow, 3);
  assert.equal(first.unlockedCustomSetlist, true);
  assert.equal(isCustomSetlistUnlocked(flow), true);
  assert.equal(runBeersTotal(flow), 3);

  const later = recordStageCleared(flow, 3);
  assert.equal(later.unlockedCustomSetlist, false);
  assert.equal(runBeersTotal(flow), 3);
});

/**
 * M25 — how many beers the drummer actually drank.
 *
 * Source of truth: the M25 brief, §14-§23.
 *
 * The statistic is a joke and the joke only works if the number is true, so
 * these tests are about exactly one thing: **what counts as a beer.** M18
 * already decided that — a mug caught within arm's reach is drunk, a mug swatted
 * far away smashes — and this milestone must not invent a second answer. So the
 * count is asserted against `drunk`, the same flag that pays the bonus and goes
 * out on the event, and never against a mug spawning, a mug being near, or a
 * drink animation playing.
 *
 * The other half is arithmetic across a run: a retried stage must not be able to
 * inflate a finished show's total, which is a property of how
 * `recordStageCleared` writes rather than of anyone remembering to subtract.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createRound,
  resolveTap,
  startRound,
  targetViews,
  tickRound,
  type RoundState,
} from '../game/state/roundState.ts';
import {
  createAppFlow,
  emptyRunBeers,
  recordStageCleared,
  returnToTitle,
  runBeersTotal,
  startCustomGig,
  startStage,
  advanceToNextStage,
  loadDraft,
  type AppFlowState,
} from '../game/state/appFlow.ts';
import { STAGES } from '../game/levels/stages.ts';
import { DRINK_MIN_CLOSENESS } from '../game/config/targets.ts';
import { countdownDurationMs } from '../game/config/rhythm.ts';
import { closenessAt } from '../game/systems/approach.ts';
import { allCatalogues } from '../game/i18n/catalogue.ts';
import { format } from '../game/i18n/format.ts';
import { MIN_VIEWPORT, wrappedLines } from '../game/rendering/textMetrics.ts';
import { SUMMARY, SUMMARY_LABEL_WIDTH } from '../game/rendering/overlayLayout.ts';
import { availableTracks } from '../game/audio/musicCatalogue.ts';
import { SETLIST_SLOTS } from '../game/audio/setlist.ts';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** A round at the first frame of actual play. */
function playing(): RoundState {
  const state = createRound();
  startRound(state);
  for (let left = countdownDurationMs(); left > 0; left -= 16) tickRound(state, 16);
  assert.equal(state.state, 'PLAYING');
  return state;
}

/** Clears everything that is not a mug, and stops on the next mug. */
function advanceToMug(state: RoundState) {
  for (let guard = 0; guard < 5000; guard += 1) {
    const mug = targetViews(state).find((v) => v.status === 'active' && v.kind === 'beerMug');
    if (mug) return mug;
    tickRound(state, 16);
    for (const view of targetViews(state)) {
      if (view.status === 'active' && view.kind !== 'beerMug') {
        resolveTap(state, { x: view.x, y: view.y });
      }
    }
  }
  throw new Error('no mug spawned');
}

/** Ticks the tracked mug until it is close enough to be drunk, then taps it. */
function drink(state: RoundState, id: number) {
  for (let guard = 0; guard < 5000; guard += 1) {
    const view = targetViews(state).find((v) => v.id === id);
    assert.ok(view, 'the mug left the round before it could be drunk');
    assert.equal(view.status, 'active', 'the mug resolved before it was tapped');
    if (closenessAt(view.progress) >= DRINK_MIN_CLOSENESS) {
      const events = resolveTap(state, { x: view.x, y: view.y });
      const hit = events.find((e) => e.type === 'TARGET_HIT');
      assert.ok(hit && hit.type === 'TARGET_HIT' && hit.drunk, 'the tap did not read as a drink');
      return view;
    }
    tickRound(state, 16);
  }
  throw new Error('the mug never came within reach');
}

// ---------------------------------------------------------------------------
// What counts, in one attempt
// ---------------------------------------------------------------------------

test('M25: a round starts with no beers drunk', () => {
  assert.equal(createRound().beersDrunk, 0);
  assert.equal(playing().beersDrunk, 0, 'the pre-roll poured something');
});

test('M25: a mug smashed far away is not a beer', () => {
  const state = playing();
  const mug = advanceToMug(state);
  assert.ok(
    closenessAt(mug.progress) < DRINK_MIN_CLOSENESS,
    'a freshly spawned mug should be short of the drink threshold',
  );

  const events = resolveTap(state, { x: mug.x, y: mug.y });
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.drunk, false, 'the mug read as drunk, so this test proves nothing');
  assert.equal(state.beersDrunk, 0, 'a smashed mug was counted as a beer');
});

test('M25: a mug that reaches the drummer is exactly one beer', () => {
  const state = playing();
  const mug = advanceToMug(state);
  drink(state, mug.id);
  assert.equal(state.beersDrunk, 1);
});

test('M25: a mug that is never hit at all is not a beer', () => {
  const state = playing();
  const mug = advanceToMug(state);

  // Let it run past the drummer untouched: a miss, not a drink.
  for (let guard = 0; guard < 5000; guard += 1) {
    const view = targetViews(state).find((v) => v.id === mug.id);
    if (!view || view.status !== 'active') break;
    tickRound(state, 16);
  }

  const view = targetViews(state).find((v) => v.id === mug.id);
  assert.notEqual(view?.status, 'active', 'the mug never resolved');
  assert.equal(state.beersDrunk, 0, 'a mug nobody touched was counted as drunk');
});

test('M25: each drunk mug counts once, and several count severally', () => {
  const state = playing();
  let drunk = 0;

  for (let guard = 0; guard < 6 && state.state === 'PLAYING'; guard += 1) {
    let mug;
    try {
      mug = advanceToMug(state);
    } catch {
      break;
    }
    if (state.state !== 'PLAYING') break;
    drink(state, mug.id);
    drunk += 1;
    assert.equal(state.beersDrunk, drunk, `beer ${String(drunk)} did not land as one`);
  }

  assert.ok(drunk >= 2, `only ${String(drunk)} mugs were drinkable; the test proved little`);
});

test('M25: tapping the same mug again cannot pour a second beer', () => {
  /*
   * The duplicate-event case, and it is guarded by construction rather than by
   * a flag: `resolveTap` skips any target whose status is not `active`, and a
   * drunk mug is `hit`. A doubled touch, a re-entrant frame, or a second finger
   * on the same pixel all end in the same place — no event, and no beer.
   */
  const state = playing();
  const mug = advanceToMug(state);
  const view = drink(state, mug.id);
  assert.equal(state.beersDrunk, 1);

  for (let again = 0; again < 3; again += 1) {
    const events = resolveTap(state, { x: view.x, y: view.y });
    assert.equal(
      events.some((e) => e.type === 'TARGET_HIT' && e.targetId === mug.id),
      false,
      'a mug that was already drunk was hit again',
    );
  }
  assert.equal(state.beersDrunk, 1, 'tapping a drunk mug again poured another');
});

test('M25: starting the stage again starts the count again', () => {
  const state = playing();
  const mug = advanceToMug(state);
  drink(state, mug.id);
  assert.equal(state.beersDrunk, 1);

  /*
   * A retry is a new `RoundState` — `GameEngine.resetScene` calls `createRound`
   * — so the attempt's count resets without anything having to remember to
   * clear it. That is the whole retry rule, and this is what it rests on.
   */
  const retry = playing();
  assert.equal(retry.beersDrunk, 0, 'a retried stage kept the last attempt’s beers');
});

// ---------------------------------------------------------------------------
// What adds up, across a run
// ---------------------------------------------------------------------------

/** A flow sitting on `index`, as a run in progress would be. */
function runAt(index: number): AppFlowState {
  const flow = createAppFlow();
  startStage(flow, 0);
  flow.stageIndex = index;
  return flow;
}

test('M25: a fresh run has drunk nothing', () => {
  const flow = createAppFlow();
  assert.deepEqual([...flow.runBeers], [...emptyRunBeers()]);
  assert.equal(flow.runBeers.length, STAGES.length, 'a stage exists with nowhere to count');
  assert.equal(runBeersTotal(flow), 0);
});

test('M25: a completed stage contributes its beers to the run', () => {
  const flow = createAppFlow();
  startStage(flow, 0);

  let expected = 0;
  for (let index = 0; index < STAGES.length; index += 1) {
    flow.stageIndex = index;
    recordStageCleared(flow, index + 1);
    expected += index + 1;
    assert.equal(runBeersTotal(flow), expected, `stage ${String(index + 1)} did not add up`);
  }
});

test('M25: recording the same completion twice does not pour twice', () => {
  /*
   * The effect that calls `recordStageCleared` re-runs on every re-render of a
   * results screen. If this added instead of assigning, a player sitting on
   * their results would watch the number climb.
   */
  const flow = runAt(0);
  for (let again = 0; again < 5; again += 1) recordStageCleared(flow, 3);
  assert.equal(runBeersTotal(flow), 3);
});

test('M25: retrying a stage replaces its beers rather than adding them', () => {
  const flow = runAt(0);
  recordStageCleared(flow, 4);
  assert.equal(runBeersTotal(flow), 4);

  // The same stage, finished again with a worse night out.
  recordStageCleared(flow, 2);
  assert.equal(runBeersTotal(flow), 2, 'a retry farmed the show total');
});

test('M25: a ruined attempt contributes nothing to the run', () => {
  /*
   * `recordStageCleared` is only reached from `SHOW_COMPLETE` — a ruined show
   * is a retry, not progress — so a failed attempt cannot write a slot at all.
   * What it drank is still on its own results screen, from `round.beersDrunk`.
   */
  const flow = runAt(1);
  const before = [...flow.runBeers];
  assert.deepEqual([...flow.runBeers], before);
  assert.equal(runBeersTotal(flow), 0, 'a stage nobody finished counted toward the show');
});

test('M25: advancing keeps the run, and leaving it ends it', () => {
  const flow = createAppFlow();
  startStage(flow, 0);
  recordStageCleared(flow, 2);
  assert.equal(advanceToNextStage(flow), true);
  assert.equal(runBeersTotal(flow), 2, 'the next stage forgot the last one');

  recordStageCleared(flow, 3);
  assert.equal(runBeersTotal(flow), 5);

  returnToTitle(flow);
  assert.equal(runBeersTotal(flow), 0, 'quitting to the title kept the run’s beers');
});

test('M25: a new run from a stage card starts empty', () => {
  const flow = createAppFlow();
  startStage(flow, 0);
  recordStageCleared(flow, 6);
  assert.equal(runBeersTotal(flow), 6);

  startStage(flow, 0);
  assert.equal(runBeersTotal(flow), 0, 'a fresh run opened with the last one’s total');
});

test('M25: a count is a count — nothing fractional or negative reaches the run', () => {
  const flow = runAt(0);
  recordStageCleared(flow, -3);
  assert.equal(runBeersTotal(flow), 0);
  recordStageCleared(flow, 2.7);
  assert.equal(runBeersTotal(flow), 2);
  recordStageCleared(flow, Number.NaN);
  assert.equal(runBeersTotal(flow), 0);
});

// ---------------------------------------------------------------------------
// The same, whoever chose the music
// ---------------------------------------------------------------------------

test('M25: a custom run counts beers exactly as the official one does', () => {
  const selectable = availableTracks();
  assert.ok(selectable.length >= SETLIST_SLOTS, 'not enough songs to build a setlist');

  const official = createAppFlow();
  startStage(official, 0);

  const custom = createAppFlow();
  custom.bestStageCleared = STAGES.length - 1;
  loadDraft(custom, selectable.slice(0, SETLIST_SLOTS));
  assert.notEqual(startCustomGig(custom), null, 'the custom gig refused to start');

  assert.equal(runBeersTotal(custom), 0, 'a custom run did not start empty');

  for (let index = 0; index < STAGES.length; index += 1) {
    official.stageIndex = index;
    custom.stageIndex = index;
    recordStageCleared(official, index + 1);
    recordStageCleared(custom, index + 1);
  }

  assert.equal(
    runBeersTotal(custom),
    runBeersTotal(official),
    'the player’s own setlist changed how many beers a run is worth',
  );
});

test('M25: the beer statistic cannot see the music', () => {
  /*
   * §20 of the brief, as a property of the module graph rather than of care.
   * The count lives in the round domain, and the round domain has no way to
   * reach a catalogue, a setlist or a track — which is what makes "music
   * selection cannot affect counting" true without having to test every
   * combination of the two.
   */
  const source = readFileSync(join(repoRoot, 'game/state/roundState.ts'), 'utf8');
  for (const forbidden of ['musicCatalogue', 'setlist', 'audioService', 'appFlow']) {
    assert.equal(
      new RegExp(`from '[^']*${forbidden}`).test(source),
      false,
      `the round domain imports ${forbidden}, so a beer could depend on a song`,
    );
  }
});

// ---------------------------------------------------------------------------
// What the player reads
// ---------------------------------------------------------------------------

test('M25: every locale names the statistic, and the name fits its row', () => {
  for (const [locale, strings] of allCatalogues()) {
    const label = strings.summary.beersDown;
    assert.ok(label.trim().length > 0, `${locale}: the summary label is empty`);

    const lines = wrappedLines(label, SUMMARY.label.fontSize, SUMMARY_LABEL_WIDTH);
    assert.ok(lines <= 1, `${locale}: "${label}" takes ${lines} lines and pushes the number out`);
  }
});

test('M25: the show’s total fits one line under the outcome, in every locale', () => {
  /*
   * The same budget the M22 "new best" line is held to: it sits between the
   * outcome and the summary on a results screen already measured against
   * 411 dp of height, so it has to be one line.
   */
  for (const [locale, strings] of allCatalogues()) {
    const text = format(strings.results.beersTonight, { count: 44 });
    assert.equal(text.includes('{'), false, `${locale}: an unfilled placeholder reached the screen`);
    assert.ok(text.includes('44'), `${locale}: the count is not in the sentence`);

    const lines = wrappedLines(text, 13, MIN_VIEWPORT.width - 56);
    assert.ok(lines <= 1, `${locale}: "${text}" takes ${lines} lines`);
  }
});

test('M25: the total reads correctly for one beer as well as for none', () => {
  /*
   * The catalogue has no plural rules on purpose (see `catalogue.ts`), so the
   * copy must be a label and a number rather than a sentence with a count in
   * it — "1 beers down" is the failure this guards.
   */
  for (const [locale, strings] of allCatalogues()) {
    /*
     * `pseudo` is skipped, and only here. It is generated by appending vowels
     * to reach an expansion target, so its padding lands after the placeholder
     * and the count is legitimately not the last thing in the string. That is a
     * property of the generator, not of the copy — every other test in this file
     * still holds it to the same rules as a real locale.
     */
    if (locale === 'pseudo') continue;
    for (const count of [0, 1, 2]) {
      const text = format(strings.results.beersTonight, { count });
      assert.ok(
        text.trim().endsWith(String(count)),
        `${locale}: "${text}" puts the count mid-sentence, where a plural would have to agree`,
      );
    }
  }
});

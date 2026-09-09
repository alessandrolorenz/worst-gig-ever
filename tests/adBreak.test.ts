/** M23: where an interstitial may appear, and everywhere it may not. */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AD_BREAK_STAGES,
  isAdBreakBoundary,
  shouldShowAdBreak,
  type AdBreakContext,
} from '../game/state/adBreak.ts';
import { GAME_STATES, type GameState } from '../game/state/gameState.ts';
import { STAGES } from '../game/levels/stages.ts';

/** Index of a stage by id, so the tests survive a reorder the same way the rule does. */
function indexOf(id: string): number {
  const index = STAGES.findIndex(stage => stage.id === id);
  assert.notEqual(index, -1, `no stage with id ${id}`);
  return index;
}

const stage1 = indexOf('stage-1-defense');
const stage2 = indexOf('stage-2-beat');
const stage3 = indexOf('stage-3-groove');
const stage4 = indexOf('stage-4-encore');

function context(overrides: Partial<AdBreakContext> = {}): AdBreakContext {
  return {
    flow: { stageIndex: stage2 },
    outcome: 'SHOW_COMPLETE',
    adsRemoved: false,
    adReady: true,
    ...overrides,
  };
}

test('M23: only Stage 2 success is eligible', () => {
  assert.equal(isAdBreakBoundary({ stageIndex: stage2 }, 'SHOW_COMPLETE'), true);

  assert.equal(isAdBreakBoundary({ stageIndex: stage1 }, 'SHOW_COMPLETE'), false);
  assert.equal(isAdBreakBoundary({ stageIndex: stage3 }, 'SHOW_COMPLETE'), false);
});

test('M23 amendment: Stage 4 never breaks for an ad, so the ending lands', () => {
  // The 2026-09-08 spec allowed this boundary. It was removed on 2026-09-09
  // because Stage 4 runs straight into SHOW COMPLETE, the gig payout, NEXT GIG
  // BOOKED and the custom setlist unlock. This assertion is the deviation:
  // if it ever flips, someone has put an ad in front of the ending.
  assert.equal(isAdBreakBoundary({ stageIndex: stage4 }, 'SHOW_COMPLETE'), false);

  for (const adsRemoved of [true, false]) {
    for (const adReady of [true, false]) {
      assert.equal(
        shouldShowAdBreak(context({ flow: { stageIndex: stage4 }, adsRemoved, adReady })),
        false,
        'no runtime condition may reopen the Stage 4 boundary',
      );
    }
  }
});

test('M23: the eligible boundary is exactly one, and named by stage', () => {
  const eligible = STAGES.filter(stage => isAdBreakBoundary({ stageIndex: indexOf(stage.id) }, 'SHOW_COMPLETE'));

  assert.equal(eligible.length, 1, 'a four-stage show has exactly one ad opportunity');
  assert.deepEqual(eligible.map(stage => stage.id), [...AD_BREAK_STAGES]);
  assert.deepEqual([...AD_BREAK_STAGES], ['stage-2-beat']);
});

test('M23: a ruined show is never an ad break, on any stage', () => {
  for (const stage of STAGES) {
    assert.equal(
      isAdBreakBoundary({ stageIndex: indexOf(stage.id) }, 'SHOW_RUINED'),
      false,
      `${stage.id} must not break for an ad after a failure`,
    );
  }
});

test('M23: no non-terminal round state is an ad break', () => {
  const nonTerminal = GAME_STATES.filter(
    (state): state is GameState => state !== 'SHOW_COMPLETE' && state !== 'SHOW_RUINED',
  );

  // Guards the list itself: a new state added to GAME_STATES must be considered
  // here rather than silently defaulting into whatever this test happens to cover.
  assert.deepEqual(
    [...nonTerminal],
    ['READY', 'COUNTDOWN', 'PLAYING', 'PAUSED', 'VOCALIST_EVENT'],
  );

  for (const state of nonTerminal) {
    for (const stage of STAGES) {
      assert.equal(isAdBreakBoundary({ stageIndex: indexOf(stage.id) }, state), false);
    }
  }
});

test('M23: a confirmed remove_ads entitlement skips an otherwise eligible break', () => {
  assert.equal(shouldShowAdBreak(context({ adsRemoved: true })), false);

  // Even with an ad already loaded: a purchase must be able to spend an
  // impression that was preloaded before it confirmed.
  assert.equal(shouldShowAdBreak(context({ adsRemoved: true, adReady: true })), false);
});

test('M23: an unready ad skips the opportunity rather than delaying the result', () => {
  assert.equal(shouldShowAdBreak(context({ adReady: false })), false);
});

test('M23: readiness and entitlement cannot widen placement', () => {
  // The two runtime facts may only ever subtract. No combination of them turns
  // an ineligible boundary into an eligible one.
  for (const adsRemoved of [true, false]) {
    for (const adReady of [true, false]) {
      for (const stageIndex of [stage1, stage3, stage4]) {
        assert.equal(
          shouldShowAdBreak(context({ flow: { stageIndex }, adsRemoved, adReady })),
          false,
        );
      }
      assert.equal(
        shouldShowAdBreak(context({ outcome: 'SHOW_RUINED', adsRemoved, adReady })),
        false,
      );
    }
  }
});

test('M23: the eligible boundary with a ready ad and no entitlement shows one', () => {
  assert.equal(shouldShowAdBreak(context()), true);
});

test('M23: the decision is synchronous, so it cannot block the result transition', () => {
  // Not a style check. A boolean has no "wait" to return, which is what makes
  // "an ad can never block the result transition" true by construction rather
  // than by the caller remembering to advance anyway.
  assert.equal(typeof shouldShowAdBreak(context()), 'boolean');
  assert.equal(typeof isAdBreakBoundary({ stageIndex: stage2 }, 'SHOW_COMPLETE'), 'boolean');
});

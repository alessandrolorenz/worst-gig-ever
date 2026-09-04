/**
 * M18: a mug caught near the drummer is drunk; one hit far away still breaks.
 *
 * The gate lives on `closenessAt`, not on `progress`, and the difference is
 * large enough to be the whole feature — so it is asserted directly rather
 * than implied.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createRound,
  resolveTap,
  startRound,
  targetViews,
  tickRound,
  type RoundState,
} from '../game/state/roundState.ts';
import { DRINK_MIN_CLOSENESS, TARGET_DEFINITIONS } from '../game/config/targets.ts';
import { SCORING } from '../game/config/scoring.ts';
import { countdownDurationMs, padBounds } from '../game/config/rhythm.ts';
import { closenessAt } from '../game/systems/approach.ts';
import { DRINK_RECT } from '../game/rendering/composition.ts';
import { STAGE } from '../game/config/stage.ts';
import {
  DRINK_CATCH_MS,
  DRINK_DRINK_MS,
  DRINK_FADE_MS,
  DRINK_TTL_MS,
  addDrink,
  clearEffects,
  createEffects,
  drinkFrame,
  drinkOpacity,
  tickEffects,
} from '../game/systems/effects.ts';

function playing(): RoundState {
  const state = createRound();
  startRound(state);
  tickRound(state, countdownDurationMs());
  return state;
}

/** Clears the other kind so the show survives, and stops on the one we want. */
function advanceToKind(state: RoundState, kind: 'beerMug' | 'beerBottle') {
  for (let guard = 0; guard < 5000; guard += 1) {
    const wanted = targetViews(state).find((v) => v.status === 'active' && v.kind === kind);
    if (wanted) return wanted;
    tickRound(state, 16);
    for (const view of targetViews(state)) {
      if (view.status === 'active' && view.kind !== kind) {
        resolveTap(state, { x: view.x, y: view.y });
      }
    }
  }
  throw new Error(`no ${kind} spawned`);
}

const advanceToMug = (state: RoundState) => advanceToKind(state, 'beerMug');

/** Ticks until the tracked mug satisfies `ready`, then returns its view. */
function advanceMugUntil(state: RoundState, id: number, ready: (progress: number) => boolean) {
  for (let guard = 0; guard < 5000; guard += 1) {
    const view = targetViews(state).find((v) => v.id === id);
    assert.ok(view, 'the mug left the round before it could be tapped');
    if (view.status !== 'active') throw new Error('the mug resolved before it was tapped');
    if (ready(view.progress)) return view;
    tickRound(state, 16);
  }
  throw new Error('the mug never reached the requested distance');
}

test('M18: a mug hit while it is still far away breaks and pays no bonus', () => {
  const state = playing();
  const mug = advanceToMug(state);
  assert.ok(
    closenessAt(mug.progress) < DRINK_MIN_CLOSENESS,
    'a freshly spawned mug should be well short of the drink threshold',
  );

  const scoreBefore = state.score;
  const events = resolveTap(state, { x: mug.x, y: mug.y });
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.drunk, false);
  assert.equal(hit.points, TARGET_DEFINITIONS.beerMug.basePoints * hit.multiplier);
  assert.equal(state.score - scoreBefore, hit.points);
});

test('M18: a mug caught near the drummer is drunk and pays the flat bonus', () => {
  const state = playing();
  const mug = advanceToMug(state);
  const near = advanceMugUntil(
    state,
    mug.id,
    (progress) => closenessAt(progress) >= DRINK_MIN_CLOSENESS,
  );

  const scoreBefore = state.score;
  const events = resolveTap(state, { x: near.x, y: near.y });
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.drunk, true);
  assert.equal(
    hit.points,
    TARGET_DEFINITIONS.beerMug.basePoints * hit.multiplier + SCORING.drinkBonus,
  );
  // Flat: the premium is exactly the bonus, whatever the multiplier is.
  assert.equal(
    hit.points - TARGET_DEFINITIONS.beerMug.basePoints * hit.multiplier,
    SCORING.drinkBonus,
  );
  assert.equal(state.score - scoreBefore, hit.points);
});

test('M18: the gate reads closeness, not progress — a mug at progress 0.60 breaks', () => {
  // At progress 0.60 a mug has crossed only 26% of the visible distance,
  // because depth runs from farDepth to 1 rather than linearly in time. If
  // this ever passes as a drink, the comparison has been moved onto the time
  // axis and the drummer is reaching for an object near the vanishing point.
  assert.ok(closenessAt(0.6) < DRINK_MIN_CLOSENESS);
  assert.ok(closenessAt(0.6) < 0.3, 'closeness at 60% of the flight time');

  const state = playing();
  const mug = advanceToMug(state);
  const midway = advanceMugUntil(state, mug.id, (progress) => progress >= 0.6);
  assert.ok(midway.progress >= 0.6);
  assert.ok(closenessAt(midway.progress) < DRINK_MIN_CLOSENESS);

  const events = resolveTap(state, { x: midway.x, y: midway.y });
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.drunk, false, 'a mug 60% through its flight time is not near enough to drink');
});

test('M18: a bottle is never drunk, however close it gets', () => {
  const state = playing();
  const bottle = advanceToKind(state, 'beerBottle');
  const near = advanceMugUntil(
    state,
    bottle.id,
    (progress) => closenessAt(progress) >= DRINK_MIN_CLOSENESS,
  );
  assert.ok(closenessAt(near.progress) >= DRINK_MIN_CLOSENESS);

  const events = resolveTap(state, { x: near.x, y: near.y });
  const hit = events.find((e) => e.type === 'TARGET_HIT');
  assert.ok(hit && hit.type === 'TARGET_HIT');
  assert.equal(hit.kind, 'beerBottle');
  assert.equal(hit.drunk, false, 'the bottle breaks at every distance — that contrast is the joke');
  assert.equal(hit.points, TARGET_DEFINITIONS.beerBottle.basePoints * hit.multiplier);
});

test('M18: the drink runs two frames over 480 ms and then clears itself', () => {
  const effects = createEffects();
  assert.equal(effects.drink, null);

  addDrink(effects);
  assert.ok(effects.drink);
  assert.equal(drinkFrame(effects.drink), 0, 'it opens on the catch');
  assert.equal(drinkOpacity(effects.drink), 1);

  tickEffects(effects, DRINK_CATCH_MS);
  assert.ok(effects.drink);
  assert.equal(drinkFrame(effects.drink), 1, 'the drink frame takes over after the catch');

  tickEffects(effects, DRINK_DRINK_MS);
  assert.ok(effects.drink);
  assert.equal(drinkOpacity(effects.drink), 1, 'the fade has not started yet');

  tickEffects(effects, DRINK_FADE_MS / 2);
  assert.ok(effects.drink);
  assert.ok(drinkOpacity(effects.drink) > 0 && drinkOpacity(effects.drink) < 1);

  tickEffects(effects, DRINK_FADE_MS);
  assert.equal(effects.drink, null, 'the drink clears at the end of its life');
  assert.equal(DRINK_TTL_MS, 480, 'the total is what every density measurement assumes');
});

test('M18: a second mug mid-drink cuts to the payoff instead of restarting', () => {
  const effects = createEffects();
  addDrink(effects);
  tickEffects(effects, 60);
  assert.ok(effects.drink);
  assert.equal(drinkFrame(effects.drink), 0, 'still on the catch');

  addDrink(effects);
  assert.ok(effects.drink);
  assert.equal(drinkFrame(effects.drink), 1, 'the second mug jumps forward to the drink');
  assert.equal(effects.drink.ageMs, DRINK_CATCH_MS, 'not restarted from zero');
  assert.equal(drinkOpacity(effects.drink), 1, 'and it gets a full hold, not a stub');
});

test('M18: quitting clears the drink along with every other effect', () => {
  const effects = createEffects();
  addDrink(effects);
  tickEffects(effects, 60);
  assert.ok(effects.drink);

  clearEffects(effects);
  assert.equal(effects.drink, null);
});

test('M18: the drink is drawn clear of the groove pad and the centre lanes', () => {
  const pad = padBounds();
  const right = DRINK_RECT.x + DRINK_RECT.width;

  assert.ok(
    DRINK_RECT.x > pad.right,
    'the drink must not cover the pad, or the player loses the beat every time they drink',
  );

  // The corridor the player reads targets down. The rect may overlap the
  // outermost lane — the arm is nearer to the camera than anything on stage —
  // but it must never reach the centre line the throws converge on.
  assert.ok(DRINK_RECT.x > STAGE.vanishingPoint.x, 'the drink entered the central sightline');
  for (const lane of STAGE.laneXs.slice(0, 4)) {
    assert.ok(lane < DRINK_RECT.x, `lane ${lane} is covered by the drink`);
  }

  // It bleeds past the screen corner on purpose: the conditioned art carries
  // transparent margin, and an arm that stops short reads as a floating stump.
  assert.ok(right >= 1920, 'the arm must run off the right edge of the screen');
  assert.ok(
    DRINK_RECT.y + DRINK_RECT.height >= 1080,
    'the arm must run off the bottom of the screen',
  );
});

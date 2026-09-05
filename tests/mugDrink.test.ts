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
  RESULTS_ARM_MS,
  createRound,
  resolveTap,
  resultsArmed,
  startRound,
  targetViews,
  tickRound,
  type RoundState,
} from '../game/state/roundState.ts';
import { STAGES } from '../game/levels/stages.ts';
import { en } from '../game/i18n/catalogues/en.ts';
import { allCatalogues } from '../game/i18n/catalogue.ts';
import type { RoundEvent } from '../game/state/roundEvents.ts';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
import { DRINK_MIN_CLOSENESS, TARGET_DEFINITIONS } from '../game/config/targets.ts';
import { SCORING } from '../game/config/scoring.ts';
import { countdownDurationMs, padBounds } from '../game/config/rhythm.ts';
import { closenessAt } from '../game/systems/approach.ts';
import {
  DRINK_MUG_SCREEN_FRACTION,
  DRINK_RECT,
  drinkMugOnCanvas,
} from '../game/rendering/composition.ts';
import { REFERENCE_CANVAS } from '../game/config/stage.ts';
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

/**
 * A round at the first frame of actual play.
 *
 * Frame-sized steps, not one big tick: `tickRound` clamps a delta to
 * `MAX_TICK_DELTA_MS`, so a single call asking for the whole pre-roll advances
 * 100 ms and leaves the round in COUNTDOWN.
 */
function playing(): RoundState {
  const state = createRound();
  startRound(state);
  for (let left = countdownDurationMs(); left > 0; left -= 16) tickRound(state, 16);
  assert.equal(state.state, 'PLAYING');
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

test('M22.1: the mug is 70% of the screen and away from the corner a thumb covers', () => {
  const mug = drinkMugOnCanvas();

  // The owner's number, reported against the 1.2.0 build: the drink played in
  // the bottom-right corner, which in landscape is under a thumb.
  assert.ok(
    Math.abs(mug.height / REFERENCE_CANVAS.height - DRINK_MUG_SCREEN_FRACTION) < 0.01,
    `the mug is ${(mug.height / REFERENCE_CANVAS.height * 100).toFixed(1)}% of the screen's height`,
  );

  // "mais posicionada para o centro da tela": a mug this tall whose left edge
  // is inside the left half straddles the centre line rather than sitting in
  // the corner, where 1.2.0 drew it entirely to the right of x 1398.
  assert.ok(
    mug.left < REFERENCE_CANVAS.width / 2,
    `the mug starts at x ${mug.left.toFixed(0)}, back in the corner a thumb covers`,
  );

  // Both frames have to fit between the top edge and the pad, and the drink
  // frame raises the mug higher than the catch frame this box is measured on.
  assert.ok(mug.top >= 0, 'the catch frame is clipped by the top of the canvas');
  assert.ok(
    mug.bottom <= padBounds().top,
    'the mug covers the pad, so the player loses the beat every time they drink',
  );
});

test('M18: the arm still leaves the frame rather than ending inside it', () => {
  // It bleeds past the screen corner on purpose: an arm that stops short reads
  // as a floating stump rather than as the player's own limb. Only the corner
  // is asserted here; `npm run measure:art` checks the silhouette itself.
  assert.ok(
    DRINK_RECT.x + DRINK_RECT.width >= REFERENCE_CANVAS.width,
    'the arm must run off the right edge of the screen',
  );
  assert.ok(
    DRINK_RECT.y + DRINK_RECT.height >= REFERENCE_CANVAS.height,
    'the arm must run off the bottom of the screen',
  );
});

/**
 * M18.1: the results screen lands under the finger that is still drumming.
 *
 * A stage ends abruptly and the button row sits in the lower centre, over the
 * groove pad. The owner skipped a stage this way on the 1.0.6 device build.
 */
test('M18.1: the results buttons are deaf until the screen settles', () => {
  const state = playing();

  // Let the kit take its three hits — nothing is tapped, so the show falls.
  for (let guard = 0; guard < 20_000 && state.state === 'PLAYING'; guard += 1) {
    tickRound(state, 16);
  }
  assert.equal(state.state, 'SHOW_RUINED');

  assert.equal(state.settledMs, 0, 'the settle clock starts the instant the show ends');
  assert.equal(resultsArmed(state), false, 'a tap arriving with the last beat must not land');

  // Frame-sized steps: a single huge tick is clamped to MAX_TICK_DELTA_MS.
  let elapsed = 0;
  while (elapsed < RESULTS_ARM_MS - 16) {
    tickRound(state, 16);
    elapsed += 16;
  }
  assert.equal(resultsArmed(state), false, 'still settling just before the threshold');

  tickRound(state, 32);
  assert.equal(resultsArmed(state), true, 'and armed once the delay has passed');
});

/**
 * The bug this test exists for shipped in 1.0.8 and made the game
 * unadvanceable.
 *
 * `resultsArmed` being *true* is not enough. `RoundState` is mutated in place
 * and the overlay is React, so the results screen renders once when the show
 * ends, reads the buttons as not-yet-armed, and — with nothing to tell it
 * otherwise — never renders again. The buttons stayed dead forever and the
 * owner could not leave the stage.
 *
 * The domain tests above all passed while that was true, because they drive
 * `tickRound` directly and never ask what the UI was told. The observable
 * contract is the *event*, so that is what is asserted here.
 */
test('M18.1: arming is announced, not merely become true', () => {
  const state = playing();
  for (let guard = 0; guard < 20_000 && state.state === 'PLAYING'; guard += 1) {
    tickRound(state, 16);
  }
  assert.equal(state.state, 'SHOW_RUINED');

  const armings: RoundEvent[] = [];
  for (let elapsed = 0; elapsed < RESULTS_ARM_MS * 3; elapsed += 16) {
    armings.push(...tickRound(state, 16).filter((e) => e.type === 'RESULTS_ARMED'));
  }

  assert.equal(armings.length, 1, 'exactly once — not never, and not every frame after');
  assert.equal(resultsArmed(state), true);
});

test('M18.1: a live round never announces arming', () => {
  const state = playing();
  const events: RoundEvent[] = [];
  for (let i = 0; i < 200; i += 1) events.push(...tickRound(state, 16));
  assert.equal(
    events.filter((e) => e.type === 'RESULTS_ARMED').length,
    0,
    'a round still being played has no results screen to arm',
  );
});

test('M18.1: the settle clock does not run while the round is still being played', () => {
  const state = playing();
  tickRound(state, 16);
  tickRound(state, 16);
  assert.equal(state.state, 'PLAYING');
  assert.equal(state.settledMs, 0, 'a live round is never "settling"');
});

test('M18.1: the mug rule is taught with pictures on the stage that introduces it', () => {
  // Stage 1 is where a mug is first thrown, so it is where the two outcomes
  // have to be explained — in words and, because one object behaving two ways
  // is hard to write, in pictures.
  const first = STAGES[0];
  const copy = en.stages[first.id].briefing.join(' ');
  assert.ok(/drink/i.test(copy), 'the briefing must say a mug can be drunk');
  // The owner's correction after the MVP playtest: saying a mug *can* be drunk
  // is not the rule. The rule is the condition — it has to be close enough to
  // reach — and without that the player has no way to make it happen on
  // purpose.
  assert.ok(
    /reach|close/i.test(copy),
    'the briefing must state the condition, not just the outcome',
  );
  assert.ok(
    /smash|break/i.test(copy),
    'and the other outcome, or the condition has nothing to contrast with',
  );
  assert.ok(first.briefingFigures, 'stage 1 must carry briefing pictures');
  assert.deepEqual(
    first.briefingFigures,
    ['smash', 'drink'],
    'both outcomes are shown, in the order they are explained',
  );
  // M19: the stage names the outcome; the caption for it lives in the catalogue.
  for (const figureId of first.briefingFigures) {
    assert.ok(
      en.briefingFigures[figureId].trim().length > 0,
      `${figureId} needs a caption`,
    );
  }
});

test('M18.1: the drink has a sound, and it is one this repository generates', () => {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, 'assets/manifest/asset-manifest.json'), 'utf8'),
  ) as { audio: Record<string, { path: string; origin?: string; generator?: string }> };

  const gulp = manifest.audio.mugDrink;
  assert.ok(gulp, 'the drink needs a registered sound');
  // Generated rather than downloaded: no licence to verify and no source page
  // that can go dead (AGENTS.md rules 12-14).
  assert.equal(gulp.origin, 'generated');
  assert.equal(gulp.generator, 'scripts/make-mug-gulp.mjs');
  assert.ok(existsSync(join(repoRoot, gulp.path)), `missing ${gulp.path}`);
  assert.ok(existsSync(join(repoRoot, gulp.generator)), 'the generator must be committed');

  // It has to end before the arm does, or the sound outlives its own picture.
  const wav = readFileSync(join(repoRoot, gulp.path));
  const sampleRate = wav.readUInt32LE(24);
  const durationMs = ((wav.length - 44) / 2 / sampleRate) * 1000;
  assert.ok(durationMs <= DRINK_TTL_MS, `gulp is ${durationMs.toFixed(0)} ms, drink is ${DRINK_TTL_MS}`);

  // Headroom, not the ceiling: it plays over music, the burst and the whoosh.
  let peak = 0;
  for (let i = 44; i + 1 < wav.length; i += 2) {
    peak = Math.max(peak, Math.abs(wav.readInt16LE(i)) / 32_768);
  }
  assert.ok(peak > 0.5 && peak < 0.95, `gulp peak ${peak.toFixed(3)} should be loud but not clipping`);
});

/**
 * The MVP playtest found the mug rule missing from stage 1. It was not missing
 * — it was written as four separate briefing entries, so the renderer gave each
 * fragment its own bullet, and the card overflowed a 150 px scroll with no
 * indicator. The rule was on screen and unreadable, which the player cannot
 * tell apart from absent.
 *
 * Both halves of that are guarded here: one idea per entry, and a budget the
 * card can actually show.
 */
test('M18.1: every briefing entry is a whole sentence, not a fragment', () => {
  /*
   * Extended to every locale at M21. The defect this catches — a rule written
   * as four fragments, each given its own bullet by the renderer — is a
   * property of how the copy is written, not of which language it is in, and a
   * translator splitting one sentence into two is exactly how it comes back.
   *
   * `\p{Lu}` rather than `A-Z`, because a Portuguese sentence may open on an
   * accented capital and an ASCII range would call that a fragment.
   */
  for (const [locale, catalogue] of allCatalogues()) {
    for (const stage of STAGES) {
      for (const line of catalogue.stages[stage.id].briefing) {
        assert.match(
          line,
          /[.!?]$/,
          `${locale}, stage ${stage.number}: "${line}" does not end a sentence — the ` +
            'renderer gives every entry its own bullet, so a fragment reads as a broken list',
        );
        assert.ok(
          line.trim().length > 0 && /^[\p{Lu}“"]/u.test(line.trim()),
          `${locale}, stage ${stage.number}: "${line}" does not start a sentence`,
        );
      }
    }
  }
});

/*
 * The height budget that used to live here was deleted at M20.
 *
 * It compared an estimated briefing height against `VIEWPORT_PX * 1.6` — 320
 * px against a 200 px card — so it permitted 60% overflow by construction, and
 * it passed a card that was clipping the mug rule in English on a real device
 * (M19 emulator run, 2026-09-05).
 *
 * Its replacement is `tests/layoutBudget.test.ts`, which measures against the
 * height the card actually has and does it in every locale. Loosening this one
 * further, or keeping both, would have left two budgets with different numbers
 * and no way to tell which was the contract.
 *
 * The sentence rule above is untouched: it is about copy, not about height,
 * and it is still right.
 */

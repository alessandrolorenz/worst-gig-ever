/**
 * M15 — the two stages and the screen flow around them.
 *
 * Two things are being held here, and they matter for different reasons.
 *
 * The **flow** is new and cheap to get wrong: a screen that cannot be left, a
 * stage that advances past the end of the list, a briefing that describes the
 * previous stage. All of that is pure state and is asserted directly.
 *
 * The **stages** carry a promise made to the owner: Stage 2 is the round that
 * was validated on a physical device at M13.1 and approved visually at M14,
 * unchanged. `game/levels/level01.ts` is that round, and the assertions below
 * are what make a future edit to it fail here rather than in a playtest.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  advanceToNextStage,
  beginRound,
  createAppFlow,
  currentStage,
  finishIntro,
  isStageCleared,
  recordStageCleared,
  replayIntro,
  returnToTitle,
  showBriefing,
  stageCount,
  startStage,
} from '../game/state/appFlow.ts';
import {
  clampStageIndex,
  hasNextStage,
  STAGES,
  stageAt,
} from '../game/levels/stages.ts';
import { FASTBALL_CHANCE } from '../game/config/targets.ts';
import { en } from '../game/i18n/catalogues/en.ts';
import { defenseDrill } from '../game/levels/defenseDrill.ts';
import { encore } from '../game/levels/encore.ts';
import { findTheBeat } from '../game/levels/findTheBeat.ts';
import { level01 } from '../game/levels/level01.ts';
import { createRound, phaseAt, tickRound } from '../game/state/roundState.ts';
import { createRhythm, resolvePadTap, tickRhythm } from '../game/state/rhythmState.ts';
import { beatTimeMs } from '../game/config/rhythm.ts';

// ---------------------------------------------------------------------------
// The stages
// ---------------------------------------------------------------------------

test('the four stages run objects, beat, both, escalation', () => {
  // The teaching order the owner asked for at M16, asserted as a sequence
  // rather than as separate facts: one job, the other job, both, then the
  // escalation M17 added on the end.
  assert.equal(stageCount(), 4);
  assert.equal(STAGES[0].level, defenseDrill);
  assert.equal(STAGES[1].level, findTheBeat);
  assert.equal(STAGES[2].level, level01);
  assert.equal(STAGES[3].level, encore);

  assert.equal(STAGES[0].groove, false, 'stage 1 teaches objects with no beat');
  assert.equal(STAGES[1].groove, true, 'stage 2 teaches the beat');
  assert.equal(STAGES[2].groove, true, 'stage 3 is the show');
  assert.equal(STAGES[3].groove, true, 'stage 4 asks for everything');
});

test('the beat stage opens on the beat alone, and only then adds objects', () => {
  // Twelve seconds of nothing but the pulse is the entire point of the stage
  // (M16). If a phase ever covers time zero, the lesson is gone.
  assert.equal(phaseAt(findTheBeat, 0), null, 'something is thrown in the teaching window');
  assert.equal(phaseAt(findTheBeat, 11_999), null);
  assert.notEqual(phaseAt(findTheBeat, 12_000), null);

  // And the first bottle lands one full interval after the phase opens,
  // because that is how the scheduler seeds a phase it enters from silence.
  const round = createRound(findTheBeat);
  round.state = 'PLAYING';
  let firstSpawnAtMs: number | null = null;
  for (let guard = 0; guard < 10_000 && round.elapsedMs < findTheBeat.durationMs; guard += 1) {
    const events = tickRound(round, 50);
    if (firstSpawnAtMs === null && events.some((event) => event.type === 'TARGET_SPAWNED')) {
      firstSpawnAtMs = round.elapsedMs;
    }
  }
  assert.notEqual(firstSpawnAtMs, null, 'the teaching stage never threw anything');
  assert.ok(
    firstSpawnAtMs !== null && firstSpawnAtMs >= 14_600 && firstSpawnAtMs < 14_700,
    `first spawn was at ${String(firstSpawnAtMs)}, expected ~14600`,
  );
});

test('the beat stage is the sparsest round in the game, and bottles only', () => {
  const sparsest = Math.min(...findTheBeat.phases.map((phase) => phase.spawnEveryMs));
  const showOpening = level01.phases[0].spawnEveryMs;
  const drillSparsest = Math.min(...defenseDrill.phases.map((phase) => phase.spawnEveryMs));
  assert.ok(
    Math.max(...findTheBeat.phases.map((phase) => phase.spawnEveryMs)) > drillSparsest,
    'the teaching stage must be sparser than the drill somewhere',
  );
  assert.ok(sparsest >= showOpening, 'the teaching stage must never out-pace the show opening');

  for (const phase of findTheBeat.phases) {
    assert.deepEqual(phase.kinds, ['beerBottle'], 'the teaching stage introduces one object only');
  }

  // It hands over at exactly the cadence the show opens on, so Stage 3 starts
  // where Stage 2 finished instead of stepping down and up again.
  const last = findTheBeat.phases[findTheBeat.phases.length - 1];
  assert.equal(last.spawnEveryMs, showOpening);
});

test('the beat stage does not spend the show\'s one surprise', () => {
  assert.equal(findTheBeat.vocalistEventAtMs, null);
});

test('every stage draws from its own seed', () => {
  const seeds = STAGES.map((stage) => stage.level.randomSeed);
  assert.equal(new Set(seeds).size, seeds.length, 'two stages would rehearse each other');
});

test("Stage 3 keeps the validated round's structure, and its opening", () => {
  /*
   * The M13.1/M14 freeze, read from the level the stage points at. M17.1
   * retuned the show's *curve* on 2026-09-05 with the owner's explicit
   * go-ahead; it did not touch the round's shape, and the difference matters
   * enough to assert separately.
   */
  assert.equal(level01.durationMs, 60_000);
  assert.equal(level01.startingIntegrity, 3);
  assert.equal(level01.vocalistEventAtMs, 41_000);
  assert.equal(level01.maxConcurrentTargets, 4);
  assert.equal(level01.randomSeed, 1);
  assert.deepEqual(
    level01.phases.map((phase) => [phase.fromMs, phase.toMs]),
    [
      [0, 15_000],
      [15_000, 35_000],
      [45_000, 60_000],
    ],
    'the phase boundaries are structure, not tuning, and M17.1 did not move them',
  );

  /*
   * The opening is the half of the retune the owner chose. Of two measured
   * candidates, the one taken leaves the first phase alone — flat cadence,
   * bottles only — and starts both curves at the values the validated round
   * already ran at, so a player's first twenty seconds are the ones that were
   * approved on a physical device. If any of these three move, that promise
   * is gone and it should be a decision rather than a diff.
   */
  assert.equal(level01.phases[0].spawnEveryMs, 1800, 'the show opens at its validated cadence');
  assert.equal(level01.phases[0].spawnEveryToMs, undefined, 'the opening phase must not ramp');
  assert.equal(level01.speedCurve?.start, 1, 'the show must open at the validated approach speed');
  assert.equal(
    level01.fastballCurve?.start,
    FASTBALL_CHANCE,
    'the show must open at the validated fastball chance',
  );

  // And the escalation only ever tightens. A curve that ended above its start
  // would be an anticlimax dressed as a ramp, which is the defect M17.1 fixed.
  assert.ok(level01.speedCurve && level01.speedCurve.end < level01.speedCurve.start);
  assert.ok(level01.fastballCurve && level01.fastballCurve.end > level01.fastballCurve.start);
});

test('the drill is a real, losable round rather than a demo', () => {
  assert.ok(defenseDrill.durationMs > 0);
  assert.equal(defenseDrill.startingIntegrity, level01.startingIntegrity);
  assert.ok(
    defenseDrill.durationMs < level01.durationMs,
    'the drill should cost less than a full show to fail',
  );
});

test('the drill has no vocalist interruption, and the round respects that', () => {
  assert.equal(defenseDrill.vocalistEventAtMs, null);

  const round = createRound(defenseDrill);
  round.state = 'PLAYING';
  for (let guard = 0; guard < 10_000 && round.elapsedMs < defenseDrill.durationMs; guard += 1) {
    tickRound(round, 100);
    assert.notEqual(round.state, 'VOCALIST_EVENT', 'the drill interrupted the player');
  }
  assert.equal(round.vocalist.triggered, false);
  assert.equal(round.vocalist.status, 'idle');
});

test('the drill opens on exactly the cadence the show opens on', () => {
  // What the player learns in Stage 1 has to be what the show then asks for.
  assert.equal(phaseAt(defenseDrill, 0)?.spawnEveryMs, phaseAt(level01, 0)?.spawnEveryMs);
  assert.deepEqual(phaseAt(defenseDrill, 0)?.kinds, phaseAt(level01, 0)?.kinds);
});

test('the drill escalates but stops one step short of the show', () => {
  const drillPeak = Math.min(...defenseDrill.phases.map((phase) => phase.spawnEveryMs));
  const showPeak = Math.min(...level01.phases.map((phase) => phase.spawnEveryMs));
  assert.ok(drillPeak > showPeak, 'the drill must not be as dense as the show');

  const intervals = defenseDrill.phases.map((phase) => phase.spawnEveryMs);
  for (let i = 1; i < intervals.length; i += 1) {
    assert.ok(intervals[i] < intervals[i - 1], 'each drill phase must tighten');
  }
});

test('the drill phases tile its whole round with no gap and no overrun', () => {
  let cursor = 0;
  for (const phase of defenseDrill.phases) {
    assert.equal(phase.fromMs, cursor, 'a gap or overlap between drill phases');
    assert.ok(phase.toMs > phase.fromMs);
    cursor = phase.toMs;
  }
  assert.equal(cursor, defenseDrill.durationMs, 'the drill stops scheduling before it ends');
});

test('the two stages do not replay the same throws', () => {
  assert.notEqual(defenseDrill.randomSeed, level01.randomSeed);
});

test('the stage index is clamped rather than trusted', () => {
  assert.equal(clampStageIndex(-5), 0);
  assert.equal(clampStageIndex(99), STAGES.length - 1);
  assert.equal(clampStageIndex(Number.NaN), 0);
  assert.equal(clampStageIndex(1.9), 1);
  assert.equal(stageAt(99), STAGES[STAGES.length - 1]);
});

test('only the last stage has nothing after it', () => {
  assert.equal(hasNextStage(0), true);
  assert.equal(hasNextStage(STAGES.length - 1), false);
});

// ---------------------------------------------------------------------------
// The Groove switch is a rule, not a coat of paint
// ---------------------------------------------------------------------------

test('a defense-only stage never scores, misses, or judges a beat', () => {
  const rhythm = createRhythm();
  const context = (elapsedMs: number) => ({
    elapsedMs,
    durationMs: defenseDrill.durationMs,
    state: 'PLAYING' as const,
    grooveEnabled: false,
  });

  // A perfectly timed tap on the pad scores nothing, because there is no pad.
  assert.deepEqual(resolvePadTap(rhythm, context(beatTimeMs(4))), []);
  // And letting a whole round of beats go by costs nothing either.
  assert.deepEqual(tickRhythm(rhythm, context(defenseDrill.durationMs)), []);

  assert.deepEqual(rhythm, createRhythm(), 'a defense-only stage touched the Groove state');
});

test('the same taps on a Groove stage do score', () => {
  const rhythm = createRhythm();
  const events = resolvePadTap(rhythm, {
    elapsedMs: beatTimeMs(4),
    durationMs: level01.durationMs,
    state: 'PLAYING',
    grooveEnabled: true,
  });
  /*
   * The tap also closes out the beats it skipped past, so this is a hit plus
   * some misses rather than a single event. What matters is that the hit is
   * there: without it the negative case above would prove nothing.
   */
  assert.ok(
    events.some((event) => event.type === 'BEAT_HIT'),
    'the control case must score, or the test above proves nothing',
  );
  assert.ok(rhythm.score > 0);
});

// ---------------------------------------------------------------------------
// The flow
// ---------------------------------------------------------------------------

test('the game opens on the story, at stage one, with nothing cleared', () => {
  const flow = createAppFlow();
  assert.equal(flow.screen, 'STORY');
  assert.equal(flow.stageIndex, 0);
  assert.equal(flow.introSeen, false);
  assert.equal(flow.bestStageCleared, -1);
  assert.equal(isStageCleared(flow, 0), false);
});

test('the story leads to the title and is not shown again by itself', () => {
  const flow = createAppFlow();
  finishIntro(flow);
  assert.equal(flow.screen, 'TITLE');
  assert.equal(flow.introSeen, true);
});

test('the story can be replayed from the title without losing progress', () => {
  const flow = createAppFlow();
  finishIntro(flow);
  startStage(flow, 1);
  recordStageCleared(flow);
  returnToTitle(flow);

  replayIntro(flow);
  assert.equal(flow.screen, 'STORY');
  assert.equal(flow.bestStageCleared, 1, 'replaying the story reset progress');
  assert.equal(flow.introSeen, true);
});

test('picking a stage opens its briefing, not its round', () => {
  const flow = createAppFlow();
  finishIntro(flow);

  startStage(flow, 1);
  assert.equal(flow.screen, 'BRIEFING');
  assert.equal(flow.stageIndex, 1);
  assert.equal(currentStage(flow), STAGES[1]);

  beginRound(flow);
  assert.equal(flow.screen, 'ROUND');
});

test('the briefing shown is the briefing of the stage just picked', () => {
  // M19: the stage carries an id and the catalogue carries the sentences, so
  // "the right briefing" is now "the right id resolving to the right strings".
  const flow = createAppFlow();
  startStage(flow, 0);
  assert.equal(currentStage(flow).id, STAGES[0].id);
  assert.deepEqual(en.stages[currentStage(flow).id].briefing, en.stages[STAGES[0].id].briefing);
  startStage(flow, 1);
  assert.equal(currentStage(flow).id, STAGES[1].id);
  assert.deepEqual(en.stages[currentStage(flow).id].briefing, en.stages[STAGES[1].id].briefing);
});

test('no stage is locked, because the unlock could not survive a relaunch', () => {
  const flow = createAppFlow();
  finishIntro(flow);
  // Straight to the last stage on a cold start, nothing cleared.
  startStage(flow, STAGES.length - 1);
  assert.equal(flow.stageIndex, STAGES.length - 1);
  assert.equal(flow.screen, 'BRIEFING');
});

test('a picked stage out of range lands on a real stage instead of crashing', () => {
  const flow = createAppFlow();
  startStage(flow, 42);
  assert.equal(flow.stageIndex, STAGES.length - 1);
  startStage(flow, -3);
  assert.equal(flow.stageIndex, 0);
});

test('clearing a stage records it and leads to the next one', () => {
  const flow = createAppFlow();
  startStage(flow, 0);
  beginRound(flow);

  assert.deepEqual(recordStageCleared(flow), { hasNext: true });
  assert.equal(isStageCleared(flow, 0), true);
  assert.equal(isStageCleared(flow, 1), false);

  assert.equal(advanceToNextStage(flow), true);
  assert.equal(flow.stageIndex, 1);
  assert.equal(flow.screen, 'BRIEFING', 'the next stage must brief before it plays');
});

test('clearing the last stage reports no next stage and cannot advance past it', () => {
  const flow = createAppFlow();
  startStage(flow, STAGES.length - 1);
  beginRound(flow);

  assert.deepEqual(recordStageCleared(flow), { hasNext: false });
  assert.equal(advanceToNextStage(flow), false);
  assert.equal(flow.stageIndex, STAGES.length - 1, 'the flow advanced off the end of the list');
  assert.equal(flow.screen, 'ROUND', 'a refused advance must not move the player');
});

test('clearing only ever raises the high-water mark', () => {
  const flow = createAppFlow();
  startStage(flow, 1);
  recordStageCleared(flow);
  assert.equal(flow.bestStageCleared, 1);

  // Replaying an earlier stage must not un-clear a later one.
  startStage(flow, 0);
  recordStageCleared(flow);
  assert.equal(flow.bestStageCleared, 1);

  // And recording the same clear twice, as a re-render would, changes nothing.
  recordStageCleared(flow);
  assert.equal(flow.bestStageCleared, 1);
});

test('every screen can be left', () => {
  const flow = createAppFlow();

  finishIntro(flow);
  assert.equal(flow.screen, 'TITLE');

  showBriefing(flow);
  returnToTitle(flow);
  assert.equal(flow.screen, 'TITLE', 'the briefing had no way back');

  startStage(flow, 0);
  beginRound(flow);
  returnToTitle(flow);
  assert.equal(flow.screen, 'TITLE', 'a round had no way back to the title');
});

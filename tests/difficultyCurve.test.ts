/**
 * Difficulty curve and throw patterns (M17).
 *
 * Owner request, 2026-09-04: *"deve ter gradual a velocidade, frequência e
 * deve ter uns padrões pra serem feitos tipo combo de três garrafas em
 * sequência, de um lado e de outro, tipo: tap, tap, tap, no mesmo lugar."*
 *
 * Two things are being held here. The first is that the new machinery is a
 * **no-op** on every level that does not opt into it — `level01` is still the
 * subject of an open performance retest and must replay exactly. The second is
 * that a volley is actually *readable*: authored spacing, whole or not at all.
 *
 * No renderer, no audio (AGENTS.md rule 4).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { FASTBALL_CHANCE, TARGET_DEFINITIONS } from '../game/config/targets.ts';
import { STAGE } from '../game/config/stage.ts';
import { defenseDrill } from '../game/levels/defenseDrill.ts';
import { encore } from '../game/levels/encore.ts';
import { findTheBeat } from '../game/levels/findTheBeat.ts';
import { level01 } from '../game/levels/level01.ts';
import type { LevelDefinition } from '../game/levels/levelDefinition.ts';
import {
  VOLLEY_TEMPLATES,
  laneDriftRange,
  volleySpanMs,
  type VolleyTemplate,
} from '../game/levels/volleys.ts';
import {
  MIN_APPROACH_MS,
  createRound,
  fastballChanceAt,
  spawnIntervalAt,
  speedScaleAt,
  tickRound,
  type RoundState,
} from '../game/state/roundState.ts';

interface Spawned {
  readonly atMs: number;
  readonly kind: string;
  readonly durationMs: number;
  readonly laneX: number;
  /** When it reaches the drummer, which is what a pattern is authored in. */
  readonly arrivesAtMs: number;
}

/**
 * Plays a whole round and records every throw.
 *
 * Show Integrity is topped up each tick on purpose: these tests are about the
 * *schedule*, and a round that ends after three misses would only ever measure
 * its first four seconds.
 */
function playSchedule(level: LevelDefinition, stepMs = 16): Spawned[] {
  const round = createRound(level);
  round.state = 'PLAYING';
  const spawns: Spawned[] = [];
  let guard = 0;
  while (round.elapsedMs < level.durationMs && guard < 100_000) {
    for (const event of tickRound(round, stepMs)) {
      if (event.type !== 'TARGET_SPAWNED') continue;
      const target = round.targets.find((candidate) => candidate.id === event.targetId);
      assert.ok(target, 'a spawn event named a target that does not exist');
      spawns.push({
        atMs: target.spawnAtMs,
        kind: target.kind,
        durationMs: target.durationMs,
        laneX: target.laneX,
        arrivesAtMs: target.spawnAtMs + target.durationMs,
      });
    }
    round.integrity = 99;
    guard += 1;
  }
  return spawns;
}

function signature(spawns: readonly Spawned[]): string {
  const rows = spawns.map((spawn) =>
    [spawn.atMs.toFixed(3), spawn.kind, spawn.durationMs.toFixed(6), spawn.laneX].join(':'),
  );
  return createHash('sha256').update(rows.join('|')).digest('hex').slice(0, 16);
}

function thirds(spawns: readonly Spawned[], durationMs: number): Spawned[][] {
  const span = durationMs / 3;
  return [0, 1, 2].map((index) =>
    spawns.filter((spawn) => spawn.atMs >= index * span && spawn.atMs < (index + 1) * span),
  );
}

function mean(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

// ---------------------------------------------------------------------------
// The machinery is a no-op on the levels that do not opt in
// ---------------------------------------------------------------------------

test('M17 did not move a throw in the levels that never opted in', () => {
  /*
   * The load-bearing test of M17, narrowed by M17.1 rather than weakened.
   *
   * These two signatures are still the pre-M17 ones, recorded from the tree
   * immediately before the scheduler was rewritten, so they encode the *old*
   * behaviour and any drift at all breaks them. Neither level has taken a
   * curve and neither is expected to.
   *
   * `level01` used to be on this list and moved to the test below. It is not a
   * relaxation: it now has a signature of its own, pinned just as hard.
   */
  const golden: readonly [string, LevelDefinition, number, string][] = [
    ['defenseDrill', defenseDrill, 31, '26919fa035ee6f90'],
    ['findTheBeat', findTheBeat, 10, 'a939ba26283c2800'],
  ];

  for (const [name, level, count, hash] of golden) {
    const spawns = playSchedule(level);
    assert.equal(spawns.length, count, `${name} spawn count moved`);
    assert.equal(signature(spawns), hash, `${name} schedule changed under M17`);
  }
});

test('the show is pinned to the schedule M17.1 was approved on', () => {
  /*
   * `level01` is the round the owner validated at M13.1 and approved at M14,
   * and it was byte-identical from then until M17.1 retuned it on 2026-09-05
   * with an explicit go-ahead, given against the measurement table in
   * `docs/specs/M17-difficulty-curve-and-throw-patterns.md`.
   *
   * The guard does not go away just because the baseline moved once, on
   * purpose, with permission. This signature is the retuned stream, recorded
   * the day it was approved: the show is again a round that cannot drift
   * without somebody being told. Every device observation from before that
   * date is measured against a different round, which is exactly why the
   * retune needed asking for.
   */
  const spawns = playSchedule(level01);
  assert.equal(spawns.length, 37, 'the show spawn count moved');
  assert.equal(signature(spawns), '2f1801cdbe5c9c35', 'the show schedule changed after M17.1');
});

test('a level with no curves makes exactly the generator calls it always did', () => {
  /*
   * The mechanism behind the test above, stated directly: the volley roll
   * happens *only* when a phase declares volleys, so a phase without them
   * consumes the same run of the generator it consumed before M17. Asserted
   * through the final RNG state, which is a fingerprint of every draw taken.
   */
  const rngAfter = (level: LevelDefinition) => {
    const round = createRound(level);
    round.state = 'PLAYING';
    let guard = 0;
    while (round.elapsedMs < level.durationMs && guard < 100_000) {
      tickRound(round, 16);
      round.integrity = 99;
      guard += 1;
    }
    return round.rng.seed;
  };

  assert.equal(rngAfter(level01), 26_059_698);
  assert.equal(rngAfter(defenseDrill), 4_200_720_901);
  assert.equal(rngAfter(findTheBeat), 1_632_165_925);
});

test('the curve helpers are identities when a level declares no curve', () => {
  // `level01` is no longer in this list: M17.1 gave the show a curve of its
  // own. The two teaching rounds still declare none, and this is what proves
  // the machinery stays inert for them.
  for (const level of [defenseDrill, findTheBeat]) {
    for (const atMs of [0, level.durationMs / 2, level.durationMs]) {
      assert.equal(speedScaleAt(level, atMs), 1, `${level.id} scaled a duration`);
      assert.equal(fastballChanceAt(level, atMs), FASTBALL_CHANCE, `${level.id} moved fastballs`);
    }
    for (const phase of level.phases) {
      assert.equal(spawnIntervalAt(phase, phase.fromMs), phase.spawnEveryMs);
      assert.equal(spawnIntervalAt(phase, phase.toMs), phase.spawnEveryMs);
    }
  }
});

// ---------------------------------------------------------------------------
// The ramp
// ---------------------------------------------------------------------------

test('a ramped phase interpolates its cadence end to end', () => {
  const phase = encore.phases[0];
  assert.notEqual(phase.spawnEveryToMs, undefined, 'the encore opening stopped ramping');
  assert.equal(spawnIntervalAt(phase, phase.fromMs), phase.spawnEveryMs);
  assert.ok(
    Math.abs(spawnIntervalAt(phase, phase.toMs) - (phase.spawnEveryToMs ?? 0)) < 1e-9,
    'the phase does not reach its end interval',
  );
  const middle = spawnIntervalAt(phase, (phase.fromMs + phase.toMs) / 2);
  assert.ok(
    Math.abs(middle - (phase.spawnEveryMs + (phase.spawnEveryToMs ?? 0)) / 2) < 1e-9,
    'the ramp is not linear',
  );
});

test('the encore gets denser and faster as it goes, measured over a whole round', () => {
  const spawns = playSchedule(encore);
  const parts = thirds(spawns, encore.durationMs);
  assert.ok(parts.every((part) => part.length > 0), 'a third of the encore threw nothing');

  const gapOf = (part: Spawned[]) => {
    const ordered = [...part].sort((a, b) => a.atMs - b.atMs);
    return mean(ordered.slice(1).map((spawn, index) => spawn.atMs - ordered[index].atMs));
  };

  const gaps = parts.map(gapOf);
  assert.ok(gaps[0] > gaps[1], `gap did not tighten: ${gaps.map(Math.round).join(' -> ')}`);
  assert.ok(gaps[1] > gaps[2], `gap did not tighten: ${gaps.map(Math.round).join(' -> ')}`);

  const approaches = parts.map((part) => mean(part.map((spawn) => spawn.durationMs)));
  assert.ok(
    approaches[0] > approaches[2],
    `throws did not speed up: ${approaches.map(Math.round).join(' -> ')}`,
  );
});

test('no ramp can author a throw below the floor', () => {
  /*
   * A ramp is a tuning dial, and a dial with no stop eventually authors a
   * throw nobody can see. The floor is the same bound the fast window is
   * already held to by `tests/contracts.test.ts`.
   */
  for (const spawn of playSchedule(encore)) {
    assert.ok(
      spawn.durationMs >= MIN_APPROACH_MS,
      `a throw took ${spawn.durationMs.toFixed(0)} ms, under the ${String(MIN_APPROACH_MS)} ms floor`,
    );
  }

  // And directly, against a curve deliberately steeper than anything shipped.
  const brutal: LevelDefinition = { ...encore, speedCurve: { start: 1, end: 0.01 } };
  for (const spawn of playSchedule(brutal)) {
    assert.ok(spawn.durationMs >= MIN_APPROACH_MS, 'the floor did not hold under a steep curve');
  }
});

test('the fastball curve ramps between its endpoints and stays a probability', () => {
  assert.ok(encore.fastballCurve, 'the encore stopped ramping fastballs');
  assert.equal(fastballChanceAt(encore, 0), encore.fastballCurve.start);
  assert.equal(fastballChanceAt(encore, encore.durationMs), encore.fastballCurve.end);
  for (const curve of [encore.fastballCurve]) {
    assert.ok(curve.start >= 0 && curve.start <= 1, 'fastball chance is not a probability');
    assert.ok(curve.end >= 0 && curve.end <= 1, 'fastball chance is not a probability');
    assert.ok(curve.end > curve.start, 'fastballs are supposed to get commoner');
  }
});

// ---------------------------------------------------------------------------
// The patterns
// ---------------------------------------------------------------------------

test('every template is a coherent figure on the lane table', () => {
  for (const template of Object.values(VOLLEY_TEMPLATES) as VolleyTemplate[]) {
    assert.ok(template.members.length >= 2, `${template.id} is not a figure`);

    for (const member of template.members) {
      assert.ok(
        member.lane >= 0 && member.lane < STAGE.laneXs.length,
        `${template.id} authors lane ${String(member.lane)}, off the table`,
      );
      assert.ok(member.arriveAfterMs >= 0, `${template.id} arrives before it starts`);
    }

    // The first member defines the figure's start, so something must be at 0.
    assert.ok(
      template.members.some((member) => member.arriveAfterMs === 0),
      `${template.id} has no first member`,
    );

    // Every drift the range allows must keep every member on the table.
    const drift = laneDriftRange(template, STAGE.laneXs.length);
    for (let offset = drift.min; offset <= drift.max; offset += 1) {
      for (const member of template.members) {
        const lane = member.lane + offset;
        assert.ok(
          lane >= 0 && lane < STAGE.laneXs.length,
          `${template.id} drifts lane ${String(lane)} off the table at offset ${String(offset)}`,
        );
      }
    }
  }
});

test('a volley resolves inside a sensible span', () => {
  for (const template of Object.values(VOLLEY_TEMPLATES) as VolleyTemplate[]) {
    const span = volleySpanMs(template);
    assert.ok(
      span < 1500,
      `${template.id} takes ${String(span)} ms to arrive, which is a phase rather than a figure`,
    );
  }
});

/** Groups a round's spawns into the figures they arrived as. */
function volleyGroups(spawns: readonly Spawned[]): Spawned[][] {
  const ordered = [...spawns].sort((a, b) => a.arrivesAtMs - b.arrivesAtMs);
  const groups: Spawned[][] = [];
  let current: Spawned[] = [];
  for (const spawn of ordered) {
    if (current.length === 0) {
      current = [spawn];
      continue;
    }
    const gap = spawn.arrivesAtMs - current[current.length - 1].arrivesAtMs;
    if (gap <= 1) current.push(spawn);
    else {
      groups.push(current);
      current = [spawn];
    }
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

test('the encore actually throws figures', () => {
  // Measured over a full round: eight volleys, all admitted whole. Without
  // this the ramp tests would still pass on a round that never threw a single
  // pattern, which is half the milestone missing and silent about it.
  const round = createRound(encore);
  round.state = 'PLAYING';
  let queued = 0;
  let guard = 0;
  while (round.elapsedMs < encore.durationMs && guard < 100_000) {
    const before = round.pendingSpawns.length;
    tickRound(round, 16);
    if (round.pendingSpawns.length > before) queued += 1;
    round.integrity = 99;
    guard += 1;
  }
  assert.ok(queued >= 5, `only ${String(queued)} volleys in a whole encore`);
});

test('a pincer puts two objects in two places at the same instant', () => {
  /*
   * Forced rather than hoped for: the encore's own seed happens not to draw a
   * pincer, and a figure this sharp should not go untested because of one
   * lucky RNG stream. It is the only template whose members share an arrival,
   * and the first figure in the game that cannot simply be *done*.
   */
  const pincersOnly: LevelDefinition = {
    ...encore,
    phases: encore.phases.map((phase) =>
      phase.volleys === undefined
        ? phase
        : { ...phase, volleys: { chance: 1, templates: ['PINCER'] } },
    ),
  };

  const groups = volleyGroups(playSchedule(pincersOnly)).filter((group) => group.length >= 2);
  assert.ok(groups.length > 0, 'no pincer ever arrived as a pair');

  for (const group of groups) {
    assert.equal(group.length, 2, 'a pincer is two objects');
    const lanes = group.map((spawn) => spawn.laneX).sort((a, b) => a - b);
    assert.equal(lanes[0], Math.min(...STAGE.laneXs), 'a pincer must reach the far edge');
    assert.equal(lanes[1], Math.max(...STAGE.laneXs), 'a pincer must reach the far edge');
  }
});

test('a volley arrives at its authored spacing, at any frame rate', () => {
  /*
   * The rule that makes a pattern perceivable at all. Members keep their own
   * kind's speed window and their *spawn* times are solved backwards from the
   * arrivals they owe, so "three bottles 360 ms apart" is 360 ms apart on the
   * screen — not three independent throws that happened to leave together and
   * arrived scrambled.
   */
  for (const stepMs of [16, 33, 97]) {
    const spawns = playSchedule(encore, stepMs);
    const arrivals = [...spawns].map((spawn) => spawn.arrivesAtMs).sort((a, b) => a - b);

    // Authored gaps that must appear somewhere in the round, within a
    // millisecond: the triple's 360 and the side-to-side's 460.
    for (const authored of [360, 460]) {
      const found = arrivals.some((arrival, index) =>
        arrivals
          .slice(index + 1)
          .some((later) => Math.abs(later - arrival - authored) < 1),
      );
      assert.ok(found, `no pair arrived ${String(authored)} ms apart at a ${String(stepMs)} ms step`);
    }
  }
});

test('a volley is admitted whole or not at all', () => {
  /*
   * Dropping the middle member of a three-bottle line turns the intended
   * figure into a random pair. The cap therefore counts what a volley has
   * already committed to, not merely what is in the air.
   */
  const spawns = playSchedule(encore);
  const groups = volleyGroups(spawns);
  for (const group of groups) {
    assert.ok(group.length <= encore.maxConcurrentTargets, 'a group exceeded the cap');
  }

  // And a level whose cap cannot hold its smallest figure must never queue one.
  const cramped: LevelDefinition = { ...encore, maxConcurrentTargets: 1 };
  const round = createRound(cramped);
  round.state = 'PLAYING';
  let guard = 0;
  while (round.elapsedMs < cramped.durationMs && guard < 100_000) {
    tickRound(round, 16);
    assert.ok(
      round.pendingSpawns.length === 0,
      'a volley was queued into a round that cannot hold one',
    );
    round.integrity = 99;
    guard += 1;
  }
});

test('every object in a volley still flies like the object it is', () => {
  /*
   * The deviation from the M17 spec, and the reason for it. The spec called
   * for one duration shared by the whole volley, which would have made a mug
   * fly at bottle speed. Solving each member's spawn time backwards from its
   * arrival gives the same exact spacing while every object keeps the motion
   * the player has already learned.
   */
  const spawns = playSchedule(encore);
  const bottles = spawns.filter((spawn) => spawn.kind === 'beerBottle');
  const mugs = spawns.filter((spawn) => spawn.kind === 'beerMug');
  assert.ok(mugs.length > 0, 'the encore never threw a mug');

  assert.ok(
    mean(mugs.map((spawn) => spawn.durationMs)) >
      mean(bottles.map((spawn) => spawn.durationMs)),
    'mugs stopped being the slower object',
  );

  const slowestBottleWindow = TARGET_DEFINITIONS.beerBottle.approachMs.maxMs;
  for (const spawn of spawns) {
    const ceiling = TARGET_DEFINITIONS[spawn.kind as 'beerBottle' | 'beerMug'].approachMs.maxMs;
    assert.ok(
      spawn.durationMs <= ceiling * 1.2,
      `a ${spawn.kind} flew for ${spawn.durationMs.toFixed(0)} ms, past its own window`,
    );
  }
  assert.ok(slowestBottleWindow > 0);
});

test('the singer interrupting abandons the figure in flight', () => {
  /*
   * M1 pauses spawning during the interruption. Holding a half-delivered
   * volley across it would dump the remainder the instant the singer stepped
   * aside — in a clump, at spacing that no longer means anything, at a player
   * who has been looking somewhere else.
   */
  const interrupted: LevelDefinition = { ...encore, vocalistEventAtMs: 20_000 };
  const round: RoundState = createRound(interrupted);
  round.state = 'PLAYING';

  let sawPending = false;
  let interruptions = 0;
  let pendingWhenInterrupted = -1;
  let guard = 0;
  while (round.elapsedMs < interrupted.durationMs && guard < 100_000) {
    const events = tickRound(round, 16);
    if (round.pendingSpawns.length > 0) sawPending = true;
    // Read off the event rather than off the state, so this asserts the queue
    // at the exact tick the singer steps in rather than at some tick after.
    if (events.some((event) => event.type === 'VOCALIST_EVENT_STARTED')) {
      interruptions += 1;
      pendingWhenInterrupted = round.pendingSpawns.length;
    }
    round.integrity = 99;
    guard += 1;
  }

  assert.ok(sawPending, 'the round never queued a volley, so this proves nothing');
  assert.equal(interruptions, 1, 'the interruption fires exactly once per round');
  assert.equal(pendingWhenInterrupted, 0, 'a volley survived the interruption');
});

test('the encore replays exactly from its seed', () => {
  // Rule 6, with volleys and three curves in play. Nothing about the new
  // machinery may read a clock, a frame count, or an unseeded random.
  assert.equal(signature(playSchedule(encore)), signature(playSchedule(encore)));
});

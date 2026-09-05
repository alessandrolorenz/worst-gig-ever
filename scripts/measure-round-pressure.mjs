/**
 * Measures what a round actually throws, by playing it.
 *
 * M17.1 does not permit a retune of `level01` to be decided from a description
 * of a curve — the spec requires "measured before/after (mean spawn interval
 * and mean approach duration per third of the round, fastball count, volley
 * count)" in hand first. `level01` is the only round with a physical baseline
 * behind it, and the moment it is retuned every earlier device observation
 * stops being comparable, so the decision is made against numbers or not at
 * all.
 *
 * It replays through the real `tickRound`, exactly as `difficultyCurve.test.ts`
 * does, rather than re-deriving the schedule from the level data. A model of
 * the scheduler could agree with the level file and disagree with the game;
 * only the scheduler can say what the player will be thrown.
 *
 * Show Integrity is topped up every tick on purpose. These are questions about
 * the schedule, and a round that ends after three misses would only ever
 * measure its first few seconds.
 *
 * Usage:
 *   node scripts/measure-round-pressure.mjs
 *   node scripts/measure-round-pressure.mjs --candidate game/levels/level01.retune.ts
 */
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

import { defenseDrill } from '../game/levels/defenseDrill.ts';
import { encore } from '../game/levels/encore.ts';
import { findTheBeat } from '../game/levels/findTheBeat.ts';
import { level01 } from '../game/levels/level01.ts';
import { TARGET_DEFINITIONS } from '../game/config/targets.ts';
import { createRound, tickRound } from '../game/state/roundState.ts';

const STEP_MS = 16;

function playSchedule(level) {
  const round = createRound(level);
  let volleys = 0;
  round.state = 'PLAYING';
  const spawns = [];
  let guard = 0;
  while (round.elapsedMs < level.durationMs && guard < 100_000) {
    const queuedBefore = round.pendingSpawns.length;
    for (const event of tickRound(round, STEP_MS)) {
      if (event.type !== 'TARGET_SPAWNED') continue;
      const target = round.targets.find((candidate) => candidate.id === event.targetId);
      if (!target) throw new Error('a spawn event named a target that does not exist');
      spawns.push({
        atMs: target.spawnAtMs,
        kind: target.kind,
        durationMs: target.durationMs,
        laneX: target.laneX,
        arrivesAtMs: target.spawnAtMs + target.durationMs,
      });
    }
    if (round.pendingSpawns.length > queuedBefore) volleys += 1;
    round.integrity = 99;
    guard += 1;
  }
  spawns.volleys = volleys;
  return spawns;
}

/**
 * Whether a throw came from its kind's fast window.
 *
 * Read off the drawn duration rather than counted at the roll, because the
 * roll is inside the scheduler: a duration at or below the fast window's
 * ceiling could not have come from the normal window, whose floor is above it.
 * `speedScaleAt` scales both windows by the same factor, so the comparison is
 * made against the scaled ceiling at that moment.
 */
function isFastball(spawn, level) {
  const definition = TARGET_DEFINITIONS[spawn.kind];
  const scale = curveValue(level.speedCurve, 1, spawn.atMs / level.durationMs);
  return spawn.durationMs <= definition.fastApproachMs.maxMs * scale + 1e-6;
}

function curveValue(curve, fallback, progress) {
  if (!curve) return fallback;
  const clamped = Math.max(0, Math.min(1, progress));
  return curve.start + (curve.end - curve.start) * clamped;
}

/**
 * Volleys are counted off the scheduler's own queue, the way
 * `difficultyCurve.test.ts` counts them: a tick that grows `pendingSpawns` is a
 * figure being admitted whole.
 *
 * Grouping by arrival time does not work and is worth recording so nobody
 * tries it twice. Only `PINCER` gives its members a shared arrival; the other
 * three templates are authored as shapes that land in sequence, so an
 * arrival-time grouping finds only pincers and reports zero volleys for a
 * round that threw plenty.
 */

function mean(values) {
  if (values.length === 0) return Number.NaN;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function intervals(spawns) {
  const out = [];
  for (let i = 1; i < spawns.length; i += 1) out.push(spawns[i].atMs - spawns[i - 1].atMs);
  return out;
}

function thirds(spawns, durationMs) {
  const span = durationMs / 3;
  return [0, 1, 2].map((index) =>
    spawns.filter((spawn) => spawn.atMs >= index * span && spawn.atMs < (index + 1) * span),
  );
}

/**
 * How many seeds a round is measured over.
 *
 * One seed is not a measurement, and this is the trap M17.1 was walking into.
 * Retuning the cadence changes *when* throws happen, which changes the order
 * draws are taken from the seeded generator, which changes which throws come
 * out fast. At a single seed the show's fastballs land 3/4/1 across its thirds
 * and a retune that raises the fastball chance at the end can still come out
 * 3/3/1 — not because the tuning failed but because the stream moved. A
 * decision made on that comparison is a decision made on noise.
 */
const SEEDS = 200;

function sample(level) {
  const rows = [];
  for (let seed = 1; seed <= SEEDS; seed += 1) {
    const spawns = playSchedule({ ...level, randomSeed: seed });
    const parts = thirds(spawns, level.durationMs);
    rows.push({
      throws: spawns.length,
      fast: spawns.filter((spawn) => isFastball(spawn, level)).length,
      volleys: spawns.volleys,
      gaps: parts.map((part) => mean(intervals(part))),
      approach: parts.map((part) => mean(part.map((spawn) => spawn.durationMs))),
      fastByThird: parts.map(
        (part) => part.filter((spawn) => isFastball(spawn, level)).length,
      ),
    });
  }
  const pick = (fn) => mean(rows.map(fn));
  const perThird = (key) => [0, 1, 2].map((i) => mean(rows.map((row) => row[key][i])));
  return {
    throws: pick((row) => row.throws),
    fast: pick((row) => row.fast),
    volleys: pick((row) => row.volleys),
    gaps: perThird('gaps'),
    approach: perThird('approach'),
    fastByThird: perThird('fastByThird'),
  };
}

function fmt(value, unit = '') {
  return Number.isNaN(value) ? '    -  ' : `${value.toFixed(unit ? 0 : 1).padStart(5)}${unit}`;
}

function report(name, level) {
  const s = sample(level);
  console.log(`\n## ${name}`);
  console.log(
    `   ${level.id}, ${(level.durationMs / 1000).toFixed(0)}s, cap ${String(level.maxConcurrentTargets)} | ` +
      `throws ${s.throws.toFixed(1)} | fastballs ${s.fast.toFixed(1)} ` +
      `(${((s.fast / s.throws) * 100).toFixed(1)}%) | volleys ${s.volleys.toFixed(1)}`,
  );
  console.log('   third | mean gap | mean approach | fastballs');
  for (let i = 0; i < 3; i += 1) {
    console.log(
      `     ${String(i + 1)}   | ${fmt(s.gaps[i], ' ms')} | ${fmt(s.approach[i], ' ms')}    | ${fmt(s.fastByThird[i])}`,
    );
  }
  return s;
}

const candidateIndex = process.argv.indexOf('--candidate');
const candidatePath = candidateIndex >= 0 ? process.argv[candidateIndex + 1] : null;

console.log(`# Round pressure, replayed over ${String(SEEDS)} seeds each\n`);
console.log('"mean gap" is the mean interval between consecutive spawns; "mean approach" is');
console.log('the mean spawn-to-danger-line travel time. A *lower* number is harder in both.');
console.log('Approach is dominated by which objects a phase throws — a mug\'s window is');
console.log('1800-2350 ms against a bottle\'s 1450-1950 — so read it within a phase, not across.');

report('Stage 1 — Hold the line', defenseDrill);
report('Stage 2 — Find the beat', findTheBeat);
const before = report('Stage 3 — Keep the beat (the show, as validated)', level01);

if (candidatePath) {
  const module = await import(pathToFileURL(resolve(process.cwd(), candidatePath)).href);
  const candidate = module.level01Retuned ?? module.default;
  const after = report('Stage 3 — RETUNE CANDIDATE', candidate);
  const sign = (value) => `${value >= 0 ? '+' : ''}${value.toFixed(1)}`;
  console.log('\n   delta against the validated show, over the same 200 seeds:');
  console.log(`     throws ${sign(after.throws - before.throws)} | fastballs ${sign(after.fast - before.fast)}`);
  for (let i = 0; i < 3; i += 1) {
    console.log(
      `     third ${String(i + 1)}: gap ${sign(after.gaps[i] - before.gaps[i])} ms | ` +
        `approach ${sign(after.approach[i] - before.approach[i])} ms | ` +
        `fastballs ${sign(after.fastByThird[i] - before.fastByThird[i])}`,
    );
  }
}

report('Stage 4 — Encore (the hardest round)', encore);

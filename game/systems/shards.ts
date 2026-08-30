/**
 * Glass debris after a break, simulated with Matter.js.
 *
 * This is the one mechanic where physics earns its place (M2, engine policy):
 * a handful of shards tumbling and falling is exactly what a rigid-body
 * solver is good at, and nothing about it needs to be deterministic or
 * testable. Target approach motion deliberately does *not* use Matter
 * (AGENTS.md rule 8) — it is time-based interpolation instead.
 *
 * The engine is created once and reused for the life of the app. It is never
 * constructed during a React render.
 */
import Matter from 'matter-js';

import { REFERENCE_CANVAS } from '../config/stage.ts';

export const SHARD_TTL_MS = 700;
const SHARDS_PER_BREAK = 5;
/** Matter is stepped in fixed slices so debris behaves the same at any frame rate. */
const FIXED_STEP_MS = 16.666;
const MAX_STEPS_PER_TICK = 6;

export interface Shard {
  readonly id: number;
  readonly body: Matter.Body;
  readonly size: number;
  ageMs: number;
}

export interface ShardsState {
  engine: Matter.Engine;
  world: Matter.World;
  shards: Shard[];
  nextId: number;
  accumulatorMs: number;
}

export function createShards(): ShardsState {
  const engine = Matter.Engine.create({
    enableSleeping: true,
    gravity: { x: 0, y: 2.2, scale: 0.001 },
  } as Matter.IEngineDefinition);

  return {
    engine,
    world: engine.world,
    shards: [],
    nextId: 1,
    accumulatorMs: 0,
  };
}

/** Bursts a few shards away from a break, in canvas coordinates. */
export function spawnShards(state: ShardsState, x: number, y: number, scale = 1): void {
  for (let i = 0; i < SHARDS_PER_BREAK; i += 1) {
    const size = (12 + Math.random() * 16) * Math.max(0.4, scale);
    const body = Matter.Bodies.rectangle(x, y, size, size, {
      label: 'shard',
      frictionAir: 0.02,
      restitution: 0.35,
      angle: Math.random() * Math.PI,
    });
    const speed = 4 + Math.random() * 5;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    Matter.Body.setVelocity(body, {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed,
    });
    Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.4);
    Matter.Composite.add(state.world, body);
    state.shards.push({ id: state.nextId++, body, size, ageMs: 0 });
  }
}

function removeShard(state: ShardsState, shard: Shard): void {
  Matter.Composite.remove(state.world, shard.body);
}

export function tickShards(state: ShardsState, deltaMs: number): void {
  if (state.shards.length === 0) {
    state.accumulatorMs = 0;
    return;
  }

  state.accumulatorMs += deltaMs;
  let steps = 0;
  while (state.accumulatorMs >= FIXED_STEP_MS && steps < MAX_STEPS_PER_TICK) {
    Matter.Engine.update(state.engine, FIXED_STEP_MS);
    state.accumulatorMs -= FIXED_STEP_MS;
    steps += 1;
  }
  if (steps === MAX_STEPS_PER_TICK) state.accumulatorMs = 0;

  const survivors: Shard[] = [];
  for (const shard of state.shards) {
    shard.ageMs += deltaMs;
    const offScreen =
      shard.body.position.y > REFERENCE_CANVAS.height + 200 ||
      shard.body.position.x < -200 ||
      shard.body.position.x > REFERENCE_CANVAS.width + 200;
    if (shard.ageMs >= SHARD_TTL_MS || offScreen) removeShard(state, shard);
    else survivors.push(shard);
  }
  state.shards = survivors;
}

/** Clears all debris, e.g. on restart. The engine itself is kept. */
export function clearShards(state: ShardsState): void {
  for (const shard of state.shards) removeShard(state, shard);
  state.shards = [];
  state.accumulatorMs = 0;
}

export function shardOpacity(shard: Shard): number {
  const fadeFrom = SHARD_TTL_MS * 0.55;
  if (shard.ageMs <= fadeFrom) return 1;
  return Math.max(0, 1 - (shard.ageMs - fadeFrom) / (SHARD_TTL_MS - fadeFrom));
}

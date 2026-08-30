/**
 * Short-lived visual feedback: the drumstick strike and the impact burst.
 *
 * Presentation only — no scoring or state lives here, and the domain never
 * reads it. Ages are tracked in elapsed milliseconds so the effects run at the
 * same speed on any frame rate (AGENTS.md rule 5).
 */

export const STRIKE_TTL_MS = 150;
export const BURST_TTL_MS = 280;

export interface TimedEffect {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  ageMs: number;
  readonly ttlMs: number;
}

export interface EffectsState {
  strikes: TimedEffect[];
  bursts: TimedEffect[];
  nextId: number;
}

export function createEffects(): EffectsState {
  return { strikes: [], bursts: [], nextId: 1 };
}

export function addStrike(effects: EffectsState, x: number, y: number): void {
  effects.strikes.push({ id: effects.nextId++, x, y, ageMs: 0, ttlMs: STRIKE_TTL_MS });
}

export function addBurst(effects: EffectsState, x: number, y: number): void {
  effects.bursts.push({ id: effects.nextId++, x, y, ageMs: 0, ttlMs: BURST_TTL_MS });
}

function ageAll(list: TimedEffect[], deltaMs: number): TimedEffect[] {
  for (const effect of list) effect.ageMs += deltaMs;
  return list.filter((effect) => effect.ageMs < effect.ttlMs);
}

export function tickEffects(effects: EffectsState, deltaMs: number): void {
  effects.strikes = ageAll(effects.strikes, deltaMs);
  effects.bursts = ageAll(effects.bursts, deltaMs);
}

export function clearEffects(effects: EffectsState): void {
  effects.strikes = [];
  effects.bursts = [];
}

/** 0 -> 1 over the effect's life. */
export function effectProgress(effect: TimedEffect): number {
  return Math.min(1, effect.ageMs / effect.ttlMs);
}

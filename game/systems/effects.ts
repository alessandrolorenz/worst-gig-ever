/**
 * Short-lived visual feedback: the drumstick strike and the impact burst.
 *
 * Presentation only — no scoring or state lives here, and the domain never
 * reads it. Ages are tracked in elapsed milliseconds so the effects run at the
 * same speed on any frame rate (AGENTS.md rule 5).
 */

export const STRIKE_TTL_MS = 150;
export const BURST_TTL_MS = 280;

/**
 * The two-frame drink (M18).
 *
 * The catch is a beat; the drink is the joke, so it holds twice as long. The
 * 480 ms total is deliberately the same as the three-frame version it replaced
 * — every mug-density number in the spec is measured against it.
 */
export const DRINK_CATCH_MS = 120;
export const DRINK_DRINK_MS = 240;
export const DRINK_FADE_MS = 120;
export const DRINK_TTL_MS = DRINK_CATCH_MS + DRINK_DRINK_MS + DRINK_FADE_MS;

export interface TimedEffect {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  ageMs: number;
  readonly ttlMs: number;
}

/** One drink at a time. Presentation only; the domain never reads it. */
export interface DrinkEffect {
  ageMs: number;
}

export interface EffectsState {
  strikes: TimedEffect[];
  bursts: TimedEffect[];
  drink: DrinkEffect | null;
  nextId: number;
}

export function createEffects(): EffectsState {
  return { strikes: [], bursts: [], drink: null, nextId: 1 };
}

/**
 * Starts a drink, or cuts a running one forward to its payoff.
 *
 * A second mug landing mid-drink jumps to the drink frame rather than
 * restarting from the catch. The show throws two mugs closer than 480 ms apart
 * twice a round, and restarting would show the player two beginnings and no
 * punchline in exactly those cases — the one shape of interruption that costs
 * the joke instead of telling it.
 */
export function addDrink(effects: EffectsState): void {
  if (effects.drink === null) {
    effects.drink = { ageMs: 0 };
    return;
  }
  effects.drink.ageMs = DRINK_CATCH_MS;
}

/** 0 for the catch, 1 for the drink. The fade holds the drink frame. */
export function drinkFrame(drink: DrinkEffect): number {
  return drink.ageMs < DRINK_CATCH_MS ? 0 : 1;
}

/** Full opacity until the fade begins, then down to 0 at the end of its life. */
export function drinkOpacity(drink: DrinkEffect): number {
  const fadeStart = DRINK_CATCH_MS + DRINK_DRINK_MS;
  if (drink.ageMs <= fadeStart) return 1;
  return Math.max(0, 1 - (drink.ageMs - fadeStart) / DRINK_FADE_MS);
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
  if (effects.drink !== null) {
    effects.drink.ageMs += deltaMs;
    if (effects.drink.ageMs >= DRINK_TTL_MS) effects.drink = null;
  }
}

export function clearEffects(effects: EffectsState): void {
  effects.strikes = [];
  effects.bursts = [];
  effects.drink = null;
}

/** 0 -> 1 over the effect's life. */
export function effectProgress(effect: TimedEffect): number {
  return Math.min(1, effect.ageMs / effect.ttlMs);
}

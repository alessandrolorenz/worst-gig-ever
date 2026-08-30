/**
 * Seedable pseudo-random number generator (mulberry32).
 *
 * AGENTS.md rule 6: randomness must be seedable where practical, so a round
 * can be replayed exactly while tuning. The generator state is a single
 * number, which keeps `RoundState` serializable and easy to assert on.
 */

export interface RngState {
  seed: number;
}

export function createRng(seed: number): RngState {
  return { seed: seed >>> 0 };
}

/** Advances the generator and returns a float in [0, 1). */
export function nextFloat(rng: RngState): number {
  rng.seed = (rng.seed + 0x6d2b79f5) >>> 0;
  let t = rng.seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Advances the generator and returns an integer in [0, exclusiveMax). */
export function nextInt(rng: RngState, exclusiveMax: number): number {
  return Math.floor(nextFloat(rng) * exclusiveMax);
}

/** Advances the generator and returns one element of a non-empty list. */
export function pick<T>(rng: RngState, items: readonly T[]): T {
  return items[nextInt(rng, items.length)];
}

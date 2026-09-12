import { CONSTANTS } from './constants';

export interface Rng { state: number }

export function createRng(seed: number): Rng {
  if (!Number.isInteger(seed) || seed < 0 || seed >= CONSTANTS.RNG.MODULUS) {
    throw new RangeError('Seed must be an unsigned 32-bit integer.');
  }
  return { state: seed };
}

export function nextRandom(rng: Rng): number {
  rng.state = (Math.imul(rng.state, CONSTANTS.RNG.MULTIPLIER) + CONSTANTS.RNG.INCREMENT) >>> 0;
  return rng.state / CONSTANTS.RNG.MODULUS;
}

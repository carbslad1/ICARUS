import { expect, test } from 'vitest';
import { createRng, nextRandom } from '../../src/sim/rng';

test('seeded generator follows an independently known unsigned sequence', () => {
  const rng = createRng(1);
  for (const expected of [1015568748, 1586005467, 2165703038]) {
    expect(nextRandom(rng)).toBe(expected / 4294967296);
    expect(rng.state).toBe(expected);
  }
});

test('same seeds replay exactly, distinct seeds diverge, and zero is a valid seed', () => {
  const a = createRng(0);
  const b = createRng(0);
  const c = createRng(42);
  for (let index = 0; index < 1000; index += 1) {
    const value = nextRandom(a);
    expect(value).toBe(nextRandom(b));
    expect(value).not.toBe(nextRandom(c));
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
});

test.each([-1, 0.5, NaN, Infinity, 4294967296])('rejects invalid seed %s', (seed) => {
  expect(() => createRng(seed)).toThrow(RangeError);
});

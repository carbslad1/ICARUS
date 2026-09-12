import { expect, test } from 'vitest';
import { atan2, cos, expSmall, magnitude, sin } from '../../src/sim/math';

test('fixed trigonometry agrees with reference values across quadrants and repeated revolutions', () => {
  for (let index = -1000; index <= 1000; index += 1) {
    const angle = index * Math.PI / 100;
    expect(sin(angle)).toBeCloseTo(Math.sin(angle), 14);
    expect(cos(angle)).toBeCloseTo(Math.cos(angle), 14);
    expect(atan2(Math.sin(angle), Math.cos(angle))).toBeCloseTo(Math.atan2(Math.sin(angle), Math.cos(angle)), 14);
  }
});

test('quadrant boundaries and signed zero are preserved', () => {
  for (const y of [-1, -0, 0, 1]) for (const x of [-1, -0, 0, 1]) {
    expect(atan2(y, x)).toBe(Math.atan2(y, x));
  }
});

test('bounded exponential and scaled magnitude stay accurate', () => {
  for (let index = -100; index <= 100; index += 1) {
    expect(expSmall(index / 100)).toBeCloseTo(Math.exp(index / 100), 14);
  }
  expect(magnitude(3, 4)).toBe(5);
  expect(magnitude(0, 0)).toBe(0);
  expect(magnitude(1e200, 1e200) / 1e200).toBeCloseTo(Math.SQRT2, 14);
  expect(() => expSmall(2)).toThrow(RangeError);
});

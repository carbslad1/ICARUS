import { expect, expectTypeOf, test } from 'vitest';
import { localPos, metres, metresPerSec, metresPerSec2, radians, seconds, toWorld, worldPos } from '../../src/sim/units';
import type { LocalPos, Metres, MetresPerSec, MetresPerSec2, Radians, Seconds, WorldPos } from '../../src/sim/units';

test('units and coordinate spaces cannot be interchanged', () => {
  expectTypeOf<Metres>().not.toEqualTypeOf<MetresPerSec>();
  expectTypeOf<MetresPerSec>().not.toEqualTypeOf<MetresPerSec2>();
  expectTypeOf<Seconds>().not.toEqualTypeOf<Radians>();
  expectTypeOf<WorldPos>().not.toMatchTypeOf<LocalPos>();
  expectTypeOf<LocalPos>().not.toMatchTypeOf<WorldPos>();
  expectTypeOf<number>().not.toMatchTypeOf<Metres>();
  expectTypeOf(metres(1) + metresPerSec(1)).not.toMatchTypeOf<Metres>();
});

test('the single transform returns a world position without mutating either input', () => {
  const origin = worldPos(120, 50);
  const local = localPos(-4, 7);
  const result = toWorld(local, { origin });
  expect(result).toEqual({ x: 116, y: 57 });
  expect({ x: result.x - origin.x, y: result.y - origin.y }).toEqual(local);
  expect(origin).toEqual({ x: 120, y: 50 });
  expect(Object.isFrozen(local)).toBe(true);
});

test.each([metres, metresPerSec, metresPerSec2, seconds, radians])('unit constructors reject non-finite values', (construct) => {
  expect(() => construct(NaN)).toThrow(RangeError);
  expect(() => construct(Infinity)).toThrow(RangeError);
  expect(() => construct(-Infinity)).toThrow(RangeError);
});

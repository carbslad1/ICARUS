import { CONSTANTS } from './constants';

export function magnitude(x: number, y: number): number {
  const scale = Math.max(Math.abs(x), Math.abs(y));
  if (scale === 0) return 0;
  return scale * Math.sqrt((x / scale) * (x / scale) + (y / scale) * (y / scale));
}

// Fixed Taylor recurrences use IEEE arithmetic, avoiding runtime-specific libm results.
export function sin(value: number): number {
  let x = value % (2 * Math.PI);
  if (x > Math.PI) x -= 2 * Math.PI;
  if (x < -Math.PI) x += 2 * Math.PI;
  if (x > Math.PI / 2) x = Math.PI - x;
  if (x < -Math.PI / 2) x = -Math.PI - x;
  let term = x;
  let sum = term;
  for (let index = 1; index < CONSTANTS.NUMERICS.SERIES_TERMS; index += 1) {
    term *= -x * x / (2 * index * (2 * index + 1));
    sum += term;
  }
  return sum;
}

export function cos(value: number): number {
  let x = Math.abs(value % (2 * Math.PI));
  if (x > Math.PI) x = 2 * Math.PI - x;
  const sign = x > Math.PI / 2 ? -1 : 1;
  if (sign < 0) x = Math.PI - x;
  let term = 1;
  let sum = term;
  for (let index = 1; index < CONSTANTS.NUMERICS.SERIES_TERMS; index += 1) {
    term *= -x * x / ((2 * index - 1) * (2 * index));
    sum += term;
  }
  return sign * sum;
}

function atanUnit(value: number): number {
  const reduce = value > Math.SQRT2 - 1;
  const x = reduce ? (value - 1) / (value + 1) : value;
  let power = x;
  let sum = power;
  for (let index = 1; index < CONSTANTS.NUMERICS.SERIES_TERMS; index += 1) {
    power *= -x * x;
    sum += power / (2 * index + 1);
  }
  return sum + (reduce ? Math.PI / (2 * 2) : 0);
}

export function atan2(y: number, x: number): number {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  let angle = ax === 0 && ay === 0 ? 0 : ay > ax ? Math.PI / 2 - atanUnit(ax / ay) : atanUnit(ay / ax);
  if (x < 0 || Object.is(x, -0)) angle = Math.PI - angle;
  return y < 0 || Object.is(y, -0) ? -angle : angle;
}

export function expSmall(value: number): number {
  if (!Number.isFinite(value) || Math.abs(value) > 1) throw new RangeError('Exponential series requires an argument in [-1, 1].');
  let term = 1;
  let sum = term;
  for (let index = 1; index < CONSTANTS.NUMERICS.SERIES_TERMS; index += 1) {
    term *= value / index;
    sum += term;
  }
  return sum;
}

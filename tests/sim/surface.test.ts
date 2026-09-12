import { expect, test } from 'vitest';
import { CONSTANTS } from '../../src/sim/constants';
import { idleIntent } from '../../src/sim/intent';
import { stepWorld } from '../../src/sim/step';
import { acceleration, metres, metresPerSec, metresPerSec2, radians, seconds, velocity, worldPos } from '../../src/sim/units';
import { createWaterWorld } from '../../src/sim/world';
import { resolveMedium, surfaceCrossing } from '../../src/sim/water/surface';

test('medium hysteresis holds inside the band, while exact crossings take precedence', () => {
  expect(resolveMedium('water', metres(0.1))).toBe('water');
  expect(resolveMedium('air', metres(-0.1))).toBe('air');
  expect(resolveMedium('water', metres(0.16))).toBe('air');
  expect(resolveMedium('air', metres(-0.16))).toBe('water');
  expect(resolveMedium('water', metres(0.001), 'breach')).toBe('air');
  expect(resolveMedium('air', metres(-0.001), 'entry')).toBe('water');
});

test('analytically detects a crossing that leaps across the entire surface layer', () => {
  const crossing = surfaceCrossing(metres(-0.4), metresPerSec(120), metresPerSec2(0), CONSTANTS.TIME.SIM_DT, 1);
  expect(crossing?.time).toBeCloseTo(1 / 300, 14);
  expect(crossing?.kind).toBe('breach');
});

test('finds the first root even when both integration endpoints are underwater', () => {
  const crossing = surfaceCrossing(metres(-1), metresPerSec(10), metresPerSec2(-10), seconds(1), 1);
  expect(crossing?.time).toBeCloseTo((10 - Math.sqrt(60)) / 20, 14);
  expect(crossing?.kind).toBe('breach');
});

test('a surface launch does not retrigger the zero-time root; a tangent is not a crossing', () => {
  expect(surfaceCrossing(metres(0), metresPerSec(20), metresPerSec2(-18), seconds(1 / 120), 0.5)).toBeUndefined();
  expect(surfaceCrossing(metres(-1), metresPerSec(2), metresPerSec2(-1), seconds(2), 1)).toBeUndefined();
});

test('incoming ballistic speed is measured at the fractional impact, not after the full step', () => {
  const world = createWaterWorld(42, { position: worldPos(0, 0.01), velocity: velocity(0, -80), heading: radians(-Math.PI / 2), medium: 'air' });
  stepWorld(world, idleIntent(), CONSTANTS.TIME.SIM_DT);
  const crossing = world.entities[0]?.lastCrossing;
  expect(crossing?.kind).toBe('entry');
  expect(crossing?.fraction).toBeGreaterThan(0);
  expect(crossing?.fraction).toBeLessThan(0.1);
  expect(crossing?.incomingSpeed).toBeCloseTo(Math.sqrt(80 * 80 + 2 * 18 * 0.01), 10);
  expect(crossing?.grade).toBe('perfect');
});

test('shallow fast downward crossings skip with 0.6 restitution and stay airborne', () => {
  const world = createWaterWorld(42, { position: worldPos(0, 0.001), velocity: velocity(30, -2), heading: radians(0), medium: 'air' });
  stepWorld(world, idleIntent(), CONSTANTS.TIME.SIM_DT);
  const body = world.entities[0];
  expect(body?.lastCrossing?.kind).toBe('skip');
  expect(body?.medium).toBe('air');
  expect(body?.velocity.y).toBeGreaterThan(0);
  expect(body?.entries).toBe(0);
});

test('a slow shallow landing enters the water instead of skipping forever', () => {
  const world = createWaterWorld(42, { position: worldPos(0, 0.001), velocity: velocity(0.5, -0.5), heading: radians(-Math.PI / 2), medium: 'air' });
  stepWorld(world, idleIntent(), CONSTANTS.TIME.SIM_DT);
  expect(world.entities[0]?.lastCrossing?.kind).toBe('entry');
});

test('simple ballistic flight reaches its predicted apex and returns at the predicted instant', () => {
  const world = createWaterWorld(42, { position: worldPos(0, 0), velocity: velocity(0, 24), heading: radians(Math.PI / 2), medium: 'air' });
  let apex = 0;
  for (let step = 0; step < 400; step += 1) {
    stepWorld(world, idleIntent(), CONSTANTS.TIME.SIM_DT);
    const body = world.entities[0];
    if (!body) throw new Error('Missing player');
    apex = Math.max(apex, body.position.y);
    if (body.lastCrossing?.kind === 'entry') {
      expect(apex).toBeCloseTo(16, 8);
      expect(body.lastCrossing.time).toBeCloseTo(8 / 3, 10);
      expect(body.lastCrossing.incomingSpeed).toBeCloseTo(24, 10);
      return;
    }
  }
  throw new Error('Ballistic arc did not return to the surface.');
});

test('acceleration vectors retain their unit brand', () => {
  expect(acceleration(0, -18)).toEqual({ x: 0, y: -18 });
});

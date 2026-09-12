import { expect, test } from 'vitest';
import { CONSTANTS } from '../../src/sim/constants';
import { idleIntent } from '../../src/sim/intent';
import { stepWorld } from '../../src/sim/step';
import { seconds } from '../../src/sim/units';
import { createWorld } from '../../src/sim/world';
import { createFixedLoop } from '../../src/harness/loop';

test('fractional frame time is accumulated and interpolated', () => {
  let steps = 0;
  const loop = createFixedLoop(() => { steps += 1; });
  expect(loop.advance(seconds(CONSTANTS.TIME.SIM_DT / 2))).toBe(0.5);
  expect(steps).toBe(0);
  expect(loop.advance(seconds(CONSTANTS.TIME.SIM_DT / 2))).toBe(0);
  expect(steps).toBe(1);
});

test('dilation changes step count, never the simulation timestep', () => {
  const world = createWorld();
  const loop = createFixedLoop(() => stepWorld(world, idleIntent(), CONSTANTS.TIME.SIM_DT));
  for (let frame = 0; frame < 120; frame += 1) loop.advance(CONSTANTS.TIME.SIM_DT, 0.25);
  expect(world.stepIndex).toBe(30);
  expect(() => stepWorld(world, idleIntent(), seconds(CONSTANTS.TIME.SIM_DT / 2))).toThrow(RangeError);
});

test('long frames are capped and reset discards old accumulator time', () => {
  let steps = 0;
  const loop = createFixedLoop(() => { steps += 1; });
  loop.advance(seconds(30));
  expect(steps).toBe(30);
  loop.advance(seconds(CONSTANTS.TIME.SIM_DT / 2));
  loop.reset();
  loop.advance(seconds(CONSTANTS.TIME.SIM_DT / 2));
  expect(steps).toBe(30);
});

test('pause stops real-time steps but manual pumping remains exact', () => {
  let steps = 0;
  const loop = createFixedLoop(() => { steps += 1; });
  loop.setPaused(true);
  loop.advance(seconds(1));
  expect(steps).toBe(0);
  loop.stepFrames(1000);
  expect(steps).toBe(1000);
  loop.setPaused(false);
  loop.advance(CONSTANTS.TIME.SIM_DT);
  expect(steps).toBe(1001);
});

test.each([-1, 0.5, NaN, Infinity])('manual pump rejects invalid count %s', (count) => {
  const loop = createFixedLoop(() => { throw new Error('Must not step'); });
  expect(() => loop.stepFrames(count)).toThrow(RangeError);
});

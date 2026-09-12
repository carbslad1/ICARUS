import { expect, test } from 'vitest';
import { CONSTANTS } from '../../src/sim/constants';
import { idleIntent } from '../../src/sim/intent';
import { atan2, magnitude } from '../../src/sim/math';
import { stepWorld } from '../../src/sim/step';
import { angleDifference, radians, velocity, worldPos } from '../../src/sim/units';
import { createWaterWorld } from '../../src/sim/world';

const dt = CONSTANTS.TIME.SIM_DT;

test.each([26, 60])('an unpowered quarter turn carries momentum (%s m/s start)', (initialSpeed) => {
  const world = createWaterWorld(42, { position: worldPos(0, -100), velocity: velocity(initialSpeed, 0), heading: radians(0) });
  const body = world.entities[0];
  if (!body) throw new Error('Missing player');
  let angle = 0;
  let previous = radians(0);
  let distance = 0;
  let largestSlip = 0;
  for (let index = 0; index < 240 && angle < Math.PI / 2; index += 1) {
    const position = body.position;
    stepWorld(world, { ...idleIntent(), turn: 1 }, dt);
    const direction = radians(atan2(body.velocity.y, body.velocity.x));
    angle += angleDifference(direction, previous);
    previous = direction;
    distance += Math.hypot(body.position.x - position.x, body.position.y - position.y);
    largestSlip = Math.max(largestSlip, Math.abs(angleDifference(body.heading, direction)));
  }
  const exitSpeed = magnitude(body.velocity.x, body.velocity.y);
  console.log(`Coasting turn ${initialSpeed}: exit ${exitSpeed.toFixed(3)} m/s, slip ${(largestSlip * 180 / Math.PI).toFixed(2)} deg, time ${(world.stepIndex * dt).toFixed(3)} s.`);
  expect(angle).toBeGreaterThanOrEqual(Math.PI / 2);
  expect(world.stepIndex * dt).toBeLessThan(0.6);
  expect(exitSpeed).toBeGreaterThan(initialSpeed * 0.9);
  expect(largestSlip).toBeLessThan(0.5);
  expect(distance).toBeGreaterThan(5);
});

test('holding a turn traces a continuous curve without the nose lapping or reversing the velocity', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -100), velocity: velocity(26, 0), heading: radians(0) });
  const body = world.entities[0];
  if (!body) throw new Error('Missing player');
  let previous = radians(0);
  let winding = 0;
  let backwards = 0;
  let largestSlip = 0;
  for (let index = 0; index < 240; index += 1) {
    stepWorld(world, { ...idleIntent(), turn: 1, thrust: true }, dt);
    const direction = radians(atan2(body.velocity.y, body.velocity.x));
    const change = angleDifference(direction, previous);
    if (change < 0) backwards += 1;
    winding += change;
    largestSlip = Math.max(largestSlip, Math.abs(angleDifference(body.heading, direction)));
    previous = direction;
  }
  console.log(`Sustained curve: ${winding.toFixed(3)} rad, ${backwards} reverse steps, ${(largestSlip * 180 / Math.PI).toFixed(2)} deg maximum slip.`);
  expect(backwards).toBe(0);
  expect(winding).toBeGreaterThan(2 * Math.PI);
  expect(largestSlip).toBeLessThan(0.5);
  expect(magnitude(body.velocity.x, body.velocity.y)).toBeGreaterThan(24);
});

test('releasing steering settles the nose onto the carried trajectory', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -100), velocity: velocity(26, 0), heading: radians(0) });
  const body = world.entities[0];
  if (!body) throw new Error('Missing player');
  for (let index = 0; index < 48; index += 1) stepWorld(world, { ...idleIntent(), turn: 1 }, dt);
  for (let index = 0; index < 60; index += 1) stepWorld(world, idleIntent(), dt);
  expect(Math.abs(angleDifference(body.heading, radians(atan2(body.velocity.y, body.velocity.x))))).toBeLessThan(0.02);
  expect(magnitude(body.velocity.x, body.velocity.y)).toBeGreaterThan(22);
});

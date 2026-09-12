import { expect, test } from 'vitest';
import { CONSTANTS } from '../../src/sim/constants';
import { idleIntent } from '../../src/sim/intent';
import { stepWorld } from '../../src/sim/step';
import { angleDifference, radians, velocity, worldPos } from '../../src/sim/units';
import { createWaterWorld } from '../../src/sim/world';
import { entryQuality } from '../../src/sim/water/entry';

const dt = CONSTANTS.TIME.SIM_DT;

test('the trial starts near the surface with a gentle downward drift', () => {
  const body = createWaterWorld(42).entities[0];
  expect(body?.position.y).toBeGreaterThanOrEqual(-4);
  expect(body?.velocity.y).toBeGreaterThanOrEqual(-2);
});

test('a half-second turn rotates the body more than two radians', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -100), heading: radians(0) });
  for (let step = 0; step < 60; step += 1) stepWorld(world, { ...idleIntent(), turn: 1 }, dt);
  expect(world.entities[0]?.heading).toBeGreaterThan(2);
});

test('thrust reaches 20 m/s from rest within three quarters of a second', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -100), velocity: velocity(0, 0), heading: radians(0) });
  for (let step = 0; step < 90; step += 1) stepWorld(world, { ...idleIntent(), thrust: true }, dt);
  const body = world.entities[0];
  if (!body) throw new Error('Missing player');
  const speed = Math.hypot(body.velocity.x, body.velocity.y);
  console.log(`Acceleration feel: ${speed.toFixed(3)} m/s after 0.75 s.`);
  expect(speed).toBeGreaterThan(20);
});

test('a committed downward dive can recover without a deep underwater detour', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -1), velocity: velocity(0, -24), heading: radians(-Math.PI / 2) });
  const body = world.entities[0];
  if (!body) throw new Error('Missing player');
  let deepest = body.position.y;
  for (let index = 0; index < 1200 && body.breaches === 0; index += 1) {
    const turn = Math.max(-1, Math.min(1, angleDifference(radians(Math.PI / 2), body.heading) / (CONSTANTS.WATER.WATER_TURN_RATE * dt)));
    stepWorld(world, { ...idleIntent(), turn, thrust: true }, dt);
    if (body.position.y < deepest) deepest = body.position.y;
  }
  console.log(`Recovery feel: ${(-deepest).toFixed(3)} m depth, ${(world.stepIndex * dt).toFixed(3)} s to breach.`);
  expect(body.breaches).toBe(1);
  expect(deepest).toBeGreaterThan(-14);
  expect(world.stepIndex * dt).toBeLessThan(2.5);
});

test('an idle dolphin starting at rest sinks less than 15 metres in five seconds', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -1), velocity: velocity(0, 0), heading: radians(-Math.PI / 2) });
  for (let step = 0; step < 600; step += 1) stepWorld(world, idleIntent(), dt);
  expect(world.entities[0]?.position.y).toBeGreaterThan(-16);
});

test('three perfect entries add more than 7 m/s and clean entries give a smaller nudge', () => {
  let speed = 26;
  for (let streak = 0; streak < 3; streak += 1) {
    speed = entryQuality(radians(-Math.PI / 2), velocity(0, -speed), streak).speed;
  }
  expect(speed).toBeGreaterThan(33);
  const clean = entryQuality(radians(-Math.PI / 2 + 0.15), velocity(0, -26), 4);
  expect(clean.grade).toBe('clean');
  expect(clean.speed).toBeGreaterThan(26);
  expect(clean.speed).toBeLessThan(entryQuality(radians(-Math.PI / 2), velocity(0, -26), 0).speed);
  expect(clean.streak).toBe(0);
  expect(entryQuality(radians(0), velocity(0, -26), 4).bonus).toBe(0);
});

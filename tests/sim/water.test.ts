import { expect, test } from 'vitest';
import { CONSTANTS } from '../../src/sim/constants';
import { idleIntent } from '../../src/sim/intent';
import { stepWorld } from '../../src/sim/step';
import { angleDifference, metresPerSec, radians, velocity, worldPos } from '../../src/sim/units';
import { atan2 } from '../../src/sim/math';
import { createWaterWorld } from '../../src/sim/world';
import { entryQuality } from '../../src/sim/water/entry';
import type { WaterBody } from '../../src/sim/water/body';

const dt = CONSTANTS.TIME.SIM_DT;

function player(world: ReturnType<typeof createWaterWorld>): WaterBody {
  const body = world.entities[0];
  if (!body) throw new Error('Water world must have a player.');
  return body;
}

function turnExit(rate: number, startingSpeed: number) {
  const world = createWaterWorld(42, {
    position: worldPos(0, -500), velocity: velocity(startingSpeed, 0), heading: radians(0),
  });
  const body = player(world);
  const target = -2 * Math.PI / 3;
  const direction = { x: Math.cos(target), y: Math.sin(target) };
  for (let index = 0; index < 2000; index += 1) {
    const before = body.velocity;
    const turn = Math.max(-rate, (-Math.PI - body.heading) / (CONSTANTS.WATER.WATER_TURN_RATE * dt));
    stepWorld(world, { ...idleIntent(), turn, thrust: true }, dt);
    if (Math.atan2(body.velocity.y, body.velocity.x) <= target) {
      // Compare at exactly the same velocity angle, not at different body headings.
      const beforeCross = before.x * direction.y - before.y * direction.x;
      const afterCross = body.velocity.x * direction.y - body.velocity.y * direction.x;
      const fraction = beforeCross / (beforeCross - afterCross);
      const x = before.x + (body.velocity.x - before.x) * fraction;
      const y = before.y + (body.velocity.y - before.y) * fraction;
      return { speed: Math.hypot(x, y), angle: Math.atan2(y, x), steps: index + fraction };
    }
  }
  throw new Error('Turn never reached the target trajectory.');
}

test.each([26, 60])('hard turns exit slower than gentle turns through the same 120-degree trajectory (%s m/s start)', (speed) => {
  const hard = turnExit(1, speed);
  const gentle = turnExit(0.25, speed);
  expect(hard.angle).toBeCloseTo(-2 * Math.PI / 3, 12);
  expect(gentle.angle).toBeCloseTo(hard.angle, 12);
  expect(hard.steps).toBeLessThan(gentle.steps);
  expect(hard.speed).toBeLessThan(gentle.speed * 0.9);
  console.log(`Turn gate (${speed} m/s): hard ${hard.speed.toFixed(3)}, gentle ${gentle.speed.toFixed(3)} m/s, same 120-degree trajectory.`);
});

test('from rest with no input, a downward-facing dolphin sinks to terminal velocity', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -500), velocity: velocity(0, 0), heading: radians(-Math.PI / 2) });
  const body = player(world);
  for (let step = 0; step < 12000; step += 1) stepWorld(world, idleIntent(), dt);
  const terminal = Math.sqrt(Math.abs(CONSTANTS.WATER.WATER_GRAVITY) / CONSTANTS.WATER.WATER_DRAG_QUADRATIC);
  expect(body.position.y).toBeLessThan(-500);
  expect(body.velocity.y).toBeCloseTo(-terminal, 3);
  expect(body.velocity.x).toBeCloseTo(0, 10);
});

test('thrust builds speed from rest but does not clamp earned momentum above its ceiling', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -500), velocity: velocity(0, 0), heading: radians(0) });
  for (let step = 0; step < 240; step += 1) stepWorld(world, { ...idleIntent(), thrust: true }, dt);
  expect(Math.hypot(player(world).velocity.x, player(world).velocity.y)).toBeGreaterThan(20);

  const options = { position: worldPos(0, -500), velocity: velocity(0, -60), heading: radians(-Math.PI / 2) };
  const coasting = createWaterWorld(42, options);
  const thrusting = createWaterWorld(42, options);
  stepWorld(coasting, idleIntent(), dt);
  stepWorld(thrusting, { ...idleIntent(), thrust: true }, dt);
  expect(player(thrusting).velocity).toEqual(player(coasting).velocity);
  expect(Math.hypot(player(thrusting).velocity.x, player(thrusting).velocity.y)).toBeGreaterThan(26);
});

test('rotating the body does not instantly rotate its velocity', () => {
  const world = createWaterWorld(42, { position: worldPos(0, -50), velocity: velocity(25, 0), heading: radians(0) });
  stepWorld(world, { ...idleIntent(), turn: 1 }, dt);
  const body = player(world);
  expect(body.heading).toBeCloseTo(CONSTANTS.WATER.WATER_TURN_RATE * dt, 12);
  expect(Math.abs(Math.atan2(body.velocity.y, body.velocity.x))).toBeLessThan(body.heading / 4);
});

test.each([
  [0, 'perfect', 1], [0.09, 'perfect', 1], [0.091, 'clean', 0.97],
  [0.26, 'clean', 0.97], [0.48, 'sloppy', 0.845], [0.7, 'sloppy', 0.72],
  [0.701, 'belly-flop', 0.45],
])('entry angle %s has grade %s and retention %s', (angle, grade, retention) => {
  const result = entryQuality(radians(-Math.PI / 2 + angle), velocity(0, -30), 0);
  expect(result.grade).toBe(grade);
  expect(result.retention).toBeCloseTo(retention, 12);
});

test('entry angle wraps correctly across negative and positive pi', () => {
  expect(entryQuality(radians(-Math.PI + 0.02), velocity(-30, 0), 0).grade).toBe('perfect');
});

test('ten consecutive perfect entries produce monotonically increasing ideal ballistic apices; bonuses are capped', () => {
  let speed = metresPerSec(20);
  let streak = 0;
  let apex = 0;
  for (let index = 0; index < 10; index += 1) {
    const entry = entryQuality(radians(-Math.PI / 2), velocity(0, -speed), streak);
    expect(entry.streak).toBe(streak + 1);
    expect(entry.bonus).toBeLessThanOrEqual(CONSTANTS.ENTRY.PERFECT_BONUS_CAP);
    speed = entry.speed;
    streak = entry.streak;
    const nextApex = speed * speed / (2 * Math.abs(CONSTANTS.WATER.AIR_GRAVITY));
    expect(nextApex).toBeGreaterThan(apex);
    apex = nextApex;
  }
  expect(entryQuality(radians(0), velocity(0, -speed), streak).streak).toBe(0);
});

test('a belly-flop locks controls for its specified duration', () => {
  const world = createWaterWorld(42, { position: worldPos(0, 0.01), velocity: velocity(0, -30), heading: radians(0), medium: 'air' });
  stepWorld(world, idleIntent(), dt);
  const body = player(world);
  expect(body.lastCrossing?.grade).toBe('belly-flop');
  expect(body.lockout).toBeGreaterThan(0);
  const heading = body.heading;
  for (let index = 0; index < 20; index += 1) stepWorld(world, { ...idleIntent(), thrust: true, turn: 1 }, dt);
  expect(body.heading).toBe(heading);
  for (let index = 0; index < 20; index += 1) stepWorld(world, { ...idleIntent(), turn: 1 }, dt);
  expect(body.heading).toBeGreaterThan(heading);
});

test.each([10, 12, 14])('ten complete perfect-entry cycles increase actual flight apices (%s m/s initial launch)', (initialSpeed) => {
  const world = createWaterWorld(42, {
    position: worldPos(0, 0), velocity: velocity(0, initialSpeed), heading: radians(-Math.PI / 2), medium: 'air',
  });
  const body = player(world);
  let breaches = 0;
  let lastApex = initialSpeed * initialSpeed / (2 * Math.abs(CONSTANTS.WATER.AIR_GRAVITY));
  for (let index = 0; index < 24000 && breaches < 10; index += 1) {
    // This upstream controller uses only heading/thrust, never teleports or changes velocity.
    const impactY = -Math.sqrt(body.velocity.y ** 2 + 2 * Math.abs(CONSTANTS.WATER.AIR_GRAVITY) * Math.max(0, body.position.y));
    const target = body.medium === 'air' ? atan2(impactY, body.velocity.x) : Math.PI / 2;
    const turn = Math.max(-1, Math.min(1, angleDifference(radians(target), body.heading) / (CONSTANTS.WATER.WATER_TURN_RATE * dt)));
    stepWorld(world, { ...idleIntent(), turn, thrust: true }, dt);
    if (body.breaches > breaches) {
      // Include the fractional post-breach altitude, not just the end-of-step velocity.
      const apex = body.position.y + body.velocity.y ** 2 / (2 * Math.abs(CONSTANTS.WATER.AIR_GRAVITY));
      expect(body.streak).toBe(breaches + 1);
      expect(body.entries).toBe(breaches + 1);
      expect(apex).toBeGreaterThan(lastApex);
      lastApex = apex;
      breaches = body.breaches;
    }
  }
  expect(breaches).toBe(10);
});

import { expect, test } from 'vitest';
import { DEFAULT_TUNING, parseMovementTuning, TUNING_FIELDS } from '../../src/sim/tuning';
import { CONSTANTS } from '../../src/sim/constants';
import { idleIntent } from '../../src/sim/intent';
import { stepWorld } from '../../src/sim/step';
import { radians, velocity, worldPos } from '../../src/sim/units';
import { createWaterWorld } from '../../src/sim/world';
import { entryQuality } from '../../src/sim/water/entry';
import { createRecorder } from '../../src/harness/record';
import { replayTrace } from '../../src/harness/replay';
import { parseTrace, traceJson } from '../../src/harness/trace';
import { createHarness } from '../../src/harness/headless';

const dt = CONSTANTS.TIME.SIM_DT;

test('tuning validates every bound, rejects malformed data, and keeps defaults immutable', () => {
  expect(Object.isFrozen(DEFAULT_TUNING)).toBe(true);
  for (const [key, field] of Object.entries(TUNING_FIELDS)) {
    expect(field.defaultValue).toBeGreaterThanOrEqual(field.min);
    expect(field.defaultValue).toBeLessThanOrEqual(field.max);
    expect(parseMovementTuning({ [key]: field.min })).toHaveProperty(key, field.min);
    expect(parseMovementTuning({ [key]: field.max })).toHaveProperty(key, field.max);
    for (const bad of [NaN, Infinity, '1', null, field.min - field.step, field.max + field.step]) {
      expect(() => parseMovementTuning({ [key]: bad })).toThrow();
    }
  }
  for (const bad of [null, [], 'settings', { unknown: 1 }]) expect(() => parseMovementTuning(bad)).toThrow();
  const source = { thrust: 60 };
  const parsed = parseMovementTuning(source);
  source.thrust = 1;
  expect(parsed.thrust).toBe(60);
  expect(DEFAULT_TUNING.thrust).toBe(CONSTANTS.WATER.WATER_THRUST);
});

test.each(['waterGravity', 'waterDrag', 'thrust', 'thrustSpeed', 'turnRate', 'redirectRate', 'steerLead', 'turnCost'])('%s changes the actual water trajectory', (key) => {
  const results = [0, 1].map((end) => {
    const field = Object.entries(TUNING_FIELDS).find(([name]) => name === key)?.[1];
    if (!field) throw new Error('Missing field');
    const tuning = parseMovementTuning({ [key]: end === 0 ? field.min : field.max });
    const world = createWaterWorld(42, { position: worldPos(0, -500), velocity: velocity(20, 0), heading: radians(0) }, tuning);
    for (let step = 0; step < 60; step += 1) stepWorld(world, { ...idleIntent(), turn: 1, thrust: true }, dt);
    return world.entities[0];
  });
  expect(results[0]?.position).not.toEqual(results[1]?.position);
});

test('air gravity and rotation are independent from water steering', () => {
  const tuning = parseMovementTuning({ airGravity: -4, airTurnRate: 10, turnRate: 1 });
  const world = createWaterWorld(42, { position: worldPos(0, 100), velocity: velocity(12, 0), heading: radians(0), medium: 'air' }, tuning);
  stepWorld(world, { ...idleIntent(), turn: 1, thrust: true }, dt);
  expect(world.entities[0]?.velocity.y).toBe(-4 * dt);
  expect(world.entities[0]?.velocity.x).toBe(12);
  expect(world.entities[0]?.heading).toBe(10 * dt);
});

test('entry boosts, retention, and recovery settings all reach the transition model', () => {
  const tuning = parseMovementTuning({ perfectBonus: 4, streakBonus: 1, bonusCap: 8, cleanBonus: 3,
    cleanRetention: 0.9, sloppyRetention: 0.6, flopRetention: 0.2, flopLockout: 0.8 });
  const incoming = velocity(0, -30);
  const heading = -Math.PI / 2;
  expect(entryQuality(radians(heading), incoming, 2, tuning).bonus).toBe(6);
  expect(entryQuality(radians(heading), incoming, 50, tuning).bonus).toBe(8);
  expect(entryQuality(radians(heading + 0.2), incoming, 0, tuning).speed).toBe(30);
  expect(entryQuality(radians(heading + 0.7), incoming, 0, tuning).retention).toBeCloseTo(0.6, 12);
  expect(entryQuality(radians(0), incoming, 0, tuning).speed).toBe(6);
  const world = createWaterWorld(42, { position: worldPos(0, 0.01), velocity: incoming, heading: radians(0), medium: 'air' }, tuning);
  stepWorld(world, idleIntent(), dt);
  expect(world.entities[0]?.lastCrossing?.grade).toBe('belly-flop');
  expect(world.entities[0]?.lockout).toBeGreaterThan(0.8 - dt);
});

test.each(['min', 'max'])('the %s endpoints remain finite through sustained steering, release, and crossings', (end) => {
  const tuning = parseMovementTuning(Object.fromEntries(Object.entries(TUNING_FIELDS).map(([key, field]) => [key, end === 'min' ? field.min : field.max])));
  const world = createWaterWorld(42, {}, tuning);
  for (let index = 0; index < 3000; index += 1) {
    stepWorld(world, { ...idleIntent(), thrust: index % 600 < 450, turn: index % 400 < 120 ? 1 : 0 }, dt);
    const body = world.entities[0];
    for (const value of [body?.position.x, body?.position.y, body?.velocity.x, body?.velocity.y, body?.heading]) expect(Number.isFinite(value)).toBe(true);
  }
});

test('changing one run does not reset its progress, mutate snapshots, or affect another run', () => {
  const first = createHarness(42, createWaterWorld);
  const second = createHarness(42, createWaterWorld);
  first.step(idleIntent());
  const before = first.snapshot();
  const tuning = parseMovementTuning({ thrust: 70 });
  first.step({ ...idleIntent(), thrust: true }, tuning);
  expect(first.snapshot().stepIndex).toBe(2);
  expect(first.snapshot().tuning).toEqual(tuning);
  expect(first.snapshot().player?.position.x).toBeGreaterThan(before.player?.position.x ?? 0);
  expect(before.tuning).toBeUndefined();
  expect(second.snapshot().stepIndex).toBe(0);
  expect(second.snapshot().tuning).toBeUndefined();
  expect(Object.isFrozen(first.snapshot().tuning)).toBe(true);
});

test('custom initial settings and mid-run edits record and replay exactly, including reset to defaults', () => {
  const initial = parseMovementTuning({ thrust: 60, turnRate: 7 });
  const recorder = createRecorder(42, 'water', initial);
  const recorded = [];
  for (let step = 0; step < 600; step += 1) {
    const tuning = step === 80 ? parseMovementTuning({ airGravity: -12, perfectBonus: 4 }) : step === 450 ? DEFAULT_TUNING : undefined;
    recorded.push(recorder.step({ ...idleIntent(), thrust: true, turn: step < 60 ? 1 : 0 }, tuning));
  }
  const trace = parseTrace(JSON.parse(traceJson(recorder.trace())));
  const replay = replayTrace(trace);
  expect(replay.frames.slice(1)).toEqual(recorded);
  expect(replay.csv).toBe(recorder.csv());
  expect(replay.frames[0]?.tuning).toEqual(initial);
  expect(replay.frames[81]?.tuning?.airGravity).toBe(-12);
  expect(replay.frames[451]?.tuning).toBeUndefined();
  expect(() => parseTrace({ version: 1, seed: 42, steps: 0, entries: [], tuning: initial })).toThrow();
  expect(() => createRecorder(42).step(idleIntent(), initial)).toThrow();
});

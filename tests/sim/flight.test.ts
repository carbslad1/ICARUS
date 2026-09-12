import { expect, test } from 'vitest';
import { CONSTANTS } from '../../src/sim/constants';
import { idleIntent } from '../../src/sim/intent';
import { createBody } from '../../src/sim/water/body';
import { DEFAULT_TUNING } from '../../src/sim/tuning';
import { createAir } from '../../src/sim/flight/state';
import { flightValue, integrateFrame, tierForApex } from '../../src/sim/flight/frame';
import { moveAirPlayer } from '../../src/sim/flight/control';
import { advanceReturn, startReturn } from '../../src/sim/flight/transition';
import { localPos, metres, metresPerSec, metresPerSec2, radians, seconds, toWorld, velocity, worldPos } from '../../src/sim/units';
import { createFlightWorld } from '../../src/sim/world';
import { stepWorld } from '../../src/sim/step';
import { updateBreach } from '../../src/sim/breach/window';
import { createFixedLoop } from '../../src/harness/loop';
import { createRecorder } from '../../src/harness/record';
import { replayTrace } from '../../src/harness/replay';

const dt = CONSTANTS.TIME.SIM_DT;
function flight(vy = 36) {
  return createAir(createBody({ position: worldPos(20, 0), velocity: velocity(12, vy), heading: radians(Math.PI / 2) }), DEFAULT_TUNING);
}

test.each([20, 35, 60])('the frame reaches its predicted apex and exact return time at %s m/s', (vy) => {
  const air = flight(vy);
  const expected = flightValue(metresPerSec(vy), metresPerSec2(-18));
  const apex = integrateFrame(air.arena, air.velocity, DEFAULT_TUNING.airGravity, seconds(vy / 18));
  expect(air.arena.origin.y).toBeCloseTo(expected.apex, 12);
  const landed = integrateFrame(air.arena, apex.velocity, DEFAULT_TUNING.airGravity, seconds(vy / 18 + 1));
  expect(landed.landed).toBe(true);
  expect(apex.elapsed + landed.elapsed).toBeCloseTo(expected.airtime, 12);
  expect(air.arena.origin.y).toBeCloseTo(0, 12);
  expect(landed.velocity.y).toBeCloseTo(-vy, 12);
});

test('tier bands include exact thresholds and do not cap altitude', () => {
  expect([0, 15, 40, 80, 150, 5000].map((height) => tierForApex(metres(height)))).toEqual([1, 2, 3, 4, 5, 5]);
});

test('air input reverses immediately and releases without affecting the ballistic rail', () => {
  const air = flight();
  const origin = air.arena.origin;
  const movement = air.velocity;
  moveAirPlayer(air.arena, { ...idleIntent(), move: { x: 1, y: 0 } }, dt);
  expect(air.arena.player.velocity.x).toBe(12);
  moveAirPlayer(air.arena, { ...idleIntent(), move: { x: -1, y: 0 } }, dt);
  expect(air.arena.player.velocity.x).toBe(-9);
  for (let i = 0; i < 5; i += 1) moveAirPlayer(air.arena, idleIntent(), dt);
  expect(Math.abs(air.arena.player.velocity.x)).toBeLessThan(0.002);
  expect(air.arena.origin).toEqual(origin);
  expect(air.velocity).toEqual(movement);
});

test('all edges contain the player even during repeated diagonal dashes', () => {
  const air = flight();
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    for (let i = 0; i < 1200; i += 1) {
      moveAirPlayer(air.arena, { ...idleIntent(), move: { x: x / Math.SQRT2, y: y / Math.SQRT2 }, dash: i % 60 === 0 }, dt);
      expect(Math.abs(air.arena.player.position.x)).toBeLessThanOrEqual(24);
      expect(Math.abs(air.arena.player.position.y)).toBeLessThanOrEqual(14);
    }
  }
});

test('dash displaces exactly 3.5 m, consumes one charge on hold, and resets on a new flight', () => {
  const air = flight();
  air.arena.player.heading = radians(0);
  for (let i = 0; i < 15; i += 1) moveAirPlayer(air.arena, { ...idleIntent(), dash: true }, dt);
  expect(air.arena.player.position.x).toBeCloseTo(3.5, 12);
  expect(air.arena.player.dashCharges).toBe(1);
  for (let i = 0; i < 120; i += 1) moveAirPlayer(air.arena, { ...idleIntent(), dash: true }, dt);
  expect(air.arena.player.dashCharges).toBe(1);
  expect(flight().arena.player.dashCharges).toBe(2);
});

test('commitment transfers the sprite position once and banks frame velocity, never local dash velocity', () => {
  const air = flight();
  air.arena.origin = worldPos(125, 40);
  air.arena.player.position = localPos(7, -5);
  air.arena.player.velocity = velocity(100, 100);
  air.velocity = velocity(12, -20);
  const returning = startReturn(air, false);
  expect(returning.body.position).toEqual(toWorld(air.arena.player.position, air.arena));
  expect(returning.body.velocity).toEqual(air.velocity);
  expect('localPosition' in returning.body).toBe(false);
  expect(toWorld(localPos(returning.body.position.x - air.arena.origin.x, returning.body.position.y - air.arena.origin.y), air.arena)).toEqual(returning.body.position);
});

test('an early escape returns with less speed than riding the arc, even when both align perfectly', () => {
  function land(at: number) {
    const air = flight();
    air.velocity = integrateFrame(air.arena, air.velocity, DEFAULT_TUNING.airGravity, seconds(at)).velocity;
    air.arena.player.heading = radians(Math.atan2(-Math.abs(air.velocity.y), air.velocity.x));
    const returning = startReturn(air, at === 4);
    let completed = false;
    for (let i = 0; i < 36; i += 1) completed = advanceReturn(returning, 0, dt, i, DEFAULT_TUNING);
    expect(completed).toBe(true);
    expect(returning.body.lastCrossing?.grade).toBe('perfect');
    expect(returning.body.position.y).toBe(0);
    return Math.hypot(returning.body.velocity.x, returning.body.velocity.y);
  }
  expect(land(1)).toBeLessThan(land(4) * 0.7);
});

test('forced return closes precisely 60 percent of heading error and still permits alignment', () => {
  const air = flight();
  air.velocity = velocity(0, -36);
  air.arena.player.heading = radians(0);
  const returning = startReturn(air, true);
  expect(returning.body.heading).toBeCloseTo(-Math.PI / 2 * 0.6, 12);
  const previous = returning.body.heading;
  advanceReturn(returning, -1, dt, 1, DEFAULT_TUNING);
  expect(returning.body.heading).toBeLessThan(previous);
});

test('the breach window times out in real seconds and cannot immediately rearm', () => {
  const world = createFlightWorld();
  const state = world.cycle?.breach;
  if (!state) throw new Error('Missing breach state');
  const body = createBody({ position: worldPos(0, -2), velocity: velocity(0, 30) });
  updateBreach(state, body, dt);
  expect(state.active).toBe(true);
  expect(state.dilation).toBeGreaterThanOrEqual(0.04);
  let real = 0;
  while (state.active) {
    real += dt / state.dilation;
    updateBreach(state, body, dt);
  }
  expect(real).toBeGreaterThanOrEqual(1.6);
  expect(real).toBeLessThan(1.8);
  updateBreach(state, body, dt);
  expect(state.active).toBe(false);
  expect(state.cooldown).toBeGreaterThan(2);
});

test('dilation changes step count across a transition at 30, 60 and 120 Hz', () => {
  const samples = [30, 60, 120].map((fps) => {
    const world = createFlightWorld(1, { position: worldPos(0, -2), velocity: velocity(0, 30) });
    const loop = createFixedLoop(() => stepWorld(world, idleIntent(), dt));
    for (let i = 0; i < fps * 3; i += 1) loop.advance(seconds(1 / fps), () => world.cycle?.breach.dilation ?? 1);
    return { steps: world.stepIndex, air: world.cycle?.air };
  });
  expect(samples[0]).toEqual(samples[1]);
  expect(samples[1]).toEqual(samples[2]);
  expect(samples[0]?.steps).toBeLessThan(360);
});

test('a complete water-air-return cycle records and replays exactly without retaining a world-space air player', () => {
  const recorder = createRecorder(13, 'flight');
  let airborne = false;
  let returned = false;
  let saved = '';
  for (let i = 0; i < 1200; i += 1) {
    const state = recorder.step({ ...idleIntent(), thrust: true, turn: i < 75 ? 1 : 0 });
    if (state.flight) {
      airborne = true;
      expect(state.player).toBeUndefined();
      if (!saved) saved = JSON.stringify(state);
    }
    if (state.player?.entries) returned = true;
  }
  expect(airborne).toBe(true);
  expect(returned).toBe(true);
  expect(replayTrace(recorder.trace()).csv).toBe(recorder.csv());
  const replay = replayTrace(recorder.trace());
  expect(replay.frames.some((frame) => JSON.stringify(frame) === saved)).toBe(true);
});

test('the selected movement profile is the default for new runs', () => {
  expect(DEFAULT_TUNING).toMatchObject({ waterDrag: 0.001, thrustSpeed: 37, redirectRate: 14, steerLead: 0.24, turnCost: 0.02 });
  expect(createFlightWorld().tuning).toEqual(DEFAULT_TUNING);
});

test('a tiny surface hop cannot strand the flight frame below the water', () => {
  const air = flight(0.01);
  const first = integrateFrame(air.arena, air.velocity, DEFAULT_TUNING.airGravity, dt);
  expect(first.landed).toBe(true);
  expect(air.arena.origin.y).toBe(0);
  const next = integrateFrame(air.arena, first.velocity, DEFAULT_TUNING.airGravity, dt);
  expect(next.landed).toBe(true);
  expect(air.arena.origin.y).toBe(0);
});

test('surface skips do not refill dash charges before a true water entry', () => {
  const world = createFlightWorld();
  const cycle = world.cycle;
  if (!cycle) throw new Error('Missing cycle');
  const air = flight();
  air.velocity = velocity(20, -2);
  air.arena.player.dashCharges = 0;
  world.entities = Object.freeze([]);
  cycle.returning = startReturn(air, false);
  for (let i = 0; i < 36; i += 1) stepWorld(world, idleIntent(), dt);
  expect(cycle.air?.stats.lastCrossing?.kind).toBe('skip');
  expect(cycle.air?.arena.player.dashCharges).toBe(0);
});

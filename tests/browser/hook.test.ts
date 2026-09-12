import { afterEach, expect, test, vi } from 'vitest';
import { createBrowserDriver, registerTestHook } from '../../src/harness/browser';
import { idleIntent } from '../../src/sim/intent';
import { CONSTANTS } from '../../src/sim/constants';
import { replayTrace } from '../../src/harness/replay';
import type { InputTrace } from '../../src/harness/trace';
import { createWaterWorld } from '../../src/sim/world';
import { parseMovementTuning } from '../../src/sim/tuning';

afterEach(() => { delete window.__icarus; vi.restoreAllMocks(); });

test('1000 manual frames never call requestAnimationFrame', () => {
  const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
    throw new Error('Manual pumping must never schedule an animation frame.');
  });
  const render = vi.fn();
  const { hook } = createBrowserDriver(render);
  registerTestHook(window, hook, false, '?test=1');
  hook.reset(42);
  hook.setIntent({ ...idleIntent(), thrust: true });
  hook.stepFrames(1000);
  expect(window.__icarus?.snapshot().stepIndex).toBe(1000);
  expect(window.__icarus?.snapshot().intent.thrust).toBe(true);
  expect(render).toHaveBeenLastCalledWith(hook.snapshot(), 0);
  expect(raf).not.toHaveBeenCalled();
});

test.each([
  [false, '', false], [false, '?test=0', false], [false, '?contest=1', false],
  [false, '?test=1', true], [true, '', true],
])('hook registration: DEV=%s search=%s', (dev, search, enabled) => {
  const { hook } = createBrowserDriver(() => {});
  expect(registerTestHook(window, hook, dev, search)).toBe(enabled);
  expect(window.__icarus !== undefined).toBe(enabled);
});

test('browser and headless replay agree on sparse trace boundaries', () => {
  const trace: InputTrace = { version: 1, seed: 42, steps: 7, entries: [
    { stepIndex: 0, intent: { ...idleIntent(), turn: 1 } },
    { stepIndex: 3, intent: { ...idleIntent(), move: { x: 1, y: 0 }, dash: true } },
    { stepIndex: 6, intent: { ...idleIntent(), commit: true } },
  ] };
  const driver = createBrowserDriver(() => {});
  driver.hook.loadTrace(trace);
  const expected = replayTrace(trace).frames;
  for (const frame of expected.slice(1)) {
    driver.hook.stepFrames(1);
    expect(driver.hook.snapshot()).toEqual(frame);
  }
});

test('pause and reset isolate manual state from real-time stepping', () => {
  const driver = createBrowserDriver(() => {});
  driver.hook.reset(42);
  driver.advance(CONSTANTS.TIME.SIM_DT);
  expect(driver.hook.snapshot().stepIndex).toBe(0);
  driver.hook.setPaused(false);
  driver.advance(CONSTANTS.TIME.SIM_DT);
  expect(driver.hook.snapshot().stepIndex).toBe(1);
  driver.hook.setPaused(true);
  driver.advance(CONSTANTS.TIME.SIM_DT);
  expect(driver.hook.snapshot().stepIndex).toBe(1);
  driver.hook.reset(42);
  expect(driver.hook.snapshot().stepIndex).toBe(0);
});

test('live edits latch at a step boundary, survive restart, and cannot contaminate a replay', () => {
  const driver = createBrowserDriver(() => {}, createWaterWorld);
  driver.hook.reset(42);
  driver.hook.stepFrames(20);
  const before = driver.hook.snapshot();
  const tuning = parseMovementTuning({ thrust: 65 });
  driver.setTuning(tuning);
  expect(driver.hook.snapshot()).toEqual(before);
  driver.hook.stepFrames(1);
  expect(driver.hook.snapshot().tuning).toEqual(tuning);
  expect(driver.hook.snapshot().stepIndex).toBe(21);
  driver.hook.reset(42);
  expect(driver.hook.snapshot().tuning).toEqual(tuning);
  const trace: InputTrace = { version: 2, scenario: 'water', seed: 42, steps: 3, entries: [] };
  driver.hook.loadTrace(trace);
  expect(driver.hook.snapshot().tuning).toBeUndefined();
  driver.hook.stepFrames(3);
  expect(driver.hook.snapshot()).toEqual(replayTrace(trace).frames.at(-1));
});

test('browser and headless agree exactly across recorded tuning changes', () => {
  const trace: InputTrace = { version: 2, scenario: 'water', seed: 42, steps: 600,
    tuning: parseMovementTuning({ thrust: 50, waterDrag: 0.001 }),
    entries: [
      { stepIndex: 0, intent: { ...idleIntent(), turn: 1, thrust: true } },
      { stepIndex: 60, intent: { ...idleIntent(), thrust: true }, tuning: parseMovementTuning({ airGravity: -10 }) },
      { stepIndex: 450, intent: idleIntent(), tuning: parseMovementTuning({}) },
    ],
  };
  const driver = createBrowserDriver(() => {}, createWaterWorld);
  driver.hook.loadTrace(trace);
  for (const frame of replayTrace(trace).frames.slice(1)) {
    driver.hook.stepFrames(1);
    expect(driver.hook.snapshot()).toEqual(frame);
  }
});

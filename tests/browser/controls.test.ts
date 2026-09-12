import { expect, test } from 'vitest';
import { createControls } from '../../src/input/controls';
import { createBrowserDriver } from '../../src/harness/browser';
import { createFlightWorld, createWaterWorld } from '../../src/sim/world';
import { seconds, velocity, worldPos } from '../../src/sim/units';
import { idleIntent } from '../../src/sim/intent';

test('keyboard input supports simultaneous thrust and steering, releases, and opposing keys', () => {
  const controls = createControls(window, []);
  try {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    expect(controls.sample()).toEqual({ ...idleIntent(), turn: 1, thrust: true });
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyD' }));
    expect(controls.sample().turn).toBe(0);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    expect(controls.sample().turn).toBe(-1);
    window.dispatchEvent(new Event('blur'));
    expect(controls.sample()).toEqual(idleIntent());
  } finally { controls.destroy(); }
});

test('manual water stepping samples the same keyboard adapter as real-time play', () => {
  const controls = createControls(window, []);
  const driver = createBrowserDriver(() => {}, createWaterWorld, controls.sample);
  try {
    driver.hook.reset(42);
    const start = driver.hook.snapshot().player;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    driver.hook.stepFrames(60);
    expect(driver.hook.snapshot().player?.heading).toBeGreaterThan(start?.heading ?? 0);
    expect(driver.hook.snapshot().intent.thrust).toBe(true);
    window.dispatchEvent(new Event('blur'));
    driver.hook.stepFrames(1);
    expect(driver.hook.snapshot().intent.thrust).toBe(false);
  } finally { controls.destroy(); }
});

test('editing a slider or number field does not steer or thrust, and keyup still releases', () => {
  const controls = createControls(window, []);
  const input = document.createElement('input');
  input.type = 'range';
  document.body.append(input);
  try {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
    input.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true }));
    expect(controls.sample()).toEqual(idleIntent());
    input.type = 'number';
    input.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowUp', bubbles: true }));
    expect(controls.sample()).toEqual(idleIntent());
  } finally { input.remove(); controls.destroy(); }
});

test('input keeps sampling each display frame while breach dilation slows the simulation', () => {
  let samples = 0;
  const driver = createBrowserDriver(() => {},
    (seed) => createFlightWorld(seed, { position: worldPos(0, -2), velocity: velocity(0, 30) }),
    () => { samples += 1; return idleIntent(); });
  for (let i = 0; i < 60; i += 1) driver.advance(seconds(1 / 60));
  expect(samples).toBe(60);
  expect(driver.hook.snapshot().stepIndex).toBeLessThan(20);
});

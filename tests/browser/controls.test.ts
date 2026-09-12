import { expect, test } from 'vitest';
import { createControls } from '../../src/input/controls';
import { createBrowserDriver } from '../../src/harness/browser';
import { createWaterWorld } from '../../src/sim/world';
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

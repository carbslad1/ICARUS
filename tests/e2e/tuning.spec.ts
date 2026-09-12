import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createHarness } from '../../src/harness/headless';
import { parseTrace } from '../../src/harness/trace';
import { replayTrace } from '../../src/harness/replay';
import { createWaterWorld } from '../../src/sim/world';
import { idleIntent } from '../../src/sim/intent';
import { DEFAULT_TUNING, parseMovementTuning } from '../../src/sim/tuning';

test.beforeEach(async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
});

test('sliders apply live without resetting a run and match the headless tuned movement', async ({ page }) => {
  await page.evaluate(() => window.__icarus?.stepFrames(24));
  const before = await page.evaluate(() => window.__icarus?.snapshot());
  await page.getByRole('button', { name: 'Movement settings', exact: true }).click();
  await expect(page.locator('#tuning-panel input[type="range"]')).toHaveCount(18);
  const slider = page.getByRole('slider', { name: 'Thrust', exact: true });
  await slider.focus();
  await slider.press('End');
  await expect(slider).toHaveValue('80');
  expect(await page.evaluate(() => window.__icarus?.snapshot())).toEqual(before);
  await slider.press('ArrowLeft');
  await expect(slider).toHaveValue('79');
  await page.evaluate(() => window.__icarus?.stepFrames(1));
  expect(await page.evaluate(() => window.__icarus?.snapshot().intent)).toEqual(idleIntent());
  await page.getByRole('button', { name: 'Close movement settings' }).click();
  await page.keyboard.down('w');
  await page.evaluate(() => window.__icarus?.stepFrames(12));
  await page.keyboard.up('w');
  const harness = createHarness(1, createWaterWorld);
  for (let i = 0; i < 24; i += 1) harness.step(idleIntent());
  harness.step(idleIntent(), parseMovementTuning({ thrust: 79 }));
  for (let i = 0; i < 12; i += 1) harness.step({ ...idleIntent(), thrust: true });
  expect(await page.evaluate(() => window.__icarus?.snapshot())).toEqual(harness.snapshot());
});

test('settings survive restart and reload, reset live, and do not contaminate default replay', async ({ page }) => {
  await page.getByRole('button', { name: 'Movement settings', exact: true }).click();
  const gravity = page.getByRole('spinbutton', { name: 'Water gravity value' });
  await gravity.fill('0');
  await gravity.press('Enter');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  expect(await page.evaluate(() => window.__icarus?.snapshot().tuning?.waterGravity)).toBe(0);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  expect(await page.evaluate(() => window.__icarus?.snapshot().tuning?.waterGravity)).toBe(0);
  const trace = parseTrace(JSON.parse(readFileSync('tests/golden/water.trace.json', 'utf8')));
  await page.evaluate((trace) => { window.__icarus?.loadTrace(trace); window.__icarus?.stepFrames(trace.steps); }, trace);
  expect(await page.evaluate(() => window.__icarus?.snapshot())).toEqual(replayTrace(trace).frames.at(-1));
  await page.getByRole('button', { name: 'Movement settings', exact: true }).click();
  await expect(gravity).toHaveValue('0');
  const before = await page.evaluate(() => window.__icarus?.snapshot());
  await page.getByRole('button', { name: 'Reset defaults' }).click();
  expect(await page.evaluate(() => window.__icarus?.snapshot())).toEqual(before);
  await expect(gravity).toHaveValue('-1.2');
  await expect(page.getByRole('button', { name: 'Reset defaults' })).toBeDisabled();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  expect(await page.evaluate(() => window.__icarus?.snapshot().tuning)).toBeUndefined();
});

test('all settings export exactly, with a selectable fallback when clipboard permission is denied', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Movement settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Steering', exact: true }).click();
  const rate = page.getByRole('spinbutton', { name: 'Body turn speed value' });
  await rate.fill('8');
  await rate.press('Enter');
  await page.getByRole('tab', { name: 'Entries', exact: true }).click();
  const retention = page.getByRole('spinbutton', { name: 'Flop speed kept value' });
  await retention.fill('90');
  await retention.press('Enter');
  await page.getByRole('button', { name: 'Copy settings' }).click();
  await expect(page.locator('#tuning-status')).toHaveText('Settings copied');
  const json = await page.getByRole('textbox', { name: 'Settings to share' }).inputValue();
  expect(JSON.parse(json)).toEqual({ game: 'ICARUS', version: 1, movement: { ...DEFAULT_TUNING, turnRate: 8, flopRetention: 0.9 } });
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(json);
  await page.evaluate(() => {
    Object.defineProperty(navigator.clipboard, 'writeText', { configurable: true, value: () => Promise.reject(new Error('Denied')) });
  });
  await page.getByRole('button', { name: 'Copy settings' }).click();
  await expect(page.locator('#tuning-status')).toHaveText('Clipboard unavailable / settings selected');
  const exported = page.getByRole('textbox', { name: 'Settings to share' });
  await expect(exported).toBeFocused();
  expect(await exported.evaluate((element) => element instanceof HTMLTextAreaElement && element.selectionStart === 0 && element.selectionEnd === element.value.length)).toBe(true);
  await page.getByRole('tab', { name: 'Air', exact: true }).click();
  const rotation = page.getByRole('spinbutton', { name: 'Air rotation speed value' });
  await rotation.fill('999');
  await rotation.press('Enter');
  await expect(rotation).toHaveValue('12');
  await expect(exported).toBeHidden();
});

test('the open panel keeps the game and hold controls visible at desktop, phone, and landscape sizes', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Movement settings', exact: true }).click();
  const sizes = testInfo.project.name === 'desktop'
    ? [{ width: 1280, height: 800 }, { width: 844, height: 390 }]
    : [{ width: 393, height: 851 }, { width: 320, height: 568 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const panel = await page.getByRole('complementary', { name: 'Movement tuning' }).boundingBox();
    const stage = await page.locator('#stage').boundingBox();
    if (!panel || !stage) throw new Error('Missing tuning layout');
    expect(stage.width).toBeGreaterThan(300);
    expect(stage.height).toBeGreaterThan(250);
    expect(panel.x >= stage.x + stage.width || panel.y >= stage.y + stage.height).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const pixels = await page.locator('canvas').evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) throw new Error('Missing WebGL2');
      const rgba = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      let visible = 0;
      for (let i = 0; i < rgba.length; i += 4) if (rgba[i] === 43 && rgba[i + 1] === 245 && rgba[i + 2] === 255) visible += 1;
      return visible;
    });
    expect(pixels).toBeGreaterThan(20);
    await page.screenshot({ path: testInfo.outputPath(`tuning-${size.width}x${size.height}.png`) });
  }
  if (testInfo.project.name === 'mobile') {
    const thrust = page.getByRole('button', { name: 'Thrust', exact: true });
    const box = await thrust.boundingBox();
    if (!box) throw new Error('Missing hold control');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.evaluate(() => window.__icarus?.stepFrames(12));
    expect(await page.evaluate(() => window.__icarus?.snapshot().intent.thrust)).toBe(true);
    await page.mouse.up();
  }
  await page.getByRole('tab', { name: 'Water', exact: true }).focus();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('complementary', { name: 'Movement tuning' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Movement settings', exact: true })).toBeFocused();
});

test('corrupt saved data and unavailable device storage do not break play or live settings', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('icarus.movement.v1', '{bad json'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  expect(await page.evaluate(() => window.__icarus?.snapshot().tuning)).toBeUndefined();
  await page.evaluate(() => {
    Object.defineProperty(Storage.prototype, 'setItem', { configurable: true, value: () => { throw new Error('Denied'); } });
  });
  await page.getByRole('button', { name: 'Movement settings', exact: true }).click();
  const thrust = page.getByRole('spinbutton', { name: 'Thrust value', exact: true });
  await thrust.fill('45');
  await thrust.press('Enter');
  await expect(page.locator('#tuning-status')).toHaveText('Applied / device storage unavailable');
  await page.evaluate(() => window.__icarus?.stepFrames(1));
  expect(await page.evaluate(() => window.__icarus?.snapshot().tuning?.thrust)).toBe(45);
});

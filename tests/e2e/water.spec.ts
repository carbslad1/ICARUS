import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parseTrace } from '../../src/harness/trace';
import { replayTrace } from '../../src/harness/replay';

const trace = parseTrace(JSON.parse(readFileSync('tests/golden/water.trace.json', 'utf8')));

test('a visible dolphin breaches and re-enters identically to headless simulation', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?test=1&scene=water');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const canvas = page.getByRole('img', { name: 'Icarus water trial' });
  await expect(canvas).toBeVisible();
  const start = await page.screenshot({ path: testInfo.outputPath('water-start.png') });
  const airborne = await page.evaluate((input) => {
    const hook = window.__icarus;
    if (!hook) throw new Error('Missing test hook');
    hook.reset(input.seed);
    hook.loadTrace(input);
    hook.stepFrames(300);
    return hook.snapshot();
  }, trace);
  expect(airborne).toEqual(replayTrace(trace).frames[300]);
  expect(airborne.player?.medium).toBe('air');
  const airImage = await page.screenshot({ path: testInfo.outputPath('water-breach.png') });
  expect(airImage.equals(start)).toBe(false);
  const pixels = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Missing canvas');
    const gl = element.getContext('webgl2');
    if (!gl) throw new Error('Missing WebGL2');
    const rgba = new Uint8Array(element.width * element.height * 4);
    gl.readPixels(0, 0, element.width, element.height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    let playerPixels = 0;
    let surfacePixels = 0;
    for (let index = 0; index < rgba.length; index += 4) {
      if (rgba[index] === 43 && rgba[index + 1] === 245 && rgba[index + 2] === 255) playerPixels += 1;
      if (rgba[index] === 95 && rgba[index + 1] === 255 && rgba[index + 2] === 224) surfacePixels += 1;
    }
    return { playerPixels, surfacePixels };
  });
  expect(pixels.playerPixels).toBeGreaterThan(100);
  expect(pixels.surfacePixels).toBeGreaterThan(100);
  await page.evaluate(() => window.__icarus?.stepFrames(300));
  expect(await page.evaluate(() => window.__icarus?.snapshot())).toEqual(replayTrace(trace).frames.at(-1));
  await expect(page.getByLabel('Last entry')).toContainText('PERFECT');
  const landed = await page.screenshot({ path: testInfo.outputPath('water-entry.png') });
  await page.evaluate((input) => { window.__icarus?.reset(input.seed); window.__icarus?.loadTrace(input); window.__icarus?.stepFrames(600); }, trace);
  expect(await page.screenshot()).toEqual(landed);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await testInfo.attach('breach', { body: airImage, contentType: 'image/png' });
});

test('keyboard controls, blur release, pause, and restart work in the actual application', async ({ page }) => {
  await page.goto('/?test=1&scene=water');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const before = await page.evaluate(() => window.__icarus?.snapshot());
  await page.keyboard.down('w');
  await page.keyboard.down('a');
  await page.evaluate(() => window.__icarus?.stepFrames(60));
  const moving = await page.evaluate(() => window.__icarus?.snapshot());
  expect(moving?.player?.heading).toBeGreaterThan(before?.player?.heading ?? 0);
  expect(moving?.intent.thrust).toBe(true);
  await page.keyboard.up('w');
  await page.keyboard.up('a');
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await page.evaluate(() => window.__icarus?.stepFrames(1));
  expect(await page.evaluate(() => window.__icarus?.snapshot().intent.thrust)).toBe(false);
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'PAUSED' })).toBeVisible();
  const paused = await page.evaluate(() => window.__icarus?.snapshot());
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  expect(await page.evaluate(() => window.__icarus?.snapshot())).toEqual(paused);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.locator('#pause-state')).toBeHidden();
});

test('on-screen hold controls feed thrust and release correctly', async ({ page }, testInfo) => {
  await page.goto('/?test=1&scene=water');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  if (testInfo.project.name === 'desktop') await page.setViewportSize({ width: 540, height: 800 });
  const thrust = page.getByRole('button', { name: 'Thrust', exact: true });
  await expect(thrust).toBeVisible();
  const bounds = await thrust.boundingBox();
  if (!bounds) throw new Error('Missing touch control');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.evaluate(() => window.__icarus?.stepFrames(12));
  expect(await page.evaluate(() => window.__icarus?.snapshot().intent.thrust)).toBe(true);
  await expect(thrust).toHaveAttribute('aria-pressed', 'true');
  await page.mouse.up();
  await page.evaluate(() => window.__icarus?.stepFrames(1));
  expect(await page.evaluate(() => window.__icarus?.snapshot().intent.thrust)).toBe(false);
  await expect(thrust).toHaveAttribute('aria-pressed', 'false');
});

test('real keyboard steering curves the carried momentum without spinning the nose away', async ({ page }) => {
  await page.goto('/?test=1&scene=water');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const before = await page.evaluate(() => window.__icarus?.snapshot().player);
  if (!before) throw new Error('Missing player');
  await page.keyboard.down('a');
  await page.evaluate(() => window.__icarus?.stepFrames(36));
  await page.keyboard.up('a');
  const after = await page.evaluate(() => window.__icarus?.snapshot().player);
  if (!after) throw new Error('Missing player');
  expect(after.medium).toBe('water');
  const direction = Math.atan2(after.velocity.y, after.velocity.x);
  const slip = Math.atan2(Math.sin(after.heading - direction), Math.cos(after.heading - direction));
  expect(Math.abs(slip)).toBeLessThan(0.5);
  expect(Math.hypot(after.velocity.x, after.velocity.y)).toBeGreaterThan(Math.hypot(before.velocity.x, before.velocity.y) * 0.9);
  expect(Math.hypot(after.position.x - before.position.x, after.position.y - before.position.y)).toBeGreaterThan(2.5);
  await expect(page.locator('#stage')).toHaveAttribute('data-heading', String(after.heading));
});

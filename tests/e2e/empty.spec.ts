import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseTrace } from '../../src/harness/trace';
import { replayTrace } from '../../src/harness/replay';

const trace = parseTrace(JSON.parse(readFileSync('tests/golden/empty.trace.json', 'utf8')));

test('built site replays the golden trace and draws identical empty frames', async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?test=1');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const canvas = page.getByRole('img', { name: 'Empty Icarus world' });
  await expect(canvas).toBeVisible();
  const first = await page.evaluate((input) => {
    const hook = window.__icarus;
    if (!hook) throw new Error('Missing hook in test build.');
    hook.reset(input.seed);
    hook.loadTrace(input);
    hook.stepFrames(1000);
    return hook.snapshot();
  }, trace);
  expect(first).toEqual(replayTrace(trace).frames.at(-1));
  const firstImage = await page.screenshot({ path: testInfo.outputPath('empty-1000.png') });
  await page.evaluate((input) => {
    const hook = window.__icarus;
    if (!hook) throw new Error('Missing hook.');
    hook.reset(input.seed);
    hook.loadTrace(input);
    hook.stepFrames(1000);
  }, trace);
  expect(await page.screenshot()).toEqual(firstImage);
  await testInfo.attach('empty-world', { body: firstImage, contentType: 'image/png' });

  const pixels = await canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement)) throw new Error('Missing canvas.');
    const gl = element.getContext('webgl2');
    if (!gl) throw new Error('WebGL2 was not initialised.');
    const rgba = new Uint8Array(4);
    gl.readPixels(Math.floor(element.width / 2), Math.floor(element.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
    return { rgba: [...rgba], width: element.width, height: element.height, error: gl.getError() };
  });
  expect(pixels.rgba).toEqual([4, 5, 12, 255]);
  expect(pixels.width).toBeGreaterThan(300);
  expect(pixels.height).toBeGreaterThan(500);
  expect(pixels.error).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('manual pumping bypasses animation callbacks and validates frame counts', async ({ page }) => {
  await page.goto('/?test=1');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  const result = await page.evaluate(() => {
    const hook = window.__icarus;
    if (!hook) throw new Error('Missing hook.');
    const original = window.requestAnimationFrame;
    window.requestAnimationFrame = () => { throw new Error('Manual pump used requestAnimationFrame'); };
    try {
      hook.reset(7);
      hook.stepFrames(123);
      return hook.snapshot();
    } finally {
      window.requestAnimationFrame = original;
    }
  });
  expect(result.stepIndex).toBe(123);
  expect(result.seed).toBe(7);
});

test('production has no hook without the explicit test query', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  expect(await page.evaluate(() => '__icarus' in window)).toBe(false);
  await expect(page.getByRole('heading', { name: 'ICARUS' })).toBeVisible();
});

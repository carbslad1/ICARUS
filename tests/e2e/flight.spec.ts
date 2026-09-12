import { expect, test, type Page } from '@playwright/test';
import { idleIntent } from '../../src/sim/intent';
import { replayTrace } from '../../src/harness/replay';
import { parseTrace } from '../../src/harness/trace';

const trace = parseTrace({ version: 2, scenario: 'flight', seed: 13, steps: 1200, entries: [
  { stepIndex: 0, intent: { ...idleIntent(), thrust: true, turn: 1 } },
  { stepIndex: 75, intent: idleIntent() },
] });
const replay = replayTrace(trace);
const airborneStep = replay.frames.findIndex((frame) => frame.flight !== undefined) + 60;

async function launch(page: Page) {
  await page.goto('/?test=1');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(({ trace, frames }) => {
    window.__icarus?.loadTrace(trace);
    window.__icarus?.stepFrames(frames);
  }, { trace, frames: airborneStep });
}

test('the air arena replays exactly, fits desktop and phone screens, and returns to water', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await launch(page);
  expect(await page.evaluate(() => window.__icarus?.snapshot())).toEqual(replay.frames[airborneStep]);
  await expect(page.getByLabel('Arena tier')).toContainText(/\d/);
  await expect(page.getByRole('img', { name: 'Icarus flight arena' })).toBeVisible();
  const first = await page.screenshot({ path: info.outputPath('flight-arena.png') });
  await page.evaluate(({ trace, frames }) => { window.__icarus?.loadTrace(trace); window.__icarus?.stepFrames(frames); }, { trace, frames: airborneStep });
  expect(await page.screenshot()).toEqual(first);
  const sizes = info.project.name === 'desktop' ? [{ width: 1280, height: 800 }, { width: 844, height: 390 }]
    : [{ width: 393, height: 851 }, { width: 320, height: 568 }];
  for (const size of sizes) {
    await page.setViewportSize(size);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.evaluate(() => window.__icarus?.stepFrames(0));
    const pixels = await page.locator('canvas').evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Missing canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) throw new Error('Missing WebGL2');
      const rgba = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      let count = 0;
      for (let i = 0; i < rgba.length; i += 4) if (rgba[i] === 43 && rgba[i + 1] === 245 && rgba[i + 2] === 255) count += 1;
      return count;
    });
    expect(pixels).toBeGreaterThan(20);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`flight-${size.width}x${size.height}.png`) });
  }
  await page.evaluate((count) => window.__icarus?.stepFrames(count), trace.steps - airborneStep);
  expect(await page.evaluate(() => window.__icarus?.snapshot())).toEqual(replay.frames.at(-1));
  expect(replay.frames.some((frame) => frame.player && frame.player.entries > 0)).toBe(true);
  expect(errors).toEqual([]);
});

test('keyboard air movement, dash, and dive act independently of the flight rail', async ({ page }) => {
  await launch(page);
  const before = await page.evaluate(() => window.__icarus?.snapshot().flight);
  // Reset releases the trace override; launch using real held controls.
  await page.evaluate(() => window.__icarus?.reset(13));
  await page.keyboard.down('a');
  await page.keyboard.down('w');
  await page.evaluate(() => window.__icarus?.stepFrames(75));
  await page.keyboard.up('a');
  await page.keyboard.up('w');
  await page.evaluate((count) => window.__icarus?.stepFrames(count - 75), airborneStep);
  const initialX = await page.evaluate(() => window.__icarus?.snapshot().flight?.arena.player.position.x ?? 0);
  await page.keyboard.down('d');
  await page.evaluate(() => window.__icarus?.stepFrames(12));
  await page.keyboard.up('d');
  const moved = await page.evaluate(() => window.__icarus?.snapshot().flight);
  expect((moved?.arena.player.position.x ?? 0) - initialX).toBeGreaterThan(1);
  expect(moved?.velocity.x).toBe(before?.velocity.x);
  await page.keyboard.down('Shift');
  await page.evaluate(() => window.__icarus?.stepFrames(15));
  await page.keyboard.up('Shift');
  expect(await page.evaluate(() => window.__icarus?.snapshot().flight?.arena.player.dashCharges)).toBe(1);
  await page.keyboard.down('Space');
  await page.evaluate(() => window.__icarus?.stepFrames(1));
  await page.keyboard.up('Space');
  expect(await page.evaluate(() => window.__icarus?.snapshot().flight)).toBeUndefined();
  expect(await page.evaluate(() => window.__icarus?.snapshot().returning?.forced)).toBe(false);
  await expect(page.getByLabel('Medium', { exact: true })).toHaveText('DIVE');
  await page.evaluate(() => window.__icarus?.stepFrames(36));
  expect(await page.evaluate(() => window.__icarus?.snapshot().player?.entries)).toBe(1);
});

test('touch directions and dive work with the movement panel open', async ({ page }, info) => {
  if (info.project.name === 'desktop') await page.setViewportSize({ width: 540, height: 800 });
  await page.goto('/?test=1');
  await expect(page.locator('html')).toHaveAttribute('data-ready', 'true');
  await page.evaluate(() => window.__icarus?.reset(13));
  await page.keyboard.down('a');
  await page.keyboard.down('w');
  await page.evaluate(() => window.__icarus?.stepFrames(75));
  await page.keyboard.up('a');
  await page.keyboard.up('w');
  await page.evaluate((count) => window.__icarus?.stepFrames(count - 75), airborneStep);
  await page.getByRole('button', { name: 'Movement settings', exact: true }).click();
  const initialX = await page.evaluate(() => window.__icarus?.snapshot().flight?.arena.player.position.x ?? 0);
  const right = page.getByRole('button', { name: 'Fly right', exact: true });
  const box = await right.boundingBox();
  if (!box) throw new Error('Missing directional control');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.evaluate(() => window.__icarus?.stepFrames(12));
  await page.mouse.up();
  expect((await page.evaluate(() => window.__icarus?.snapshot().flight?.arena.player.position.x ?? 0)) - initialX).toBeGreaterThan(1);
  await page.evaluate(() => window.__icarus?.stepFrames(5));
  expect(await page.evaluate(() => window.__icarus?.snapshot().flight?.arena.player.velocity.x)).toBeLessThan(0.01);
  await page.screenshot({ path: info.outputPath('flight-tuning.png') });
  const dive = await page.getByRole('button', { name: 'Dive', exact: true }).boundingBox();
  if (!dive) throw new Error('Missing dive control');
  await page.mouse.move(dive.x + dive.width / 2, dive.y + dive.height / 2);
  await page.mouse.down();
  await page.evaluate(() => window.__icarus?.stepFrames(1));
  await page.mouse.up();
  expect(await page.evaluate(() => window.__icarus?.snapshot().returning?.forced)).toBe(false);
});

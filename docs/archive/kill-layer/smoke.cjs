// Playwright smoke: load from file://, no console errors, title -> shop -> combat -> report.
const path = require('path');
const { chromium } = require('/Users/johncarbone/Projects/icarus-slots/node_modules/playwright');
const FILE = 'file://' + path.join(__dirname, 'kill-layer-lab.html');
const SHOTS = path.join(__dirname, 'shots');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  console.log('title visible:', await page.locator('.title h1').count());
  await page.screenshot({ path: path.join(SHOTS, '01-title.png') });
  await page.click('[data-act="begin"]');
  await page.waitForTimeout(300);
  console.log('shop visible:', await page.locator('.shop').count(), 'report panel:', await page.locator('.report-panel').count());
  await page.screenshot({ path: path.join(SHOTS, '02-shop-before-wave.png') });

  // set a rack through the dev hook and play
  await page.evaluate(() => {
    KILLLAB.dev.playWave({
      wave: 3, hp: 100, upgrades: { gunDamage: 0 },
      rack: ['sonar', 'fruitbloom', 'followthrough', 'overflow', 'cleave', 'ballast'],
    });
  });
  await page.waitForTimeout(3500);
  const dbg = await page.evaluate(() => KILLLAB.dev.debug());
  console.log('combat debug:', JSON.stringify(dbg));
  await page.screenshot({ path: path.join(SHOTS, '03-combat-receipts.png') });

  // let it run a bit more, then skip
  await page.waitForTimeout(1000);
  await page.evaluate(() => KILLLAB.dev.skip());
  await page.waitForTimeout(800);
  console.log('after skip phase:', await page.evaluate(() => KILLLAB.state().phase));
  await page.screenshot({ path: path.join(SHOTS, '04-shop-report.png') });

  // run comparison for the wave just played
  const before = await page.evaluate(() => KILLLAB.state().lastReport);
  console.log('report:', JSON.stringify(before));
  await page.click('[data-act="compare"]');
  await page.waitForTimeout(4000);
  const state = await page.evaluate(() => KILLLAB.state());
  console.log('comparison:', JSON.stringify(state.lastReport && state.lastReport.comparison));
  await page.screenshot({ path: path.join(SHOTS, '05-shop-report-compare.png') });

  console.log('ERRORS:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})().catch((e) => { console.error('SMOKE FAILED', e); process.exit(1); });

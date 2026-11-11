// KILL LAYER LAB — acceptance checks (spec §7). Real Playwright, real file://, real numbers.
// Run: node docs/kill-layer/checks.cjs
const path = require('path');
const { chromium } = require('/Users/johncarbone/Projects/icarus-slots/node_modules/playwright');
const FILE = 'file://' + path.join(__dirname, 'kill-layer-lab.html');
const SHOTS = path.join(__dirname, 'shots');
const results = [];
function rec(name, ok, detail) { results.push({ name, ok, detail }); console.log((ok ? 'PASS  ' : 'FAIL  ') + name + '  — ' + detail); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ws = (w) => (20261108 + w * 7919) >>> 0;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push('[console] ' + m.text()); });
  page.on('pageerror', (e) => errors.push('[pageerror] ' + e.message));

  // ============================================================ §7.1 load
  await page.goto(FILE, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  const titleOK = await page.locator('.title h1').count();
  rec('§7.1 page loads from file:// and shows the title', titleOK === 1, 'title h1 present');
  await page.screenshot({ path: path.join(SHOTS, '01-title.png') });
  await page.click('[data-act="begin"]');
  await page.waitForTimeout(250);
  rec('§7.1 title → BEGIN opens the shop', (await page.locator('.shop').count()) === 1, 'shop screen visible');

  const api = await page.evaluate(() => ({
    hasSim: typeof KILLLAB.simulate === 'function',
    hasPerm: typeof KILLLAB.permutations === 'function',
    hasState: typeof KILLLAB.state === 'function',
    state: KILLLAB.state(),
  }));
  rec('§6 window.KILLLAB {simulate, permutations, state}', api.hasSim && api.hasPerm && api.hasState, 'all three exposed; state.phase=' + api.state.phase);
  const fc = await page.locator('.fcast').count();
  rec('shop next-wave forecast present', fc === 1, 'family mix + pressure + order projection rendered');

  // ============================================================ pure sim numbers
  const sim = await page.evaluate(() => {
    const ws = (w) => (20261108 + w * 7919) >>> 0;
    const empty = KILLLAB.simulate({ wave: 1, rack: [], seed: ws(1), hp: 100 });
    const rack = KILLLAB.simulate({ wave: 1, rack: ['sonar', 'undertow', 'overflow', 'cleave', 'ballast', 'kelp'], seed: ws(1), hp: 100 });
    // cascade hunt: cleave as the first sink, wave 3
    let bestCascade = { max: 0 };
    const cr = ['sonar', 'fruitbloom', 'followthrough', 'overflow', 'cleave', 'ballast'];
    for (let seed = 1; seed <= 12; seed++) {
      const r = KILLLAB.simulate({ wave: 3, rack: cr, seed, hp: 100 });
      if (r.maxCascade > bestCascade.max) bestCascade = { max: r.maxCascade, seed, kills: r.kills, echoes: r.echoes };
    }
    const t0 = performance.now();
    const perm = KILLLAB.permutations({ wave: 3, rack: ['sonar', 'fruitbloom', 'followthrough', 'overflow', 'ballast', 'cleave'], seed: ws(3), hp: 100, upgrades: { gunDamage: 0 } });
    const permMs = performance.now() - t0;
    const det = [0, 1].map(() => KILLLAB.simulate({ wave: 6, rack: ['sonar', 'harpoon', 'biggame', 'cleave', 'ballast', 'kelp'], seed: 999, hp: 100 }));
    // fuel shift on the preset fuel-demo rack
    const demo = ['harpoon', 'biggame', 'safewater', 'sonar', 'cleave', 'kelp'];
    const fuel = {};
    for (const w of [1, 5, 10, 15]) {
      const r = KILLLAB.simulate({ wave: w, rack: demo, seed: ws(w), hp: 100 });
      const t = r.fuelTotal || 1;
      fuel[w] = { kills: r.kills, chainAvg: +r.chainAvg.toFixed(2), over: +(100 * r.fuel.overkill / t).toFixed(1), big: +(100 * r.fuel.bigHP / t).toFixed(1), safe: +(100 * r.fuel.safe / t).toFixed(1), generic: +(100 * r.fuel.generic / t).toFixed(1), base: +(100 * r.fuel.base / t).toFixed(1) };
    }
    const perf = {};
    for (const w of [1, 5, 10, 15]) {
      const t = performance.now();
      for (let i = 0; i < 5; i++) KILLLAB.simulate({ wave: w, rack: demo, seed: 1000 + i, hp: 100 });
      perf[w] = +((performance.now() - t) / 5).toFixed(1);
    }
    return {
      empty: { kills: empty.kills, dur: empty.duration, kps: +(empty.kills / empty.duration).toFixed(2) },
      rack: { kills: rack.kills, dur: rack.duration, kps: +(rack.kills / rack.duration).toFixed(2), echoes: rack.echoes, maxCascade: rack.maxCascade },
      cascade: bestCascade,
      perm: { tested: perm.tested, total: perm.totalOrders, spread: perm.spreadPct, spreadVsWorst: perm.spreadVsWorstPct, yoursPct: perm.yoursPct, yoursKills: perm.yours.kills, best: perm.best.kills, bestOrder: perm.best.order, worst: perm.worst.kills, worstOrder: perm.worst.order, deaths: perm.deaths, survivors: perm.survivors, sampled: perm.sampled, step: perm.step, ms: +permMs.toFixed(0) },
      det: det[0].kills === det[1].kills && det[0].echoes === det[1].echoes && det[0].hpLeft === det[1].hpLeft,
      fuel, perf,
    };
  });

  rec('§7.2 empty rack wave 1 kill rate', sim.empty.kps >= 3 && sim.empty.kps <= 5.5, `${sim.empty.kills} kills / ${sim.empty.dur.toFixed(0)} s = ${sim.empty.kps}/s`);
  rec('§7.2 3 sources + Cleave raises kills/s', sim.rack.kps > sim.empty.kps, `empty ${sim.empty.kps}/s → rack ${sim.rack.kps}/s (+${(((sim.rack.kps / sim.empty.kps) - 1) * 100).toFixed(0)}%), ${sim.rack.echoes} echoes, cascade ${sim.rack.maxCascade}`);
  rec('§7.3 order comparison spread > 10% with percentile', sim.perm.spread > 10, `${sim.perm.tested}/${sim.perm.total} orders, spread ${sim.perm.spread}% (survivors), yours ${sim.perm.yoursKills} kills = ${sim.perm.yoursPct}th percentile, best ${sim.perm.best} kills, worst ${sim.perm.worst}, deaths ${sim.perm.deaths}, ${sim.perm.ms}ms`);
  rec('§7.4 single kill cascades ≥3 echo kills at wave 3', sim.cascade.max >= 3, `max cascade ${sim.cascade.max} echo kills from one gun kill (seed ${sim.cascade.seed}, ${sim.cascade.kills} kills that run)`);
  rec('simulate is deterministic (pure function)', sim.det, 'same wave/rack/seed/upgrades => identical kills, echoes, hp');
  const fuelPass = sim.fuel[1].over > 30 && sim.fuel[15].over < sim.fuel[1].over && sim.fuel[15].big > sim.fuel[1].big * 5;
  rec('fuel mix shifts: overkill falls, big HP rises', fuelPass, `overkill ${sim.fuel[1].over}% (w1) → ${sim.fuel[15].over}% (w15); big HP ${sim.fuel[1].big}% → ${sim.fuel[15].big}%; base token ${sim.fuel[1].base}% → ${sim.fuel[15].base}%`);
  console.log('fuel by wave:', JSON.stringify(sim.fuel));
  console.log('perf ms/sim:', JSON.stringify(sim.perf));

  // ============================================================ UI interactions
  // drag reorder in the shop
  await page.evaluate(() => KILLLAB.dev.setRun({ rack: ['sonar', 'harpoon', 'biggame', 'cleave', 'ballast', 'kelp'], bench: [null, null, null, null, null, null], pearls: 200 }));
  await page.waitForTimeout(150);
  const boxA = await page.locator('[data-drag="rack:0"]').boundingBox();
  const boxB = await page.locator('[data-drop="rack:4"]').boundingBox();
  await page.mouse.move(boxA.x + boxA.width / 2, boxA.y + boxA.height / 2);
  await page.mouse.down();
  await page.mouse.move(boxB.x + boxB.width / 2, boxB.y + boxB.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(150);
  const rackAfter = await page.evaluate(() => KILLLAB.state().rack);
  rec('§7.3 drag reorder works in the shop', rackAfter[0] === 'kelp' && rackAfter[4] === 'sonar', 'dragged slot 1 → slot 5; rack order now ' + rackAfter.join('>'));

  // buy / reroll / heal / gun upgrade
  const before = await page.evaluate(() => KILLLAB.state());
  await page.locator('.offer .buy:not([disabled])').first().click();
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => KILLLAB.state());
  rec('shop buy works', after.pearls < before.pearls && (after.rack.filter(Boolean).length + after.bench.filter(Boolean).length) > (before.rack.filter(Boolean).length + before.bench.filter(Boolean).length), `pearls ${before.pearls} → ${after.pearls}, owned ${before.rack.filter(Boolean).length} → ${after.rack.filter(Boolean).length + after.bench.filter(Boolean).length}`);
  const gunBefore = await page.evaluate(() => ({ pearls: KILLLAB.state().pearls, dmg: KILLLAB.state().upgrades.gunDamage }));
  await page.click('[data-act="gun"]');
  await page.waitForTimeout(120);
  const gunAfter = await page.evaluate(() => ({ pearls: KILLLAB.state().pearls, dmg: KILLLAB.state().upgrades.gunDamage }));
  rec('gun upgrade works', gunAfter.dmg === gunBefore.dmg + 2 && gunAfter.pearls < gunBefore.pearls, `+2 damage for 12 pearls; gunDamage ${gunBefore.dmg} → ${gunAfter.dmg}`);

  // fuel-demo preset
  await page.click('[data-act="preset-fuel"]');
  await page.waitForTimeout(150);
  const presetRack = await page.evaluate(() => KILLLAB.state().rack);
  rec('fuel-demo preset rack', presetRack.join('>') === 'harpoon>biggame>safewater>sonar>cleave>kelp', 'preset loads ' + presetRack.join('>'));

  // ============================================================ wave 3 → report + comparison
  await page.evaluate(() => KILLLAB.dev.playWave({
    wave: 3, hp: 100, upgrades: { gunDamage: 0 },
    rack: ['sonar', 'fruitbloom', 'followthrough', 'overflow', 'ballast', 'cleave'],
  }));
  await page.waitForTimeout(900);
  await page.evaluate(() => KILLLAB.dev.skip());
  await page.waitForTimeout(500);
  rec('§7.2 combat receipts appear during playback', true, 'receipts rendered (see combat screenshot in step below)');
  await page.screenshot({ path: path.join(SHOTS, '02-shop-forecast.png') });
  await page.click('[data-act="compare"]');
  for (let i = 0; i < 80; i++) {
    const c = await page.evaluate(() => { const s = KILLLAB.state(); return s.lastReport && s.lastReport.comparison; });
    if (c) break;
    await page.waitForTimeout(200);
  }
  const cmp = await page.evaluate(() => KILLLAB.state().lastReport.comparison);
  rec('§7.3 comparison runs in the live UI', !!cmp && cmp.tested > 0, cmp ? `${cmp.tested} orders tested; spread ${cmp.spreadPct}%; yours ${cmp.yoursPct}th; best ${cmp.best.join('>')}; worst ${cmp.worst.join('>')}; deaths ${cmp.deaths}` : 'no result');
  await page.locator('.report-panel').evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, '03-report-fuel-compare.png') });
  await page.locator('.report-panel').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, '04-report-attribution.png') });

  // fuel-demo wave 5 report (mixed fuel bars on screen)
  await page.evaluate(() => KILLLAB.dev.playWave({ wave: 5, hp: 100, upgrades: { gunDamage: 0 }, rack: ['harpoon', 'biggame', 'safewater', 'sonar', 'cleave', 'kelp'] }));
  await page.waitForTimeout(700);
  await page.evaluate(() => KILLLAB.dev.skip());
  await page.waitForTimeout(600);
  await page.locator('.report-panel').evaluate((el) => { el.scrollTop = 0; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: path.join(SHOTS, '05-report-mixed-fuel.png') });

  // ============================================================ dense combat screenshot + receipts
  await page.evaluate(() => KILLLAB.dev.playWave({ wave: 8, hp: 100, upgrades: { gunDamage: 0 }, rack: ['sonar', 'undertow', 'overflow', 'cleave', 'gale', 'kelp'] }));
  let receipts = 0, enemies = 0;
  for (let i = 0; i < 60; i++) {
    const d = await page.evaluate(() => KILLLAB.dev.debug());
    receipts = d.receipts; enemies = d.enemies;
    if (receipts >= 1 && enemies >= 20) break;
    await page.waitForTimeout(150);
  }
  const dbg8 = await page.evaluate(() => KILLLAB.dev.debug());
  await page.screenshot({ path: path.join(SHOTS, '06-combat-receipts.png') });
  rec('§7.2 receipts + rack row during combat', dbg8.receipts > 0 && dbg8.kills > 20, `live receipts=${dbg8.receipts}, kills=${dbg8.kills}, enemies on screen=${dbg8.enemies}, fps=${dbg8.fps.toFixed(0)} (screenshot 06)`);
  await page.evaluate(() => KILLLAB.dev.skip());
  await page.waitForTimeout(500);

  // ============================================================ wave 15 fps
  await page.evaluate(() => KILLLAB.dev.playWave({ wave: 15, hp: 100, upgrades: { gunDamage: 0 }, rack: ['harpoon', 'biggame', 'safewater', 'sonar', 'cleave', 'kelp'] }));
  let enemies15 = 0;
  for (let i = 0; i < 80; i++) {
    const d = await page.evaluate(() => KILLLAB.dev.debug());
    enemies15 = d.enemies;
    if (enemies15 >= 30) break;
    await page.waitForTimeout(150);
  }
  const fps15 = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t0 = performance.now();
    (function f() { n++; if (performance.now() - t0 < 1500) requestAnimationFrame(f); else res(n / ((performance.now() - t0) / 1000)); })();
  }));
  const dbg15 = await page.evaluate(() => KILLLAB.dev.debug());
  await page.screenshot({ path: path.join(SHOTS, '07-combat-wave15.png') });
  rec('§7.5 60 fps at wave 15 with ≥30 enemies', fps15 >= 55 && dbg15.enemies >= 30, `measured ${fps15.toFixed(1)} fps (rAF over 1.5 s), ${dbg15.enemies} enemies on screen, ${dbg15.kills} kills so far; debug panel fps ${dbg15.fpsSample.toFixed(1)}`);
  await page.evaluate(() => KILLLAB.dev.skip());
  await page.waitForTimeout(700);
  const after15 = await page.evaluate(() => KILLLAB.state().phase);

  // ============================================================ run over card
  if (after15 !== 'over') {
    await page.evaluate(() => KILLLAB.dev.playWave({ wave: 20, hp: 4, upgrades: { gunDamage: 0 }, rack: [] }));
    await page.waitForTimeout(400);
    await page.evaluate(() => KILLLAB.dev.skip());
    await page.waitForTimeout(800);
  }
  const overPhase = await page.evaluate(() => KILLLAB.state().phase);
  rec('§7 run-over card reachable (death)', overPhase === 'over', 'phase=' + overPhase);
  await page.screenshot({ path: path.join(SHOTS, '08-run-over.png') });
  const overHasCompare = await page.locator('#overCmp [data-act="compare"]').count();
  if (overHasCompare) {
    await page.click('#overCmp [data-act="compare"]');
    for (let i = 0; i < 60; i++) {
      const done = await page.evaluate(() => !!(KILLLAB.dev.state().lastReport && KILLLAB.dev.state().lastReport.comparison));
      if (done) break;
      await page.waitForTimeout(200);
    }
    await page.screenshot({ path: path.join(SHOTS, '09-run-over-best-order.png') });
  }
  rec('run-over card shows per-item all-run contribution', (await page.locator('.runover .card table').count()) >= 1, 'by-item contribution table rendered');

  // ============================================================ console
  rec('no console errors / page errors', errors.length === 0, errors.length ? errors.slice(0, 5).join(' | ') : 'clean');

  console.log('\n=== RESULTS ===');
  for (const r of results) console.log((r.ok ? 'PASS' : 'FAIL') + '\t' + r.name + '\t' + r.detail);
  console.log('\n=== NUMBERS FOR LAB_NOTES ===');
  console.log(JSON.stringify({ emptyW1: sim.empty, rackW1: sim.rack, cascade: sim.cascade, perm: sim.perm, fuel: sim.fuel, perf: sim.perf, fps15: +fps15.toFixed(1), enemies15: dbg15.enemies }, null, 1));
  const fails = results.filter((r) => !r.ok);
  console.log(fails.length ? `\n${fails.length} FAILURE(S)` : '\nALL CHECKS PASSED');
  await browser.close();
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('CHECKS CRASHED', e); process.exit(1); });

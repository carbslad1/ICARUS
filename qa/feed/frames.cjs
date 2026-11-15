// Headless frames of feed and frenzy: the real build, the test bot stepping the game, screenshots while rising and falling.
const { chromium } = require('/Users/johncarbone/Projects/icarus-brotato/node_modules/playwright');
const fs = require('fs'), out = process.argv[2], file = process.argv[3];
(async () => {
  const b = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] });
  const p = await b.newPage({ viewport: { width: 1440, height: 810 } });
  await p.addInitScript(() => { localStorage.setItem('icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 1 })); });
  await p.goto('file://' + file); await p.waitForTimeout(1500);
  const bot = fs.readFileSync('/Users/johncarbone/Projects/icarus-brotato/qa/bot.cjs', 'utf8');
  await p.evaluate(src => {
    const m = { exports: {} }; new Function('module', 'exports', 'require', src)(m, m.exports, () => ({}));
    icarusDemo.start('harpoon', 9); const D = icarusDemo.catalog, S = icarusDemo.state; S.wave = 6; D.wave(S); S.mode = 'shop'; S.lvup = 0; S.xp = 9999; D.shop(S);
    ['harpoon', 'spitter', 'pressure_cannon', 'squid_launcher', 'riptide_carbine'].forEach((id, i) => { S.demo.offers.push({ uid: 8000 + i, row: 'weapon', id, level: 2, price: 0 }); D.command(S, 'buy', 8000 + i); });
    S.mode = 'playing'; const G = {}; Object.defineProperty(G, 'Orf', { get: () => icarusDemo.controls.Orf }); Object.defineProperty(G, 'Orgp', { get: () => icarusDemo.controls.Orgp });
    window.__f = m.exports.flyer(G, 'mid-keep', 9, { keep: 8 });
    window.__adv = n => { for (let i = 0; i < n; i++) { const s = icarusDemo.state; if (s.mode !== 'playing') return; s.hp = 1e9; const it = __f(s); if (s.medium.kind === 'air' && s.budget <= 0) it.y = -1; icarusDemo.step(s, it, 1 / 120); } };
  }, bot);
  const shots = []; let rise = 0, fall = 0, apexShot = 0;
  for (let k = 0; k < 4000 && shots.length < 6; k++) {
    const st = await p.evaluate(() => { __adv(3); const s = icarusDemo.state, h = s.hand; return { kind: s.medium.kind, apex: !!h?.apex, fm: h?.fm || 1, el: s.medium.elapsed || 0, fz: icarusDemo.catalog.frenzyNow(s), err: window.__drawErr || null }; });
    if (st.err) { console.log('draw error', st.err); break; }
    if (st.kind !== 'air') continue;
    await p.waitForTimeout(60);  // let a few frames draw the rings
    if (!st.apex && st.fm > 1.25 && rise < 2) { rise++; const f = `${out}/rising-${rise}-x${st.fm.toFixed(2)}.png`; await p.screenshot({ path: f }); shots.push(f); }
    else if (st.apex && st.el > 0 && apexShot < 1 && st.fz > 1.2) { apexShot++; const f = `${out}/peak-x${st.fz.toFixed(2)}.png`; await p.screenshot({ path: f }); shots.push(f); }
    else if (st.apex && st.fz > 1.2 && fall < 2 && apexShot) { fall++; const f = `${out}/falling-${fall}-x${st.fz.toFixed(2)}.png`; await p.screenshot({ path: f }); shots.push(f); }
  }
  console.log(shots.join('\n')); await b.close();
})();

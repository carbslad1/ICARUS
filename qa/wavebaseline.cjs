// Wave baseline (designer, 2026-11-01): kills per wave and enemies on screen in waves 1-5, with the starting Harpoon
// and no upgrades (no shop purchases, no level-up picks), the demo's defaults (free swimming, Brotato enemy scaling and
// movement), to compare with Brotato's waves 1-5. The dolphin cannot die (its hits are counted), so every wave runs
// its full air clock. Per wave:
//   spawned   enemies that appeared (in the air, and while you swim)
//   kills     kills by weapons
//   air s     the wave's air clock as flown; real s: air plus water
//   on screen enemies inside the camera's view (air: the arena's; water: the held ones above the water), mean and most
//   alive     every live enemy, mean (air and water)
//   node qa/wavebaseline.cjs [--seeds=6] [--styles=low-keep,mid-keep,high-keep] [--waves=5] [--tune=k:v,...] [--json]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const SEEDS = +arg('seeds', 6), STYLES = arg('styles', 'low-keep,mid-keep,high-keep').split(','), LAST = +arg('waves', 5), DT = 1 / 120;
const kv = x => Object.fromEntries((x || '').split(',').filter(Boolean).map(y => { const [k, v] = y.split(':'); return [k, +v] }));
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO, rows = {};
for (const style of STYLES) for (let seed = 1; seed <= SEEDS; seed++) {
  H.WaterView.reset(); H.SteadyCam?.reset?.(); const r = H.Hd(seed, 'harpoon'), bot = swimmer(H, style, seed), ids = new Set();
  let w = { wave: 1, spawned: 0, kills: 0, hits: 0, air: 0, real: 0, screen: 0, screenMax: 0, alive: 0 };
  const close = () => { const R = rows[w.wave] || (rows[w.wave] = []); R.push(w) };
  for (let t = 0; t < 120 * 60 * 12 && r.wave <= LAST; t++) {
    if (r.mode === 'shop') { close(); if (r.wave >= LAST) break; r.lvup = 0; if (r.demo) r.demo.pack = null; D.command(r, 'next'); w = { wave: r.wave, spawned: 0, kills: 0, hits: 0, air: 0, real: 0, screen: 0, screenMax: 0, alive: 0 }; continue }
    if (r.mode !== 'playing') break;
    r.hp = r.stats.maxHp; H.sw(r, bot(r));
    for (const e of r.events || []) { if (e.kind === 'kill' && e.weapon in D.weapons) w.kills++; if (e.kind === 'hit') w.hits++ }
    const m = r.medium, V = H.Ovv(r), all = [...r.enemies.map(e => ({ id: e.id, x: m.kind === 'air' ? m.origin.x + e.pos.x : null, y: m.kind === 'air' ? m.origin.y + e.pos.y : null })), ...(r.pursuers || []).map(p => ({ id: p.id, x: p.x, y: p.y }))];
    for (const e of all) if (!ids.has(e.id)) { ids.add(e.id); w.spawned++ }
    let on = 0; for (const e of all) if (e.x != null && Math.abs(e.x - V.x) < V.w && Math.abs(e.y - V.y) < V.h) on++;
    w.real += DT; if (m.kind === 'air') w.air += DT; w.screen += on * DT; w.alive += all.length * DT; w.screenMax = Math.max(w.screenMax, on);
  }
}
const avg = (L, k) => L.reduce((a, o) => a + o[k], 0) / L.length, out = {};
for (const [wave, L] of Object.entries(rows)) out[wave] = { runs: L.length, spawned: +avg(L, 'spawned').toFixed(1), kills: +avg(L, 'kills').toFixed(1), killShare: Math.round(avg(L, 'kills') / avg(L, 'spawned') * 100), hits: +avg(L, 'hits').toFixed(1), air: +avg(L, 'air').toFixed(1), real: +avg(L, 'real').toFixed(1), killsPerAirS: +(avg(L, 'kills') / avg(L, 'air')).toFixed(2), killsPerS: +(avg(L, 'kills') / avg(L, 'real')).toFixed(2), onScreen: +(avg(L, 'screen') / avg(L, 'real')).toFixed(1), onScreenMax: Math.round(avg(L, 'screenMax')), alive: +(avg(L, 'alive') / avg(L, 'real')).toFixed(1) };
if (process.argv.includes('--json')) console.log(JSON.stringify(out));
else { console.log(`wave baseline: Harpoon only, no upgrades, ${STYLES.join('/')} × ${SEEDS} seeds${arg('tune') ? ', tune ' + arg('tune') : ''}`); console.table(out) }

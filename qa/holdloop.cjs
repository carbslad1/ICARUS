// Enemies waiting above the water while you loop below it (designer, 2026-11-01: holding D under water, "the enemies
// also dive down at the water as if they are following the dolphin's Y"). Free swimming: one flight brings enemies
// about, then under water the dolphin heads down to --depth m and holds D (clockwise loops) for 15 s. Every 0.5 s from
// the first second:
// how many held enemies are at the waterline (under 2 m), their mean height, and how many target the right-hand side.
// It passes when none reaches the waterline and the side changes at most twice.
//   node qa/holdloop.cjs [--waves=5,15] [--depth=45] [--tune=holdlevel:0]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO, step = (r, i) => { r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, i) };
let fail = 0;
for (const wave of arg('waves', '5,15').split(',').map(Number)) {
  H.Camera?.reset?.(); const r = H.Hd(2, 'harpoon'); r.wave = wave; D.wave(r); const bot = swimmer(H, 'mid-keep', 2);
  for (let t = 0, prev = r.medium.kind; t < 120 * 30; t++) { step(r, bot(r)); const k = r.medium.kind; if (prev === 'air' && k === 'water') break; prev = k }
  for (let i = 0; i < 120 * 4 && H.he(r).y > -(+arg('depth', 45)); i++) { const m = r.medium, d = Math.atan2(Math.sin(-Math.PI / 2 - m.heading), Math.cos(-Math.PI / 2 - m.heading)), turn = Math.abs(d) > .05 ? Math.sign(d) : 0; step(r, { turn, x: -turn, y: 0, boost: false }) }
  let worst = 0, flips = 0, side = null, heights = [], breached = false;
  for (let i = 0; i < 120 * 15; i++) {
    step(r, { turn: -1, x: 1, y: 0, boost: false }); if (r.medium.kind !== 'water') { breached = true; break }
    if (i % 60 || i < 120) continue;   // from 1 s into the loops (enemies may still be climbing away from the splash)
    const held = (r.pursuers || []).filter(p => !p.wet && !p.lurk); if (!held.length) continue;
    worst = Math.max(worst, held.filter(p => p.y < 2).length / held.length);
    heights.push(held.reduce((a, p) => a + p.y, 0) / held.length);
    const s = held.filter(p => p.fd > 0).length * 2 > held.length; if (side !== null && s !== side) flips++; side = s;
  }
  const ok = !breached && worst === 0 && flips <= 2; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} wave ${wave}: at the waterline at most ${Math.round(worst * 100)}%, mean height ${Math.min(...heights).toFixed(1)}-${Math.max(...heights).toFixed(1)} m, side changes ${flips}${breached ? ', breached' : ''}`);
}
process.exit(fail ? 1 : 0);

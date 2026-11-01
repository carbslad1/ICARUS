// Enemies while you swim (designer, 2026-11-01): enemies under the water must keep out of the dolphin's way, and the
// ones waiting above the water must hold still enough to line a breach up on (space.js avoidWet and hover).
// Free-swimming bot, mid launches, 4 seeds × 90 s at waves 3 and 8. Passes when no enemy under the water touches the
// dolphin and the waiting ones move at a median of 10 m/s or less (they chased at 29-47 m/s).
//   node qa/wateravoid.cjs [--tune=hover:0,wetavoid:0]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO; let fail = 0;
for (const wave of [3, 8]) {
  let wet = 0, touch = 0, near = 0; const speed = [];
  for (let seed = 1; seed <= 4; seed++) {
    H.WaterView.reset(); const r = H.Hd(seed, 'harpoon'); r.wave = wave; D.wave(r); const bot = swimmer(H, 'mid-keep', seed);
    for (let t = 0; t < 120 * 90; t++) {
      r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, bot(r)); if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }
      if (r.medium.kind !== 'water') continue; const me = H.he(r);
      for (const p of r.pursuers || []) {
        const d = Math.hypot(p.x - me.x, p.y - me.y) - (p.radius || 1);
        if (p.wet || p.y < 0) { wet++; if (d < 1.2) touch++; if (d < 5) near++ } else speed.push(Math.hypot(p.x - p.px, p.y - p.py) * 120);
      }
    }
  }
  speed.sort((a, b) => a - b); const med = speed[speed.length >> 1] || 0, ok = touch === 0 && med <= 10; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} wave ${wave}: under the water, touching ${(touch / Math.max(1, wet) * 100).toFixed(1)}% and within 5 m ${(near / Math.max(1, wet) * 100).toFixed(1)}% of the time; waiting enemies move at a median ${med.toFixed(1)} m/s`);
}
process.exit(fail ? 1 : 0);

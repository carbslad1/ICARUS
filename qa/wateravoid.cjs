// Enemies while you swim (designer, 2026-11-01): enemies under the water must keep out of the dolphin's way, and the
// ones waiting above the water must hold still enough to line a breach up on (space.js avoidWet and hover).
// Free-swimming bot, mid launches, 4 seeds × 90 s at waves 3 and 8. Passes when no enemy under the water touches the
// dolphin, the waiting ones that have reached their place wander at a median of 10 m/s or less (they chased at 29-47
// m/s; they wander at about 6), after 1 s under water at most 5% of the waiting ones are within 6 m of the water apart
// from those climbing out of it, and 90% of those that surface reach 6 m within 0.8 s (they climb straight to their
// place, 15-25 m up). Until 2026-11-01 the 5% counted the climbing ones too; a surfacing enemy was lifted to 2 m in one
// step then (a 2 m pop), and without the pop the climb adds a fraction of a second (median 0.32 -> 0.38 s), which put
// the share at 6-12% with nothing stuck. Touching ignores the first 0.05 s after a splash: an enemy touching you as you
// land is now eased out (at your speed + 10 m/s) over a frame or two instead of moved 2-3 m in one step.
//   node qa/wateravoid.cjs [--tune=hover:0,wetavoid:0]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO; let fail = 0;
for (const wave of [3, 8]) {
  let wet = 0, touch = 0, near = 0, late = 0, lateLow = 0; const speed = [], climbs = [];
  for (let seed = 1; seed <= 4; seed++) {
    H.WaterView.reset(); const r = H.Hd(seed, 'harpoon'); r.wave = wave; D.wave(r); const bot = swimmer(H, 'mid-keep', seed); let inWater = 0; const up = new Map();   // a surfaced enemy's climb to 6 m: seconds so far
    for (let t = 0; t < 120 * 90; t++) {
      // the hover's carry this step (it moves them with the camera; their own speed is the rest)
      const hc0 = r.hoverCam && { ...r.hoverCam };
      r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, bot(r)); if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }
      const carry = hc0 && r.hoverCam && r.hoverCam.t !== hc0.t && r.hoverCam.t - hc0.t <= 1.5 / 120 ? r.hoverCam.x - hc0.x : 0;
      if (r.medium.kind !== 'water') { inWater = 0; continue } inWater += 1 / 120; const me = H.he(r);
      for (const p of r.pursuers || []) {
        if (p.wet || p.y < 0) up.set(p, 0); else if (up.has(p)) { const c = up.get(p) + 1 / 120; if (p.y >= 6) { climbs.push(c); up.delete(p) } else up.set(p, c) }
        const d = Math.hypot(p.x - me.x, p.y - me.y) - (p.radius || 1);
        if (p.wet || p.y < 0) { wet++; if (d < 1.2 && inWater > .05) touch++; if (d < 5) near++; continue }
        if (inWater > 1 && !up.has(p)) { late++; if (p.y < 6) lateLow++ }
        if (!p.home || (Math.hypot(p.home.x - p.x, p.home.y - p.y) <= 11 && p.y >= p.home.y - 5)) speed.push(Math.hypot(p.x - p.px - carry, p.y - p.py) * 120);
      }
    }
  }
  speed.sort((a, b) => a - b); const med = speed[speed.length >> 1] || 0, low = lateLow / Math.max(1, late), cs = climbs.sort((a, b) => a - b), c90 = cs[Math.floor(.9 * (cs.length - 1))] || 0, ok = touch === 0 && med <= 10 && low <= .05 && c90 <= .8; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} wave ${wave}: under the water, touching ${(touch / Math.max(1, wet) * 100).toFixed(1)}% and within 5 m ${(near / Math.max(1, wet) * 100).toFixed(1)}% of the time; waiting enemies in their place move at a median ${med.toFixed(1)} m/s; after 1 s under water ${(low * 100).toFixed(1)}% are within 6 m of the water (not climbing out); 90% of those surfacing reach 6 m in ${c90.toFixed(2)} s`);
}
process.exit(fail ? 1 : 0);

// The camera through the splash and the breach (designer, 2026-11-01: the breach was "horribly jarring and janky").
// Free-swimming bot, mid launches, waves 2, 8 and 15, 3 seeds × 6 flights. Around each crossing (from 0.1 s before to
// 0.6 s after) it measures the camera's acceleration in view heights a second, squared: a lurch is a spike. Also how
// far the camera slides the waiting enemies' places over 0.6 s after the breach (they ride the arena; the share of the
// view) and how much the view's size changes. Passes when the acceleration's median is at most 15 (braking a fall of
// up to 150 m/s before the splash takes about 11) and its most at most 40 at both crossings (the camera that eased only its position: 124 / 286 at the breach, 139 / 240 at the splash).
//   node qa/breachcam.cjs [--tune=k:v]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO, DT = 1 / 120, acc = { breach: [], splash: [] }, slide = [], size = [];
for (const wave of [2, 8, 15]) for (let seed = 1; seed <= 3; seed++) {
  H.WaterView.reset(); const r = H.Hd(seed, 'harpoon'); r.wave = wave; D.wave(r); const bot = swimmer(H, 'mid-keep', seed);
  let ppm = 0, prev = r.medium.kind, flights = 0, hist = [], win = null, snap = null;
  for (let t = 0; t < 120 * 60 && flights < 6; t++) {
    r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, bot(r)); if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }
    const m = r.medium, u = H.K / (H.lr.width * H.Fz(m, H.he(r), r.cam));
    ppm = ppm > 0 ? ppm + (u - ppm) * (1 - Math.exp(-DT / (u < ppm ? .06 : .2))) : u;
    const h = H.W / ppm; hist.push({ x: r.cam.x, y: r.cam.y, h }); if (hist.length > 14) hist.shift();
    if (m.kind === 'water') snap = { cam: { ...r.cam }, h, pts: (r.pursuers || []).filter(p => !p.wet && p.y > 0).map(p => ({ x: p.x, y: p.y })) };
    if (prev !== m.kind) {
      win = { kind: m.kind === 'air' ? 'breach' : 'splash', t: 0, peak: 0, o0: m.kind === 'air' ? { ...m.origin } : null, snap: m.kind === 'air' ? snap : null };
      // include the 0.1 s before the crossing
      for (let i = 2; i < hist.length; i++) { const [a, b, c] = [hist[i - 2], hist[i - 1], hist[i]]; win.peak = Math.max(win.peak, Math.hypot(c.x - 2 * b.x + a.x, c.y - 2 * b.y + a.y) / DT / DT / c.h) }
      if (m.kind === 'air') flights++;
    }
    if (win) {
      win.t += DT; const [a, b, c] = hist.slice(-3); win.peak = Math.max(win.peak, Math.hypot(c.x - 2 * b.x + a.x, c.y - 2 * b.y + a.y) / DT / DT / c.h);
      if (win.kind === 'breach' && win.snap && Math.abs(win.t - .6) < DT / 2 && m.kind === 'air') {
        for (const p of win.snap.pts) { const sb = { x: (p.x - win.snap.cam.x) / win.snap.h, y: (p.y - win.snap.cam.y) / win.snap.h }, w = { x: p.x + m.origin.x - win.o0.x, y: p.y + m.origin.y - win.o0.y }; slide.push(Math.hypot((w.x - r.cam.x) / h - sb.x, (w.y - r.cam.y) / h - sb.y)) }
        size.push(h / win.snap.h);
      }
      if (win.t >= .6 || win.kind !== (m.kind === 'air' ? 'breach' : 'splash')) { acc[win.kind].push(win.peak); win = null }
    }
    prev = m.kind;
  }
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0 }, most = a => Math.max(0, ...a);
let fail = 0;
for (const k of ['splash', 'breach']) { const ok = med(acc[k]) <= 15 && most(acc[k]) <= 40; if (!ok) fail++; console.log(`${ok ? 'PASS' : 'FAIL'} ${k}: the camera's acceleration, median ${med(acc[k]).toFixed(1)} and most ${most(acc[k]).toFixed(1)} view heights/s² (${acc[k].length} crossings)`) }
console.log(`     after the breach: the camera slides the waiting enemies' places ${(med(slide) * 100).toFixed(1)}% of the view by 0.6 s (median); the view is ${(med(size) * 100).toFixed(0)}% of its size`);
process.exit(fail ? 1 : 0);

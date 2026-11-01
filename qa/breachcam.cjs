// The camera through a breach (designer, 2026-11-01: "enemies move when we breach ... they move upward with the camera
// change"). Free-swimming bot, mid launches, wave 4, 6 seeds × 8 flights. Points where the waiting enemies were at the
// last water step are carried with the arena from the breach (as the enemies are, minus their own movement), and their
// screen positions are compared with where they were just before it: how far the camera slides them (share of the
// view's height) and how much the view's size changes. Passes when the slide is at most 8% after 0.6 s and the view
// keeps at least 95% of its size (before the fix: 14% and 72%).
//   node qa/breachcam.cjs [--tune=k:v]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO, DT = 1 / 120, marks = [.15, .3, .6, 1], acc = Object.fromEntries(marks.map(m => [m, { n: 0, move: 0, zoom: 0 }]));
for (let seed = 1; seed <= 6; seed++) {
  H.WaterView.reset(); const r = H.Hd(seed, 'harpoon'); r.wave = 4; D.wave(r); const bot = swimmer(H, 'mid-keep', seed);
  let ppm = 0, prev = r.medium.kind, snap = null, ta = 0, flights = 0;
  for (let t = 0; t < 120 * 90 && flights < 8; t++) {
    r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, bot(r)); if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }
    const m = r.medium, u = H.K / (H.lr.width * H.Fz(m, H.he(r), r.cam));
    ppm = ppm > 0 ? ppm + (u - ppm) * (1 - Math.exp(-DT / (u < ppm ? .06 : .2))) : u;
    const V = { cx: r.cam.x, cy: r.cam.y, h: H.W / ppm / 2 }, scr = w => ({ x: (w.x - V.cx) / V.h, y: (w.y - V.cy) / V.h });
    if (m.kind === 'water') { snap = { V, pts: (r.pursuers || []).filter(p => !p.wet && p.y > 0).map(p => ({ w: { x: p.x, y: p.y }, s: scr(p) })) }; ta = 0 }
    if (m.kind === 'air' && prev === 'water' && snap) { snap.live = true; snap.o0 = { ...m.origin }; flights++ }
    if (m.kind === 'air' && snap?.live) {
      ta += DT;
      for (const mk of marks) if (Math.abs(ta - mk) < DT / 2) for (const o of snap.pts) {
        const s = scr({ x: o.w.x + m.origin.x - snap.o0.x, y: o.w.y + m.origin.y - snap.o0.y }), A = acc[mk];
        A.n++; A.move += Math.hypot(s.x - o.s.x, s.y - o.s.y) / 2; A.zoom += V.h / snap.V.h;
      }
      if (ta > 1.05) snap.live = false;
    }
    prev = m.kind;
  }
}
let fail = 0;
for (const mk of marks) {
  const A = acc[mk], slide = A.move / A.n, size = A.zoom / A.n, ok = mk !== .6 || (slide <= .08 && size >= .95); if (!ok) fail++;
  console.log(`${mk === .6 ? (ok ? 'PASS ' : 'FAIL ') : '     '}${mk} s after the breach: the camera slid the enemies' places ${(slide * 100).toFixed(1)}% of the view; the view is ${(size * 100).toFixed(0)}% of its size before`);
}
process.exit(fail ? 1 : 0);

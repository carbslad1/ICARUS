// The camera around the water line (designer, 2026-11-01: "make the camera not feel like it's bouncing and zooming in
// and out around the water line during breach and entry"). Free-swimming bot, mid launches, waves 2, 8 and 15, 3 seeds
// × 6 flights. Around each breach and splash (0.1 s before to 0.6 s after) it measures, as the renderer would show it:
//   lurch     the camera's acceleration, view heights a second squared (median / most)
//   zoom      the most the view's size changes in that time (share)
//   water     how far the water line moves on screen from just before to 0.3 s after (share of the view)
//   enemies   at the breach, how far the waiting enemies' places move on screen over 0.6 s apart from their own moves
//             (they ride the arena from the breach; share of the view)
// Passes, with the steady camera, when the zoom at either crossing is under 2% (a steep dive that passes the view's
// depth within 0.6 s of the splash starts the deep-dive growth: 1.7% at most; v3's camera 51-100%), no lurch (most at
// most 40), and at the breach the enemies' places move at most 5% in their first 0.15 s (the water line must drop away there: the camera
// rides the arena, with the enemies, from the breach).
//   node qa/steadycam.cjs [--tune=steadycam:0]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO, DT = 1 / 120, out = { breach: { acc: [], zoom: [], water: [], en15: [], en60: [] }, splash: { acc: [], zoom: [], water: [] } };
for (const wave of [2, 8, 15]) for (let seed = 1; seed <= 3; seed++) {
  H.WaterView?.reset?.(); H.SteadyCam?.reset?.(); const r = H.Hd(seed, 'harpoon'); r.wave = wave; D.wave(r); const bot = swimmer(H, 'mid-keep', seed);
  let ppm = 0, prev = r.medium.kind, flights = 0, hist = [], win = null, last = null;
  for (let t = 0; t < 120 * 60 && flights < 6; t++) {
    r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, bot(r)); if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }
    const m = r.medium, u = H.K / (H.lr.width * H.Fz(m, H.he(r), r.cam));
    ppm = ppm > 0 ? ppm + (u - ppm) * (1 - Math.exp(-DT / (u < ppm ? .06 : .2))) : u;
    const h = H.W / ppm, f = { x: r.cam.x, y: r.cam.y, h }; hist.push(f); if (hist.length > 14) hist.shift();
    const scr = (w, F) => ({ x: (w.x - F.x) / F.h, y: (w.y - F.y) / F.h });
    if (prev !== m.kind) {
      const kind = m.kind === 'air' ? 'breach' : 'splash', before = hist[hist.length - 2] || f;
      win = { kind, t: 0, peak: 0, h0: before.h, zmax: 0, w0: scr({ x: before.x, y: 0 }, before).y, o0: m.kind === 'air' ? { ...m.origin } : null, pts: kind === 'breach' && last ? last.pts.map(p => ({ w: p, s: scr(p, last.f) })) : [] };
      for (let i = 2; i < hist.length; i++) { const [a, b, c] = [hist[i - 2], hist[i - 1], hist[i]]; win.peak = Math.max(win.peak, Math.hypot(c.x - 2 * b.x + a.x, c.y - 2 * b.y + a.y) / DT / DT / c.h) }
      if (m.kind === 'air') flights++;
    }
    if (m.kind === 'water') last = { f, pts: (r.pursuers || []).filter(p => !p.wet && p.y > 0).map(p => ({ x: p.x, y: p.y })) };
    if (win) {
      win.t += DT; const [a, b, c] = hist.slice(-3); win.peak = Math.max(win.peak, Math.hypot(c.x - 2 * b.x + a.x, c.y - 2 * b.y + a.y) / DT / DT / c.h);
      win.zmax = Math.max(win.zmax, Math.abs(h / win.h0 - 1));
      if (Math.abs(win.t - .3) < DT / 2) out[win.kind].water.push(Math.abs(scr({ x: f.x, y: 0 }, f).y - win.w0));
      if (win.kind === 'breach' && m.kind === 'air') for (const [mk, key] of [[.15, 'en15'], [.6, 'en60']]) if (Math.abs(win.t - mk) < DT / 2)
        for (const p of win.pts) { const w = { x: p.w.x + m.origin.x - win.o0.x, y: p.w.y + m.origin.y - win.o0.y }, s = scr(w, f); out.breach[key].push(Math.hypot(s.x - p.s.x, s.y - p.s.y)) }
      if (win.t >= .6 || (win.kind === 'breach') !== (m.kind === 'air')) { out[win.kind].acc.push(win.peak); out[win.kind].zoom.push(win.zmax); win = null }
    }
    prev = m.kind;
  }
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1] ?? 0 }, most = a => Math.max(0, ...a), pc = v => (v * 100).toFixed(1) + '%';
const steady = H.DEMO.tune.steadycam && H.lr.fit; let fail = 0;
for (const k of ['breach', 'splash']) {
  const o = out[k];
  let line = `${k.padEnd(6)}: lurch ${med(o.acc).toFixed(1)} / ${most(o.acc).toFixed(1)} view heights/s²; zoom up to ${pc(most(o.zoom))}; the water line moves ${pc(med(o.water))} (most ${pc(most(o.water))})`;
  if (k === 'breach') line += `; the enemies' places move ${pc(med(o.en15))} by 0.15 s, ${pc(med(o.en60))} by 0.6 s`;
  const ok = !steady || (most(o.zoom) < .02 && most(o.acc) <= 40 && (k !== 'breach' || med(o.en15) <= .05));
  if (!ok) fail++; console.log(`${steady ? (ok ? 'PASS ' : 'FAIL ') : '     '}${line}`);
}
process.exit(fail ? 1 : 0);

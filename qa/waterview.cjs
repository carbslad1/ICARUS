// Water view: can you see the surface and the enemies waiting above it while you swim? (designer, 2026-11-01: "at 80 m/s
// things get out of hand"). A free-swimming bot (qa/bot.cjs swimmer) plays each launch style; every water step the view
// is worked out as the renderer does (zoom from Fz, eased as its ppm is, centred on the camera) and checked for:
//   surface   the waterline is on screen
//   held      the enemies held above the water while you swim (pursuers, dry) are on screen, as a share of them
//   speed     the dolphin's speed under water; depth: how deep the dives go; launch: speed leaving the water / the wave's
//   pan, zoom how fast the camera moves up and down under water (view heights a second) and zooms over the whole cycle,
//             splash and breach included (share a second), 99th percentile and most
//   node qa/waterview.cjs [--waves=1,10,20] [--seeds=4] [--flights=8] [--set=wave.cap:40] [--tune=viewfit:1]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
const WAVES = arg('waves', '1,10,20').split(',').map(Number), SEEDS = +arg('seeds', 4), FLIGHTS = +arg('flights', 8);
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0, ...kv(arg('set')) })]]), { bake: true, modern: true });
const D = H.DEMO, DT = 1 / 120;
function run(wave, style, seed) {
  H.WaterView?.reset?.(); H.SteadyCam?.reset?.(); const r = H.Hd(seed, 'harpoon'); r.wave = wave; D.wave(r);
  const bot = swimmer(H, style, seed);
  const o = { water: 0, surface: 0, held: 0, heldN: 0, speed: 0, depth: 0, zoom: 0, flights: 0, launch: 0, launchN: 0, pan: [], zr: [] };
  let pc = null, ph = null;
  let ppm = 0, prev = r.medium.kind, t = 0;
  while (o.flights < FLIGHTS && t < 120 * 60 * 4 && r.mode === 'playing') {
    r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, bot(r)); t++;
    if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }
    const m = r.medium, me = H.he(r), u = H.K / (H.lr.width * H.Fz(m, me, r.cam));
    // the renderer's zoom, eased as its ppm is, over the whole cycle (the splash and the breach included)
    ppm = ppm > 0 ? ppm + (u - ppm) * (1 - Math.exp(-DT / (u < ppm ? .06 : .2))) : u;
    { const h = H.W / ppm / 2, cy = m.kind === 'air' ? m.origin.y + r.cam.y * 0 : r.cam.y;
      if (pc != null && m.kind === 'water') o.pan.push(Math.abs(r.cam.y - pc) / DT / (2 * h));
      if (ph != null) o.zr.push(Math.abs(Math.log(h / ph)) / DT); pc = m.kind === 'water' ? r.cam.y : null; ph = h }
    if (m.kind === 'water') {
      const w = H.K / ppm / 2, h = H.W / ppm / 2, c = r.cam, inView = (x, y) => Math.abs(x - c.x) < w && Math.abs(y - c.y) < h;
      o.water += DT; o.zoom += (u > 0 ? H.K / H.lr.width / ppm : 1) * DT;
      if (inView(me.x, 0)) o.surface += DT;
      for (const p of r.pursuers || []) if (!p.wet && p.y > 0) { o.heldN += DT; if (inView(p.x, p.y)) o.held += DT }
      o.speed += Math.hypot(m.velocity.x, m.velocity.y) * DT; o.depth = Math.max(o.depth, -me.y);
    }
    if (prev !== 'air' && m.kind === 'air') { o.launch += Math.hypot(m.vx, m.vy) / H.Dd(wave); o.launchN++ }
    if (prev === 'air' && m.kind !== 'air') o.flights++;
    prev = m.kind;
  }
  return o;
}
console.log(`water view, free swimming, ${SEEDS} seeds × ${FLIGHTS} flights${arg('set') ? ', set ' + arg('set') : ''}${arg('tune') ? ', tune ' + arg('tune') : ''}`);
console.log(' wave  style   surface on screen   held enemies on screen   speed m/s   deepest m   zoom ×   launch %   pan 95% (/s)   zoom 99% / max (/s)');
const out = {};
for (const wave of WAVES) for (const style of ['low-keep', 'mid-keep', 'high-keep']) {
  const s = Array.from({ length: SEEDS }, (_, i) => run(wave, style, i + 1)).reduce((a, o) => { for (const k in o) if (Array.isArray(o[k])) a[k] = (a[k] || []).concat(o[k]); else a[k] = (a[k] || 0) + (k === 'depth' ? 0 : o[k]); a.depth = Math.max(a.depth || 0, o.depth); return a }, {});
  const qq = (a, p) => { const x = [...a].sort((p, q) => p - q); return x.length ? +x[Math.floor(p * (x.length - 1))].toFixed(2) : 0 }, q95 = a => qq(a, .95);
  const row = { surface: Math.round(s.surface / s.water * 100), held: s.heldN ? Math.round(s.held / s.heldN * 100) : null, speed: Math.round(s.speed / s.water), depth: Math.round(s.depth), zoom: +(s.zoom / s.water).toFixed(2), launch: Math.round(s.launch / Math.max(1, s.launchN) * 100), pan95: q95(s.pan), zoom99: qq(s.zr, .99), zoomMax: qq(s.zr, 1) };
  out[wave + ':' + style] = row;
  console.log(`  ${String(wave).padStart(2)}   ${style.split('-')[0].padEnd(5)}  ${String(row.surface).padStart(8)}%  ${String(row.held ?? '–').padStart(18)}%  ${String(row.speed).padStart(14)}  ${String(row.depth).padStart(10)}  ${String(row.zoom).padStart(8)}  ${String(row.launch).padStart(5)}%   ${String(row.pan95).padStart(8)}       ${row.zoom99} / ${row.zoomMax}`);
}
if (process.argv.includes('--json')) console.log(JSON.stringify(out));

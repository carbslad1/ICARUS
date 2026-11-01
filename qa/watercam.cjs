// Water camera test (designer, 2026-11-01): "have the dolphin hold the D key underwater such that it is not breaching.
// At all speeds the air needs to be visible and the camera needs to be smooth." Free swimming; at each wave's speed the
// dolphin starts below the surface and holds D (clockwise loops) for --time seconds. Every step the view is worked out
// as the renderer draws it (zoom from Fz, eased as its ppm is; centred on the camera) and measured:
//   air      the view shows at least AIR m above the waterline (share of time)
//   dolphin  the dolphin is in view, 2 m inside the edge (share of time)
//   breach   flights that started (it should never leave the water)
//   pan      the camera's vertical speed, in view heights a second (95th percentile and most)
//   zoom     how fast the zoom changes, in share of the view a second (95th percentile and most)
//   node qa/watercam.cjs [--waves=1,5,10,15,20] [--time=12] [--depth=auto|m] [--tune=k:v] [--json]
const path = require('path');
const { load } = require('./load.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
const WAVES = arg('waves', '1,5,10,15,20').split(',').map(Number), TIME = +arg('time', 12), AIR = 8, DT = 1 / 120;
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO, q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0 };
const out = {};
for (const wave of WAVES) {
  H.WaterView?.reset?.(); H.SteadyCam?.reset?.(); const r = H.Hd(1, 'harpoon'); r.wave = wave; D.wave(r);
  const V = H.Dd(wave), depth = arg('depth', 'auto') === 'auto' ? 12 : +arg('depth');
  r.medium = { ...r.medium, kind: 'water', pos: { x: 0, y: -depth }, heading: -.5, velocity: { x: Math.cos(-.5) * V, y: Math.sin(-.5) * V } };
  r.cam = { x: 0, y: -depth + 12 }; r.camV = { x: 0, y: 0 };
  let ppm = 0, prevCam = null, prevH = null, t = 0, air = 0, seen = 0, n = 0, breach = 0, deepest = 0, fastest = 0;
  const pan = [], zoom = [];
  for (; t < TIME / DT; t++) {
    r.hp = r.stats.maxHp; r.hurt = 99; r.enemies = []; r.pursuers = [];
    const kind = r.medium.kind;
    H.sw(r, { turn: -1, x: 1, y: 0, boost: false });
    if (kind === 'water' && r.medium.kind === 'air') { breach++; break }
    const m = r.medium, me = H.he(r), u = H.K / (H.lr.width * H.Fz(m, me, r.cam));
    ppm = ppm > 0 ? ppm + (u - ppm) * (1 - Math.exp(-DT / (u < ppm ? .06 : .2))) : u;
    const w = H.K / ppm / 2, h = H.W / ppm / 2, c = r.cam;
    n++; if (c.y + h >= AIR) air++;
    if (Math.abs(me.x - c.x) < w - 2 && Math.abs(me.y - c.y) < h - 2) seen++;
    if (prevCam) { pan.push(Math.abs(c.y - prevCam.y) / DT / (2 * h)); zoom.push(Math.abs(Math.log(h / prevH)) / DT) }
    prevCam = { ...c }; prevH = h; deepest = Math.max(deepest, -me.y); fastest = Math.max(fastest, Math.hypot(m.velocity.x, m.velocity.y));
  }
  out[wave] = { speed: Math.round(fastest), deepest: Math.round(deepest), breach, air: Math.round(air / n * 1000) / 10, dolphin: Math.round(seen / n * 1000) / 10,
    pan95: +q(pan, .95).toFixed(2), panMax: +Math.max(...pan).toFixed(2), zoom95: +q(zoom, .95).toFixed(2), zoomMax: +Math.max(...zoom).toFixed(2) };
}
if (process.argv.includes('--json')) console.log(JSON.stringify(out));
else {
  console.log(`water camera: hold D under water for ${TIME} s${arg('tune') ? ', tune ' + arg('tune') : ''}`);
  console.log(' wave  speed  deepest  breached   air in view   dolphin in view   pan 95%/max (views/s)   zoom 95%/max (/s)');
  for (const [w, o] of Object.entries(out)) console.log(`  ${String(w).padStart(2)}   ${String(o.speed).padStart(4)}   ${String(o.deepest).padStart(5)}   ${String(o.breach).padStart(6)}   ${String(o.air).padStart(9)}%   ${String(o.dolphin).padStart(12)}%      ${String(o.pan95).padStart(5)} / ${String(o.panMax).padEnd(5)}           ${String(o.zoom95).padStart(5)} / ${o.zoomMax}`);
}

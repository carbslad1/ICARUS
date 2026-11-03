// The camera rules (docs/CAMERA_RULES.md), every rule in every scenario, measured on screen as the renderer draws it:
// 1440 × 810, 60 frames a second (two simulation steps a frame), the zoom eased as the renderer eases it (ppm), the
// renderer's camera clamp (Ocy), the drawn size of the dolphin (the renderer's zoom, with the size hold). Driven by a
// human-like pilot (qa/pilot.cjs). Exits non-zero when any rule fails.
//   node qa/camera-rules.cjs [--only=name] [--seeds=2] [--time=30] [--tune=k:v,...] [--verbose]
const path = require('path');
const { load } = require('./load.cjs'), { pilot } = require('./pilot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const kv = s => Object.fromEntries((s || '').split(',').filter(Boolean).map(x => { const [k, v] = x.split(':'); return [k, +v] }));
// every run in a fresh copy of the game, so no state leaks from one run into the next
const fresh = () => load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(kv(arg('tune')))], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
let H = fresh(), D = H.DEMO;
const K = H.K, W = H.W, STEP = 1 / 120, FRAME = 1 / 60, SEEDS = +arg('seeds', 2), TIME = +arg('time', 30);

const LIMIT = { R1: 1.5, R2: 2, R3: .03, R4: 4, R5: 30, R6: .99, R7: 1 };
const SCENARIOS = [
  { name: 'hops, low speed',  wave: 1,  plans: [{ depth: 6, angle: 45 }, { depth: 3, angle: 25 }] },
  { name: 'hops, high speed', wave: 15, plans: [{ depth: 6, angle: 45 }, { depth: 3, angle: 25 }] },
  { name: 'hops, top speed',  wave: 20, plans: [{ depth: 6, angle: 45 }, { depth: 3, angle: 25 }] },
  { name: 'skims',            wave: 4,  plans: [{ depth: 2, angle: 10 }] },
  { name: 'skims, fast',      wave: 15, plans: [{ depth: 2, angle: 10 }] },
  { name: 'loops',            wave: 1,  plans: [{ loop: true }], start: true, time: 8 },
  { name: 'loops, fast',      wave: 10, plans: [{ loop: true }], start: true, time: 8 },
  { name: 'loops, top speed', wave: 20, plans: [{ loop: true }], start: true, time: 8 },
  { name: 'deep dives',       wave: 1,  plans: [{ depth: 70, angle: 40 }] },
  { name: 'deep dives, fast', wave: 15, plans: [{ depth: 70, angle: 40 }] },
  { name: 'turnarounds',      wave: 4,  plans: [{ depth: 10, angle: 40, flip: true }] },
  { name: 'turnarounds, fast',wave: 15, plans: [{ depth: 10, angle: 40, flip: true }] },
  { name: 'trick holds',      wave: 4,  plans: [{ depth: 6, angle: 45, hold: 'down' }, { depth: 6, angle: 45, hold: 'right' }] },
  { name: 'trick holds, fast',wave: 15, plans: [{ depth: 6, angle: 45, hold: 'down' }, { depth: 6, angle: 45, hold: 'right' }] },
];

function run(sc, plan, seed) {
  H = fresh(); D = H.DEMO; H.Camera?.reset?.();
  const r = H.Hd(seed, 'harpoon'); r.wave = sc.wave; D.wave(r);
  if (sc.start) { const V = H.Dd(sc.wave); r.medium = { ...r.medium, kind: 'water', pos: { x: 0, y: -12 }, heading: -.5, velocity: { x: Math.cos(-.5) * V, y: Math.sin(-.5) * V } }; r.cam = { x: 0, y: 0 } }
  const drive = pilot(H, plan, seed), o = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, water: 0, sky: 0, frames: 0, seen: 0, breaches: 0, where: {} };
  const note = (k, v, what) => { if (v > o[k]) { o[k] = v; o.where[k] = what } };
  let ppm = 0, prev = null, pv = null, kind = r.medium.kind, tb = null, cut = 0, wave = r.wave;
  const en = new Map();                                            // id -> { x, y, vx, vy, hp, hitT }
  const airPpm = W / H.Jt.height, frames = (sc.time || TIME) * 60;
  for (let f = 0; f < frames && r.mode !== 'dead'; f++) {
    for (let k = 0; k < 2; k++) {
      r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, drive(r));
      if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }
      if (r.wave !== wave) { wave = r.wave; cut = 6 }
      const m = r.medium;
      if (kind === 'water' && m.kind === 'air') { tb = r.time; o.breaches++ }
      if (m.kind !== 'air') tb = null;
      kind = m.kind;
    }
    const m = r.medium, me = H.he(r), u = K / (H.lr.width * H.Fz(m, me, r.cam));
    ppm = ppm > 0 ? ppm + (u - ppm) * (1 - Math.exp(-FRAME / (u < ppm ? .06 : .2))) : u;
    const h = W / ppm / 2, w = K / ppm / 2;
    const cam = H.Camera?.on() ? { x: r.cam.x, y: r.cam.y } : { x: r.cam.x, y: Math.max(r.cam.y, Math.min(-.76 * h, me.y + .64 * h)) };   // the renderer's clamp (Ocy; none with the camera module)
    const at = `${m.kind} f${f}${tb != null ? ' ' + (r.time - tb).toFixed(2) + ' s after a breach' : ''}`;
    o.frames++;
    if (cut > 0) { cut--; prev = null; pv = null; en.clear(); continue }
    // R1: the picture's scroll speed, px a frame, and its change
    const v = prev ? { x: (cam.x - prev.x) * ppm, y: (cam.y - prev.y) * ppm } : null;
    if (v && pv) note('R1', Math.hypot(v.x - pv.x, v.y - pv.y), at);
    // R2: riding the arena (vertically; across, the camera scrolls with the dolphin over the arena by design)
    if (m.kind === 'air' && tb != null && r.time - tb > .15 && prev && !H.Camera.leading) note('R2', Math.abs((cam.y - prev.y) / FRAME - m.vy), at);
    // R3: the dolphin's drawn size against its size in the air
    const R = Object.create(H.Ul.prototype); R.ppm = ppm; R.sizeTitle = false;   // the renderer's own zoom getter
    note('R3', Math.abs(R.zoom * H.hw / airPpm - 1), at);
    // R6, R7
    if (m.kind === 'water') { o.water++; if (cam.y + h >= 8 && cam.y - h < 0) o.sky++ }
    if (Math.abs(me.x - cam.x) < w * .96 && Math.abs(me.y - cam.y) < h * .96) o.seen++;
    // R4, R5: enemies on screen
    const now = new Map();
    const look = (id, wx, wy, e, p) => {
      const sx = K / 2 + (wx - cam.x) * ppm, sy = W / 2 - (wy - cam.y) * ppm;
      if (sx < -40 || sx > K + 40 || sy < -40 || sy > W + 40) return;
      const hp = (e || p?.e)?.hp ?? 0, old = en.get(id);
      const hitT = old && hp < old.hp ? r.time : old?.hitT ?? -9;
      const busy = (e && (e.kx || e.ky || e.charge)) || (p && (p.kx || p.ky)) || ((e || p)?.age ?? 9) < .25 || r.time - hitT < .25
        || (p && p.dodgeT != null && r.time - p.dodgeT < 2.5 / 120);   // dodging the dolphin under the water (as the speed limit in source/space.js marks it, this frame or the last)
      const rec = { x: sx, y: sy, hp, hitT, rx: (wx - cam.x) * airPpm, ry: (wy - cam.y) * airPpm };
      if (old) {
        rec.vx = sx - old.x; rec.vy = sy - old.y;
        if (old.vx != null) note('R5', Math.hypot(rec.vx - old.vx, rec.vy - old.vy), at + ` enemy ${id}`);   // a jump on screen, whatever it is doing
        rec.rvx = rec.rx - old.rx; rec.rvy = rec.ry - old.ry;
        if (old.vx != null && !busy) note('R4', Math.hypot(rec.vx - old.vx, rec.vy - old.vy), at + ` enemy ${id} (without the zoom ${Math.hypot(rec.rvx - (old.rvx ?? rec.rvx), rec.rvy - (old.rvy ?? rec.rvy)).toFixed(1)}; ${e ? 'arena ' + e.kind : p.wet ? 'under water' : 'waiting'}; px/frame ${old.vx.toFixed(1)},${old.vy.toFixed(1)} -> ${rec.vx.toFixed(1)},${rec.vy.toFixed(1)}; at ${sx.toFixed(0)},${sy.toFixed(0)}${p ? '; y ' + p.y.toFixed(1) + ' v ' + (p.v || 0).toFixed(0) : ''})`);
      }
      now.set(id, rec);
    };
    if (m.kind === 'air') for (const e of r.enemies) look(e.id, m.origin.x + e.pos.x, m.origin.y + e.pos.y, e, null);
    for (const p of r.pursuers || []) look(p.id, p.x, p.y, null, p);
    en.clear(); for (const [k, x] of now) en.set(k, x);
    prev = cam; pv = v;
  }
  return o;
}

let fail = 0;
const rows = [];
for (const sc of SCENARIOS) {
  if (arg('only') && !sc.name.includes(arg('only'))) continue;
  const t = { R1: 0, R2: 0, R3: 0, R4: 0, R5: 0, water: 0, sky: 0, frames: 0, seen: 0, breaches: 0, where: {} };
  for (const plan of sc.plans) for (let seed = 1; seed <= SEEDS; seed++) {
    const o = run(sc, plan, seed);
    for (const k of ['R1', 'R2', 'R3', 'R4', 'R5']) if (o[k] > t[k]) { t[k] = o[k]; t.where[k] = o.where[k] }
    for (const k of ['water', 'sky', 'frames', 'seen', 'breaches']) t[k] += o[k];
  }
  const R6 = t.water ? t.sky / t.water : 1, R7 = t.seen / Math.max(1, t.frames);
  const res = {
    R1: t.R1 <= LIMIT.R1, R2: t.R2 <= LIMIT.R2, R3: t.R3 <= LIMIT.R3, R4: t.R4 <= LIMIT.R4, R5: t.R5 <= LIMIT.R5, R6: R6 >= LIMIT.R6, R7: R7 >= LIMIT.R7,
  };
  const ok = Object.values(res).every(Boolean); if (!ok) fail++;
  rows.push([sc.name, H.Dd(sc.wave), t.breaches, t.R1.toFixed(2), t.R2.toFixed(1), (t.R3 * 100).toFixed(1) + '%', t.R4.toFixed(1), t.R5.toFixed(0), (R6 * 100).toFixed(1) + '%', (R7 * 100).toFixed(1) + '%', ok ? 'PASS' : 'FAIL ' + Object.keys(res).filter(k => !res[k]).join(' ')]);
  if (!ok && process.argv.includes('--verbose')) for (const k of Object.keys(res)) if (!res[k] && t.where[k]) rows.push(['   ' + k + ' worst at', t.where[k]]);
}
const head = ['scenario', 'm/s', 'breaches', `R1 jolt ≤${LIMIT.R1}`, `R2 ride ≤${LIMIT.R2}`, `R3 size ≤${LIMIT.R3 * 100}%`, `R4 enemy ≤${LIMIT.R4}`, `R5 jump ≤${LIMIT.R5}`, 'R6 sky ≥99%', 'R7 dolphin 100%', 'result'];
const widths = head.map((h, i) => Math.max(h.length, ...rows.filter(r => r.length > 2).map(r => String(r[i] ?? '').length)));
console.log(head.map((h, i) => h.padEnd(widths[i])).join('  '));
for (const r of rows) console.log(r.length > 2 ? r.map((c, i) => String(c).padEnd(widths[i])).join('  ') : r.join(' '));
console.log(fail ? `${fail} scenario(s) fail the camera rules` : 'every scenario keeps every camera rule');
process.exit(fail ? 1 : 0);

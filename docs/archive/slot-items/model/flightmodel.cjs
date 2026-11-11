// Flight model on the game's own code: every wave × launch angle × air input, no enemies, no stats.
// For each case the dolphin swims to the surface at the angle, is launched at exactly that angle at the breach speed the
// game gives it, flies with one air input (hold / down / up), enters, swims straight back out at the same angle, and
// flies again. The second cycle is recorded (the first starts from the run's spawn dive).
//   node flightmodel.cjs <path to ICARUS-demo.html> [out.json]
const path = require('path'), fs = require('fs');
const demo = process.argv[2], out = process.argv[3] || 'model.json';
const { load } = require(path.join(path.dirname(demo), 'qa', 'load.cjs'));
// free swimming (the demo's default), shipped tune; no tricks forced
// shipped tune (an empty saved tune keeps the demo's defaults, rules 1 included; qa/load.cjs would otherwise set rules 0)
const H = load(demo, new Map([['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })], ['icarus.scoreshow.tune', '{}']]), { bake: true, modern: true }), D = H.DEMO;
const DT = 1 / 120, deg = d => d * Math.PI / 180, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const ANGLES = process.env.ANGLES ? process.env.ANGLES.split(",").map(Number) : [2, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 89];
const WAVES = (process.env.WAVES ? process.env.WAVES.split(",").map(Number) : Array.from({ length: 20 }, (_, i) => i + 1)), AIR = { hold: 0, down: -1, up: 1 };

function steer(m, want) { const d = wrap(want - m.heading), turn = Math.abs(d) > .04 ? Math.sign(d) : 0; return { turn, x: -turn, y: 0, boost: false, w: false } }

function run(wave, angle, style) {
  const r = H.Hd(1, 'harpoon'); r.wave = wave; D.wave(r); r.demo.trickForce = null;
  const a = deg(angle), viewH = H.Jt.height;
  const cyc = []; let cur = null, wat = null, prev = r.medium.kind, ticks = 0, flights = 0;
  while (ticks++ < 120 * 120 && r.mode === 'playing' && flights < 2) {
    // no enemies, and no damage: enemies can spawn and hit inside one step, and a lethal hit busts the flight (demo.js:194)
    r.enemies = []; r.pursuers = []; r.shots = []; r.hp = r.stats.maxHp; r.hurt = 10;
    const m = r.medium;
    // under water: dive at the mirror of the launch angle until 0.5 m deep then aim for the launch angle (same direction)
    let i;
    // under water: nose down (mirror of the launch angle) until 1 m deep, then up at the launch angle, same direction
    if (m.kind === 'water') { const st = wat || (r.pre || (r.pre = { turned: false })); if (m.pos.y < -1) st.turned = true; i = steer(m, st.turned ? Math.max(a, deg(12)) : -Math.max(a, deg(12))) }   // below 12° it swims out at 12° and the launch is set at the breach
    // the key is pressed after the breach (a key held through it is latched as the trick's, source/controls.js)
    else i = { turn: 0, x: 0, y: cur && cur.t > .02 ? AIR[style] : 0, boost: false, w: false };
    H.sw(r, i);
    if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }
    const n = r.medium;
    if (n.kind === 'air' && prev !== 'air') {          // breach: force the angle, keep the game's speed
      const v = Math.hypot(n.vx, n.vy); n.vx = Math.cos(a) * v; n.vy = Math.sin(a) * v;
      // the flight's phases come from its prediction, made at the breach from the natural angle: redo it for the forced one
      if (r.hand?.pred) { const vy = n.vy; Object.assign(r.hand.pred, { height: vy * vy / 30, air: 2 * vy / 15, apex: vy / 15 }) }
      cur = { v, t: 0, s: [] }; if (wat) { wat.end = r.time }
    }
    if (n.kind === 'air' && cur) { cur.t += DT; cur.s.push([cur.t, n.origin.y, H.he(r).y, r.cam.y, D.phase(r)]) }
    if (prev === 'air' && n.kind === 'water') { if (cur) cyc.push({ air: cur, water: null }); cur = null; flights++; wat = { start: r.time, depth: 0, turned: false } }
    if (n.kind === 'water' && wat) wat.depth = Math.min(wat.depth, n.pos.y);
    if (n.kind === 'water' && wat && cyc.length) cyc.at(-1).water = wat;
    prev = n.kind;
  }
  const c = cyc[1] || cyc[0]; if (!c) return null;
  const s = c.air.s, T = s.length * DT, peak = Math.max(...s.map(x => x[2])), w = cyc[0].water;
  const share = f => s.filter(f).length / s.length;
  return { wave, angle, style, v: +c.air.v.toFixed(1), air: +T.toFixed(2), peak: +peak.toFixed(1), originPeak: +Math.max(...s.map(x => x[1])).toFixed(1),
    waterVisible: +share(x => x[3] - viewH / 2 < 0).toFixed(3),
    below: Object.fromEntries([5, 10, 20, 40].map(h => [h, +share(x => x[2] < h).toFixed(3)])),
    belowFrac: Object.fromEntries([.25, .5].map(f => [f, +share(x => x[2] < f * peak).toFixed(3)])),
    phase: { ascent: +share(x => x[4] === 'ascent').toFixed(3), apex: +share(x => x[4] === 'apex').toFixed(3), descent: +share(x => x[4] === 'descent').toFixed(3) },
    waterTime: w && w.end ? +(w.end - w.start).toFixed(2) : null, depth: w ? +(-w.depth).toFixed(1) : null };
}

const res = [];
for (const wave of WAVES) for (const angle of ANGLES) for (const style of Object.keys(AIR)) { const o = run(wave, angle, style); if (o) res.push(o) }
fs.writeFileSync(out, JSON.stringify({ ok: res.length, gravity: H.ai, view: { w: H.Jt.width, h: H.Jt.height }, launchSpeed: WAVES.map(w => H.Dd(w)), res }, null, 0));
console.log('cases', res.length, 'gravity', H.ai, 'view', H.Jt.width, H.Jt.height, 'Dd', WAVES.map(w => H.Dd(w)).join(','));

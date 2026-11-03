// Spawns while you swim (designer, 2026-11-01: "the spawns are flicking and not being handled properly when the dolphin
// is in the water"). Free swimming; after one flight the dolphin stays under water holding D (loops) for 12 s while the
// wave's schedule spawns enemies behind markers above the water (space.js wetSpawn). Checks, for every marker:
//   still     where it is drawn (demoSeen of its frame + its place) never moves while it waits
//   in view   it is inside the camera's view while it waits (the share of its time)
//   on it     the enemy appears where its marker was drawn (distance)
//   node qa/wetspawn.cjs [--waves=5,15]
const path = require('path');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', '{}'], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0 })]]), { bake: true, modern: true });
const D = H.DEMO, step = (r, i) => { r.hp = r.stats.maxHp; r.hurt = 99; H.sw(r, i) };
let fail = 0;
for (const wave of arg('waves', '5,15').split(',').map(Number)) {
  H.Camera.reset(); const r = H.Hd(4, 'harpoon'); r.wave = wave; D.wave(r); const bot = swimmer(H, 'mid-keep', 4);
  for (let t = 0, prev = r.medium.kind; t < 120 * 30; t++) { step(r, bot(r)); const k = r.medium.kind; if (prev === 'air' && k === 'water') break; prev = k }
  for (let i = 0; i < 120 * 3 && H.he(r).y > -40; i++) { const m = r.medium, d = Math.atan2(Math.sin(-Math.PI / 2 - m.heading), Math.cos(-Math.PI / 2 - m.heading)), turn = Math.abs(d) > .05 ? Math.sign(d) : 0; step(r, { turn, x: -turn, y: 0, boost: false }) }
  const seen = new Map(); let markers = 0, moved = 0, inView = 0, samples = 0, spawned = 0, off = [];
  for (let i = 0; i < 120 * 12; i++) {
    const before = new Map((r.warns || []).map(w => [w, seen.get(w)]));
    const pn = (r.pursuers || []).length;
    step(r, { turn: -1, x: 1, y: 0, boost: false }); if (r.medium.kind !== 'water') break;
    const F = r.wetFrame; if (!F) continue;
    const o = H.DEMO && typeof H.demoSeen === 'function' ? H.demoSeen(F) : F.origin, V = H.Ovv(r);
    for (const w of r.warns || []) {
      const at = { x: o.x + w.x, y: o.y + Math.max(w.y, -o.y + w.c + 4) };
      if (!seen.has(w)) { seen.set(w, at); markers++ } else if (Math.hypot(at.x - seen.get(w).x, at.y - seen.get(w).y) > .01) moved++;
      samples++; if (Math.abs(at.x - V.x) < V.w && Math.abs(at.y - V.y) < V.h) inView++;
    }
    // markers resolved this step: their enemies are the new pursuers
    const gone = [...before.keys()].filter(w => !(r.warns || []).includes(w)), fresh = (r.pursuers || []).slice(pn);
    for (const w of gone) { const at = seen.get(w); const p = fresh.shift(); if (!p || !at) continue; spawned++; off.push(Math.hypot(p.x - at.x, p.y - at.y)) }
  }
  const ok = markers > 0 && moved === 0 && inView / samples > .95 && Math.max(0, ...off) < 6; if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} wave ${wave}: ${markers} markers, ${moved} moves while waiting, in view ${Math.round(inView / Math.max(1, samples) * 100)}%, ${spawned} enemies appeared, at most ${Math.max(0, ...off).toFixed(1)} m from their marker`);
}
process.exit(fail ? 1 : 0);

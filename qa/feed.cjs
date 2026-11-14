// Feed and frenzy baseline (docs/FEED_FRENZY_PLAN.md): rule checks for what tune.feed changes, on the built game.
//   node qa/feed.cjs
'use strict';
const assert = require('assert/strict'), path = require('path');
const { load } = require('./load.cjs');
const file = path.join(__dirname, '..', 'ICARUS-demo.html');
const game = tune => load(file, new Map([['icarus.scoreshow.tune', JSON.stringify(tune)]]), { bake: true, modern: true });
const ON = game({ feed: 1 }), OFF = game({ feed: 0 });
const POOL = ['harpoon', 'trident', 'tuna_gaff', 'spitter', 'pressure_cannon', 'squid_launcher', 'riptide_carbine'];
let passed = 0, failed = 0;
// the game runs in its own vm context, so compare its arrays by value
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
function test(name, fn) { try { const d = fn(); passed++; console.log('PASS ' + name + (d ? '  ' + d : '')); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
function shopRun(G, wave, seed) { const r = G.Hd(seed); r.wave = wave; G.DEMO.wave(r); r.mode = 'shop'; r.lvup = 0; r.xp = 5000; G.DEMO.shop(r); return r; }

test('a run starts with one tier 1 Harpoon', () => { const r = ON.Hd(1); same(r.slots.map(g => [g.id, g.lvl]), [['harpoon', 1]]); });
test('the Harpoon keeps its own numbers', () => {
  const w = ON.DEMO.weapons.harpoon;
  same(w.damage, [14, 24, 36, 50]); same(w.cd, [40, 36, 32, 28]); same(w.crit, [.3, .35, .4, .45]);
  same(w.cx, [2.25, 2.5, 2.75, 3]); assert.equal(w.range[0], 30); assert.equal(w.pierce[0], 2); assert.equal(w.type, 'Shot');
});
test('the Harpoon is the only start weapon', () => { const s = Object.keys(ON.DEMO.weapons).filter(k => ON.DEMO.weapons[k].starter); same(s, ['harpoon']); });
test('the draw has a colour for the Harpoon', () => { assert(/^#[0-9a-f]{6}$/i.test(ON.Q.harpoon.color)); });
test('the shop sells only the baseline pool, and every pool weapon appears', () => {
  const seen = new Set(); for (let s = 1; s <= 300; s++) for (const o of shopRun(ON, 1 + s % 15, s).demo.offers) if (o.row === 'weapon') { assert(POOL.includes(o.id), o.id); seen.add(o.id); }
  for (const k of POOL) assert(seen.has(k), k + ' never offered'); return seen.size + ' weapons';
});
test('buying a second Harpoon combines into tier 2', () => {
  const r = shopRun(ON, 3, 7), D = ON.DEMO; r.demo.offers[0] = { uid: 9001, row: 'weapon', id: 'harpoon', level: 1, price: 10 };
  assert.equal(D.command(r, 'buy', 9001), true); const i = r.slots.findIndex(g => g.id === 'harpoon'); assert.equal(D.command(r, 'combine', i), true);
  same(r.slots.map(g => [g.id, g.lvl]), [['harpoon', 2]]);
});
test('with the setting off, the game is as before: no Harpoon, the port starters, the whole armoury on sale', () => {
  const D = OFF.DEMO; assert(!D.weapons.harpoon); assert.notEqual(OFF.Hd(1).slots[0].id, 'harpoon');
  const seen = new Set(); for (let s = 1; s <= 300; s++) for (const o of shopRun(OFF, 1 + s % 15, s).demo.offers) if (o.row === 'weapon') seen.add(o.id);
  assert(seen.size > POOL.length + 10, 'only ' + seen.size + ' weapons offered'); return seen.size + ' weapons offered';
});

// Step 1: the jump ramp. Fly real jumps with the test bot and read each launch speed at the breach.
function launches(G, wave, n, seed = 3) {
  const { flyer } = require('./bot.cjs'), D = G.DEMO, r = G.Hd(seed); r.wave = wave; D.wave(r);
  const f = flyer(G, 'mid-keep', seed, { keep: 8 }), out = []; let prev = r.medium.kind, t = 0;
  while (t < 120 * 200 && r.mode === 'playing' && out.length < n) { r.hp = 1e9; const it = f(r); if (r.medium.kind === 'air' && r.budget <= 0) it.y = -1; G.sw(r, it); t++; if (prev === 'water' && r.medium.kind === 'air') out.push(Math.hypot(r.medium.vx, r.medium.vy)); prev = r.medium.kind; }
  return out;
}
test('jump n of wave w launches at min(30 + 5(n − 1), 30 + 5(w − 1)) m/s', () => {
  for (const w of [1, 4, 6, 10]) { const v = launches(ON, w, 12); assert(v.length >= Math.min(w, 5) + 1, 'only ' + v.length + ' jumps at wave ' + w);  // enough to pass the cap (wave 1 ends after about 6)
    v.forEach((x, i) => { const want = Math.min(30 + 5 * i, 30 + 5 * (w - 1)); assert(Math.abs(x - want) < .5, `wave ${w} jump ${i + 1}: ${x.toFixed(1)} vs ${want}`); }); }
  return 'waves 1, 4, 6 and 10';
});
test('wave 1 plays exactly as before: every jump at 30 m/s', () => { for (const x of launches(ON, 1, 8)) assert(Math.abs(x - 30) < .5, x); });
test('with the setting off, every jump of a wave launches at the wave speed', () => { for (const x of launches(OFF, 6, 8)) assert(Math.abs(x - 55) < .5, x); });
test('the count starts again each wave', () => { const G = ON, D = G.DEMO, r = G.Hd(2); r.wave = 6; D.wave(r); r.demo.jumps = 5; D.wave(r); assert.equal(r.demo.jumps, 0); });

console.log(JSON.stringify({ round: 'feed', passed, failed }));
process.exit(failed ? 1 : 0);

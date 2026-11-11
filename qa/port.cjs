// The armory (docs/BROTATO_PORT.md): weapon, item, stat and shop rules on the built game.
//   node qa/port.cjs          rule checks
//   node qa/port.cjs --runs   also plays bot runs and prints a per-wave table
//     --bot=god|reach         god cannot die (levels and income to wave 20); reach flies inside its weapons' reach
//     --seeds=1,2             seeds for the bot runs
'use strict';
const assert = require('assert/strict'), path = require('path');
const { load } = require('./load.cjs');
const { flyer } = require('./bot.cjs');
const file = path.join(__dirname, '..', 'ICARUS-demo.html');
const game = tune => load(file, new Map([['icarus.scoreshow.tune', JSON.stringify(tune)]]), { bake: true, modern: true });
const H = game({}), D = H.DEMO, OFF = game({ port: 0 });
const W = D.weapons, ids = Object.keys(W), START = ids.find(k => W[k].starter);
let failed = 0, passed = 0;
function test(name, fn) { try { const d = fn(); passed++; console.log('PASS ' + name + (d ? '  ' + d : '')); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + e.message); } }
function shopRun(wave = 1, seed = 1, G = H) { const r = G.Hd(seed); r.wave = wave; G.DEMO.wave(r); for (let i = 0; i < 50; i++) G.ce(r); r.mode = 'shop'; r.lvup = 0; r.xp = 5000; G.DEMO.shop(r); return r; }
const near = (a, b, tol, what) => assert(Math.abs(a - b) <= tol, `${what}: ${a} vs ${b}`);
const zero = r => { for (const k of Object.keys(r.demo.stats)) r.demo.stats[k] = 0; r.demo.classBonus = {}; };
const find = f => { const k = ids.find(id => [1, 2, 3, 4].some(t => D.tier(W[id].damage, t) != null && f(W[id], t))); assert(k, 'no weapon fits'); const t = [1, 2, 3, 4].find(t => D.tier(W[k].damage, t) != null && f(W[k], t)); return { id: k, t, d: W[k] }; };
const item = f => { const x = Object.values(D.ITEMS).find(f); assert(x, 'no item fits'); return x; };
function arena(r, n = 3) {
  r.mode = 'playing'; r.armed = false; r.hurt = 0; r.medium = { kind: 'air', elapsed: 1, origin: { x: 0, y: 0 }, local: { x: 0, y: 10 }, vx: 10, vy: 0, velocity: { x: 0, y: 0 } };
  r.enemies = Array.from({ length: n }, (_, i) => ({ id: 1000 + i, kind: 'chaser', pos: { x: 3 + i * 2, y: 10 }, velocity: { x: 0, y: 0 }, hp: 1e9, maxHp: 1e9, radius: .5, kv: 1, xp: 1 })); r.shots = [];
  if (!r.hand) r.hand = { kills: [], K: 0, phaseChips: {}, activeAir: 0, pred: { air: 1, apex: .5 }, hits: 0, hpLost: 0, attackKills: {}, bonus: {}, launch: { angle: 1 } };
  return r;
}
const hitRec = (base = 10, x = {}) => ({ d: null, l: 1, g: null, base, mul: 1, cc: 0, cx: 2, kb: 0, fx: [], ls: 0, ctx: { primary: true, weapon: START }, ...x });
const fly = (r, secs) => { for (let i = 0; i < secs * 120; i++) D.shots(r, 1 / 120, true); };

test('the catalogue replaced the old weapons and gear', () => { for (const old of ['harpoon', 'laser', 'flak']) assert(!W[old], old); assert(ids.length >= 48); assert(Object.keys(D.ITEMS).length >= 105); for (const k of ids) assert(W[k].armory && W[k].classes.length >= 1, k); return `${ids.length} weapons, ${Object.keys(D.ITEMS).length} items`; });
test('a run starts with 30 pearls and a starter weapon', () => { const r = H.Hd(1); assert.equal(r.xp, 30); assert.equal(r.slots.length, 1); assert(W[r.slots[0].id].starter); });
test('price formula at waves 1, 10, 20', () => { for (const [w, base, want] of [[1, 10, 12], [10, 10, 30], [20, 10, 50], [1, 50, 56], [10, 50, 110], [20, 50, 170]]) { const r = shopRun(1); r.wave = w; assert.equal(D.price(r, base), want); } });
test('Item price stat changes prices', () => { const r = shopRun(1); r.wave = 10; r.demo.stats['Item price'] = -.1; assert.equal(D.price(r, 10), 27); });
test('reroll price climbs within a shop', () => { for (const [w, want] of [[1, [1, 2, 3]], [10, [11, 15, 19]], [20, [23, 31, 39]]]) { const r = shopRun(1); r.wave = w; want.forEach((c, n) => { r.demo.rerolls.shelf = n; assert.equal(D.rerollCost(r), c); }); } });
test('rerolling charges that price and keeps locked offers', () => { const r = shopRun(4), o = r.demo.offers[0]; D.command(r, 'lock', o.uid); const xp = r.xp, c = D.rerollCost(r); assert.equal(D.command(r, 'reroll', 'shelf'), true); assert.equal(r.xp, xp - c); assert(r.demo.offers.includes(o)); assert.equal(r.demo.offers.length, 4); });
test('tier odds match the table', () => { const r = shopRun(1), roll = (w, n = 40000) => { const c = [0, 0, 0, 0]; for (let i = 0; i < n; i++) c[D.tierRoll(r, w) - 1]++; return c.map(x => x / n); }; for (const [w, t] of [[3, [.88, .12, 0, 0]], [5, [.76, .20, .04, 0]], [10, [.46, .40, .13, .01]], [20, [.40, .35, .22, .03]]]) roll(w).forEach((v, i) => near(v, t[i], .012, `wave ${w} tier ${i + 1}`)); });
test('four offers; waves 1-2 guarantee two weapons, 3-5 one, later 35%; no repeats in a shop', () => {
  let w10 = 0, n = 0; for (let s = 1; s <= 300; s++) {
    for (const [w, min] of [[1, 2], [2, 2], [3, 1], [5, 1]]) { const r = shopRun(w, s), o = r.demo.offers; assert.equal(o.length, 4); assert(o.filter(x => x.row === 'weapon').length >= min); assert(o.every(x => ['weapon', 'armory'].includes(x.row))); const keys = o.map(x => x.row + x.id + (x.level || '')); assert.equal(new Set(keys).size, 4, keys.join()); }
    const r = shopRun(10, s); w10 += r.demo.offers.filter(o => o.row === 'weapon').length; n += 4;
  } near(w10 / n, .35, .03, 'weapon share at wave 10');
});
test('with six weapons every offer is an item', () => { for (let s = 1; s <= 60; s++) { const r = shopRun(1, s); while (r.slots.length < 6) r.slots.push(H.Owslot(START, 1, 900 + r.slots.length)); D.sync(r); r.demo.offers = []; D.shop(r); assert(r.demo.offers.every(o => o.row === 'armory')); } });
test('weapons are only offered at tiers they exist in', () => { for (let s = 1; s <= 400; s++) for (const o of shopRun(12, s).demo.offers) if (o.row === 'weapon') assert(D.tier(W[o.id].damage, o.level) != null, o.id + o.level); });
test('item limits are respected', () => { const x = item(i => i.max > 0), r = shopRun(1); r.demo.aItems = { [x.id]: x.max }; for (let i = 0; i < 2000; i++) { r.demo.offers = []; D.shop(r); assert(r.demo.offers.every(o => o.id !== x.id)); } });
test('buying an item applies its numbers and counts it', () => { const x = item(i => i.fx.some(f => f.s === 'Close')), r = shopRun(1); zero(r); const o = { uid: 5000, row: 'armory', id: x.id, price: 10 }; r.demo.offers = [o]; assert.equal(D.command(r, 'buy', 5000), true); assert.equal(r.demo.aItems[x.id], 1); near(r.demo.stats.Close, x.fx.find(f => f.s === 'Close').v, 1e-9, 'Close'); });
test('free rerolls cost nothing until used', () => { const x = item(i => i.fx.some(f => f.k === 'freeroll')), r = shopRun(10); r.demo.aItems = { [x.id]: 1 }; assert.equal(D.rerollCost(r), 0); r.demo.rerolls.shelf = 1; assert.equal(D.rerollCost(r), 11); });
test('hit protection ignores the first hit of a wave', () => { const x = item(i => i.fx.some(f => f.k === 'hitprot')), r = H.Hd(5); zero(r); r.demo.aItems = { [x.id]: 1 }; D.wave(r); D.sync(r); arena(r); r.hp = 100; D.hit(r, 20); assert.equal(r.hp, 100); arena(r); D.hit(r, 20); assert(r.hp < 100); });
test('end-of-wave items add their stat', () => { const x = item(i => i.fx.some(f => f.k === 'endwave')), f = x.fx.find(y => y.k === 'endwave'), r = H.Hd(5); zero(r); r.demo.aItems = { [x.id]: 2 }; D.sync(r); const b = r.demo.stats[f.s]; r.mode = 'playing'; r.wave = 1; D.finish(r); near(r.demo.stats[f.s], b + 2 * f.v, 1e-9, f.s); });
test('selling a weapon pays a quarter of the current price', () => { const r = shopRun(10), g = H.Owslot(START, 1, 901); r.slots.push(g); g.paid = 999; const want = Math.floor(.25 * D.weaponPrice(r, START, 1)), xp = r.xp; assert.equal(D.command(r, 'sell', 1), true); assert.equal(r.xp, xp + want); });
test('two of a tier combine and free a slot', () => { const r = shopRun(1); r.slots.push(H.Owslot(r.slots[0].id, 1, 901)); D.sync(r); assert.equal(D.command(r, 'combine', 0), true); assert.equal(r.slots.length, 1); assert.equal(r.slots[0].lvl, 2); });
test('level-ups offer four of sixteen stats; fixed tiers; rerollable', () => {
  const seen = new Set(); for (let s = 1; s <= 300; s++) { const r = shopRun(3, s); r.lvl = 2; r.lvup = 1; D.levelChoices(r); const L = r.demo.levelChoices; assert.equal(L.length, 4); assert.equal(new Set(L.map(c => c.id)).size, 4); L.forEach(c => seen.add(c.id)); } assert.equal(seen.size, 16, [...seen].join());
  for (const [lv, t] of [[5, 2], [10, 3], [15, 3], [20, 3]]) { const r = shopRun(3); r.lvl = lv; r.lvup = 1; D.levelChoices(r); assert(r.demo.levelChoices.every(c => c.level === t)); }
  const r = shopRun(3); r.lvl = 2; r.lvup = 1; D.levelChoices(r); const xp = r.xp; assert.equal(D.command(r, 'levelReroll', ''), true); assert.equal(r.xp, xp - 3); });
test('each level adds 10 Max HP', () => { const r = shopRun(1); r.lvl = 3; D.sync(r); assert.equal(r.stats.maxHp, 130); });
test('damage: base plus scaling truncated, then percent rounded', () => { const { id, t, d } = find((w, t) => D.tier(w.scale, t).length === 1 && D.tier(w.scale, t)[0][0] === 'Close'), r = H.Hd(2); zero(r); r.demo.stats.Close = 7; r.demo.stats['Damage %'] = .25; D.sync(r); const p = D.tier(d.scale, t)[0][1]; assert.equal(D.aBase(r, d, t, { id }), Math.max(1, Math.round(Math.max(1, Math.trunc(D.tier(d.damage, t) + 7 * p)) * 1.25))); });
test('cooldown: attack speed, random share, big reloads, melee swing time', () => {
  const R = find((w, t) => w.kind === 'ranged' && !(D.tier(w.every, t) > 0)), r = H.Hd(2); zero(r); D.sync(r); const c = D.tier(R.d.cd, R.t), mr = Math.min(c / 5, 5); for (let i = 0; i < 2000; i++) { const f = D.aNextCd(r, R.d, R.t, { shots: 1 }, 5) * 60; assert(f >= Math.max(1, c - mr) - 1e-6 && f <= c + mr + 1e-6, String(f)); }
  r.demo.stats['Attack speed'] = 1; const fast = Math.max(2, Math.trunc(c / 2)), m2 = Math.min(fast / 5, 5); for (let i = 0; i < 500; i++) assert(D.aNextCd(r, R.d, R.t, { shots: 1 }, 5) * 60 <= fast + m2 + 1e-6);
  const B = find((w, t) => w.kind === 'ranged' && D.tier(w.every, t) > 0); r.demo.stats['Attack speed'] = 0; near(D.aNextCd(r, B.d, B.t, { shots: D.tier(B.d.every, B.t) }, 5) * 60, Math.max(2, D.tier(B.d.cd, B.t)) * D.tier(B.d.mult, B.t), 1e-6, 'big reload');
  const M = find(w => w.kind === 'melee'), cd = D.tier(M.d.cd, M.t), rec = D.tier(M.d.recoil, M.t), atk = .2 + (5 * 25 / 70) * .15, mn = Math.max(1, cd - Math.min(cd / 5, 5)) / 60 + atk / 2 + .2 + rec; assert(D.aNextCd(r, M.d, M.t, { shots: 1 }, 5) >= mn - 1e-6, 'melee swing time');
});
test('class bonuses need two weapons, count duplicates, and leave with the weapon', () => { const c = find(w => Object.values(D.CLASSES[w.classes[0]]).some(a => a[0] && a[1])), cls = c.d.classes[0], [st] = Object.entries(D.CLASSES[cls]).find(([, a]) => a[0] && a[1]), r = H.Hd(2); zero(r); r.slots = [H.Owslot(c.id, c.t, 1)]; D.sync(r); const b = r.demo.stats[st]; r.slots.push(H.Owslot(c.id, c.t, 2)); D.sync(r); assert(r.demo.stats[st] !== b); r.slots.pop(); D.sync(r); near(r.demo.stats[st], b, 1e-9, 'gone'); });
test('Dodge is capped at 60%', () => { const r = H.Hd(5); zero(r); r.demo.stats.Dodge = 1; D.sync(r); let hurt = 0; const n = 5000; for (let i = 0; i < n; i++) { arena(r); r.hp = r.stats.maxHp; D.hit(r, 10); if (r.hp < r.stats.maxHp) hurt++; } near(hurt / n, .4, .03, 'hit share'); });
test('Armour reduces damage; negative raises it', () => { const r = H.Hd(5); zero(r); r.demo.stats.Armour = 15; D.sync(r); arena(r); r.hp = 100; D.hit(r, 20); near(r.hp, 90, 1e-6, '+15'); r.demo.stats.Armour = -15; D.sync(r); arena(r); r.hp = 100; D.hit(r, 20); near(r.hp, 70, 1e-6, '-15'); });
test('Harvesting pays at wave end, then grows', () => { const r = H.Hd(5); zero(r); r.mode = 'playing'; r.wave = 1; r.demo.stats.Harvesting = 10; const xp = r.xp; D.finish(r); assert.equal(r.xp, xp + 10); assert.equal(r.demo.stats.Harvesting, 11); });
test('XP gain raises XP but not money', () => { const r = H.Hd(5); zero(r); r.demo.stats['XP gain'] = 1; D.sync(r); const xp = r.xp, l = r.lxp; H.Oxepay(r, 4, { x: 0, y: 0 }); assert.equal(r.xp, xp + 4); assert.equal(r.lxp, l + 8); });
test('critical hits multiply, then round', () => { const r = H.Hd(5); zero(r); D.sync(r); arena(r, 1); const e = r.enemies[0], hp = e.hp; D.aHit(r, e, hitRec(7, { cc: 1, cx: 1.5 }), 1, 0); near(hp - e.hp, Math.round(7 * 1.5) * H.OwB.hp, 1e-6, 'crit'); });
test('burn ticks every half second for its duration', () => { const r = H.Hd(5); zero(r); D.sync(r); arena(r, 1); const e = r.enemies[0]; D.aHit(r, e, hitRec(1, { fx: [{ k: 'burn', c: 1, d: 3, t: 3, sp: 0, scale: [] }] }), 1, 0); const after = e.hp; for (let i = 0; i < 300; i++) D.aTick(r, 1 / 120); near(after - e.hp, 3 * 3 * H.OwB.hp, 1e-6, 'three ticks'); assert.equal(e.burn, null); });
test('an explosion replaces the direct hit and reaches everyone in its radius', () => { const r = H.Hd(5); zero(r); D.sync(r); arena(r, 3); const R = 147.34 / 25; r.enemies[1].pos = { x: 3 + R - .1, y: 10 }; r.enemies[2].pos = { x: 3 + R + 2, y: 10 }; const [a, b, c] = r.enemies.map(e => e.hp); D.aHit(r, r.enemies[0], hitRec(10, { fx: [{ k: 'explode', c: 1, r: 1 }] }), 1, 0); assert(r.enemies[0].hp < a); assert(r.enemies[1].hp < b); assert.equal(r.enemies[2].hp, c); });
test('Explosion size scales the radius', () => { const r = H.Hd(5); zero(r); r.demo.stats['Explosion size'] = 1; D.sync(r); arena(r, 2); const R = 147.34 / 25; r.enemies[1].pos = { x: 3 + 1.5 * R, y: 10 }; const b = r.enemies[1].hp; D.aHit(r, r.enemies[0], hitRec(10, { fx: [{ k: 'explode', c: 1, r: 1 }] }), 1, 0); assert(r.enemies[1].hp < b); });
test('a shot pierces then stops, losing damage each time', () => {
  const r = H.Hd(7); zero(r); D.sync(r); arena(r, 4); const hp = r.enemies.map(e => e.hp);
  r.shots = [{ id: 1, weapon: START, pos: { x: 1, y: 10 }, velocity: { x: 40, y: 0 }, radius: .3, life: 2, hit: [], arm: hitRec(100), pierce: 2, pdr: .3, bounce: 0, bdr: .5 }]; fly(r, 1); const dealt = r.enemies.map((e, i) => (hp[i] - e.hp) / H.OwB.hp); near(dealt[0], 100, 1e-6, 'first'); near(dealt[1], 70, 1e-6, 'second'); near(dealt[2], 49, 1e-6, 'third'); assert.equal(dealt[3], 0);
});
test('a bouncing shot retargets and loses damage', () => { const r = H.Hd(7); zero(r); D.sync(r); arena(r, 3); const hp = r.enemies.map(e => e.hp); r.shots = [{ id: 1, weapon: START, pos: { x: 1, y: 10 }, velocity: { x: 40, y: 0 }, radius: .3, life: 2, hit: [], arm: hitRec(100), pierce: 0, pdr: 0, bounce: 1, bdr: .5 }]; fly(r, 2); const d = r.enemies.map((e, i) => (hp[i] - e.hp) / H.OwB.hp).filter(x => x > 0).sort((a, b) => b - a); assert.equal(d.length, 2, d.join()); near(d[1], 50, 1e-6, 'bounced damage'); });
test('life steal heals at most once per 0.1 s', () => { const r = H.Hd(5); zero(r); r.demo.stats['Life steal'] = 1; D.sync(r); arena(r, 1); r.demo.air = 5; r.hp = 50; D.aHit(r, r.enemies[0], hitRec(1), 1, 0); assert.equal(r.hp, 60); D.aHit(r, r.enemies[0], hitRec(1), 1, 0); assert.equal(r.hp, 60); r.demo.air = 5.2; D.aHit(r, r.enemies[0], hitRec(1), 1, 0); assert.equal(r.hp, 70); });
test('every weapon fires and deals damage in a real tick', () => { for (const id of ids) { const t = W[id].min, r = H.Hd(9); zero(r); r.slots = [H.Owslot(id, t, 1)]; r.slots[0].cd = 0; D.sync(r); arena(r, 5); r.enemies.forEach((e, i) => e.pos = { x: 2 + i * .6, y: 10 }); const hp = r.enemies.map(e => e.hp); D.fire(r, 1 / 120); assert(r.slots[0].cd > 0, id + ' did not fire'); fly(r, 1); assert(r.enemies.some((e, i) => e.hp < hp[i]), id + ' dealt nothing'); } return ids.length + ' weapons'; });
test('the setting restores the old game', () => { const r = shopRun(1, 1, OFF), Do = OFF.DEMO; assert.equal(OFF.Hd(1, 'harpoon').xp, 0); assert(Do.weapons.harpoon); assert.equal(Do.rerollCost(r), 2); for (let s = 1; s <= 100; s++) for (const o of shopRun(6, s, OFF).demo.offers) if (o.row === 'weapon') assert(!Do.weapons[o.id].port, o.id); });

if (process.argv.includes('--runs')) {
  // bot modes (trick-ladders plan, step 0): --bot=god cannot die, for counting levels and income to wave 20;
  // --bot=reach flies inside its weapons' reach, for balance runs; anything else is the 2026-11-08 bot (holds 8 m).
  const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
  const BOT = arg('bot', 'normal'), SEEDS = String(arg('seeds', '1,2')).split(',').map(Number);
  const PREF = ['Attack speed', 'Damage %', 'Shot', 'Close', 'Blast', 'Armour', 'Max HP', 'Crit', 'Regen', 'Dodge', 'Life steal', 'Harvesting', 'Reach', 'Luck', 'Air steering', 'Engineering'], rows = {};
  function play(style, seed) {
    const G = game({}), Dm = G.DEMO, r = G.Hd(seed);
    // the in-reach bot holds at 80% of its shortest weapon's reach, so every gun can hit
    const keep = BOT === 'reach' ? () => Math.max(2, Math.min(...r.slots.map(g => Dm.tier(Dm.weapons[g.id].range, g.lvl) ?? 6)) * .8) : 8;
    const flyr = flyer(G, style, seed, { keep }); let t = 0;
    const seenIds = new Set(); let wDmg = 0, wHealth = 0;   // this wave's damage landed and health sent (wave budget spends during the air phases)
    while (['playing', 'shop'].includes(r.mode) && t < 120 * 60 * 40) {
      if (god()) r.hp = 1e9;   // far above max, as qa/jumpstyle.cjs does: a whole wave's burst can land in one tick late on
      if (r.mode === 'shop') {
        const x = (rows[r.wave] ||= { n: 0, income: 0, pearls: 0, buys: 0, lvl: 0, close: 0, shot: 0, blast: 0, guns: 0, tier: 0, hp: 0, dmg: 0, health: 0 });
        x.n++; x.income += r.earned - (r._e || 0); r._e = r.earned; x.pearls += r.xp; x.lvl += r.lvl; x.hp += r.stats.maxHp; x.guns += r.slots.length; x.tier += r.slots.reduce((a, g) => a + g.lvl, 0) / r.slots.length;
        x.dmg += wDmg; x.health += wHealth; wDmg = 0; wHealth = 0;
        for (const s of ['Close', 'Shot', 'Blast']) x[s.toLowerCase()] += r.demo.stats[s] || 0;
        for (let i = 0; r.lvup && i < 60; i++) { const L = r.demo.levelChoices, b = L.map((c, i) => ({ i, s: 100 - PREF.indexOf(c.id) })).sort((a, b) => b.s - a.s)[0]; Dm.command(r, 'level', b.i); }
        for (let p = 0; p < 3; p++) { for (const o of r.demo.offers) { if (o.bought || o.price > r.xp) continue; if (o.row !== 'weapon' || r.slots.length < 6) if (Dm.command(r, 'buy', o.uid)) x.buys++; } for (let i = 0; i < r.slots.length; i++) Dm.command(r, 'combine', i); if (r.xp > Dm.rerollCost(r) * 3) Dm.command(r, 'reroll', 'shelf'); }
        Dm.command(r, 'next'); continue;
      }
      const intent = flyr(r); if (r.medium.kind === 'air' && r.budget <= 0) intent.y = -1; G.sw(r, intent); t++;
      for (const e of r.enemies) if (!seenIds.has(e.id)) { seenIds.add(e.id); wHealth += e.maxHp }
      for (const ev of r.events || []) if (ev.kind === 'damage') wDmg += ev.applied ?? ev.value;
    }
    return { style, seed, wave: r.wave, mode: r.mode, reason: r.endReason || '', lvl: r.lvl, earned: r.earned, guns: r.slots.map(g => g.id + g.lvl).join(' ') };
  }
  const god = () => BOT === 'god';
  const out = []; for (const seed of SEEDS) for (const style of ['mid-keep', 'low-keep', 'high-keep']) out.push(play(style, seed));
  console.log(`\nbot: ${BOT}   wave  runs  income  pearls  buys  level  Close  Shot  Blast  guns  avgTier  maxHP  dmg/health`);
  for (const w of Object.keys(rows).map(Number).sort((a, b) => a - b)) { const x = rows[w], f = v => (v / x.n).toFixed(1).padStart(6); console.log(String(w).padStart(12), String(x.n).padStart(5), f(x.income), f(x.pearls), f(x.buys), f(x.lvl), f(x.close), f(x.shot), f(x.blast), f(x.guns), f(x.tier), f(x.hp), (x.health ? Math.round(100 * x.dmg / x.health) + '%' : '–').padStart(6)); }
  for (const o of out) console.log(JSON.stringify(o));
}
console.log(JSON.stringify({ round: 'port', passed, failed }));
if (failed) process.exit(1);

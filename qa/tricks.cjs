// The four tricks (ICARUS_DESIGN.md §4.3-4.4, step 2 of §4.17; source/tricks.js): chosen under water with W A S D,
// carried over, never dealing damage; each boosts its weapon type's damage for the flight and does one thing at its
// moment: Charge (Front flip), Repulse (Backflip), Time slow (Corkscrew), Shockwave and ×1.5 XP and pearls (Belly flop).
//   node qa/tricks.cjs [--detail]
const assert = require('assert'), path = require('path');
const { load } = require('./load.cjs');
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify({})]]), { bake: true, modern: true }), D = H.DEMO, T = H.Tricks;
const checks = [];
function test(name, fn) { try { const detail = fn(); checks.push({ name, pass: true, detail }); console.log('PASS ' + name) } catch (e) { checks.push({ name, pass: false, error: e.stack }); console.log('FAIL ' + name + ': ' + e.message) } }
const DT = 1 / 120, still = { x: 0, y: 0, w: false, turn: 0, boost: false };

// a run with this trick chosen under water, then a flight that has just opened, moving right
function run(id, guns = ['harpoon']) {
  const r = H.Hd(7, 'harpoon');
  r.slots = guns.map(g => { const s = H.Owslot(g, 1, ++r.demo.uid); s.paid = 0; s.cd = 1e9; return s }); D.sync(r);
  if (id) assert.ok(T.choose(r, id), 'chosen under water');
  r.medium = { kind: 'air', origin: { x: 0, y: 100 }, local: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, vx: 20, vy: 0.001, elapsed: 1, heading: 1, waterScale: 1, exitFlight: false };
  r.bw = r.wave; r.bt = 0; r.bk = 0; r.bg = []; r.bq = []; r.warns = []; r.demo.bossSpawned = true; r.budget = 99; D.open(r); return r;
}
function foe(r, x, y, kind = 'chaser') { D.spawn(r, false, 0); const e = r.enemies.at(-1); e.kind = kind; e.pos = { x, y }; e.velocity = { x: 0, y: 0 }; e.hp = e.maxHp = 1e6; e.timer = 1e9; e.armour = null; e.mv = null; return e }
// the real enemy step (v3's ME with every wrapper, the tricks' included)
const enemyStep = (r, n = 1) => { for (let i = 0; i < n; i++) H.ME(r, r.medium, still, DT) };
const hurt = (r, e) => e.maxHp - e.hp;

test('a trick is chosen only under water, and the choice carries over to later flights', () => {
  const r = H.Hd(3, 'harpoon');
  assert.equal(T.chosen(r), null);
  assert.ok(T.choose(r, 'back')); assert.equal(T.chosen(r), 'back');
  r.medium = { ...r.medium, kind: 'air', origin: { x: 0, y: 50 }, local: { x: 0, y: 0 }, vx: 20, vy: 1, elapsed: 1 };
  assert.equal(T.choose(r, 'front'), false, 'no choosing in the air'); assert.equal(T.chosen(r), 'back');
  D.open(r); assert.equal(r.hand.tk.id, 'back', 'the flight takes the choice');
  r.hand = null; D.open(r); assert.equal(r.hand.tk.id, 'back', 'carried over with no new choice');
  return T.KEYS;
});

test('each trick boosts only its weapon type (+30% damage); a two-tag weapon takes it if either tag matches', () => {
  const out = {};
  for (const id of T.IDS) {
    const r = run(id, ['fin', 'minigun', 'arc', 'harpoon', 'depth']);
    out[id] = Object.fromEntries(['fin', 'minigun', 'arc', 'flak', 'harpoon', 'depth'].map(w => { const e = foe(r, 30, 0); D.damage(r, e, 100, w, 0, 0, 0, false, { primary: true, weapon: w, base: 100 }); return [w, Math.round(hurt(r, e))] }));
  }
  assert.deepEqual(out.front, { fin: 130, minigun: 100, arc: 130, flak: 100, harpoon: 100, depth: 100 });
  assert.deepEqual(out.back, { fin: 100, minigun: 130, arc: 100, flak: 130, harpoon: 130, depth: 100 });
  assert.deepEqual(out.cork, { fin: 100, minigun: 100, arc: 130, flak: 130, harpoon: 100, depth: 130 });
  assert.deepEqual(out.flop, { fin: 100, minigun: 100, arc: 100, flak: 100, harpoon: 130, depth: 130 });
  const none = run(null), e = foe(none, 30, 0); D.damage(none, e, 100, 'fin', 0, 0, 0, false, { primary: true, weapon: 'fin', base: 100 }); assert.equal(hurt(none, e), 100, 'no trick, no boost');
  return out;
});

test('no trick deals damage', () => {
  const dealt = {};
  for (const id of T.IDS) {
    const r = run(id, []); const list = [foe(r, 2, 0), foe(r, 6, 3), foe(r, -8, -2), foe(r, 0, 11)]; r.hand.apex = true; r.hurt = 99;
    enemyStep(r, 240); T.entry(r);
    dealt[id] = Math.round(list.reduce((a, e) => a + hurt(r, e), 0));
  }
  for (const id of T.IDS) assert.equal(dealt[id], 0, id + ' dealt damage');
  return dealt;
});

test('Front flip: Charge makes you invulnerable for 1 s from the breach and shoves aside enemies you touch', () => {
  const r = run('front', []); r.hp = 100; const e = foe(r, 1.5, 0);
  D.hit(r, 30); assert.equal(r.hp, 100, 'no damage during Charge');
  enemyStep(r, 2); assert.ok(e.velocity.x > 20, 'shoved away: ' + e.velocity.x.toFixed(1));
  enemyStep(r, 120); r.hurt = 0; D.hit(r, 30); assert.ok(r.hp < 100, 'hits count again after Charge');
  const b = run('back', []); b.hp = 100; b.hurt = 0; D.hit(b, 30); assert.ok(b.hp < 100, 'other tricks give no invulnerability');
  return { hpAfter: Math.round(r.hp) };
});

test('Backflip: Repulse pushes enemies within 12 m away and leaves farther ones alone', () => {
  const r = run('back', []), nearE = [foe(r, 4, 0), foe(r, -3, 6), foe(r, 0, -10)], far = foe(r, 22, 0, 'turret');
  const d0 = nearE.map(e => Math.hypot(e.pos.x, e.pos.y)); enemyStep(r, 40);
  const d1 = nearE.map(e => Math.hypot(e.pos.x - r.medium.local.x, e.pos.y - r.medium.local.y));
  d1.forEach((d, i) => assert.ok(d > d0[i] + 6, `enemy ${i}: ${d0[i].toFixed(1)} → ${d.toFixed(1)} m`));
  assert.equal(r.hand.tk.touched, 3, 'only the enemies within reach');
  return { before: d0.map(x => +x.toFixed(1)), after: d1.map(x => +x.toFixed(1)) };
});

test('Corkscrew: from the apex, enemies and their shots move at half speed for 1.5 s; nothing slows before it', () => {
  const travel = (id, apex) => {
    const r = run(id, []), e = foe(r, 20, 0); e.velocity = { x: -10, y: 0 }; r.hand.apex = apex; r.hurt = 99;
    r.shots.push({ id: ++r.id, weapon: 'hostile', pos: { x: -15, y: 10 }, velocity: { x: 0, y: -10 }, life: 9, radius: .3, damage: 1, hit: [], bd: 1 }); const sh = r.shots.at(-1);
    enemyStep(r, 1); const x0 = e.pos.x, y0 = sh.pos.y; enemyStep(r, 60);
    return { enemy: +(x0 - e.pos.x).toFixed(2), shot: +(y0 - sh.pos.y).toFixed(2), slowT: +(r.slowT || 0).toFixed(2) };
  };
  const base = travel(null, true), cork = travel('cork', true), before = travel('cork', false);
  assert.ok(Math.abs(cork.shot / base.shot - .5) < .05, `shot ${base.shot} → ${cork.shot} m`);
  assert.ok(cork.enemy < base.enemy * .6, `enemy ${base.enemy} → ${cork.enemy} m`);
  assert.ok(Math.abs(before.shot - base.shot) < 1e-6, 'no slow before the apex');
  assert.ok(Math.abs(cork.slowT - (1.5 - 61 / 120)) < .02, 'lasts 1.5 s');
  return { base, cork, before };
});

test('Belly flop: the shockwave throws pursuers away from the landing; XP orbs and pearls ×1.5', () => {
  const r = run('flop', []), nearE = foe(r, 6, 0), far = foe(r, 25, 0);
  T.entry(r); assert.ok(r.shock.ids.has(nearE.id) && !r.shock.ids.has(far.id));
  r.pursuers = [{ id: nearE.id, x: r.shock.x + 6, y: r.shock.y, h: Math.PI, v: 5 }, { id: far.id, x: r.shock.x + 25, y: r.shock.y, h: Math.PI, v: 5 }];
  r.medium = { kind: 'water', pos: { x: 0, y: -1 }, velocity: { x: 10, y: -10 }, heading: -1 };
  T.shockwave(r);
  assert.ok(Math.abs(r.pursuers[0].h) < 1e-9 && r.pursuers[0].v === T.P.shockV, 'thrown outward'); assert.equal(r.pursuers[1].v, 5, 'far pursuer untouched');
  // orbs and pearls
  const orb = id => { const q = run(id, []), e = foe(q, 5, 0); q.eorbs = []; H.Oxedrop(q, q.medium, e); return q.eorbs[0].m };
  assert.equal(orb('flop'), orb('back') * 1.5);
  const pearls = id => { const q = run(id, []); for (let i = 0; i < 9; i++) q.hand.kills.push({}); D.bank(q); return q.demo.history.at(-1).pearls };
  assert.equal(pearls('flop'), Math.round(pearls('back') * 1.5));
  return { orbFlop: orb('flop'), pearls: [pearls('back'), pearls('flop')] };
});

test('the four tricks replace the routine: no routine trick, no shop trick place, no title pick', () => {
  const r = H.Hd(5, 'harpoon');
  assert.equal(H.Routine.on(r), false); assert.equal(Object.keys(r.demo.routine?.levels || {}).length, 0, 'no routine trick at the start');
  r.mode = 'shop'; D.shop(r); assert.ok(!r.demo.offers.some(o => o.row === 'trick'), 'no trick place in the shop');
  return r.demo.offers.map(o => o.row);
});

const failed = checks.filter(c => !c.pass).length;
if (process.argv.includes('--detail')) for (const c of checks) if (c.detail !== undefined) console.log(c.name, JSON.stringify(c.detail));
console.log(JSON.stringify({ round: 'tricks', passed: checks.length - failed, failed }));
if (failed) process.exit(1);

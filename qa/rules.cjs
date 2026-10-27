// Step 4's rules (ICARUS_DESIGN.md §4.6, §4.7; designer's answers 2026-10-27): no quota, reels or charms; 0 HP ends the
// run; each flight's style score = kills × mult (1 until step 5) × clean streak (cap 5, survives the shop), paid at the
// splashdown as round(3 × √score) pearls; a wave pays 24 + 4 × wave plus 10% interest on saved pearls (at most 10).
//   node qa/rules.cjs
const assert = require('assert'), path = require('path');
const { load } = require('./load.cjs'), { flyer } = require('./bot.cjs');
const file = path.join(__dirname, '..', 'ICARUS-demo.html');
const H = load(file, new Map([['icarus.scoreshow.tune', JSON.stringify({})]]), { bake: true, modern: true }), D = H.DEMO;
const checks = [];
function test(name, fn) { try { const detail = fn(); checks.push({ name, pass: true, detail }); console.log('PASS ' + name) } catch (e) { checks.push({ name, pass: false, error: e.stack }); console.log('FAIL ' + name + ': ' + e.message) } }

// a flight in the air, already open (as combat-integration's scene)
function flight(r) {
  r.medium = { kind: 'air', origin: { x: 0, y: 100 }, local: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, vx: 20, vy: 30, elapsed: 1, heading: 1, waterScale: 1, exitFlight: false };
  r.bw = r.wave; r.bt = 0; r.bk = 0; r.bg = []; r.bq = []; r.warns = []; r.demo.bossSpawned = true; D.open(r); return r;
}
function kill(r, n) { for (let i = 0; i < n; i++) { D.spawn(r, false, 0); const e = r.enemies.at(-1); e.pos = { x: 3, y: 0 }; D.damage(r, e, 1e9, 'harpoon') } }
function land(r) { D.bank(r); r.medium = { kind: 'water', pos: { x: 0, y: -3 }, heading: -1, velocity: { x: 10, y: -10 } } }

test('the rules are on by default', () => assert.equal(D.tune.rules, 1));

test('a clean flight scores kills × streak and pays round(3√score) pearls; the streak grows to its cap of 5', () => {
  const r = H.Hd(7, 'harpoon'), rows = [];
  for (let f = 1; f <= 7; f++) {
    flight(r); const xp = r.xp; kill(r, 4); land(r);
    const h = r.demo.history.at(-1), streak = Math.min(5, f), score = 4 * streak;
    assert.equal(h.streak, streak); assert.equal(h.score, score); assert.equal(h.pearls, Math.round(3 * Math.sqrt(score)));
    assert.equal(r.xp - xp, h.pearls, 'the pearls are paid at the splashdown');
    rows.push([f, h.streak, h.score, h.pearls]);
  }
  return rows;
});

test('a hit resets the streak to 1 for that flight and no reel or bust follows', () => {
  const r = H.Hd(7, 'harpoon');
  for (let f = 0; f < 3; f++) { flight(r); kill(r, 2); land(r) }
  flight(r); kill(r, 5); r.hurt = 0; r.medium.elapsed = 1; D.hit(r, 5); land(r);
  const h = r.demo.history.at(-1);
  assert.equal(h.streak, 1); assert.equal(h.score, 5); assert.equal(h.clean, false); assert.equal(r.mode, 'playing');
  flight(r); kill(r, 1); land(r); assert.equal(r.demo.history.at(-1).streak, 2, 'the next clean flight builds from 1');
  return h;
});

test('no reels: the hand draws nothing and its mult is 1', () => {
  const r = flight(H.Hd(7, 'harpoon'));
  assert.deepEqual(r.hand.drawn, []); assert.equal(r.hand.mult, 1);
});

test('0 HP ends the run', () => {
  const r = flight(H.Hd(7, 'harpoon')); r.hurt = 0; r.hp = 3; D.hit(r, 50);
  assert.equal(r.mode, 'dead'); assert.equal(r.endReason, 'hp');
});

test('no quota: a wave with no score still goes to the shop, paying clear pay and capped interest, and restores HP', () => {
  const r = H.Hd(7, 'harpoon'); r.wave = 3; r.xp = 500; r.hp = 10; r.mode = 'playing'; r.wscore = 0; r.demo.wavePearls = 7;
  D.finish(r);
  assert.equal(r.mode, 'shop'); assert.equal(r.xp, 500 + 24 + 4 * 3 + 10, 'clear pay 36 and interest capped at 10');
  assert.deepEqual(r.lastWave.pay, { clear: 36, interest: 10, style: 7, total: 53 }); assert.equal(r.hp, r.stats.maxHp);
  const s = H.Hd(7, 'harpoon'); s.wave = 1; s.xp = 40; s.mode = 'playing'; D.finish(s); assert.equal(s.xp, 40 + 28 + 4, '10% of 40');
  return r.lastWave.pay;
});

test('the shop offers no charms or reel routines, and fills those places from the shelf', () => {
  const rows = {};
  for (let seed = 1; seed <= 30; seed++) {
    const r = H.Hd(seed, 'harpoon'); r.wave = 1 + seed % 15; r.mode = 'shop'; r.demo.offers = []; D.shop(r);
    assert.ok(r.demo.offers.length >= 5, 'seed ' + seed + ' has ' + r.demo.offers.length + ' offers');
    for (const o of r.demo.offers) { rows[o.row] = (rows[o.row] || 0) + 1; assert.ok(!['charm', 'routine', 'pack'].includes(o.row), 'offered a ' + o.row) }
  }
  return rows;
});

test('the streak survives the shop into the next wave', () => {
  const r = H.Hd(7, 'harpoon');
  for (let f = 0; f < 3; f++) { flight(r); kill(r, 1); land(r) }
  D.wave(r); assert.equal(r.demo.streak, 3);
  flight(r); kill(r, 1); land(r); assert.equal(r.demo.history.at(-1).streak, 4);
});

test('the bot plays waves through to the shop without a quota and ends only at 0 HP or wave 20', () => {
  const ends = [];
  for (const style of ['low-keep', 'mid-keep', 'high-keep', 'mid-turn']) {
    const r = H.Hd(7, 'harpoon'), fly = flyer(H, style, 7, { keep: 8 });
    let shops = 0;
    for (let t = 0; t < 120 * 60 * 12 && ['playing', 'shop'].includes(r.mode); t++) {
      if (r.mode === 'shop') { shops++; D.command(r, 'next'); continue }
      const i = fly(r); if (r.medium.kind === 'air' && r.budget <= 0) i.y = -1; H.sw(r, i);
    }
    assert.ok(shops >= 1, style + ' reached a shop'); assert.notEqual(r.endReason, 'quota');
    if (r.mode === 'dead') assert.equal(r.endReason, 'hp');
    ends.push({ style, wave: r.wave, mode: r.mode, reason: r.endReason, pearls: r.xp, streak: r.demo.streak });
  }
  return ends;
});

const failed = checks.filter(c => !c.pass).length;
console.log(JSON.stringify({ round: 'rules', passed: checks.length - failed, failed }));
if (failed) process.exit(1);

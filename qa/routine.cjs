// Step 5's first routine (ICARUS_DESIGN.md §4.2-4.6, §4.20; designer's answers 2026-10-27): Breach, Apex and Entry slots;
// Corkscrew and Gravity anchor (setups), Star pose and Spout (payoffs); linking; mult = 1 + connected levels + links.
//   node qa/routine.cjs [--gate]   (--gate also plays the bot to check the apex kill share with Star pose at Apex)
const assert = require('assert'), path = require('path');
const { load } = require('./load.cjs'), { flyer } = require('./bot.cjs');
const file = path.join(__dirname, '..', 'ICARUS-demo.html');
const H = load(file, new Map([['icarus.scoreshow.tune', JSON.stringify({})]]), { bake: true, modern: true }), D = H.DEMO, R = H.Routine;
const checks = [];
function test(name, fn) { try { const detail = fn(); checks.push({ name, pass: true, detail }); console.log('PASS ' + name) } catch (e) { checks.push({ name, pass: false, error: e.stack }); console.log('FAIL ' + name + ': ' + e.message) } }

// a run with exactly these tricks placed, in a flight that has just opened
function run(slots = {}) {
  const r = H.Hd(7, 'harpoon');
  r.demo.routine = { slots: { breach: null, apex: null, entry: null }, levels: {} };
  for (const [s, id] of Object.entries(slots)) { r.demo.routine.levels[id] = (r.demo.routine.levels[id] || 0) + 1; r.demo.routine.slots[s] = id }
  r.medium = { kind: 'air', origin: { x: 0, y: 100 }, local: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, vx: 20, vy: 30, elapsed: 1, heading: 1, waterScale: 1, exitFlight: false };
  r.bw = r.wave; r.bt = 0; r.bk = 0; r.bg = []; r.bq = []; r.warns = []; r.demo.bossSpawned = true; r.hp = 1e6; D.open(r); return r;
}
function foe(r, x, y, hp = 1e6) { D.spawn(r, false, 0); const e = r.enemies.at(-1); e.pos = { x, y }; e.velocity = { x: 0, y: 0 }; e.hp = e.maxHp = hp; e.timer = 1e9; return e }
const step = (r, dt = 1 / 120) => R.step(r, r.medium, dt);
function land(r) { R.entry(r); D.bank(r); return r.demo.history.at(-1) }

test('a run starts with one trick from three different offers, in its natural slot', () => {
  const r = H.Hd(11, 'harpoon'), S = r.demo.routine;
  assert.equal(new Set(r.demo.trickOffers).size, 3); assert.equal(Object.keys(S.levels).length, 1);
  const id = Object.keys(S.levels)[0]; assert.equal(S.slots[R.TRICKS[id].slot], id);
  return { offers: r.demo.trickOffers, slots: S.slots };
});

test('Corkscrew at Breach pushes enemies within 8 m outward, deals nothing and adds its level', () => {
  const r = run({ breach: 'cork' }), a = foe(r, 3, 0), b = foe(r, 15, 0);
  step(r);
  assert.ok(a.velocity.x > 20, 'pushed away'); assert.equal(b.velocity.x, 0, 'the far one is untouched'); assert.equal(a.hp, a.maxHp);
  assert.equal(a.setupBy, r.hand.n);
  const h = land(r); assert.equal(h.mult, 2); return h.mult;
});

test('Star pose at Apex hits enemies within 7 m; linked when a setup moved them: mult 1 + 1 + 1 + 1', () => {
  const r = run({ breach: 'cork', apex: 'star' }); foe(r, 3, 0, 1);
  step(r);                                   // Corkscrew pushes it
  r.hand.apex = true; step(r);               // Star pose bursts it
  const t = r.hand.tricks.find(x => x.id === 'star'); assert.ok(t.connected); assert.ok(t.linked);
  const h = land(r); assert.equal(h.mult, 4); assert.equal(h.chips, 1); return r.hand.tricks;
});

test('a trick that hits nothing adds nothing; a flight with no tricks has mult 1', () => {
  const r = run({ apex: 'star' }); foe(r, 30, 0); r.hand.apex = true; step(r);
  assert.equal(land(r).mult, 1);
  const q = run({}); assert.equal(land(q).mult, 1);
});

test('Gravity anchor is a gravity well: enemies keep chasing but bend toward it, for 1.5 s, then it connects', () => {
  // the well fires where the dolphin is at the apex, (0, 10); the dolphin then moves to (-12, 25). The same chaser
  // starts at (12, 0), with and without the well.
  const path = withWell => {
    const r = run(withWell ? { apex: 'anchor' } : {}), e = foe(r, 12, 0); e.timer = 0;
    r.medium.local = { x: 0, y: 10 }; r.hand.apex = true; step(r);
    let well = 1e9, start = null, end = 0;
    for (let t = 0; t < 1.4 * 120; t++) {
      r.medium.local = { x: -12, y: 25 }; r.hurt = 10; H.ME(r, r.medium, { x: 0, y: 0 }, 1 / 120); step(r);
      well = Math.min(well, Math.hypot(e.pos.x, e.pos.y - 10)); const d = Math.hypot(e.pos.x + 12, e.pos.y - 25); start ??= d; end = d;
    }
    return { r, well, start, end };
  };
  const a = path(false), b = path(true);
  assert.ok(b.well < a.well - 1, `passes closer to the well: ${b.well.toFixed(1)} m vs ${a.well.toFixed(1)} m`);
  assert.ok(b.end < b.start, 'still closes on the dolphin');
  for (let t = 0; t < 30; t++) step(b.r);
  const t = b.r.hand.tricks.find(x => x.id === 'anchor'); assert.ok(t.connected); assert.equal(land(b.r).mult, 2);
  return { closestToWell: { without: +a.well.toFixed(1), with: +b.well.toFixed(1) }, toDolphin: [+b.start.toFixed(1), +b.end.toFixed(1)] };
});

test('a hit while Gravity anchor holds cancels it: it adds nothing', () => {
  const r = run({ apex: 'anchor' }); foe(r, 10, 0); r.hand.apex = true; step(r);
  r.hp = 100; r.hurt = 0; r.medium.elapsed = 1; D.hit(r, 5);
  const t = r.hand.tricks.find(x => x.id === 'anchor'); assert.ok(t.cancelled); assert.ok(!t.connected); assert.equal(land(r).mult, 1);
});

test('Spout at Entry splashes and soaks around the landing point; higher flights splash wider', () => {
  const rows = [];
  for (const best of [0, 20, 60]) {
    const r = run({ entry: 'spout' }); r.flightBest = best; const e = foe(r, 6.5, 0);
    land(r); rows.push([best, e.st?.soaked > 0]);
  }
  assert.deepEqual(rows.map(x => x[1]), [false, true, true], '4 m at no height, 8 m at 20 m, 12 m (the cap) at 60 m');
  return rows;
});

// step 6 (§4.16 A, §4.20): a world-layer object sweeps through the arena as predicted
function arc(r, dt) { const m = r.medium, g = -15; m.origin = { x: m.origin.x + m.vx * dt, y: m.origin.y + m.vy * dt + g * dt * dt / 2 }; m.vy += g * dt }
test('Minefield: each mine reaches the dolphin when predicted, then sweeps back behind it', () => {
  const r = run({ breach: 'mines' }); r.medium.origin = { x: 0, y: 0 }; r.medium.vx = 10; r.medium.vy = 30; r.demo.stats.Hang = 0;
  step(r); const M = r.pmines.map(k => ({ ...k })); assert.equal(M.length, 3);
  const met = M.map(() => null), behind = M.map(() => null);
  for (let i = 1; i <= 1.6 * 120; i++) {
    arc(r, 1 / 120); const t = i / 120, m = r.medium;
    M.forEach((k, j) => { const lx = k.wx - m.origin.x, ly = k.wy - m.origin.y, d = Math.hypot(lx, ly);
      if (met[j] == null && d < .3) met[j] = t;
      if (met[j] != null && behind[j] == null && t > met[j] + .25) behind[j] = lx * m.vx + ly * m.vy < 0 });
  }
  M.forEach((k, j) => { assert.ok(met[j] != null && Math.abs(met[j] - k.t) < .02, `mine ${j} met at ${met[j]} vs ${k.t}`); assert.ok(behind[j], `mine ${j} behind afterwards`) });
  return { predicted: M.map(k => k.t), met };
});

test('Minefield: a mine blows up the enemy trailing on your path; linked when a setup moved it', () => {
  const r = run({ breach: 'mines', apex: 'anchor' }); r.medium.origin = { x: 0, y: 0 }; r.medium.vx = 10; r.medium.vy = 30; r.demo.stats.Hang = 0; r.hurt = 99;
  step(r); const k = r.pmines[1];
  // where mine 2 will be in the arena 0.3 s after it passes the dolphin: put a chaser there, still
  let o = { x: 0, y: 0 }, vy = 30; for (let i = 0; i < (k.t + .3) * 120; i++) { const dt = 1 / 120; o = { x: o.x + 10 * dt, y: o.y + vy * dt - 7.5 * dt * dt }; vy -= 15 * dt }
  const e = foe(r, k.wx - o.x, k.wy - o.y, 1); e.setupBy = r.hand.n;
  for (let i = 0; i < 1.6 * 120 && r.enemies.includes(e); i++) { arc(r, 1 / 120); e.velocity = { x: 0, y: 0 }; step(r) }
  assert.ok(!r.enemies.includes(e), 'the trailing chaser was hit'); assert.equal(r.pmines.length, 2, 'one mine spent');
  const h = land(r), t = r.hand.tricks.find(x => x.id === 'mines'); assert.ok(t.connected && t.linked); assert.equal(h.mult, 3);
  return t;
});

test('payoff damage scales with level, Damage % and wave', () => {
  const r = run({ apex: 'star' }), base = R.damage(r, 'star');
  r.demo.routine.levels.star = 3; const l3 = R.damage(r, 'star'); r.wave = 11; const w11 = R.damage(r, 'star');
  assert.equal(Math.round(base), 30); assert.equal(Math.round(l3), 60); assert.equal(Math.round(w11), 120);
  return { base, l3, w11 };
});

test('the shop always has one trick place; a copy of an owned trick levels it; tricks move between slots', () => {
  const r = H.Hd(5, 'harpoon'); r.mode = 'shop'; r.demo.offers = []; D.shop(r);
  const o = r.demo.offers.filter(x => x.row === 'trick'); assert.equal(o.length, 1); assert.equal(r.demo.offers.length, 6);
  const owned = Object.keys(r.demo.routine.levels)[0]; o[0].id = owned; r.xp = 999; assert.ok(D.command(r, 'buy', o[0].uid));
  assert.equal(R.level(r, owned), 2);
  R.add(r, owned === 'cork' ? 'spout' : 'cork'); const S = r.demo.routine.slots, a = Object.entries(S).find(([, v]) => v)[0];
  const id = S[a], target = R.SLOTS.find(s => s !== a);
  const other = S[target]; assert.ok(D.command(r, 'trickMove', id + ':' + target)); assert.equal(S[target], id); assert.equal(S[a], other);
  return S;
});

if (process.argv.includes('--gate')) test('gate: with Star pose at Apex the bot\'s apex kill share is above 30%', () => {
  const out = {};
  for (const mode of ['none', 'star']) {
    const k = { ascent: 0, apex: 0, descent: 0 };
    for (const style of ['low-keep', 'mid-keep', 'high-keep', 'mid-turn']) {
      const r = H.Hd(7, 'harpoon'), fly = flyer(H, style, 7, { keep: 8 });
      r.demo.routine = { slots: { breach: null, apex: mode === 'star' ? 'star' : null, entry: null }, levels: mode === 'star' ? { star: 1 } : {} };
      let counted = null;
      for (let t = 0; t < 120 * 60 * 8 && ['playing', 'shop'].includes(r.mode); t++) {
        if (r.mode === 'shop') { for (let i = 0; r.lvup && i < 50; i++) D.command(r, 'level', 0); D.command(r, 'next'); continue }
        const i = fly(r); if (r.medium.kind === 'air' && r.budget <= 0) i.y = -1; H.sw(r, i);
        const h = r.hand; if (h && !h.open && h !== counted) { counted = h; for (const x of h.kills) k[x.phase]++ }
      }
    }
    const all = k.ascent + k.apex + k.descent; out[mode] = { ...k, apexShare: Math.round(k.apex / all * 1000) / 10 };
  }
  assert.ok(out.star.apexShare > 30, 'apex share ' + out.star.apexShare + '%');
  return out;
});

const failed = checks.filter(c => !c.pass).length;
console.log(JSON.stringify({ round: 'routine', passed: checks.length - failed, failed }));
if (failed) process.exit(1);

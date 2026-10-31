// The routine (ICARUS_DESIGN.md §4.2-4.6, §4.16, §4.20), redesigned 2026-10-30: air tricks are effects that place
// enemies for the guns; only water tricks damage. mult = 1 + affected-trick levels + 1 per linked trick (a gun or water
// kill of an enemy the trick affected this flight).
//   node qa/routine.cjs [--gate] [--detail]   (--gate also plays the bot: apex kill share with Gravity anchor at Apex)
const assert = require('assert'), path = require('path');
const { load } = require('./load.cjs'), { flyer } = require('./bot.cjs');
const file = path.join(__dirname, '..', 'ICARUS-demo.html');
const H = load(file, new Map([['icarus.scoreshow.tune', JSON.stringify({ tricks: 0 })]]), { bake: true, modern: true }), D = H.DEMO, R = H.Routine;
const checks = [];
function test(name, fn) { try { const detail = fn(); checks.push({ name, pass: true, detail }); console.log('PASS ' + name) } catch (e) { checks.push({ name, pass: false, error: e.stack }); console.log('FAIL ' + name + ': ' + e.message) } }

// a run with exactly these tricks placed, in a flight that has just opened, moving to the right (ahead = +x)
function run(slots = {}) {
  const r = H.Hd(7, 'harpoon');
  r.demo.routine = { slots: {}, levels: {} };
  for (const [s, id] of Object.entries(slots)) { r.demo.routine.levels[id] = 1; r.demo.routine.slots[s] = id }
  r.medium = { kind: 'air', origin: { x: 0, y: 100 }, local: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, vx: 20, vy: 0.001, elapsed: 1, heading: 1, waterScale: 1, exitFlight: false };
  r.bw = r.wave; r.bt = 0; r.bk = 0; r.bg = []; r.bq = []; r.warns = []; r.demo.bossSpawned = true; r.hp = 1e6; D.open(r); return r;
}
function foe(r, x, y, hp = 1e6) { D.spawn(r, false, 0); const e = r.enemies.at(-1); e.pos = { x, y }; e.velocity = { x: 0, y: 0 }; e.hp = e.maxHp = hp; e.timer = 1e9; e.armour = null; return e }
const step = (r, n = 1) => { for (let i = 0; i < n; i++) { r.hurt = 99; R.step(r, r.medium, 1 / 120) } };
// enemies drift on their velocity (no chasing), so only the trick moves them
const move = (r, n) => { for (let i = 0; i < n; i++) { for (const e of r.enemies) e.pos = { x: e.pos.x + e.velocity.x / 120, y: e.pos.y + e.velocity.y / 120 }; step(r) } };
const gun = (r, e) => D.damage(r, e, 1e9, 'harpoon', 0, 0, 0, false, { primary: true, weapon: 'harpoon', base: 1e9 });
function land(r) { R.entry(r); D.bank(r); return r.demo.history.at(-1) }

test('no air trick deals damage; only water tricks do', () => {
  const air = R.IDS.filter(id => R.TRICKS[id].kind !== 'water'), dealt = {};
  for (const id of R.IDS) {
    const r = run({ apex: id }); const list = [foe(r, 3, 0), foe(r, 8, 0), foe(r, 0, -4), foe(r, 12, 2)]; r.medium.origin.y = 3; r.hand.apex = true;
    move(r, 120); dealt[id] = Math.round(list.reduce((a, e) => a + (e.maxHp - e.hp), 0));
  }
  for (const id of air) assert.equal(dealt[id], 0, id + ' dealt damage');
  return dealt;
});

test('a run starts with one trick from three different offers, in its natural slot', () => {
  const r = H.Hd(11, 'harpoon'), S = r.demo.routine;
  assert.equal(new Set(r.demo.trickOffers).size, 3); assert.equal(Object.keys(S.levels).length, 1);
  const id = Object.keys(S.levels)[0]; assert.equal(S.slots[R.TRICKS[id].slot], id);
});

// the formations are built around the enemy the guns aim at: the nearest
const offLine = (e, me, a) => Math.abs((e.pos.x - me.x) * -a.y + (e.pos.y - me.y) * a.x);
test('Gravity anchor gathers enemies into a cluster on the nearest enemy, the guns\' target, not onto you', () => {
  const r = run({ apex: 'anchor' }), t = foe(r, 8, 0), list = [foe(r, 20, 12), foe(r, 16, -14), foe(r, -4, 18)]; r.hand.apex = true;
  const toT = () => list.reduce((a, e) => a + Math.hypot(e.pos.x - t.pos.x, e.pos.y - t.pos.y), 0) / list.length, s0 = toT(); let best = s0, minD = 1e9;
  for (let i = 0; i < 120; i++) { move(r, 1); best = Math.min(best, toT()); minD = Math.min(minD, ...list.map(e => Math.hypot(e.pos.x, e.pos.y))) }
  assert.ok(best < s0 * .4, `mean distance to the target ${s0.toFixed(1)} → ${best.toFixed(1)} m`); assert.ok(minD > 2, 'none dragged onto the dolphin: closest ' + minD.toFixed(1));
  return { toTarget: [+s0.toFixed(1), +best.toFixed(1)], closestToDolphin: +minD.toFixed(1) };
});

test('Chum line lines enemies up along the line from you through the nearest enemy', () => {
  const r = run({ apex: 'chum' }), t = foe(r, 6, 6), list = [foe(r, 14, -4), foe(r, -2, 15), foe(r, 18, 9)]; r.hand.apex = true; const a = { x: Math.SQRT1_2, y: Math.SQRT1_2 }, me = { x: 0, y: 0 };
  const off = () => list.reduce((s, e) => s + offLine(e, me, a), 0) / list.length, o0 = off(); let best = o0;
  for (let i = 0; i < 150; i++) { move(r, 1); best = Math.min(best, off()) }
  assert.ok(best < o0 * .4, `off the line ${o0.toFixed(1)} → ${best.toFixed(1)} m`); return [+o0.toFixed(1), +best.toFixed(1)];
});

test('Slipstream files chasers behind you onto the line through the nearest of them', () => {
  const r = run({ apex: 'slip' }), t = foe(r, -6, -2), list = [foe(r, -12, 8), foe(r, -15, -9), foe(r, -9, -12)]; r.hand.apex = true; const a = { x: -6 / Math.hypot(6, 2), y: -2 / Math.hypot(6, 2) }, me = { x: 0, y: 0 };
  const off = () => list.reduce((s, e) => s + offLine(e, me, a), 0) / list.length, o0 = off(); let best = o0;
  for (let i = 0; i < 200; i++) { move(r, 1); best = Math.min(best, off()) }
  assert.ok(best < o0 * .4, `off the file ${o0.toFixed(1)} → ${best.toFixed(1)} m`); return [+o0.toFixed(1), +best.toFixed(1)];
});

test('Bubble net holds enemies around you still for 1 s; Bow wave pushes enemies ahead aside', () => {
  const r = run({ apex: 'bubble' }), e = foe(r, 5, 0); r.hand.apex = true; step(r); e.velocity = { x: -20, y: 0 };
  move(r, 60); assert.deepEqual(e.pos, { x: 5, y: 0 });
  const q = run({ apex: 'bow' }), a = foe(q, 8, 1), behind = foe(q, -8, 0); q.hand.apex = true; step(q);
  assert.ok(a.velocity.y > 20, 'pushed aside (upward: it sat above the path)'); assert.equal(behind.velocity.y, 0);
});

test('Eddy draws enemies onto a ring inside Close reach (6 m) but outside contact, even while they chase', () => {
  const r = run({ apex: 'eddy' }), list = [[12, 0], [-8, 9], [3, -11], [1.5, 1]].map(([x, y]) => { const e = foe(r, x, y); e.timer = 0; return e }); r.hand.apex = true;
  for (let i = 0; i < 150; i++) { r.hurt = 99; H.ME(r, r.medium, { x: 0, y: 0 }, 1 / 120) }
  const d = list.map(e => Math.hypot(e.pos.x, e.pos.y)); assert.ok(d.every(x => x > 2.5 && x < 6), d.map(x => x.toFixed(1)).join(' '));
  return d.map(x => +x.toFixed(1));
});

test('the shop leans: the trick place favours tricks that feed the guns you hold; weapon offers favour guns your tricks feed', () => {
  const count = (guns, tricks) => {
    const n = {};
    for (let seed = 1; seed <= 150; seed++) {
      const r = H.Hd(seed, 'harpoon'); r.slots = guns.map(id => H.Owslot(id, 1, ++r.demo.uid)); r.demo.routine = { slots: {}, levels: Object.fromEntries(tricks.map(t => [t, 1])) };
      const id = R.offerId(r); n[id] = (n[id] || 0) + 1;
      r.wave = 3; r.mode = 'shop'; r.demo.offers = []; D.shop(r); for (const o of r.demo.offers.filter(o => o.row === 'weapon')) n['gun:' + o.id] = (n['gun:' + o.id] || 0) + 1;
    }
    return n;
  };
  const blast = count(['rocket', 'flak'], []), close = count(['fin', 'sonic'], []), fed = count(['minigun'], ['chum']);
  assert.ok((blast.anchor || 0) > (close.anchor || 0) * 2, `anchor offered ${blast.anchor} with Blast guns vs ${close.anchor} with Close`);
  assert.ok((close.eddy || 0) > (blast.eddy || 0) * 2, `eddy offered ${close.eddy} with Close guns vs ${blast.eddy} with Blast`);
  const pierce = (fed['gun:laser'] || 0) + (fed['gun:harpoon'] || 0), plain = count(['minigun'], []), pierce0 = (plain['gun:laser'] || 0) + (plain['gun:harpoon'] || 0);
  assert.ok(pierce > pierce0, `piercing guns offered ${pierce} with Chum line vs ${pierce0} without`);
  return { anchor: [blast.anchor, close.anchor], eddy: [close.eddy, blast.eddy], piercingGuns: [pierce, pierce0] };
});

test('Breach wave lifts enemies near the surface up into the climb and soaks them', () => {
  const r = run({ breach: 'breach' }); r.medium.origin.y = 0; const low = foe(r, 6, 4), high = foe(r, 6, 20); step(r);
  assert.ok(low.velocity.y >= 22 && low.st.soaked > 0); assert.equal(high.velocity.y, 0);
});

test('Frost wake chills what crosses your trail; three chills freeze it', () => {
  const r = run({ apex: 'frost' }), e = foe(r, 0, 0); r.hand.apex = true;
  for (let i = 0; i < 120; i++) { r.medium.local = { x: 0, y: 0 }; step(r) }
  assert.ok(e.st.frozen > 0); assert.equal(e.hp, e.maxHp);
});

test('Snare buoys sit in the world ahead on the arc and freeze what touches them as they sweep past', () => {
  const r = run({ breach: 'buoys' }); r.medium.origin = { x: 0, y: 0 }; r.medium.vx = 10; r.medium.vy = 30; r.demo.stats.Hang = 0;
  step(r); const k = r.buoys[1]; assert.equal(r.buoys.length, 3);
  let o = { x: 0, y: 0 }, vy = 30; for (let i = 0; i < (.7 + .3) * 120; i++) { const dt = 1 / 120; o = { x: o.x + 10 * dt, y: o.y + vy * dt - 7.5 * dt * dt }; vy -= 15 * dt }
  const e = foe(r, k.wx - o.x, k.wy - o.y);
  for (let i = 0; i < 1.2 * 120 && !(e.st?.frozen > 0); i++) { const m = r.medium, dt = 1 / 120; m.origin = { x: m.origin.x + m.vx * dt, y: m.origin.y + m.vy * dt - 7.5 * dt * dt }; m.vy -= 15 * dt; e.velocity = { x: 0, y: 0 }; step(r) }
  assert.ok(e.st?.frozen > 0, 'the buoy froze the trailing enemy'); assert.equal(e.hp, e.maxHp, 'no damage');
});

test('Riptide and Belly flop drive enemies into the water, where they drown', () => {
  const rows = {};
  for (const id of ['riptide', 'flop']) {
    // the dolphin falls from 16 m; the enemy hovers 9 m above the water, 7 m below it
    const r = run({ descent: id }); r.medium.origin.y = 16; r.medium.vy = -14; r.hand.apex = true; r.hand.fired = { breach: 1, apex: 1 };
    const e = foe(r, 2, -7, 50); e.floor = 1.5; let t = 0;
    // the arena falls toward the water with the dolphin, as in a real descent
    for (; t < 120 && e.hp > 0; t++) { r.hurt = 99; H.ME(r, r.medium, { x: 0, y: 0 }, 1 / 120); r.medium.local = { x: 0, y: 0 }; r.medium.origin.y = Math.max(3, r.medium.origin.y + r.medium.vy / 120) }
    assert.ok(e.hp <= 0, id + ' drowned it'); assert.equal(r.hand.kills.at(-1).surface, 'water'); rows[id] = +(t / 120).toFixed(2);
  }
  return rows;
});

test('Spout and Undertow damage at the landing; Spout splashes wider from higher flights', () => {
  const rows = [];
  for (const best of [0, 20, 60]) { const r = run({ entry: 'spout' }); r.flightBest = best; const e = foe(r, 6.5, 0); land(r); rows.push(e.hp < e.maxHp) }
  assert.deepEqual(rows, [false, true, true]);
  const q = run({ entry: 'undertow' }); q.medium.origin.y = 2; const low = foe(q, 5, 1), high = foe(q, 5, 9); land(q);
  assert.ok(low.hp < low.maxHp); assert.equal(high.hp, high.maxHp, 'only enemies low over the water');
});

test('linking: a gun kill of an enemy a trick placed links it; mult = 1 + level + link', () => {
  const r = run({ apex: 'anchor' }), target = foe(r, 8, 0), e = foe(r, 18, 8), other = foe(r, 60, 0); r.hand.apex = true; move(r, 30);
  gun(r, other); assert.ok(!r.hand.tricks[0].linked, 'a kill of an enemy it never touched does not link');
  gun(r, e); assert.ok(r.hand.tricks[0].linked);
  const h = land(r); assert.equal(h.mult, 3); return h.mult;
});

test('a water kill of an enemy an air trick placed links both', () => {
  const r = run({ apex: 'bow', descent: 'flop' }); r.medium.origin.y = 20; const e = foe(r, 8, 0, 50); r.hand.apex = true; step(r);
  e.pos = { x: 1, y: -11 }; e.floor = 1.5; r.medium.vy = -14;
  for (let t = 0; t < 120 && e.hp > 0; t++) { r.hurt = 99; H.ME(r, r.medium, { x: 0, y: 0 }, 1 / 120); r.medium.local = { x: 0, y: 0 } }
  assert.ok(e.hp <= 0); const T = r.hand.tricks; assert.ok(T.find(t => t.id === 'bow').linked && T.find(t => t.id === 'flop').linked);
});

test('a trick that affects nothing adds nothing; a hit cancels a running effect', () => {
  const r = run({ apex: 'bubble' }); foe(r, 40, 0); r.hand.apex = true; step(r); assert.equal(land(r).mult, 1);
  const q = run({ apex: 'anchor' }); foe(q, 8, 0); q.hand.apex = true; step(q); q.hp = 100; q.hurt = 0; q.medium.elapsed = 1; D.hit(q, 5);
  assert.ok(q.hand.tricks[0].cancelled); assert.equal(land(q).mult, 1);
});

test('the shop always has one trick place; a copy of an owned trick levels it; tricks move between slots', () => {
  const r = H.Hd(5, 'harpoon'); r.mode = 'shop'; r.demo.offers = []; D.shop(r);
  const o = r.demo.offers.filter(x => x.row === 'trick'); assert.equal(o.length, 1); assert.equal(r.demo.offers.length, 6);
  const owned = Object.keys(r.demo.routine.levels)[0]; o[0].id = owned; r.xp = 999; assert.ok(D.command(r, 'buy', o[0].uid)); assert.equal(R.level(r, owned), 2);
  R.add(r, owned === 'bow' ? 'spout' : 'bow'); const S = r.demo.routine.slots, a = R.SLOTS.find(s => S[s]), id = S[a], target = R.SLOTS.find(s => s !== a), other = S[target];
  assert.ok(D.command(r, 'trickMove', id + ':' + target)); assert.equal(S[target], id); assert.equal(S[a], other);
});

test('an old saved routine naming a retired trick loads with that slot empty', () => {
  const r = H.Hd(5, 'harpoon'); r.demo.routine = { slots: { apex: 'star', entry: 'spout' }, levels: { star: 2, spout: 1 } };
  const S = R.state(r); assert.equal(S.slots.apex, null); assert.equal(S.slots.entry, 'spout');
});

if (process.argv.includes('--gate')) test('gate: Gravity anchor at Apex raises the apex share of gun kills', () => {
  const out = {};
  for (const mode of ['none', 'anchor']) {
    const k = { ascent: 0, apex: 0, descent: 0 };
    for (const style of ['low-keep', 'mid-keep', 'high-keep', 'mid-turn']) {
      const r = H.Hd(7, 'harpoon'), fly = flyer(H, style, 7, { keep: 8 });
      r.demo.routine = { slots: { apex: mode === 'anchor' ? 'anchor' : null }, levels: mode === 'anchor' ? { anchor: 1 } : {} };
      let counted = null;
      for (let t = 0; t < 120 * 60 * 8 && ['playing', 'shop'].includes(r.mode); t++) {
        if (r.mode === 'shop') { for (let i = 0; r.lvup && i < 50; i++) D.command(r, 'level', 0); D.command(r, 'next'); continue }
        const i = fly(r); if (r.medium.kind === 'air' && r.budget <= 0) i.y = -1; H.sw(r, i);
        const h = r.hand; if (h && !h.open && h !== counted) { counted = h; for (const x of h.kills) k[x.phase]++ }
      }
    }
    const all = k.ascent + k.apex + k.descent; out[mode] = { ...k, apexShare: Math.round(k.apex / all * 1000) / 10 };
  }
  assert.ok(out.anchor.apexShare > out.none.apexShare + 3, `apex share ${out.none.apexShare}% → ${out.anchor.apexShare}%`);
  return out;
});

const failed = checks.filter(c => !c.pass).length;
if (process.argv.includes('--detail')) for (const c of checks) if (c.detail !== undefined) console.log(c.name, JSON.stringify(c.detail));
console.log(JSON.stringify({ round: 'routine', passed: checks.length - failed, failed }));
if (failed) process.exit(1);

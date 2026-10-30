// Steps 7-10 (ICARUS_DESIGN.md §4.5, §4.16 E, §4.20; designer's answers 2026-10-30): statuses and reactions, enemy
// sides and hard surfaces, the clutch tricks, and the Ascent/Descent pulse slots.
//   node qa/statuses.cjs [--gate]   (--gate also plays the bot for step 7's and step 10's automated checks)
const assert = require('assert'), path = require('path');
const { load } = require('./load.cjs'), { flyer } = require('./bot.cjs');
const file = path.join(__dirname, '..', 'ICARUS-demo.html');
const H = load(file, new Map([['icarus.scoreshow.tune', JSON.stringify({})]]), { bake: true, modern: true }), D = H.DEMO, R = H.Routine, S = H.Status;
const checks = [];
function test(name, fn) { try { const detail = fn(); checks.push({ name, pass: true, detail }); console.log('PASS ' + name) } catch (e) { checks.push({ name, pass: false, error: e.stack }); console.log('FAIL ' + name + ': ' + e.message) } }

function run(slots = {}, wave = 1) {
  const r = H.Hd(7, 'harpoon'); r.wave = wave;
  r.demo.routine = { slots: {}, levels: {} };
  for (const [s, id] of Object.entries(slots)) { r.demo.routine.levels[id] = 1; r.demo.routine.slots[s] = id }
  r.medium = { kind: 'air', origin: { x: 0, y: 100 }, local: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, vx: 20, vy: 30, elapsed: 1, heading: 1, waterScale: 1, exitFlight: false };
  r.bw = r.wave; r.bt = 0; r.bk = 0; r.bg = []; r.bq = []; r.warns = []; r.demo.bossSpawned = true; r.hp = 1e6; D.open(r); return r;
}
function foe(r, x, y, hp = 1e6, armour) { D.spawn(r, false, 0); const e = r.enemies.at(-1); e.pos = { x, y }; e.velocity = { x: 0, y: 0 }; e.hp = e.maxHp = hp; e.timer = 1e9; e.armour = armour ?? null; return e }
const hit = (r, e, amount, weapon) => D.damage(r, e, amount, weapon, 0, 0, 0, false, { primary: true, weapon, base: amount });
const lost = e => e.maxHp - e.hp;
const step = (r, n = 1) => { for (let i = 0; i < n; i++) { r.hurt = 99; H.ME(r, r.medium, { x: 0, y: 0 }, 1 / 120) } };

// step 7
test('Spout soaks for 6 s and a soaked enemy sinks toward the surface', () => {
  const r = run({ entry: 'spout' }), e = foe(r, 2, 0); R.entry(r);
  assert.ok(e.st.soaked > 5.9); const q = run(), a = foe(q, 5, 0), b = foe(q, -5, 0); S.soak(a); a.timer = b.timer = 1e9;
  step(q, 60); assert.ok(a.pos.y < b.pos.y - .4, `soaked ${a.pos.y.toFixed(2)} vs dry ${b.pos.y.toFixed(2)}`);
});
test('Shock from Arc jumps through the cluster within 5 m, 30% each, and not beyond', () => {
  const r = run(), a = foe(r, 0, 0), b = foe(r, 4, 0), c = foe(r, 8, 0), far = foe(r, 20, 0);
  hit(r, a, 100, 'arc');
  assert.equal(Math.round(lost(b)), 30); assert.equal(Math.round(lost(c)), 30); assert.equal(lost(far), 0);
});
test('Conduct: Shock on a soaked enemy runs through every soaked enemy at any range, 50% each', () => {
  const r = run(), a = foe(r, 0, 0), b = foe(r, 30, 0), dry = foe(r, -30, 0); S.soak(a); S.soak(b);
  hit(r, a, 100, 'arc'); assert.equal(Math.round(lost(b)), 50); assert.equal(lost(dry), 0); assert.equal(r.hand.reactions.conduct, 1);
});
test('Depth charge: three chill stacks freeze; on a soaked enemy one freezes at once (Flash-freeze)', () => {
  const r = run(), a = foe(r, 0, 0), b = foe(r, 10, 0);
  hit(r, a, 1, 'depth'); hit(r, a, 1, 'depth'); assert.ok(!(a.st.frozen > 0)); hit(r, a, 1, 'depth'); assert.ok(a.st.frozen > 0);
  S.soak(b); hit(r, b, 1, 'depth'); assert.ok(b.st.frozen > 0); assert.equal(r.hand.reactions.flashFreeze, 1);
});
test('a frozen enemy holds still and deals no contact damage', () => {
  const r = run(), e = foe(r, .5, 0); S.freeze(e); e.timer = 0; const hp = r.hp; r.hurt = 0;
  H.ME(r, r.medium, { x: 0, y: 0 }, 1 / 120); r.hurt = 0; H.ME(r, r.medium, { x: 0, y: 0 }, 1 / 120);
  assert.deepEqual(e.pos, { x: .5, y: 0 }); assert.equal(r.hp, hp);
});
test('Shatter: a payoff on a frozen enemy breaks it in a 4 m blast; the frozen one takes double', () => {
  const r = run({ apex: 'star' }), a = foe(r, 3, 0), b = foe(r, 6, 0), far = foe(r, 12, 0); S.freeze(a);
  r.hand.apex = true; R.step(r, r.medium, 1 / 120);
  assert.equal(r.hand.reactions.shatter, 1); assert.ok(lost(b) > 0); assert.equal(lost(far), 0); assert.ok(lost(a) > 2.5 * 30);
});

// step 8
test('armour: hits from an armoured side do 20%; the exposed side takes full', () => {
  const r = run(), rows = {};
  for (const [kind, x, y, open] of [['shielder', 5, 0, false], ['turtle', 0, -5, false], ['turtle', 0, 5, true], ['spiker', 0, 5, false], ['spiker', 0, -5, true]]) {
    const e = foe(r, x, y, 1e6, kind); e.velocity = { x: -10, y: 0 }; hit(r, e, 100, 'harpoon');
    rows[kind + (open ? ' exposed' : ' armoured')] = lost(e); assert.equal(Math.round(lost(e)), open ? 100 : 20);
  }
  const s = foe(r, -5, 0, 1e6, 'shielder'); s.velocity = { x: -10, y: 0 }; hit(r, s, 100, 'harpoon'); assert.equal(lost(s), 100, 'a shielder hit from behind');
  return rows;
});
test('armour appears from wave 3 only, on some ordinary enemies', () => {
  const count = w => { const r = run({}, w); let n = 0; for (let i = 0; i < 300; i++) { D.spawn(r, false, 0); const e = r.enemies.at(-1); H.Status.arm(r, e); if (e.armour) n++; r.enemies.pop() } return n };
  assert.equal(count(1), 0); const n = count(5); assert.ok(n > 40 && n < 110, n + ' of 300'); return n;
});
test('touching a Spiker from below hurts double', () => {
  const r = run(), e = foe(r, 0, 1, 1e6, 'spiker'); S.beforeStep(r, r.medium); const a = r.spikeMul; S.afterStep(r, r.medium, 0);
  e.pos = { x: 0, y: -1.5 }; S.beforeStep(r, r.medium); const b = r.spikeMul; S.afterStep(r, r.medium, 0);
  assert.equal(a, 2); assert.equal(b, 1);
});
test('drowning: a soaked enemy driven into the water drowns, and the kill says so', () => {
  const r = run(); r.medium.origin = { x: 0, y: 10 }; r.medium.vy = -12; const e = foe(r, 3, -9.5, 100); S.soak(e);
  S.afterStep(r, r.medium, 1 / 120);
  assert.ok(e.hp <= 0); const k = r.hand.kills.at(-1); assert.equal(k.surface, 'water'); assert.equal(r.hand.reactions.drown, 1);
});
test('impacts: a knocked enemy into another hits both; into a frozen block shatters it', () => {
  const r = run(), a = foe(r, 0, 0), b = foe(r, 1.5, 0); a.knockT = .5; a.velocity = { x: 20, y: 0 };
  S.afterStep(r, r.medium, 1 / 120); assert.ok(lost(a) > 0 && lost(b) > 0); assert.equal(r.hand.reactions.impact, 1);
  const c = foe(r, 20, 0), f = foe(r, 21.5, 0); S.freeze(f); c.knockT = .5; c.velocity = { x: 20, y: 0 };
  S.afterStep(r, r.medium, 1 / 120); assert.equal(r.hand.reactions.frozenImpact, 1); assert.equal(r.hand.reactions.shatter, 1);
});
test('kills carry the side they came from', () => {
  const r = run(), e = foe(r, 0, -5, 1); hit(r, e, 10, 'harpoon'); assert.equal(r.hand.kills.at(-1).side, 'above', 'the dolphin was above it');
});

// step 9: the clutch tricks
test('Closing net drags enemies from 16 m in toward you over 0.8 s, then connects; a hit cancels it', () => {
  const r = run({ breach: 'net' }), e = foe(r, 15, 0), far = foe(r, 30, 0);
  r.medium.vy = -1; R.fire(r, r.medium, 'breach');
  for (let i = 0; i < 100; i++) R.step(r, r.medium, 1 / 120);
  assert.ok(Math.hypot(e.pos.x, e.pos.y) < 4, 'dragged in: ' + e.pos.x.toFixed(1)); assert.equal(far.pos.x, 30);
  const q = run({ breach: 'net' }); foe(q, 15, 0); R.fire(q, q.medium, 'breach'); R.step(q, q.medium, 1 / 120); q.hp = 100; q.hurt = 0; D.hit(q, 5);
  assert.ok(q.hand.tricks[0].cancelled);
});
test('Bounty marks the toughest enemy near you; killing it this flight pays 10 pearls a level', () => {
  const r = run({ apex: 'bounty' }), weak = foe(r, 3, 0, 50), tough = foe(r, 6, 0, 500); r.hand.apex = true; R.step(r, r.medium, 1 / 120);
  assert.equal(tough.bounty, r.hand.n); assert.equal(weak.bounty, undefined);
  const xp = r.xp; hit(r, tough, 1e9, 'harpoon'); R.entry(r); D.bank(r);
  assert.equal(r.hand.bountyPearls, 10); assert.ok(r.xp - xp >= 10); assert.ok(r.hand.tricks.find(t => t.id === 'bounty').connected);
  const q = run({ apex: 'bounty' }); foe(q, 3, 0, 500); q.hand.apex = true; R.step(q, q.medium, 1 / 120); R.entry(q);
  assert.ok(!q.hand.tricks.find(t => t.id === 'bounty').connected, 'not killed: missed');
});
test('Standoff hits harder the more enemies wait at the landing point', () => {
  const one = run({ entry: 'standoff' }), a = foe(one, 3, 0); R.entry(one);
  const five = run({ entry: 'standoff' }), list = [0, 1, 2, 3, 4].map(i => foe(five, 3 + i, 0)); R.entry(five);
  assert.equal(Math.round(lost(a)), Math.round(30 * 1.15)); assert.equal(Math.round(lost(list[0])), Math.round(30 * 1.75));
});

// step 10: stretch slots
test('Ascent pulses every 0.6 s while climbing at a third of the power; it connects once, adding its level once', () => {
  const r = run({ ascent: 'star' }), e = foe(r, 3, 0); r.medium.vy = 30;
  for (let i = 0; i < 1.4 * 120; i++) R.step(r, r.medium, 1 / 120);
  const t = r.hand.tricks.find(x => x.slot === 'ascent'); assert.equal(t.pulses, 2, 'at 0.3 s and 0.9 s'); assert.equal(Math.round(lost(e)), Math.round(2 * 10));
  r.hand.apex = true; r.medium.vy = -1; R.step(r, r.medium, 1 / 120); assert.ok(t.settled && t.connected);
  R.entry(r); assert.equal(r.hand.mult, 2);
  return { pulses: t.pulses, damage: lost(e) };
});
test('Descent pulses only after the apex, while falling', () => {
  const r = run({ descent: 'star' }); foe(r, 3, 0); r.medium.vy = 20;
  for (let i = 0; i < 60; i++) R.step(r, r.medium, 1 / 120); assert.ok(!(r.hand.tricks || []).some(t => t.slot === 'descent'));
  r.hand.apex = true; r.medium.vy = -10; for (let i = 0; i < 120; i++) R.step(r, r.medium, 1 / 120);
  assert.equal(r.hand.tricks.find(t => t.slot === 'descent').pulses, 2);
});

if (process.argv.includes('--gate')) {
  const play = (slots, weapons) => {
    const out = { flights: 0, kills: { ascent: 0, apex: 0, descent: 0 }, reactions: 0 };
    for (const style of ['low-keep', 'mid-keep', 'high-keep', 'mid-turn']) {
      const r = H.Hd(7, 'harpoon'), fly = flyer(H, style, 7, { keep: 8 });
      r.demo.routine = { slots: { ...slots }, levels: Object.fromEntries(Object.values(slots).map(id => [id, 1])) };
      if (weapons) { r.slots = weapons.map(id => { const g = H.Owslot(id, 2, ++r.demo.uid); g.paid = 0; g.cd = 0; return g }); D.sync(r) }
      let c = null;
      for (let t = 0; t < 120 * 60 * 6 && ['playing', 'shop'].includes(r.mode); t++) {
        if (r.mode === 'shop') { for (let i = 0; r.lvup && i < 50; i++) D.command(r, 'level', 0); D.command(r, 'next'); continue }
        const i = fly(r); if (r.medium.kind === 'air' && r.budget <= 0) i.y = -1; H.sw(r, i);
        const h = r.hand; if (h && !h.open && h !== c) { c = h; out.flights++; for (const k of h.kills) out.kills[k.phase]++; out.reactions += Object.entries(h.reactions || {}).filter(([k]) => ['conduct', 'flashFreeze', 'shatter'].includes(k)).reduce((a, [, n]) => a + n, 0) }
      }
    }
    const all = out.kills.ascent + out.kills.apex + out.kills.descent;
    out.share = Object.fromEntries(Object.entries(out.kills).map(([k, n]) => [k, Math.round(n / all * 1000) / 10]));
    return out;
  };
  // Spout pulses in Descent soak the enemies around the falling dolphin, where Arc and Depth charge reach them
  test('gate (step 7): reactions per flight above 0 with Spout in Descent, Arc and Depth charge', () => {
    const g = play({ descent: 'spout' }, ['arc', 'depth', 'arc', 'depth']);
    assert.ok(g.reactions / g.flights > 0); return { perFlight: +(g.reactions / g.flights).toFixed(2), flights: g.flights };
  });
  test('gate (step 10): kills per phase follow the routine (Star pose in Ascent vs in Descent)', () => {
    const up = play({ ascent: 'star' }), down = play({ descent: 'star' });
    assert.ok(up.share.ascent > down.share.ascent + 3 && down.share.descent > up.share.descent + 3);
    return { ascent: up.share, descent: down.share };
  });
}

const failed = checks.filter(c => !c.pass).length;
for (const c of checks) if (c.detail !== undefined && process.argv.includes('--detail')) console.log(c.name, JSON.stringify(c.detail));
console.log(JSON.stringify({ round: 'statuses', passed: checks.length - failed, failed }));
if (failed) process.exit(1);

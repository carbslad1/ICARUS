// Controlled placement experiment: does a placement trick make a gun class deal more damage?
// 14 chasers scattered 8-28 m around a dolphin in a steady flight, two T1 guns of one class, the trick fired at t = 0,
// 2.5 s of real combat (the demo's fire, enemy step, routine and shots). 40 layouts per cell, same layouts per trick.
//   node qa/placement.cjs .
const path = require('path'), root = process.argv[2];
const { load } = require(path.join(root, 'qa/load.cjs'));
const H = load(path.join(root, 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', '{}']]), { bake: true, modern: true }), D = H.DEMO;
const CLASSES = { close: ['fin', 'sonic'], blast: ['rocket', 'flak'], pierce: ['laser', 'harpoon'] };
const TRICKS = ['none', 'anchor', 'chum', 'slip', 'bubble', 'eddy'], N = 40, DT = 1 / 120, input = { x: 0, y: 0, w: false, turn: 0, boost: false };
function rand(seed) { let s = seed * 9301 + 49297; return () => (s = (s * 233280 + 49297) % 2147483647) / 2147483647 }
const out = {};
for (const [cls, guns] of Object.entries(CLASSES)) for (const trick of TRICKS) {
  let dmg = 0, kills = 0, attacks = 0, hitsPerAttack = 0, hitsTaken = 0;
  for (let seed = 1; seed <= N; seed++) {
    const r = H.Hd(seed, 'harpoon'); r.wave = 8; D.wave(r);
    r.slots = guns.map(id => { const g = H.Owslot(id, 1, ++r.demo.uid); g.paid = 0; g.cd = 0; return g }); D.sync(r);
    r.demo.routine = { slots: trick === 'none' ? {} : { apex: trick }, levels: trick === 'none' ? {} : { [trick]: 1 } };
    r.medium = { kind: 'air', origin: { x: 0, y: 60 }, local: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, vx: 14, vy: .001, elapsed: 1, heading: 0, waterScale: 1, exitFlight: false };
    r.bw = r.wave; r.bt = 0; r.bk = 0; r.bg = []; r.bq = []; r.warns = []; r.demo.bossSpawned = true; r.budget = 99; D.open(r); r.hand.apex = true; r.hand.fired = { breach: 1 };
    const g = rand(seed);
    for (let i = 0; i < 14; i++) { D.spawn(r, false, 0); const e = r.enemies.at(-1), a = g() * Math.PI * 2, d = 8 + g() * 20; e.pos = { x: Math.cos(a) * d, y: Math.sin(a) * d }; e.velocity = { x: 0, y: 0 }; e.armour = null }
    const per = {};
    const hp0 = r.hp; let k0 = r.kills;
    for (let t = 0; t < 2.5 / DT; t++) {
      r.hp = r.stats.maxHp; r.events = [];
      D.combat(r, r.medium, input, DT);
      for (const ev of r.events) if (ev.kind === 'damage' && guns.includes(ev.weapon)) { dmg += ev.applied ?? ev.value; }
    }
    // enemies damaged per attack, from the primary attacks the guns made
    kills += r.kills - k0; hitsTaken += r.metrics.hits;
    const recs = r.demo.waveTelemetry;
    attacks += r.demo.attackSeq;
  }
  out[cls + ':' + trick] = { gunDamage: Math.round(dmg / N), kills: +(kills / N).toFixed(2), attacks: +(attacks / N).toFixed(1), damagePerAttack: +(dmg / Math.max(1, attacks)).toFixed(1), hitsTaken: +(hitsTaken / N).toFixed(2) };
}
for (const cls of Object.keys(CLASSES)) {
  const b = out[cls + ':none'];
  console.log(cls, JSON.stringify(b));
  for (const t of TRICKS.slice(1)) { const o = out[cls + ':' + t]; console.log(`   ${t.padEnd(7)} damage ${String(o.gunDamage).padStart(5)} (${((o.gunDamage / b.gunDamage - 1) * 100).toFixed(0).padStart(4)}%)  kills ${o.kills}  per attack ${o.damagePerAttack} (base ${b.damagePerAttack})  hits taken ${o.hitsTaken}`) }
}

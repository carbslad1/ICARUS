// Controlled placement experiment: does a placement trick make a gun class deal more damage?
// 14 enemies (6 chasers, 3 turrets, 3 drifters, 2 splitters) scattered 8-28 m around a dolphin in a steady flight, two T1
// guns of one class, the trick fired at t = 0, 2.5 s of real combat (the demo's fire, enemy step, routine and shots). 40
// layouts per cell, the same layouts for every trick. Runs with the Brotato enemy movement on and off.
// --stream keeps the guns the bottleneck: every enemy that dies is replaced by one of the same kind 8-28 m away, so
// there are always 14; the trick re-fires every 2 s (as a slot does once a flight); 10 s of combat; movement on only.
//   node qa/placement.cjs [--stream] [--level=N] [--pierce=0] [--time=S]
const path = require('path'), root = path.resolve(process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(__dirname, '..'));
const { load } = require(path.join(root, 'qa/load.cjs'));
const loadWith = moves => load(path.join(root, 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify({ moves, tricks: 0, ...(PIERCE != null && { pierce: +PIERCE }) })]]), { bake: true, modern: true });
const ROSTER = ['chaser', 'chaser', 'chaser', 'chaser', 'chaser', 'chaser', 'turret', 'turret', 'turret', 'drifter', 'drifter', 'drifter', 'splitter', 'splitter'];
const CLASSES = { close: ['fin', 'sonic'], blast: ['rocket', 'flak'], pierce: ['laser', 'harpoon'] };
// optional: --level=N gun tier (1), --pierce=0 to turn tiered pierce off, --time=S seconds of combat (2.5)
const LEVEL = +(process.argv.find(a => a.startsWith('--level='))?.slice(8) || 1), PIERCE = process.argv.find(a => a.startsWith('--pierce='))?.slice(9), STREAM = process.argv.includes('--stream'), TIME = +(process.argv.find(a => a.startsWith('--time='))?.slice(7) || (STREAM ? 10 : 2.5));
const TRICKS = ['none', 'anchor', 'chum', 'slip', 'bubble', 'eddy'], N = 40, MATCH = { close: ['eddy', 'bubble'], blast: ['anchor'], pierce: ['chum', 'slip'] }, DT = 1 / 120, input = { x: 0, y: 0, w: false, turn: 0, boost: false };
function rand(seed) { let s = seed * 9301 + 49297; return () => (s = (s * 233280 + 49297) % 2147483647) / 2147483647 }
for (const moves of STREAM ? [1] : [0, 1]) {
const H = loadWith(moves), D = H.DEMO, out = {};
console.log(moves ? '\n=== Brotato enemy movement ON' : '=== enemy movement as shipped (all chase)');
for (const [cls, guns] of Object.entries(CLASSES)) for (const trick of TRICKS) {
  let dmg = 0, kills = 0, attacks = 0, hitsPerAttack = 0, hitsTaken = 0;
  for (let seed = 1; seed <= N; seed++) {
    const r = H.Hd(seed, 'harpoon'); r.wave = 8; D.wave(r);
    r.slots = guns.map(id => { const g = H.Owslot(id, LEVEL, ++r.demo.uid); g.paid = 0; g.cd = 0; return g }); D.sync(r);
    r.demo.routine = { slots: trick === 'none' ? {} : { apex: trick }, levels: trick === 'none' ? {} : { [trick]: 1 } };
    r.medium = { kind: 'air', origin: { x: 0, y: 60 }, local: { x: 0, y: 0 }, velocity: { x: 0, y: 0 }, vx: 14, vy: .001, elapsed: 1, heading: 0, waterScale: 1, exitFlight: false };
    r.bw = r.wave; r.bt = 0; r.bk = 0; r.bg = []; r.bq = []; r.warns = []; r.demo.bossSpawned = true; r.budget = 99; D.open(r); r.hand.apex = true; r.hand.fired = { breach: 1 };
    const g = rand(seed);
    const add = kind => { D.spawn(r, false, 0); const e = r.enemies.at(-1), a = g() * Math.PI * 2, d = 8 + g() * 20, me = r.medium.local; e.kind = kind; e.pos = { x: me.x + Math.cos(a) * d, y: me.y + Math.sin(a) * d }; e.velocity = { x: 0, y: 0 }; e.armour = null; e.timer = 1 + g() * 2; e.mv = undefined; e.rosterKind = kind };
    for (const kind of ROSTER) add(kind);
    const per = {};
    const hp0 = r.hp; let k0 = r.kills;
    for (let t = 0; t < TIME / DT; t++) {
      r.hp = r.stats.maxHp; r.events = [];
      D.combat(r, r.medium, input, DT);
      for (const ev of r.events) if (ev.kind === 'damage' && guns.includes(ev.weapon)) { dmg += ev.applied ?? ev.value; }
      if (STREAM) {
        const alive = r.enemies.filter(e => e.hp > 0), have = {}; for (const e of alive) have[e.rosterKind] = (have[e.rosterKind] || 0) + 1;
        const need = {}; for (const k of ROSTER) need[k] = (need[k] || 0) + 1;
        for (const [k, n] of Object.entries(need)) for (let i = have[k] || 0; i < n; i++) add(k);
        if (t > 0 && t % 240 === 0) r.hand.fired.apex = false;
      }
    }
    // enemies damaged per attack, from the primary attacks the guns made
    kills += r.kills - k0; hitsTaken += r.metrics.hits;
    const recs = r.demo.waveTelemetry;
    attacks += r.demo.attackSeq;
  }
  out[cls + ':' + trick] = { gunDamage: Math.round(dmg / N), perSecond: Math.round(dmg / N / TIME), kills: +(kills / N).toFixed(2), attacks: +(attacks / N).toFixed(1), damagePerAttack: +(dmg / Math.max(1, attacks)).toFixed(1), hitsTaken: +(hitsTaken / N).toFixed(2) };
}
for (const cls of Object.keys(CLASSES)) {
  const b = out[cls + ':none'];
  console.log(cls, JSON.stringify(b));
  for (const t of TRICKS.slice(1)) { const o = out[cls + ':' + t]; console.log(`   ${(t + (MATCH[cls].includes(t) ? ' *' : '')).padEnd(9)} damage ${String(o.gunDamage).padStart(5)} (${o.perSecond}/s) (${((o.gunDamage / b.gunDamage - 1) * 100).toFixed(0).padStart(4)}%)  kills ${o.kills}  per attack ${o.damagePerAttack} (base ${b.damagePerAttack})`) }
}
}
console.log('\n* = the trick that feeds that gun type');

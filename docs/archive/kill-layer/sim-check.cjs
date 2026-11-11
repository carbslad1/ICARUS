// Extract the pure sim from kill-layer-lab.html and exercise it headlessly.
// No packages, no browser. Run: node docs/kill-layer/sim-check.cjs
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const html = fs.readFileSync(path.join(__dirname, 'kill-layer-lab.html'), 'utf8');
const m = html.match(/\/\* ==== SIM START ==== \*\/([\s\S]*?)\/\* ==== SIM END ==== \*\//);
if (!m) { console.error('SIM markers not found'); process.exit(1); }
const ctx = vm.createContext({ console });
vm.runInContext(m[1], ctx);
const K = ctx.KILLLAB_SIM;
if (!K) { console.error('KILLLAB_SIM not exposed'); process.exit(1); }

const results = [];
function rec(name, ok, detail) { results.push({ name, ok, detail }); console.log((ok ? 'PASS ' : 'FAIL ') + name + '  ' + detail); }

console.log('--- single waves ---');
function waveRow(wave, rack, seed, hp, upgrades) {
  const r = K.simulate({ wave, rack, seed, hp, upgrades });
  return { r, line: `w${wave} kills=${r.kills} echo=${r.echoes} eKills=${r.echoKills} pearls=${r.pearls.toFixed(1)} hp=${r.hpLeft.toFixed(1)} died=${r.died} maxE=${r.maxEnemies} maxCasc=${r.maxCascade} chainAvg=${r.chainAvg.toFixed(1)} dur=${r.duration.toFixed(1)}` };
}
const EMPTY = [null, null, null, null, null, null];

// baseline: empty rack over all waves (find death point)
console.log('empty rack, waves 1..20, seed 7:');
for (let w = 1; w <= 20; w++) {
  const { r, line } = waveRow(w, EMPTY, 7);
  console.log('  ' + line);
  if (r.died) { console.log('  died at wave', w, 't=', r.deathT.toFixed(1)); break; }
}

const rackA = ['sonar', 'fruitbloom', 'followthrough', 'overflow', 'cleave', 'ballast'];
const rackB = ['cleave', 'sonar', 'fruitbloom', 'followthrough', 'overflow', 'ballast'];
console.log('\n3 sources + Cleave (rackA =', rackA.join(','), '):');
for (const w of [1, 2, 3, 5, 8, 10, 15, 20]) {
  const { r, line } = waveRow(w, rackA, 7, 100, { gunDamage: 0 });
  console.log('  ' + line + ` perSlot fires=[${r.perSlot.map(s => s.fires).join(',')}] fuel=${JSON.stringify(r.fuel)}`);
}

console.log('\norder A vs B, wave 5 seed 7:');
const a = waveRow(5, rackA, 7).r, b = waveRow(5, rackB, 7).r;
console.log('  A kills', a.kills, 'B kills', b.kills, 'delta%', (100 * (b.kills - a.kills) / Math.max(1, a.kills)).toFixed(1));

console.log('\npermutations wave 3 with 6 mixed items:');
for (const w of [1, 3, 5, 8]) {
  const t0 = Date.now();
  const p = K.permutations({ wave: w, rack: rackA, seed: 7, hp: 100, upgrades: { gunDamage: 0 } });
  const ms = Date.now() - t0;
  console.log(`  wave ${w}: tested=${p.tested}/${p.totalOrders} spread=${p.spreadPct}% (vs worst ${p.spreadVsWorstPct}%) yours=${p.yours.kills} best=${p.best.kills} ${p.best.order.join('>')} worst=${p.worst.kills} pct=${p.yoursPct} deaths=${p.deaths} ${ms}ms`);
}

console.log('\ncascade search wave 3 (Cleave early):');
const racks = [
  ['cleave', 'sonar', 'fruitbloom', 'followthrough', 'overflow', 'bellbloom'],
  ['sonar', 'fruitbloom', 'followthrough', 'overflow', 'cleave', 'ballast'],
  ['sonar', 'fruitbloom', 'cleave', 'followthrough', 'overflow', 'bellbloom'],
  ['sonar', 'cleave', 'fruitbloom', 'followthrough', 'overflow', 'keystone'],
  ['cleave', 'sonar', 'fruitbloom', 'overflow', 'followthrough', 'prism'],
];
for (const rack of racks) {
  let best = null;
  for (let seed = 1; seed <= 40; seed++) {
    const r = K.simulate({ wave: 3, rack, seed, hp: 100 });
    if (!best || r.maxCascade > best.maxCascade) best = { seed, r };
  }
  console.log(`  ${rack.join('>')}  best cascade=${best.r.maxCascade} at seed ${best.seed} (kills=${best.r.kills}, echoes=${best.r.echoes})`);
}

console.log('\nfuel + attribution sample wave 8 with rackA:');
{
  const r = K.simulate({ wave: 8, rack: rackA, seed: 7, hp: 100 });
  console.log('  kills', r.kills, 'echoes', r.echoes, 'chainAvg', r.chainAvg.toFixed(2), 'chainMax', r.chainMax);
  console.log('  fuel', JSON.stringify(r.fuel), 'total', r.fuelTotal.toFixed(0));
  r.perSlot.forEach((s, i) => console.log('   slot' + i, s.id, 'seen', s.seen, 'fires', s.fires, 'added', s.added.toFixed(0), 'spent', s.spent.toFixed(0), 'echo', s.echo, 'barrier', s.barrier, 'pearls', s.pearls.toFixed(1), 'hollow', s.hollow));
}

console.log('\ndeterminism:');
{
  const a1 = K.simulate({ wave: 6, rack: rackA, seed: 99, hp: 100, record: true });
  const a2 = K.simulate({ wave: 6, rack: rackA, seed: 99, hp: 100, record: true });
  rec('same input -> same kills/events/frames', a1.kills === a2.kills && a1.events.length === a2.events.length && a1.frames.length === a2.frames.length, `kills=${a1.kills} events=${a1.events.length} frames=${a1.frames.length}`);
  const a3 = K.simulate({ wave: 6, rack: rackA, seed: 100, hp: 100 });
  rec('different seed -> different outcome', a3.kills !== a1.kills || a3.hpLeft !== a1.hpLeft, `seed99 kills=${a1.kills} seed100 kills=${a3.kills}`);
}

console.log('\nperf:');
for (const w of [1, 5, 10, 15, 20]) {
  const t0 = Date.now();
  const n = 20;
  for (let i = 0; i < n; i++) K.simulate({ wave: w, rack: rackA, seed: 1000 + i, hp: 100 });
  console.log(`  wave ${w}: ${((Date.now() - t0) / n).toFixed(1)}ms/sim`);
}

const fails = results.filter(r => !r.ok);
console.log('\n' + (fails.length ? 'FAILURES: ' + fails.length : 'all checks passed'));
process.exit(fails.length ? 1 : 0);

// Sizes the basic slot items to rarity budgets. An item's value is what it adds to a reference build (Discharge + Lens
// unless it needs something else) at its best launch angle or plan, averaged over waves 5, 10, 15 and 20, in % more
// damage per air second. For each item it tries candidate numbers and picks the one closest to its budget.
//   node slots-size.cjs [--only=id,id]            basics, writes sized.json
//   node slots-size.cjs --rares [--only=id,id]    rares, writes sized-rares.json
const S = require('./slots.cjs');
const fs = require('fs');
const WAVES = [5, 10, 15, 20];
const SINGLE = [10, 15, 20, 30, 45, 60, 75, 89];
const HUNT = [[20, 20, 20, 75], [20, 75]];
const MIX = [[20, 45, 75], [15, 30, 50, 75]];                           // three and four launch tiers in a wave
const BUDGET = { C: 7.5, U: 11, R: 15 };                                // C = one Lens on Discharge + Lens [TUNE]
const REF = ['discharge', 'lens'];

// cand: numbers to try; ref: the build it's added to; swap: the item it replaces instead of adding to
const SIZE = {
  battery:     { cand: [1, 2, 3, 4, 5, 6, 8, 10] },
  predator:    { cand: [.5, 1, 1.5, 2, 3, 4, 5] },
  magpie:      { cand: [1, 2, 2.5, 3, 4, 5, 6, 8] },
  capacitor:   { cand: [1.25, 1.5, 1.75, 2, 2.5, 3] },
  shallows:    { cand: [.5, .75, 1, 1.5, 2] },
  summit:      { cand: [.25, .5, .75, 1, 1.5, 2] },
  skipping:    { cand: [1.25, 1.5, 1.75, 2, 2.5, 3] },
  feedback:    { cand: [1, 2, 3, 4, 5, 8, 10], ref: ['discharge', 'lens', 'battery'] },
  prism:       { cand: [1.25, 1.5, 1.75, 2, 2.5, 3] },
  stalk:       { cand: [1, 1.5, 2, 3, 4, 6] },
  momentum:    { cand: [.5, 1, 2, 3, 4, 5, 8] },
  trophy:      { cand: [50, 100, 150, 200, 250, 300, 400] },
};
// Rares. Each is sized in Discharge + Lens if it works there, or else in its home build. OVER is the one basic build
// that wastes Charge at entry (6 of 840 basic builds waste any; this one up to 94 Charge a wave, on flat launches).
const OVER = ['discharge', 'battery', 'capacitor', 'mirror'];
const RARES = {
  tidal:        { cand: [.25, .4, .5, .6, .75] },
  spendthrift:  { cand: [.25, .5, .75, 1], ref: ['cashout', 'lens'] },
  hollow:       { cand: [.25, .5, .75, 1] },
  counterweight: { cand: [2, 3, 4, 5, 6], swap: 'lens' },
  echolocation: { cand: [.002, .005, .01, .02, .05] },
  migration:    { cand: [.1, .2, .25, .5, 1] },
  springtide:   { cand: [1.25, 1.5, 2, 3], ref: ['bank', 'strike', 'lens'] },
  thunderhead:  { cand: [10, 25, 50, 100, 200, 400], ref: OVER },
  burst:        { cand: [20, 25, 30, 40], ref: OVER, swap: 'discharge' }      // below 20 it's just a stronger Discharge
};
const RARES_FIXED = {                                                   // no number to size: value in Discharge + Lens and at home
  keystone:  [REF, ['discharge', 'lens', 'prism']],
  inversion: [REF, ['discharge', 'battery', 'capacitor']],
  mirror:    [REF, ['discharge', 'lens', 'prism']],
  riptide:   [OVER, OVER],
  undertow:  [OVER, ['discharge', 'capacitor', 'mirror', 'feedback']]
};
const RARE_MODE = process.argv.includes('--rares');

// Not sized here: Burst, Undertow and Thunderhead only pay when Charge is cut short at entry, and no basic build wastes
// Charge on flights of 1 s or more. They're sized with the rares, against a high-Charge build.

const plansAt = w => SINGLE.filter(a => S.flies(w, a)).map(a => [a]).concat(HUNT.concat(MIX).filter(p => p.every(a => S.flies(w, a))));
let memo = {};
function best(items, w, plan) {
  const k = items.join(',') + '|' + w + '|' + plan.join('/');
  if (!(k in memo)) memo[k] = Math.max(...S.arrangements(items).map(arr => S.wave(w, plan, arr).pct));
  return memo[k];
}
// what the item adds per wave, at its best plan; also the lean (wave 10 at 10° vs 75°)
function measure(id, spec = {}) {
  const ref = spec.ref || REF;
  const withIt = spec.swap ? ref.map(x => x === spec.swap ? id : x) : ref.concat(id);
  const per = WAVES.map(w => {
    let top = { v: -Infinity };
    for (const plan of plansAt(w)) { const v = best(withIt, w, plan) - best(ref, w, plan); if (v > top.v) top = { v, plan } }
    return top;
  });
  const lean = a => S.flies(10, a) ? best(withIt, 10, [a]) - best(ref, 10, [a]) : NaN;
  return { per, value: per.reduce((s, x) => s + x.v, 0) / per.length, flat: lean(10), steep: lean(75) };
}

const only = (process.argv.find(x => x.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const out = {};
for (const [id, spec] of Object.entries(RARE_MODE ? RARES : SIZE)) {
  if (only.length && !only.includes(id)) continue;
  const budget = BUDGET[S.ITEMS[id].r];
  let pick = null;
  for (const p of spec.cand) {
    S.OVR[id] = p; memo = {};
    const m = measure(id, spec);
    if (!pick || Math.abs(m.value - budget) < Math.abs(pick.m.value - budget)) pick = { p, m };
  }
  delete S.OVR[id]; memo = {};
  const { p, m } = pick;
  out[id] = { rarity: S.ITEMS[id].r, budget, p, text: S.ITEMS[id].text(p), value: S.fmt(m.value), perWave: m.per.map(x => S.fmt(x.v)), bestPlan: m.per.map(x => x.plan.join('/')), flat10: S.fmt(m.flat), steep75: S.fmt(m.steep) };
  const o = out[id];
  console.log(`${id.padEnd(12)}${o.rarity} ${String(budget).padStart(4)}  p=${String(p).padEnd(5)} value ${o.value.toFixed(1).padStart(5)}  waves ${o.perWave.map(v => v.toFixed(1)).join(' / ')}  plans ${o.bestPlan.join(' ')}  w10 10° ${o.flat10.toFixed(1)} 75° ${o.steep75.toFixed(1)}`);
}

memo = {};
const avg = (fn) => WAVES.reduce((s, w) => s + fn(w), 0) / WAVES.length;
const bestOver = (items, w) => Math.max(...plansAt(w).map(p => best(items, w, p)));
if (RARE_MODE) {
  const fixed = {};
  console.log('\nno number to size (adds in Discharge + Lens | in its home build, averaged over waves, best plan):');
  for (const [id, [ref, home]] of Object.entries(RARES_FIXED)) {
    if (only.length && !only.includes(id)) continue;
    const inRef = avg(w => bestOver(ref.concat(id), w) - bestOver(ref, w)), atHome = avg(w => bestOver(home.concat(id), w) - bestOver(home, w));
    fixed[id] = { text: S.ITEMS[id].text(), inRef: S.fmt(inRef), home: home.join('+'), atHome: S.fmt(atHome) };
    console.log(`  ${id.padEnd(12)} ${inRef.toFixed(1).padStart(6)} | ${atHome.toFixed(1).padStart(6)}  (home ${home.join('+')})`);
  }
  if (!only.length) fs.writeFileSync(__dirname + '/sized-rares.json', JSON.stringify({ budget: BUDGET, waves: WAVES, over: OVER, items: out, fixed }, null, 1));
  process.exit(0);
}

// Items that depend on a partner: report their value in a reference build instead of sizing a number.
const structural = {
  mirror: avg(w => bestOver(['discharge', 'lens', 'mirror'], w) - bestOver(REF, w)),
  'mirror (with Prism)': avg(w => bestOver(['discharge', 'lens', 'prism', 'mirror'], w) - bestOver(['discharge', 'lens', 'prism'], w)),
  undertow: avg(w => bestOver(['discharge', 'lens', 'capacitor', 'battery', 'undertow'], w) - bestOver(['discharge', 'lens', 'capacitor', 'battery'], w)),
  'bank + strike (for Discharge, + Lens, Battery)': avg(w => bestOver(['strike', 'bank', 'lens', 'battery'], w) - bestOver(['discharge', 'lens', 'battery'], w)),
  'bank + strike + stalk (for Discharge + Stalk)': avg(w => bestOver(['strike', 'bank', 'stalk'], w) - bestOver(['discharge', 'stalk'], w))
};
console.log('\nstructural (what it adds in that build, averaged over waves, best plan):');
for (const [k, v] of Object.entries(structural)) console.log('  ' + k.padEnd(50) + v.toFixed(1));
const pearls = SINGLE.filter(a => S.flies(10, a)).map(a => a + '° ' + S.wave(10, [a], [null, null, null, null, 'cashout']).pearls.toFixed(1));
console.log('  cash out alone, pearls per wave 10: ' + pearls.join('  '));
if (!only.length) fs.writeFileSync(__dirname + '/sized.json', JSON.stringify({ budget: BUDGET, ref: REF, waves: WAVES, items: out, structural }, null, 1));

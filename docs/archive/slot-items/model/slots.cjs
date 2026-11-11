// Slot items on the flight model: five slots fire once per flight (breach → ascent → apex → descent → entry), items
// change shared Charge and Mult, and a converter turns them into damage or pearls. Each wave is flown as a repeating
// plan of launch angles (holding nothing, flights of MIN_AIR s or more), and every arrangement of an item set is tried.
//   node slots.cjs [--wave=10] [--engine=neutral|proposal] [--kill=0.5] [--orb=0.3] [--min=1]
// Damage is reported as % more damage per air second (the same unit as items.cjs); pearls per wave.
const path = require('path');
const j = require(path.join(__dirname, 'model.json'));
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d };

const clock = w => w === 20 ? 90 : Math.min(60, 20 + 5 * (w - 1));   // demo.js:74, air seconds per wave
const G = 15, CAM_HALF = 21.6;                                         // air gravity; half the camera's view height
const SLOTS = ['breach', 'ascent', 'apex', 'descent', 'entry'];
const SLOT_AT = [0, .25, .5, .75, 1];                                  // share of the flight: halfway up, apex, halfway down

// Engines. proposal: as pasted (10 Charge at each breach; Discharge = +Charge × Mult DPS for 2 s, on weapons doing `dps`).
// neutral: no base Charge; Discharge = +100% × Mult damage for Charge × r seconds; overlaps add; it ends at entry,
// so only Charge can be wasted (Charge too big for the rest of the flight), never Mult.
const ENGINES = {
  proposal: { base: 10, conv: 'dps', dur: 2, dps: 50 },              // dps [ASSUMED]: weapon DPS the bonus is measured against
  neutral: { base: 0, conv: 'boost', r: .1 }                          // r [TUNE]
};
const P = Object.assign({ storeCap: 3, rate: 1, kill: +arg('kill', .5), orb: +arg('orb', .3), minAir: +arg('min', 1) }, ENGINES[arg('engine', 'neutral')]);
// kill and orb rates per air second are [ASSUMED] (enemies aren't settled); kills scale with the damage multiplier,
// so early damage earns kills that later items read.

const CASES = {};
for (const c of j.res) if (c.style === 'hold') CASES[c.wave + ':' + c.angle] = c;
const ANGLES = [...new Set(j.res.map(r => r.angle))].sort((a, b) => a - b);
const flies = (w, a) => CASES[w + ':' + a] && CASES[w + ':' + a].air >= P.minAir;

const tier = a => 1 + (a >= 27) + (a >= 42) + (a >= 56) + (a >= 70);  // the game's threat tiers by launch angle
// Release: spend all Charge for +100% × gain × Mult damage, lasting Charge ÷ per seconds (Discharge: gain 1, per 10).
function release(f, gain = 1, per = 1 / P.r) {
  const cm = f.C * f.M; f.lastDis = f.t; f.st.since = -f.t;
  // Tidal Lock adds a share of the last Discharge's Mult after multipliers, so it converges (to ×1/(1−p)) instead of compounding
  const M = f.M + (f.tidal ? pOf('tidal') * f.st.lastM : 0); f.st.lastM = M;
  if (P.conv === 'boost') f.buffs.push({ amt: gain * M, from: f.t, until: f.t + f.C / per, per });   // Mult: how hard; Charge: how long
  else f.buffs.push({ amt: cm / P.dps, from: f.t, until: f.t + P.dur, per: 0 });
  f.C = 0;
  return true;
}
const store = f => { f.st.S += f.C; f.C = 0 };

// Item numbers: p is the default, sized by slots-size.cjs (sized.json); OVR overrides it while sizing.
const OVR = {};
const pOf = id => id in OVR ? OVR[id] : ITEMS[id].p;
const fmt = n => +n.toFixed(2);
const CONVERT = ['discharge', 'burst', 'strike', 'cashout'];

// One short rule each, Balatro-style. Run at the item's slot with x (values at activation) and c (arrangement, slot).
const ITEMS = {
  // converters
  discharge: { r: 'S', text: () => 'Spend all Charge: +100% × Mult damage for Charge ÷ 10 seconds', run: f => release(f) },
  burst:     { r: 'U', p: 20, text: p => `Spend all Charge: +200% × Mult damage for Charge ÷ ${p} seconds`, run: (f, x, c) => release(f, 2, c.p) },
  strike:    { r: 'C', text: () => 'If you launched at 56° or more: Discharge', run: (f, x) => x.angle >= 56 && release(f) },
  cashout:   { r: 'C', p: 10, text: p => `Spend all Charge: 1 pearl per ${p} Charge`, run: (f, x, c) => { f.st.pearls += f.C / c.p; if (c.arr.includes('spendthrift')) release(f, pOf('spendthrift')); f.C = 0 } },
  // Charge
  battery:   { r: 'C', p: 1, text: p => `+${p} Charge`, run: (f, x, c) => { f.C += c.p } },
  predator:  { r: 'C', p: 1.5, text: p => `+${p} Charge per kill this flight`, run: (f, x, c) => { f.C += c.p * f.kills } },
  magpie:    { r: 'C', p: 2.5, text: p => `+${p} Charge per orb this flight`, run: (f, x, c) => { f.C += c.p * f.orbs } },
  capacitor: { r: 'U', p: 2, text: p => `×${p} Charge`, run: (f, x, c) => { f.C *= c.p } },
  // Mult
  lens:      { r: 'C', p: 1, text: p => `+${p} Mult`, run: (f, x, c) => { f.M += c.p } },
  shallows:  { r: 'C', p: 1, text: p => `+1 Mult per ${p} s the water has been on screen this flight`, run: (f, x, c) => { f.M += Math.floor(f.wet / c.p + 1e-9) } },
  summit:    { r: 'U', p: 0.5, text: p => `+${p} Mult per launch tier above the second`, run: (f, x, c) => { f.M += c.p * Math.max(0, tier(x.angle) - 2) } },
  skipping:  { r: 'U', p: 1.75, text: p => `×${p} Mult if you launched below 27°`, run: (f, x, c) => { if (x.angle < 27) f.M *= c.p } },
  feedback:  { r: 'U', p: 4, text: p => `+1 Mult per ${p} Charge held`, run: (f, x, c) => { f.M += Math.floor(f.C / c.p + 1e-9) } },
  prism:     { r: 'R', p: 2, text: p => `×${p} Mult`, run: (f, x, c) => { f.M *= c.p } },
  // across flights
  bank:      { r: 'C', text: () => 'If you launched below 42°: store all Charge for the next flight', run: (f, x) => x.angle < 42 && store(f) },
  stalk:     { r: 'R', p: 3, text: p => `+1 Mult per ${p} air seconds since you last Discharged`, run: (f, x, c) => { f.M += Math.floor((f.st.since + f.t) / c.p + 1e-9) } },
  undertow:  { r: 'R', text: () => 'Charge cut short at entry carries to the next flight', run: f => { f.undertow = true } },
  momentum:  { r: 'U', p: 3, text: p => `+1 Mult per ${p} kills last flight`, run: (f, x, c) => { f.M += Math.floor(f.st.prevKills / c.p + 1e-9) } },
  // across the run
  trophy:    { r: 'R', p: 150, run_: 1, text: p => `+1 Mult per ${p} kills this run`, run: (f, x, c) => { f.M += Math.floor(f.st.run.kills / c.p + 1e-9) } },
  thunderhead: { r: 'R', p: 100, run_: 1, text: p => `+1 Mult per ${p} Charge cut short at entry this run`, run: (f, x, c) => { f.M += Math.floor(f.st.run.wasted / c.p + 1e-9) } },
  // order
  mirror:    { r: 'R', text: () => 'Copies the item in the slot before it', run: (f, x, c) => { const id = c.arr[c.i - 1]; if (id && id !== 'mirror') ITEMS[id].run(f, x, { arr: c.arr, i: c.i - 1, p: pOf(id) }) } },
  // rares: rule-breakers, position and run-scaling (sized by slots-size.cjs --rares). Passive ones act wherever they sit.
  keystone:  { r: 'R', text: () => 'The next slot activates twice', run: (f, x, c) => { f.retrig = c.i + 1 } },
  inversion: { r: 'R', text: () => 'Swap your Charge and Mult', run: f => { const C = f.C; f.C = f.M; f.M = Math.max(1, C) } },
  riptide:   { r: 'R', text: () => 'Discharges cut short at entry continue from your next breach', run: f => { f.riptide = true } },
  tidal:     { r: 'R', p: .5, text: p => `Discharges add ${p === .5 ? 'half' : p * 100 + '%'} of your last Discharge's Mult`, run: () => {} },
  spendthrift: { r: 'R', p: 1, text: p => p === 1 ? 'Cash Out also Discharges' : `Cash Out also Discharges at ${p * 100}% strength`, run: () => {} },
  hollow:    { r: 'R', p: .5, text: p => `+×${p} Mult per empty slot`, run: (f, x, c) => { f.M *= 1 + c.p * c.arr.filter(id => !id).length } },
  counterweight: { r: 'R', p: 4, text: p => `×${p} Mult if this is the only item before your Discharge`, run: (f, x, c) => { const d = c.arr.findIndex(id => CONVERT.includes(id)); if (d > c.i && c.arr.slice(0, d).filter(Boolean).length === 1) f.M *= c.p } },
  echolocation: { r: 'R', p: .02, run_: 1, text: p => `+${p} Mult per kill made during a Discharge this run`, run: (f, x, c) => { f.M += c.p * f.st.run.bkills } },
  migration: { r: 'R', p: .2, run_: 1, text: p => `+${p} Mult for each wave this run you launched in 3 or more tiers`, run: (f, x, c) => { f.M += c.p * f.st.run.migr } },
  springtide: { r: 'R', p: 3, text: p => `Stored Charge ×${p} at each breach`, run: () => {} },
  // exploratory (ICARUS-slot-sim.md, first pass)
  savings:   { text: () => 'Store all Charge for the next flight', run: f => store(f) },
  altimeter: { p: 2, text: p => `+${p} Charge per 10% of this wave's highest jump you are at`, run: (f, x, c) => { f.C += c.p * Math.floor(10 * x.share + 1e-9) } },
  metres:    { p: 1, text: p => `+${p} Charge per 5 m of altitude (the proposal's Altimeter)`, run: (f, x, c) => { f.C += c.p * Math.floor(x.alt / 5) } },
  tailwind:  { p: 1, text: p => `+${p} Charge per 10% of launch speed that is horizontal`, run: (f, x, c) => { f.C += c.p * Math.floor(10 * x.flat + 1e-9) } },
  patience:  { p: 2, text: p => `+1 Mult per ${p} s since you last Discharged this flight`, run: (f, x, c) => { f.M += Math.floor((f.t - f.lastDis) / c.p) } }
};

// One flight with arrangement arr (5 entries, item id or null); st carries stored Charge, pearls, the last flight's
// kills and the run's records between flights.
function fly(c, arr, st) {
  const T = c.air, th = c.angle * Math.PI / 180, vy = c.v * Math.sin(th), top = c.v * c.v / 30;
  const has = id => arr.includes(id);
  // stored Charge (Bank, Savings, Undertow, Spring Tide) is capped at STORE_CAP × this flight's airtime, the rest is lost:
  // without it Undertow + Capacitor + Mirror stored 10²¹ Charge in one wave
  const stored = Math.min(st.S * (has('springtide') ? pOf('springtide') : 1), P.storeCap * T);
  const f = { st, C: P.base + stored, M: 1, tidal: has('tidal'), t: 0, lastDis: 0, kills: 0, bkills: 0, orbs: 0, wet: 0, dmg: 0, buffs: [] };
  st.S = 0; st.tiers.add(tier(c.angle));
  for (const b of st.carry) f.buffs.push({ amt: b.amt, from: 0, until: b.left, per: b.per });   // Riptide's carried bonuses
  st.carry = [];
  const alt = t => Math.max(0, vy * t - G / 2 * t * t);               // the arena's ballistic arc (the camera follows it)
  // the water is on screen while the arena is below CAM_HALF: before t1 and after t2
  const disc = vy * vy - 2 * G * CAM_HALF, t1 = disc < 0 ? Infinity : (vy - Math.sqrt(disc)) / G, t2 = disc < 0 ? Infinity : (vy + Math.sqrt(disc)) / G;
  const wet = (a, b) => Math.max(0, Math.min(b, t1) - a) + Math.max(0, b - Math.max(a, t2));
  function adv(t) {                                                    // Charge, orbs, wet time, and kills and bonus damage under buffs
    const pts = [f.t, t, ...f.buffs.flatMap(b => [b.from, b.until]).filter(u => u > f.t && u < t)].sort((a, b) => a - b);
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = pts[i], b = pts[i + 1], mid = (a + b) / 2;
      const bonus = f.buffs.reduce((s, x) => s + (x.from <= mid && mid < x.until ? x.amt : 0), 0);
      f.dmg += bonus * (b - a); f.kills += P.kill * (1 + bonus) * (b - a);
      if (bonus > 0) f.bkills += P.kill * (1 + bonus) * (b - a);
    }
    f.C += P.rate * (t - f.t); f.orbs += P.orb * (t - f.t); f.wet += wet(f.t, t); f.t = t;
  }
  for (let i = 0; i < 5; i++) {
    adv(SLOT_AT[i] * T);
    if (!arr[i]) continue;
    const a = alt(f.t);
    for (let k = f.retrig === i ? 2 : 1; k > 0; k--)                  // Keystone: the slot after it fires twice
      ITEMS[arr[i]].run(f, { angle: c.angle, alt: a, share: a / top, flat: Math.cos(th) }, { arr, i, p: pOf(arr[i]) });
  }
  // at entry: bonuses end; Charge cut short is lost, or carried by Undertow
  // a cut counts only for a Discharge released before entry (one at entry is all waste, not a cut)
  for (const b of f.buffs) if (b.until > T + 1e-9) {
    const secs = b.until - Math.max(b.from, T), left = secs * b.per;
    if (f.riptide) { st.carry.push({ amt: b.amt, left: secs, per: b.per }); continue }
    if (b.from < T - 1e-9) { st.run.cuts++; st.run.wasted += left }
    if (f.undertow) st.S += left;
  }
  st.since += T; st.prevKills = f.kills; st.run.kills += f.kills; st.run.bkills += f.bkills;
  return f;                                                            // Charge, Mult and buffs end at entry
}

const newState = (run = newRun()) => ({ S: 0, pearls: 0, since: 0, prevKills: 0, lastM: 0, carry: [], tiers: new Set(), run });

// A wave flown with a repeating plan of angles; the last flight finishes past the clock. Items that read the run
// (Trophy, Thunderhead) fly waves 1 to w−1 first with the same plan and arrangement.
const newRun = () => ({ kills: 0, cuts: 0, wasted: 0, bkills: 0, migr: 0 });
function wave(w, plan, arr, run) {
  if (!run) { run = newRun(); if (arr.some(id => id && ITEMS[id].run_)) for (let k = 1; k < w; k++) wave(k, plan, arr, run) }
  const st = newState(run);
  let air = 0, dmg = 0, kills = 0, n = 0;
  while (air < clock(w)) { const c = CASES[w + ':' + plan[n % plan.length]]; const f = fly(c, arr, st); air += c.air; dmg += f.dmg; kills += f.kills; n++ }
  if (st.tiers.size >= 3) run.migr++;
  return { pct: 100 * dmg / air, pearls: st.pearls, kills, flights: n, air };
}

// Every way to put the items in distinct slots (empty slots allowed).
function arrangements(items) {
  const out = [];
  (function go(i, arr) { if (i === items.length) return out.push(arr.slice()); for (let s = 0; s < 5; s++) if (!arr[s]) { arr[s] = items[i]; go(i + 1, arr); arr[s] = null } })(0, [null, null, null, null, null]);
  return out;
}
const show = arr => arr.map((x, i) => x ? SLOTS[i][0].toUpperCase() + SLOTS[i].slice(1, 3) + ':' + x : null).filter(Boolean).join(' ');

// For an item set and a list of plans: the best arrangement per plan, and how much a single fixed arrangement loses.
function study(items, plans, w, goal = 'pct') {
  const arrs = arrangements(items);
  const grid = plans.map(plan => arrs.map(arr => wave(w, plan, arr)[goal]));
  const best = grid.map(row => { let k = 0; row.forEach((v, i) => { if (v > row[k] + 1e-9) k = i }); return { k, v: row[k], arr: arrs[k] } });
  // the one arrangement with the smallest worst-case shortfall against each plan's best
  let fixed = null;
  arrs.forEach((arr, i) => { const loss = Math.max(...grid.map((row, p) => best[p].v > 0 ? 1 - row[i] / best[p].v : 0)); if (!fixed || loss < fixed.loss - 1e-9) fixed = { arr, loss } });
  return { best, fixed };
}

module.exports = { newState, newRun, ITEMS, OVR, pOf, fmt, tier, ENGINES, P, SLOTS, SLOT_AT, CASES, ANGLES, clock, fly, wave, arrangements, study, show, flies };

// Archetype sets, and the plans they're flown on.
const SETS = {
  starter:   ['discharge'],
  hunter:    ['predator', 'lens', 'discharge'],
  climber:   ['altimeter', 'lens', 'discharge'],
  skimmer:   ['tailwind', 'shallows', 'discharge'],
  patient:   ['patience', 'discharge'],
  reactor:   ['battery', 'feedback', 'discharge'],
  doubler:   ['capacitor', 'lens', 'discharge'],
  metres:    ['metres', 'lens', 'discharge'],
  saver:     ['magpie', 'cashout']
};

if (require.main === module) {
  const w = +arg('wave', 10);
  const A = ANGLES.filter(a => flies(w, a) && [10, 15, 20, 30, 45, 60, 75, 89].includes(a));
  console.log(`wave ${w}, engine ${arg('engine', 'neutral')}, kill ${P.kill}/s, orb ${P.orb}/s; flights of ${P.minAir} s or more`);
  console.log('set'.padEnd(10) + A.map(a => (a + '°').padStart(7)).join('') + '   best°  fixed-order loss   best order (flattest | steepest)');
  for (const [name, items] of Object.entries(SETS)) {
    const goal = items.includes('cashout') ? 'pearls' : 'pct';
    const r = study(items, A.map(a => [a]), w, goal);
    const vals = r.best.map(b => b.v), top = vals.indexOf(Math.max(...vals));
    console.log(name.padEnd(10) + vals.map(v => v.toFixed(goal === 'pct' ? 1 : 0).padStart(7)).join('') + ('   ' + A[top] + '°').padEnd(9) + (Math.round(100 * r.fixed.loss) + '%').padStart(8) + '          ' + show(r.best[0].arr) + ' | ' + show(r.best[r.best.length - 1].arr));
  }
  // bank & strike: bank on low hops, cash in on a high leap
  const lo = A.find(a => a >= 20) || A[0], hi = 75;
  const plans = [[lo], [hi], [lo, hi], [lo, lo, hi], [lo, lo, lo, hi]];
  const names = plans.map(p => p.join('/'));
  for (const items of [['discharge', 'lens'], ['bank', 'strike', 'lens'], ['bank', 'strike', 'lens', 'tailwind'], ['strike', 'stalk'], ['bank', 'strike', 'stalk']]) {
    const r = study(items, plans, w);
    console.log('\n' + items.join(' + ') + ':  ' + names.map((n, i) => `${n} ${r.best[i].v.toFixed(1)}%`).join('   '));
  }
}

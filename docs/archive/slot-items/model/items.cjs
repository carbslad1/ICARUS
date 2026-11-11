// Item values from the flight model: for each jump-only condition item, its average bonus per air second (Damage % and
// Attack speed % both counted as % more damage per second), at every wave and launch angle, holding nothing in the air.
// Flights under MIN_AIR s are left out: short-hop spam will be limited by a separate mechanic (designer, 2026-11-03).
//   node items.cjs [model.json] [--min=1]
const j = require(process.argv[2] && !process.argv[2].startsWith('--') ? require('path').resolve(process.argv[2]) : './model.json');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? +a.split('=')[1] : d };
const MIN_AIR = arg('min', 1);
const cases = j.res.filter(r => r.style === 'hold' && r.air >= MIN_AIR);

// Each item: f(case, p) = average % bonus per air second; p holds its numbers (gain, cost, ...).
const ITEMS = {
  shallows: { pair: 1, p: { on: 12, off: 15 }, f: (c, p) => p.on * c.waterVisible - p.off * (1 - c.waterVisible) },
  opensky:  { pair: 1, p: { on: 15, off: 10 }, f: (c, p) => p.on * (1 - c.waterVisible) - p.off * c.waterVisible },
  spray:    { pair: 2, p: { on: 15, off: 2 }, f: (c, p) => p.on * .4 - p.off * .6 },
  thinair:  { pair: 2, p: { on: 30, off: 1 }, f: (c, p) => p.on * .2 - p.off * .8 },
  updraft:  { pair: 3, p: { on: 12 }, f: (c, p) => p.on * c.phase.ascent },
  freefall: { pair: 3, p: { on: 12 }, f: (c, p) => p.on * c.phase.descent },
  lowroad:  { pair: 4, p: { on: 12 }, f: (c, p) => c.angle < 42 ? p.on : 0 },
  highstakes: { pair: 4, p: { on: 14 }, f: (c, p) => c.angle >= 56 ? p.on : 0 },
  // a window, not a burst: the first `win` s of each flight, so its uptime is at most 100% however short the flights
  quickdraw: { pair: 5, p: { on: 12, win: 1.5 }, f: (c, p) => p.on * Math.min(1, p.win / c.air) },
  // +rate % per second in the air up to cap, averaged over the flight; minus a flat cost
  longbreath: { pair: 5, p: { rate: 2, cap: 24, off: 4 }, f: (c, p) => { const T = c.air, tc = p.cap / p.rate; const area = T <= tc ? p.rate * T * T / 2 : p.rate * tc * tc / 2 + p.cap * (T - tc); return area / T - p.off } }
};

const waves = [...new Set(cases.map(c => c.wave))].sort((a, b) => a - b);
function table(id, p = ITEMS[id].p) {
  const it = ITEMS[id], rows = {};
  for (const w of waves) { const cw = cases.filter(c => c.wave === w); const v = cw.map(c => ({ a: c.angle, v: it.f(c, p) })); const best = v.reduce((a, b) => b.v > a.v ? b : a); rows[w] = { best: best.v, at: best.a, mean: v.reduce((s, x) => s + x.v, 0) / v.length, worst: Math.min(...v.map(x => x.v)) } }
  return rows;
}
// rarity budgets: % bonus per air second for the style the item is for (pure items: Common +5%) [TUNE]
// N: style-neutral items (same value for every way of flying) get the pure item's +5
const BUDGET = { N: 5, C: 8, U: 12, R: 16 };
const RARITY = { shallows: 'U', opensky: 'U', spray: 'N', thinair: 'N', updraft: 'N', freefall: 'N', lowroad: 'U', highstakes: 'U', quickdraw: 'U', longbreath: 'U' };
module.exports = { ITEMS, table, cases, waves, BUDGET, RARITY };
if (require.main === module) {
  const W = [1, 3, 5, 10, 15, 20].filter(w => waves.includes(w));
  console.log('min air', MIN_AIR, 's; cases', cases.length);
  console.log('item, budget'.padEnd(16) + W.map(w => ('w' + w + ' best@ang mean').padEnd(19)).join(''));
  for (const id of Object.keys(ITEMS)) { const t = table(id); console.log((id + ' ' + RARITY[id] + BUDGET[RARITY[id]]).padEnd(16) + W.map(w => `${t[w].best.toFixed(1)}@${t[w].at} ${t[w].mean.toFixed(1)}`.padEnd(19)).join('')) }
}

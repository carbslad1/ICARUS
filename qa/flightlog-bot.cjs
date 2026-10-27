// Bot flight logs: plays the four flow-study bot runs (docs/flow-study) headless with the same seed and shop policy,
// saves each run's SAVE FLIGHT LOG output, and checks that qa/flightlog-metrics.cjs reproduces the study's baseline.
// It checks the recorder (it only observes, so the same flights happen) and the metrics script together.
//   node qa/flightlog-bot.cjs [outDir]
const fs = require('fs'), path = require('path');
const { load } = require('./load.cjs'), { flyer } = require('./bot.cjs'), { analyse } = require('./flightlog-metrics.cjs');
const root = path.resolve(__dirname, '..'), file = path.join(root, 'ICARUS-demo.html');
const out = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'icarus-flightlog-bot'));

// The flow study's baseline on the S4 build (docs/flow-study, 2026-10-26)
const BASELINE = { flights: 291, hits: 59, kills: 4533, killsByPhase: { ascent: 1915, apex: 793, descent: 1825 }, offScreen: 58.28 };
const STYLES = ['low-keep', 'mid-keep', 'high-keep', 'mid-turn'], SEED = 7, MAX_WAVE = 16;

function run(style) {
  const H = load(file, new Map(), { bake: true, modern: true }), D = H.DEMO, r = H.Hd(SEED, 'harpoon'), fly = flyer(H, style, SEED, { keep: 8 });
  const pref = ['Armour', 'Max HP', 'Regen', 'Damage %', 'Attack speed', 'Shot', 'Crit', 'Area', 'Lift', 'Hang', 'Air steering', 'Pickup', 'Luck', 'XP gain'];
  function shop() {
    const d = r.demo;
    for (let i = 0; r.lvup && i < 50; i++) { const b = d.levelChoices.map((c, i) => ({ i, s: pref.indexOf(c.id) < 0 ? -1 : 100 - pref.indexOf(c.id) })).sort((a, b) => b.s - a.s)[0]; D.command(r, 'level', b.i) }
    for (let t = 0; t < 2; t++) {
      for (const o of d.offers) {
        if (o.bought || o.price > r.xp) continue;
        if (o.row === 'weapon' && (r.slots.length < 6 || r.slots.some(g => g.id === o.id && g.lvl === o.level && g.lvl < 4))) D.command(r, 'buy', o.uid);
        else if (o.row === 'stat' && ['Armour', 'Max HP', 'Regen', 'Damage %', 'Shot'].includes(D.items[o.id].up)) D.command(r, 'buy', o.uid);
        else if (o.row === 'routine' && o.choice.kind === 'draw') D.command(r, 'buy', o.uid);
      }
      for (let i = 0; i < r.slots.length; i++) D.command(r, 'combine', i);
      if (r.xp > 20) D.command(r, 'reroll', 'shelf');
    }
    D.command(r, 'next');
  }
  let ticks = 0;
  while (['playing', 'shop'].includes(r.mode) && r.wave <= MAX_WAVE && ticks < 120 * 60 * 40) {
    if (r.mode === 'shop') { if (r.wave >= MAX_WAVE) break; shop(); continue }
    const intent = fly(r); if (r.medium.kind === 'air' && r.budget <= 0) intent.y = -1;
    H.sw(r, intent); ticks++;
  }
  return JSON.parse(H.FlightLog.exportJSON());
}

fs.mkdirSync(out, { recursive: true });
const logs = STYLES.map(style => { const l = run(style); fs.writeFileSync(path.join(out, `bot-${style}.json`), JSON.stringify(l)); return l });
const r = analyse(logs), flights = logs.flatMap(l => l.flights);
const got = {
  flights: flights.length, hits: flights.reduce((a, f) => a + f.hits.length, 0), kills: flights.reduce((a, f) => a + f.kills.length, 0),
  killsByPhase: Object.fromEntries(['ascent', 'apex', 'descent'].map(p => [p, flights.reduce((a, f) => a + f.kills.filter(k => k.ph === p).length, 0)])),
  offScreen: r.all.offScreenEnemies
};
// Event counts must match exactly; the off-screen share samples on a different tick grid, so it gets 1 point.
const checks = [
  ['flights', got.flights === BASELINE.flights], ['hits', got.hits === BASELINE.hits], ['kills', got.kills === BASELINE.kills],
  ...Object.keys(BASELINE.killsByPhase).map(p => [`${p} kills`, got.killsByPhase[p] === BASELINE.killsByPhase[p]]),
  ['off-screen share within 1 point', Math.abs(got.offScreen - BASELINE.offScreen) <= 1]
];
for (const [name, ok] of checks) console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
console.log(JSON.stringify({ baseline: BASELINE, got, all: r.all, out }, null, 1));
if (checks.some(c => !c[1])) process.exit(1);

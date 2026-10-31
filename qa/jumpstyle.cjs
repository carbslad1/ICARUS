// Jump-style harness (docs/TRICK_LAB.md): is a trick better in its home jump style and still viable in the others?
// For each style the launch angle is forced (low 28°, mid 55°, high 78°); the bot flies the air phase; the dolphin
// cannot die; when the wave ends the same wave starts again (normal clock and spawn pattern, so normal density), so
// runs with and without the trick meet the same enemy stream.
// Measures damage dealt per second of air time (guns, plus drowning and splashes for water tricks), against the same
// seeds without the trick, and checks the criteria in docs/TRICK_LAB.md.
//   node qa/jumpstyle.cjs <trick> [--wave=5] [--seeds=8] [--flights=10] [--level=1] [--set=key:value,...] [--json]
//   --set overrides the trick's live numbers (Routine.P), e.g. --set=eddyRing:5,eddySpin:8
const path = require('path'), assert = require('assert');
const { load } = require('./load.cjs'), { flyer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const TRICK = process.argv.slice(2).find(a => !a.startsWith('--')) || 'eddy';
const WAVE = +arg('wave', 5), SEEDS = +arg('seeds', 8), FLIGHTS = +arg('flights', 10), LEVEL = +arg('level', 1);
const SET = Object.fromEntries((arg('set', '') || '').split(',').filter(Boolean).map(kv => { const [k, v] = kv.split(':'); return [k, +v] }));
const STYLES = { low: 28, mid: 55, high: 78 };
// the guns each trick is meant to feed; neutral tricks get one Shot and one Close gun
const GUNS = { eddy: ['fin', 'sonic'], bubble: ['fin', 'sonic'], anchor: ['rocket', 'flak'], chum: ['laser', 'harpoon'], slip: ['laser', 'harpoon'] };
const guns = GUNS[TRICK] || ['harpoon', 'fin'];
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify({ moves: 1 })]]), { bake: true, modern: true }), D = H.DEMO, R = H.Routine;
if (!R.TRICKS[TRICK]) { console.error('no trick ' + TRICK + '; tricks: ' + R.IDS.join(', ')); process.exit(2) }
Object.assign(R.P, SET);
const water = R.TRICKS[TRICK].kind === 'water';
const counts = w => w in D.weapons || ['shock', 'conduct', 'shatter'].includes(w) || (water && (w === 'drown' || R.TRICKS[w]?.kind === 'water'));

function play(style, withTrick, seed) {
  const r = H.Hd(seed, guns[0]); r.wave = WAVE; D.wave(r);
  r.slots = guns.map(id => { const g = H.Owslot(id, LEVEL, ++r.demo.uid); g.paid = 0; g.cd = 0; return g }); D.sync(r);
  r.demo.routine = { slots: withTrick ? { [R.TRICKS[TRICK].slot]: TRICK } : {}, levels: withTrick ? { [TRICK]: 1 } : {} };
  const fly = flyer(H, 'mid-keep', seed, { keep: 8 }), angle = STYLES[style] * Math.PI / 180;
  let air = 0, dmg = 0, kills = 0, hits = 0, flights = 0, prev = r.medium.kind, ticks = 0;
  while (flights < FLIGHTS && ticks < 120 * 60 * 6 && r.mode === 'playing') {
    r.hp = r.stats.maxHp;
    const i = fly(r); H.sw(r, i); ticks++;
    if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }   // replay the wave
    const m = r.medium;
    if (m.kind === 'air' && prev !== 'air') {    // the launch: force this style's angle, keeping the speed and direction
      const v = Math.hypot(m.vx, m.vy), sx = Math.sign(m.vx) || 1; m.vx = Math.cos(angle) * v * sx; m.vy = Math.sin(angle) * v;
    }
    if (m.kind === 'air') air += 1 / 120;
    for (const ev of r.events || []) {
      if (ev.kind === 'damage' && counts(ev.weapon)) dmg += ev.applied ?? ev.value;
      if (ev.kind === 'kill') kills++;
      if (ev.kind === 'hit') hits++;
    }
    if (prev === 'air' && m.kind !== 'air') flights++;
    prev = m.kind;
  }
  return { air, dmg, kills, hits, flights };
}
const sum = list => list.reduce((a, o) => ({ air: a.air + o.air, dmg: a.dmg + o.dmg, kills: a.kills + o.kills, hits: a.hits + o.hits, flights: a.flights + o.flights }), { air: 0, dmg: 0, kills: 0, hits: 0, flights: 0 });
const out = {};
for (const style of Object.keys(STYLES)) {
  const base = sum(Array.from({ length: SEEDS }, (_, i) => play(style, false, i + 1))), trick = sum(Array.from({ length: SEEDS }, (_, i) => play(style, true, i + 1)));
  const dps = o => o.dmg / Math.max(1e-9, o.air), hpf = o => o.hits / Math.max(1, o.flights);
  out[style] = { gain: Math.round((dps(trick) / dps(base) - 1) * 1000) / 10, dpsBase: Math.round(dps(base)), dpsTrick: Math.round(dps(trick)), airPerFlight: +(trick.air / Math.max(1, trick.flights)).toFixed(1), hitsBase: +hpf(base).toFixed(2), hitsTrick: +hpf(trick).toFixed(2), killsPerFlight: [+(base.kills / Math.max(1, base.flights)).toFixed(1), +(trick.kills / Math.max(1, trick.flights)).toFixed(1)] };
}
// the criteria (docs/TRICK_LAB.md, all [TUNE])
const gains = Object.entries(out).map(([s, o]) => [s, o.gain]).sort((a, b) => b[1] - a[1]), [home, best] = gains[0], second = gains[1][1];
const verdict = {
  home, homeGain: best,
  'home gain ≥ +20%': best >= 20,
  'other styles ≥ 0%': gains.slice(1).every(([, g]) => g >= 0),
  'home ≥ 10 points above the rest': best - second >= 10,
  'hits ≤ +10% in every style': Object.values(out).every(o => o.hitsTrick <= o.hitsBase * 1.1 + .02)
};
verdict.proven = verdict['home gain ≥ +20%'] && verdict['other styles ≥ 0%'] && verdict['home ≥ 10 points above the rest'] && verdict['hits ≤ +10% in every style'];
if (process.argv.includes('--json')) console.log(JSON.stringify({ trick: TRICK, guns, wave: WAVE, seeds: SEEDS, flights: FLIGHTS, set: SET, styles: out, verdict }));
else {
  console.log(`${R.TRICKS[TRICK].name} with ${guns.join(' + ')} T${LEVEL}, wave ${WAVE}, ${SEEDS} seeds × ${FLIGHTS} flights${Object.keys(SET).length ? ', set ' + JSON.stringify(SET) : ''}`);
  for (const [s, o] of Object.entries(out)) console.log(`  ${s.padEnd(5)} ${String(STYLES[s]).padStart(2)}°  ${(o.gain >= 0 ? '+' : '') + o.gain}%  (${o.dpsBase} → ${o.dpsTrick} dmg/air-s)  air ${o.airPerFlight} s/flight  kills/flight ${o.killsPerFlight.join(' → ')}  hits/flight ${o.hitsBase} → ${o.hitsTrick}`);
  for (const [k, v] of Object.entries(verdict)) if (typeof v === 'boolean') console.log(`  ${v ? 'PASS' : 'FAIL'} ${k}`);
  console.log(`  home style: ${home} (+${best}%) · ${verdict.proven ? 'PROVEN by the numbers' : 'not proven yet'}`);
}

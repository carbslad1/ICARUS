// Jump-style harness (docs/TRICK_LAB.md): what does a trick change, in each jump style and wave?
// For each style the launch angle is forced (low 28°, mid 55°, high 78°); the bot flies the air phase; the dolphin
// cannot die; when the wave ends the same wave starts again (normal clock and spawn pattern, so normal density), so
// runs with and without the trick meet the same enemy stream.
// Measured against the same seeds without the trick, per second of air time unless noted:
//   damage   gun damage dealt (plus drowning and splashes for water tricks)
//   kills    kills
//   ttk      time to kill: an enemy's seconds alive in the arena (air time only) before it dies
//   alive    enemies in the arena on average: the pressure on the dolphin
//   hits     hits taken per flight, and HP lost per flight
// At an easy wave the guns kill everything that reaches them, so damage cannot rise; at a hard wave (the guns are the
// bottleneck) a damage boost shows as more damage, more kills and a shorter ttk. --waves runs several in one go, each
// with its own gun tier as wave:tier (--waves=5:1,10:2: wave 5 with T1 guns, wave 10 with T2).
// Noise: a run with the trick and one without drift apart after the first difference, so each change also gets a 95%
// band (± 1.96 standard errors of the per-seed difference, as a share of the no-trick mean). The verdicts count a change
// only when it is outside its band.
// Verdicts:
//   the four tricks (front, back, cork, flop; source/tricks.js), which boost and protect: never worse anywhere, and
//   clearly safer or clearly faster somewhere (the thresholds are [TUNE], docs/TRICK_LAB.md)
//   the routine's placement tricks: the older damage criteria (home jump style)
//   node qa/jumpstyle.cjs <trick> [--waves=5:1,10:2] [--wave=5] [--seeds=8] [--flights=10] [--level=1] [--set=key:value,...] [--json]
//   --set overrides the trick's live numbers (Tricks.P or Routine.P), e.g. --set=repulseR:14 or --set=eddyRing:5
// The four tricks run with DEMO.tune.tricks on; the routine's tricks with it off.
const path = require('path');
const { load } = require('./load.cjs'), { flyer } = require('./bot.cjs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const TRICK = process.argv.slice(2).find(a => !a.startsWith('--')) || 'front';
const WAVES = String(arg('waves', arg('wave', 5))).split(',').map(x => { const [w, t] = x.split(':'); return { w: +w, tier: +(t || arg('level', 1)) } }), SEEDS = +arg('seeds', 8), FLIGHTS = +arg('flights', 10);
const SET = Object.fromEntries((arg('set', '') || '').split(',').filter(Boolean).map(kv => { const [k, v] = kv.split(':'); return [k, +v] }));
const STYLES = { low: 28, mid: 55, high: 78 };
// the guns each trick is meant to feed; neutral tricks get one Shot and one Close gun
const GUNS = { front: ['fin', 'sonic'], back: ['minigun', 'laser'], cork: ['arc', 'flak'], flop: ['harpoon', 'depth'], eddy: ['fin', 'sonic'], bubble: ['fin', 'sonic'], anchor: ['rocket', 'flak'], chum: ['laser', 'harpoon'], slip: ['laser', 'harpoon'] };
const guns = (arg('guns', '') || '').split(',').filter(Boolean).length ? arg('guns').split(',') : GUNS[TRICK] || ['harpoon', 'fin'];
const FOUR = ['front', 'back', 'cork', 'flop'].includes(TRICK);
const H = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify({ moves: 1, tricks: FOUR ? 1 : 0 })]]), { bake: true, modern: true }), D = H.DEMO, R = FOUR ? H.Tricks : H.Routine;
if (!R.TRICKS[TRICK]) { console.error('no trick ' + TRICK + '; tricks: front, back, cork, flop, ' + H.Routine.IDS.join(', ')); process.exit(2) }
Object.assign(R.P, SET);
const water = R.TRICKS[TRICK].kind === 'water';
const counts = w => w in D.weapons || ['shock', 'conduct', 'shatter'].includes(w) || (water && (w === 'drown' || R.TRICKS[w]?.kind === 'water'));
const DT = 1 / 120;

function play({ w: wave, tier }, style, withTrick, seed) {
  const r = H.Hd(seed, guns[0]); r.wave = wave; D.wave(r);
  r.slots = guns.map(id => { const g = H.Owslot(id, tier, ++r.demo.uid); g.paid = 0; g.cd = 0; return g }); D.sync(r);
  if (FOUR) r.demo.trick = withTrick ? TRICK : null;
  else r.demo.routine = { slots: withTrick ? { [R.TRICKS[TRICK].slot]: TRICK } : {}, levels: withTrick ? { [TRICK]: 1 } : {} };
  const fly = flyer(H, 'mid-keep', seed, { keep: 8 }), angle = STYLES[style] * Math.PI / 180;
  const o = { air: 0, dmg: 0, kills: 0, hits: 0, hpLost: 0, flights: 0, alive: 0, ttk: 0, ttkN: 0 }, life = new Map();
  let prev = r.medium.kind, ticks = 0;
  while (o.flights < FLIGHTS && ticks < 120 * 60 * 6 && r.mode === 'playing') {
    r.hp = r.stats.maxHp;
    const i = fly(r); H.sw(r, i); ticks++;
    if (r.mode === 'shop') { r.mode = 'playing'; D.wave(r) }   // replay the wave
    const m = r.medium;
    if (m.kind === 'air' && prev !== 'air') {    // the launch: force this style's angle, keeping the speed and direction
      const v = Math.hypot(m.vx, m.vy), sx = Math.sign(m.vx) || 1; m.vx = Math.cos(angle) * v * sx; m.vy = Math.sin(angle) * v;
    }
    if (m.kind === 'air') { o.air += DT; o.alive += r.enemies.length * DT; for (const e of r.enemies) life.set(e.id, (life.get(e.id) || 0) + DT) }
    let last = null;   // a kill event follows the damage event of the blow that killed (demo.js damage)
    for (const ev of r.events || []) {
      if (ev.kind === 'damage') { last = ev.id; if (counts(ev.weapon)) o.dmg += ev.applied ?? ev.value }
      if (ev.kind === 'kill') { o.kills++; if (last != null && life.has(last)) { o.ttk += life.get(last); o.ttkN++; life.delete(last) } }
      if (ev.kind === 'hit') { o.hits++; o.hpLost += ev.value || 0 }
    }
    if (prev === 'air' && m.kind !== 'air') o.flights++;
    prev = m.kind;
  }
  return o;
}
const sum = list => list.reduce((a, o) => { for (const k in o) a[k] = (a[k] || 0) + o[k]; return a }, {});
const pct = (a, b) => b > 0 ? Math.round((a / b - 1) * 1000) / 10 : 0;
function measure(wave) {
  const out = {};
  for (const style of Object.keys(STYLES)) {
    const runs = t => Array.from({ length: SEEDS }, (_, i) => play(wave, style, t, i + 1)), B = runs(false), T = runs(true), base = sum(B), trick = sum(T);
    const per = o => ({ dps: o.dmg / Math.max(1e-9, o.air), kps: o.kills / Math.max(1e-9, o.air), ttk: o.ttk / Math.max(1, o.ttkN), alive: o.alive / Math.max(1e-9, o.air), hits: o.hits / Math.max(1, o.flights), hp: o.hpLost / Math.max(1, o.flights), air: o.air / Math.max(1, o.flights) });
    const b = per(base), t = per(trick);
    // the 95% band of a change: per-seed differences, as a share of the no-trick mean (in percentage points)
    const band = k => { const d = B.map((x, i) => per(T[i])[k] - per(x)[k]), m = d.reduce((a, v) => a + v, 0) / d.length, sd = Math.sqrt(d.reduce((a, v) => a + (v - m) ** 2, 0) / Math.max(1, d.length - 1)); return b[k] > 0 ? Math.round(1960 * sd / Math.sqrt(d.length) / b[k]) / 10 : 0 };
    out[style] = { base: b, trick: t, gain: pct(t.dps, b.dps), kills: pct(t.kps, b.kps), ttk: pct(t.ttk, b.ttk), alive: pct(t.alive, b.alive), hits: pct(t.hits, b.hits), hp: pct(t.hp, b.hp), band: { gain: band('dps'), kills: band('kps'), ttk: band('ttk'), alive: band('alive'), hits: band('hits'), hp: band('hp') } };
  }
  return out;
}
const results = Object.fromEntries(WAVES.map(W => [W.w + ':T' + W.tier, measure(W)]));

// the verdicts (docs/TRICK_LAB.md, all thresholds [TUNE])
const cells = Object.entries(results).flatMap(([w, out]) => Object.entries(out).map(([s, o]) => ({ w: w.split(':')[0], s, o })));
let verdict;
if (FOUR) {
  // a hit costs little when there are almost none: count a change in hits only once it is at least 0.05 a flight
  // a change counts only outside its 95% band
  const out_ = (o, k) => Math.abs(o[k]) > o.band[k];
  const hitsUp = o => o.trick.hits > o.base.hits * 1.1 + .05 && out_(o, 'hits'), dmgDown = o => o.gain < -5 && out_(o, 'gain');
  const safer = o => o.trick.hits <= o.base.hits * .85 - .02 && out_(o, 'hits'), faster = o => o.ttk <= -15 && out_(o, 'ttk');
  const where = f => cells.filter(c => f(c.o)).map(c => `${c.s}@w${c.w}`);
  verdict = {
    'never worse: hits ≤ +10% and damage ≥ −5% in every style and wave': !cells.some(c => hitsUp(c.o) || dmgDown(c.o)),
    'clearly safer somewhere: hits ≤ −15%': where(safer).length > 0,
    'clearly faster somewhere: time to kill ≤ −15%': where(faster).length > 0,
    worse: where(o => hitsUp(o) || dmgDown(o)), saferIn: where(safer), fasterIn: where(faster)
  };
  verdict.proven = verdict['never worse: hits ≤ +10% and damage ≥ −5% in every style and wave'] && (verdict['clearly safer somewhere: hits ≤ −15%'] || verdict['clearly faster somewhere: time to kill ≤ −15%']);
} else {
  const out = Object.values(results)[0], gains = Object.entries(out).map(([s, o]) => [s, o.gain]).sort((a, b) => b[1] - a[1]), [home, best] = gains[0], second = gains[1][1];
  verdict = {
    home, homeGain: best,
    'home gain ≥ +20%': best >= 20,
    'other styles ≥ 0%': gains.slice(1).every(([, g]) => g >= 0),
    'home ≥ 10 points above the rest': best - second >= 10,
    'hits ≤ +10% in every style': Object.values(out).every(o => o.trick.hits <= o.base.hits * 1.1 + .02)
  };
  verdict.proven = verdict['home gain ≥ +20%'] && verdict['other styles ≥ 0%'] && verdict['home ≥ 10 points above the rest'] && verdict['hits ≤ +10% in every style'];
}
if (process.argv.includes('--json')) console.log(JSON.stringify({ trick: TRICK, guns, waves: WAVES, seeds: SEEDS, flights: FLIGHTS, set: SET, results, verdict }));
else {
  const sg = v => (v >= 0 ? '+' : '') + v + '%', f = (v, d = 1) => v.toFixed(d);
  console.log(`${R.TRICKS[TRICK].name} with ${guns.join(' + ')}, ${SEEDS} seeds × ${FLIGHTS} flights${Object.keys(SET).length ? ', set ' + JSON.stringify(SET) : ''}`);
  for (const [w, out] of Object.entries(results)) {
    console.log(` wave ${w.replace(':', ' ')}   damage/s                kills/s               time to kill             in the arena           hits/flight              HP lost/flight     (* outside the 95% band)`);
    for (const [s, o] of Object.entries(out)) {
      const b = o.base, t = o.trick;
      const c = k => ((Math.abs(o[k]) > o.band[k] ? '*' : ' ') + sg(o[k]) + '±' + o.band[k]).padStart(13);
      console.log(`  ${s.padEnd(5)} ${String(STYLES[s]).padStart(2)}°  ${(f(b.dps, 0) + '→' + f(t.dps, 0)).padEnd(8)}${c('gain')}  ${(f(b.kps) + '→' + f(t.kps)).padEnd(8)}${c('kills')}  ${(f(b.ttk, 2) + '→' + f(t.ttk, 2) + 's').padEnd(11)}${c('ttk')}  ${(f(b.alive) + '→' + f(t.alive)).padEnd(10)}${c('alive')}  ${(f(b.hits, 2) + '→' + f(t.hits, 2)).padEnd(10)}${c('hits')}  ${(f(b.hp, 0) + '→' + f(t.hp, 0)).padEnd(8)}${c('hp')}`);
    }
  }
  for (const [k, v] of Object.entries(verdict)) if (typeof v === 'boolean' && k !== 'proven') console.log(`  ${v ? 'PASS' : 'FAIL'} ${k}`);
  if (FOUR) console.log(`  safer in: ${verdict.saferIn.join(' ') || '–'} · faster in: ${verdict.fasterIn.join(' ') || '–'} · worse in: ${verdict.worse.join(' ') || '–'}`);
  else console.log(`  home style: ${verdict.home} (+${verdict.homeGain}%)`);
  console.log(`  ${verdict.proven ? 'PROVEN by the numbers' : 'not proven yet'}`);
}

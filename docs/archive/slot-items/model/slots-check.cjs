// Hand-worked checks for slots.cjs: closed-form values a flight must give.
//   node slots-check.cjs   (exits 1 on a failure)
let fails = 0;
const ok = (name, got, want, tol = .05) => { const pass = Math.abs(got - want) <= tol; if (!pass) fails++; console.log((pass ? 'ok   ' : 'FAIL ') + name + ': ' + got.toFixed(3) + ' (want ' + want.toFixed(3) + ')') };
const load = engine => { process.argv = process.argv.slice(0, 2).concat(['--engine=' + engine]); delete require.cache[require.resolve('./slots.cjs')]; return require('./slots.cjs') };

let S = load('neutral');
Object.assign(S.OVR, { predator: 2, magpie: 3, burst: 25 });   // the numbers these hand checks were worked with
const E = [null, null, null, null, null], at = (slot, id, arr = E.slice()) => (arr[S.SLOTS.indexOf(slot)] = id, arr);
const T = c => S.CASES[c].air;

// Discharge at descent: Charge 0.75T, +100% damage for 0.075T s, all of it before entry → 7.5% at every angle and wave.
for (const c of ['1:30', '10:10', '10:89', '20:15']) ok('starter at descent ' + c, S.wave(+c.split(':')[0], [+c.split(':')[1]], at('descent', 'discharge')).pct, 7.5);
// At the apex: Charge 0.5T → 5%. At entry: nothing is left of the flight → 0.
ok('starter at apex', S.wave(10, [45], at('apex', 'discharge')).pct, 5);
ok('starter at entry', S.wave(10, [45], at('entry', 'discharge')).pct, 0);
// Hunter: kills by the apex 0.5/s × T/2, +2 Charge each → apex Charge T; descent Charge 1.25T; Mult 2 → 0.25T → 25%.
ok('hunter', S.wave(10, [60], ['lens', null, 'predator', 'discharge', null]).pct, 25);
// Mult 2: Charge 0.75T × 2 × 0.1 = 0.15T of boost, all before entry.
let f = S.fly(S.CASES['10:45'], ['lens', null, null, 'discharge', null], S.newState());
ok('boost fits (Mult 2)', f.dmg / T('10:45'), .15, .001);
// Mult is never cut: Mult 4 gives +400% for 0.075T s.
f = S.fly(S.CASES['10:45'], ['lens', 'lens', 'lens', 'discharge', null], S.newState());
ok('Mult 4 is not cut', f.dmg / T('10:45'), .3, .001);
// Charge is: a 1.74 s flight with 10 extra Charge has 1.13 s of boost but only 0.435 s left after the descent.
S.OVR.battery = 10; f = S.fly(S.CASES['10:10'], ['battery', null, null, 'discharge', null], S.newState());
ok('Charge cut at entry', f.dmg / T('10:10'), .25, .001); delete S.OVR.battery;
// Two Discharges, at the ascent (0.25T → 0.025T s) and the apex (0.25T → 0.025T s).
f = S.fly(S.CASES['10:45'], [null, 'discharge', 'discharge', null, null], S.newState());
ok('two Discharges add', f.dmg / T('10:45'), .05, .001);
// Kills double while boosted: 0.5/s × T plus 0.5/s × boosted seconds.
ok('kills double under the boost', f.kills, .5 * T('10:45') + .5 * .05 * T('10:45'), .001);
// Altitude: at the apex the arena is at vy²/30, a sin²θ share of this wave's highest jump.
f = S.fly(S.CASES['10:45'], [null, null, 'altimeter', null, null], S.newState());
const th = 45 * Math.PI / 180, c45 = S.CASES['10:45'], vy = c45.v * Math.sin(th), tA = c45.air / 2, share = (vy * tA - 7.5 * tA * tA) / (c45.v * c45.v / 30);
ok('altimeter at the apex', f.C, c45.air + 2 * Math.floor(10 * share));
// Cash Out at entry: Charge T, plus 3 per orb by the descent (0.3/s × 0.75T); the remainder carries, so (T + 0.675T) / 10 a flight.
const c89 = S.CASES['10:89'], r = S.wave(10, [89], [null, null, null, 'magpie', 'cashout']);
ok('cash out per flight', r.pearls, r.flights * (c89.air + .9 * .75 * c89.air) / 10, .001);
// Savings at entry carries the flight's Charge to the next breach; the wave's first flight starts with none.
const st = S.newState(); S.fly(S.CASES['10:45'], [null, null, null, null, 'savings'], st);
ok('savings carries Charge', st.S, T('10:45'), .001);
f = S.fly(S.CASES['10:45'], ['discharge', null, null, null, null], st);
ok('stored Charge is spent at the next breach', f.dmg, .1 * T('10:45'), .001);

const fresh = () => S.newState();
// Water on screen: a hop (vy² < 2·15·21.6) keeps it on screen all flight; a near-vertical flight only near the water,
// before t1 and after t2, the two times the arena crosses 21.6 m.
f = S.fly(S.CASES['10:10'], [], fresh());
ok('a hop is wet all flight', f.wet, T('10:10'), .001);
const c = S.CASES['10:89'], vy89 = c.v * Math.sin(89 * Math.PI / 180), d = Math.sqrt(vy89 * vy89 - 30 * 21.6);
f = S.fly(c, [], fresh());
ok('a high flight is wet at both ends', f.wet, (vy89 - d) / 15 + Math.max(0, c.air - (vy89 + d) / 15), .001);
// Mirror after Lens is a second Lens: Mult 3 → 22.5%.
ok('mirror copies the slot before', S.wave(10, [45], ['lens', 'mirror', null, 'discharge', null]).pct, 22.5);
// Burst at the descent: +200% for 0.75T ÷ 25 s → 6%.
ok('burst', S.wave(10, [45], [null, null, null, 'burst', null]).pct, 6);
// Undertow: 10 + 0.435 Charge at the descent of a 1.74 s flight lasts 1.04 s; 0.435 s fit, the rest carries as Charge.
S.OVR.battery = 10; let st2 = fresh(); const c10 = S.CASES['10:10'];
f = S.fly(c10, ['battery', null, null, 'discharge', 'undertow'], st2);
ok('undertow carries the cut Charge', st2.S, 10 + .75 * c10.air - .25 * c10.air * 10, .001);
ok('a cut Discharge is counted', st2.run.cuts, 1, 0);
ok('and its Charge is recorded as wasted', st2.run.wasted, 10 + .75 * c10.air - .25 * c10.air * 10, .001);
st2 = fresh(); S.fly(c10, [null, null, null, null, 'discharge'], st2);
ok('a Discharge at entry is not a cut', st2.run.cuts, 0, 0);
delete S.OVR.battery;
// Run records: Trophy reads every earlier wave's kills (0.5 per air second, doubled while boosted).
const run = S.newRun(), arr = [null, 'trophy', null, 'discharge', null];
for (let k = 1; k < 10; k++) S.wave(k, [45], arr, run);
const before = run.kills; S.wave(10, [45], arr, run);
ok('trophy run kills accumulate', +(before > .5 * [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((s, k) => s + S.clock(k), 0)), 1, 0);
// Momentum reads the last flight's kills.
const st3 = fresh(); S.fly(S.CASES['10:89'], [], st3);
ok('momentum reads last flight', st3.prevKills, .5 * T('10:89'), .001);

// Rares.
// Keystone before Lens: Lens fires twice → Mult 3 → 22.5%.
ok('keystone retriggers the next slot', S.wave(10, [45], ['keystone', 'lens', null, 'discharge', null]).pct, 22.5);
// Inversion at the apex with Lens: Charge 0.5T and Mult 2 swap → Charge 2 (+0.25T by the descent), Mult 0.5T.
{ const c = S.CASES['10:45'], Tt = c.air; const f = S.fly(c, ['lens', null, 'inversion', 'discharge', null], fresh());
  ok('inversion swaps Charge and Mult', f.dmg, .5 * Tt * Math.min((2 + .25 * Tt) / 10, .25 * Tt), .001) }
// Hollow Bones with Discharge + Lens: 2 empty slots → ×(1 + 2 × 0.5) = ×2 → Mult 4 → 30%.
ok('hollow bones counts empty slots', S.wave(10, [45], ['lens', 'hollow', null, 'discharge', null]).pct, 30);
// Counterweight alone before Discharge: ×4 → 30%; with Lens also before it, nothing → 15%.
ok('counterweight alone before Discharge', S.wave(10, [45], ['counterweight', null, null, 'discharge', null]).pct, 30);
ok('counterweight with company', S.wave(10, [45], ['counterweight', 'lens', null, 'discharge', null]).pct, 15);
// Spendthrift: Cash Out at the descent also Discharges with the same Charge → 7.5% and the pearls.
{ const r = S.wave(10, [45], [null, null, null, 'cashout', 'spendthrift']); ok('spendthrift damage', r.pct, 7.5); ok('spendthrift pearls', r.pearls, .75 * r.air / 10, .001) }
// Tidal Lock with Lens: Mult 2 + half the last Discharge's Mult → 2, 3, 3.5, ... → 4. Over a wave, near 30%.
{ const st = fresh(), c = S.CASES['10:45']; let f; for (let i = 0; i < 12; i++) f = S.fly(c, ['lens', 'tidal', null, 'discharge', null], st);
  ok('tidal lock converges to ×2', st.lastM, 4, .01) }
// Stored Charge is capped at 3× the next flight's airtime.
{ const st = fresh(); st.S = 1000; const f = S.fly(S.CASES['10:45'], ['discharge', null, null, null, null], st);
  ok('stored Charge capped', f.dmg, Math.min(.1 * 3 * T('10:45'), T('10:45')), .001) }
// Riptide: a Discharge cut short continues from the next breach.
{ S.OVR.battery = 10; const st = fresh(), c = S.CASES['10:10'];
  S.fly(c, ['battery', null, null, 'discharge', 'riptide'], st);
  ok('riptide carries the bonus', st.carry.reduce((s, b) => s + b.left, 0), (10 + .75 * c.air) / 10 - .25 * c.air, .001);
  delete S.OVR.battery }
// Migration: a wave flown at 20/45/75 uses three tiers → counted.
{ const run = S.newRun(); S.wave(5, [20, 45, 75], [], run); S.wave(5, [20], [], run); ok('migration counts 3-tier waves', run.migr, 1, 0) }

// The proposal engine against the closed form: (10 + T/2) DPS for min(2, T/2) s at the apex, per wave, on 50 DPS weapons.
S = load('proposal');
for (const [w, a] of [[20, 10], [10, 89], [5, 45]]) {
  const c = S.CASES[w + ':' + a], n = Math.ceil(S.clock(w) / c.air), want = n * (10 + c.air / 2) * Math.min(2, c.air / 2);
  const r = S.wave(w, [a], [null, null, 'discharge', null, null]);
  ok(`proposal Discharge, wave ${w} ${a}°`, r.pct * r.air / 100 * 50, want, .5);
}
console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);

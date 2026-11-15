// The floor (docs/FEED_FRENZY_PLAN.md, step 0): how much of each wave a plain build kills, with no stats, no items and
// no feed or frenzy. One pure build per weapon (six copies at the wave's tier), one cannot-die bot, one whole wave.
//
//   node qa/floor.cjs                 full: the pool's 7 weapons × waves 5, 10, 15, 20 × 6 seeds, split across performance cores
//   node qa/floor.cjs --quick         smoke: 3 weapons × waves 5, 10 × 2 seeds (under a minute)
//   node qa/floor.cjs --check         also prove it repeats: the same cell twice, alone and inside a batch, must match
//   node qa/floor.cjs --weapons=harpoon --vs='{"feed":1,"ladders":0}'   on/off comparison: both settings in one batch, paired
//   options: --weapons=a,b --waves=5,10 --seeds=8 --style=mid-keep --tune='{"feed":1}' --jobs=N --json=out.json
//
// Fast and paired by construction: every (weapon, wave, seed) cell starts its own fresh run from its own seed, so a cell's
// result never depends on what else is in the command, and two settings compared on the same seeds play identically up to
// the first moment a setting changes anything. Cells run in parallel worker processes (default: one per performance core).
'use strict';
const path = require('path'), os = require('os'), fs = require('fs'), { fork } = require('child_process');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const has = k => process.argv.includes('--' + k);
const POOL = ['mixed', 'close', 'harpoon', 'trident', 'tuna_gaff', 'spitter', 'pressure_cannon', 'squid_launcher', 'riptide_carbine'];
const TIER = { 5: 1, 10: 2, 15: 3, 20: 4 };   // the tier a build plausibly holds by then [ASSUMED]; Brotato winners reach 3 to 4

function cell({ weapon, wave, seed, style, tune }) {
  const { load } = require('./load.cjs'), { flyer } = require('./bot.cjs');
  const G = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', JSON.stringify(tune)]]), { bake: true, modern: true }), D = G.DEMO;
  const r = G.Hd(seed); r.wave = wave; D.wave(r);
  const lvl = TIER[wave] || 1;
  const MIXED = ['trident', 'tuna_gaff', 'spitter', 'pressure_cannon', 'squid_launcher', 'riptide_carbine'], CLOSE = ['trident', 'tuna_gaff', 'trident', 'tuna_gaff', 'trident', 'tuna_gaff'];
  r.slots = Array.from({ length: 6 }, (_, i) => { const id = weapon === 'mixed' ? MIXED[i] : weapon === 'close' ? CLOSE[i] : weapon; return G.Owslot(id, Math.max(D.weapons[id].min || 1, TIER[wave] || 1), 500 + i); });
  r.slots.forEach(g => { g.cd = 0; }); D.sync(r);
  const fly = flyer(G, style, seed, { keep: 8 }), seen = new Set(), t0 = Date.now();
  const mults = []; let prevKind = r.medium.kind, lastHand = null;
  let hits = 0, hpLost = 0, steps = 0, crowdSum = 0, crowdN = 0, peak = 0, airSteps = 0, sent = 0, landed = 0;
  while (r.mode === 'playing' && steps < 120 * 600) {
    r.hp = 1e9;
    const it = fly(r); if (r.medium.kind === 'air' && r.budget <= 0) it.y = -1;
    if (r.medium.kind === 'air') lastHand = r.hand;
    G.sw(r, it); steps++; if (r.hp < 1e9) { hits++; hpLost += 1e9 - r.hp; }
    if (prevKind === 'air' && r.medium.kind !== 'air' && lastHand && D.feedTotals) mults.push(Math.min(lastHand.fm || 1, D.feedTotals(r).cap)); prevKind = r.medium.kind;
    for (const e of r.enemies) if (!seen.has(e.id)) { seen.add(e.id); sent += e.maxHp; }
    for (const ev of r.events || []) if (ev.kind === 'damage') landed += ev.applied ?? ev.value;
    if (r.medium.kind === 'air') { airSteps++; crowdSum += r.enemies.length; crowdN++; if (r.enemies.length > peak) peak = r.enemies.length; }
  }
  const kills = r.waveKills ?? r.wkill ?? 0;
  return { weapon, wave, seed, style, tune, tier: lvl, ended: r.mode, arrivals: seen.size, kills, share: seen.size ? kills / seen.size : 0,
    crowd: crowdN ? crowdSum / crowdN : 0, peak, hits, hpLost, mults, cap: D.feedTotals ? D.feedTotals(r).cap : 1, air: airSteps / 120, landedShare: sent ? landed / sent : 0, secs: (Date.now() - t0) / 1000 };
}

if (process.argv[2] === '--worker') {
  process.on('message', job => { try { process.send({ ok: true, res: cell(job) }); } catch (e) { process.send({ ok: false, job, err: String(e.stack || e) }); } });
  return;
}

async function runAll(jobs, n) {
  const out = [], queue = jobs.slice(); let failed = null;
  await Promise.all(Array.from({ length: Math.min(n, jobs.length) }, () => new Promise(done => {
    const w = fork(__filename, ['--worker'], { silent: false });
    const next = () => { const j = queue.shift(); if (!j || failed) { w.kill(); done(); return; } w.send(j); };
    w.on('message', m => { if (m.ok) out.push(m.res); else failed = m; next(); });
    w.on('exit', () => done());
    next();
  })));
  if (failed) throw Error('cell failed: ' + JSON.stringify(failed.job) + '\n' + failed.err);
  return out;
}

const pct = x => (100 * x).toFixed(0) + '%';
function table(rows) {
  const by = {}; for (const r of rows) (by[r.weapon + '|' + r.wave] ||= []).push(r);
  const keys = Object.keys(by).sort((a, b) => { const [wa, va] = a.split('|'), [wb, vb] = b.split('|'); return POOL.indexOf(wa) - POOL.indexOf(wb) || va - vb; });
  const mean = (a, f) => a.reduce((s, x) => s + f(x), 0) / a.length, sd = (a, f) => { const m = mean(a, f); return Math.sqrt(mean(a, x => (f(x) - m) ** 2)); };
  console.log('weapon            wave tier seeds  arrivals  killed (± sd)   crowd  peak  hits  landed/sent  air s  mult med/p90/cap');
  for (const k of keys) {
    const a = by[k], x = a[0];
    console.log(`${x.weapon.padEnd(17)} ${String(x.wave).padStart(4)} ${String(x.tier).padStart(4)} ${String(a.length).padStart(5)} ${mean(a, y => y.arrivals).toFixed(0).padStart(9)}  ${pct(mean(a, y => y.share)).padStart(6)} (± ${pct(sd(a, y => y.share)).padStart(3)})  ${mean(a, y => y.crowd).toFixed(1).padStart(6)} ${mean(a, y => y.peak).toFixed(0).padStart(5)} ${mean(a, y => y.hits ?? 0).toFixed(0).padStart(5)}  ${pct(mean(a, y => y.landedShare)).padStart(11)} ${mean(a, y => y.air).toFixed(0).padStart(6)}  ${(() => { const m = a.flatMap(y => y.mults || []).sort((p, q) => p - q); if (!m.length) return '-'; const q = f => m[Math.min(m.length - 1, Math.floor(f * m.length))]; return q(.5).toFixed(2) + '/' + q(.9).toFixed(2) + '/' + (x.cap || 1).toFixed(2); })()}`);
  }
}

(async () => {
  const quick = has('quick'), t0 = Date.now();
  const weapons = arg('weapons', quick ? 'harpoon,tuna_gaff,squid_launcher' : POOL.join(',')).split(',');
  const waves = arg('waves', quick ? '5,10' : '5,10,15,20').split(',').map(Number);
  const nSeeds = +arg('seeds', quick ? 2 : 6), style = arg('style', 'mid-keep'), tune = JSON.parse(arg('tune', '{"feed":1}'));
  const vs = arg('vs') ? JSON.parse(arg('vs')) : null;
  const jobs = []; for (const t of vs ? [tune, vs] : [tune]) for (const weapon of weapons) for (const wave of waves) for (let s = 1; s <= nSeeds; s++) jobs.push({ weapon, wave, seed: 1000 * wave + s, style, tune: t });
  jobs.sort((a, b) => b.wave - a.wave);   // longest cells first, so the batch ends together
  // one worker per performance core: on this M1 (4 + 4 cores) seven workers ran slower than four
  let perf = 0; try { perf = +require('child_process').execSync('sysctl -n hw.perflevel0.physicalcpu', { encoding: 'utf8' }) || 0; } catch (e) {}
  const n = +arg('jobs', perf || Math.max(1, os.cpus().length - 1));
  const all = await runAll(jobs, n), key = r => r.weapon + '|' + r.wave + '|' + r.seed;
  const rows = all.filter(r => JSON.stringify(r.tune) === JSON.stringify(tune));
  if (vs) {
    const other = all.filter(r => JSON.stringify(r.tune) === JSON.stringify(vs)), byKey = new Map(rows.map(r => [key(r), r]));
    console.log('A = ' + JSON.stringify(tune)); table(rows); console.log('\nB = ' + JSON.stringify(vs)); table(other);
    const strip = r => JSON.stringify({ ...r, secs: 0, tune: 0 }), same = other.filter(r => strip(r) === strip(byKey.get(key(r)))).length;
    console.log(`\npaired cells identical in A and B: ${same} of ${other.length}`);
  } else table(rows);
  if (has('check')) {
    const probe = jobs[0], again = await runAll([probe, ...jobs.slice(1, 4), probe], 2), first = rows.find(r => r.weapon === probe.weapon && r.wave === probe.wave && r.seed === probe.seed);
    const strip = r => JSON.stringify({ ...r, secs: 0 });
    const same = again.filter(r => r.weapon === probe.weapon && r.wave === probe.wave && r.seed === probe.seed).every(r => strip(r) === strip(first));
    console.log(same ? 'REPEATS: the same cell gives identical results alone and inside another batch' : 'DOES NOT REPEAT');
    if (!same) process.exitCode = 1;
  }
  const cpu = rows.reduce((a, r) => a + r.secs, 0);
  console.log(`${rows.length} runs in ${((Date.now() - t0) / 1000).toFixed(0)} s wall (${cpu.toFixed(0)} s of game simulation work, ${n} workers). Style ${style}, tune ${JSON.stringify(tune)}.`);
  if (arg('json')) fs.writeFileSync(arg('json'), JSON.stringify({ date: new Date().toISOString(), style, tune, rows }, null, 1));
})().catch(e => { console.error(e.message); process.exit(1); });

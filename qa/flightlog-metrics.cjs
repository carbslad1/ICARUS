// Flight-log metrics: reads one or more SAVE FLIGHT LOG files (source/flightlog.js) and prints the measures the
// build-and-playtest plan gates on (ICARUS_DESIGN.md §4.20): kills by phase against time by phase, distance to the
// nearest enemy, the off-screen enemy share, hits per flight, launch-angle spread and tricks landed.
//   node qa/flightlog-metrics.cjs run1.json [run2.json ...] [--json]
const fs = require('fs');

// The view is 57 m wide (frame.width) and centred on the arena origin, so an enemy is off-screen horizontally
// when its arena-local |x| exceeds half of that. Weapon reach for Shot weapons is 30 m.
const VIEW_HALF = 28.5, REACH = 30, PHASES = ['ascent', 'apex', 'descent'];

const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 };
const quantile = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * q, lo = Math.floor(i); return s[lo] + (s[Math.ceil(i)] - s[lo]) * (i - lo) };
const round = (v, d = 2) => v == null ? null : Math.round(v * 10 ** d) / 10 ** d;
const pct = (n, d) => d ? round(100 * n / d, 1) : null;

function launchBand(angle) { return angle < 40 ? 'low (<40°)' : angle < 65 ? 'mid (40–65°)' : 'high (65°+)' }
function waveBand(w) { return w <= 3 ? 'waves 1–3' : w <= 6 ? 'waves 4–6' : 'waves 7+' }

function measure(flights, complete) {
  const kills = { ascent: 0, apex: 0, descent: 0 }, time = { ascent: 0, apex: 0, descent: 0 };
  const nearest = [], onScreen = [], firstKill = [];
  let enemyN = 0, offN = 0, near = 0, withEnemy = 0, hits = 0, clean = 0, drawn = 0, bailed = 0;
  for (const f of flights) {
    for (const k of f.kills) if (k.ph in kills) kills[k.ph]++;
    if (f.kills.length) firstKill.push(f.kills[0].t);
    hits += f.hits.length; if (!f.hits.length) clean++;
    if (f.bank?.tricks) { drawn += f.bank.tricks.length; bailed += f.bank.bails || 0 }
    for (const s of f.samples) {
      if (s.k !== 'a') continue;
      if (s.ph in time) time[s.ph]++;
      if (!s.en) continue;
      let best = Infinity, on = 0;
      for (const e of s.en) {
        best = Math.min(best, Math.hypot(e[1] - s.l[0], e[2] - s.l[1]));
        enemyN++; if (Math.abs(e[1]) > VIEW_HALF) offN++; else on++;
      }
      onScreen.push(on);
      if (s.en.length) { withEnemy++; nearest.push(best); if (best <= REACH) near++ }
    }
  }
  const kSum = PHASES.reduce((a, p) => a + kills[p], 0), tSum = PHASES.reduce((a, p) => a + time[p], 0);
  const angles = flights.map(f => f.launch.angle);
  return {
    flights: flights.length,
    waterS: round(median(flights.map(f => f.water).filter(v => v != null))),
    airS: round(median(flights.map(f => f.dur))),
    peakM: round(median(flights.map(f => f.peak))),
    launchAngle: { median: round(median(angles), 1), iqr: round(quantile(angles, .75) - quantile(angles, .25), 1) },
    killsPerFlight: round(median(flights.map(f => f.kills.length))),
    killShare: Object.fromEntries(PHASES.map(p => [p, pct(kills[p], kSum)])),
    timeShare: Object.fromEntries(PHASES.map(p => [p, pct(time[p], tSum)])),
    firstKillS: round(median(firstKill)),
    nearestEnemyM: round(median(nearest), 1),
    enemyWithinReach: pct(near, withEnemy),
    // version 1 logs kept only enemies within 60 m, so their off-screen share undercounts
    offScreenEnemies: complete ? pct(offN, enemyN) : null,
    enemiesOnScreen: round(median(onScreen)),
    hitsPerFlight: round(flights.length ? hits / flights.length : null),
    cleanFlights: pct(clean, flights.length),
    tricksLanded: drawn ? pct(drawn - bailed, drawn) : null
  };
}

function analyse(logs) {
  const flights = logs.flatMap(l => l.flights.filter(f => f.dur != null));
  const complete = logs.every(l => (l.version || 1) >= 2);
  const group = key => {
    const g = {};
    for (const f of flights) (g[key(f)] ??= []).push(f);
    return Object.fromEntries(Object.entries(g).sort().map(([k, v]) => [k, measure(v, complete)]));
  };
  return {
    files: logs.length, complete,
    ends: logs.map(l => l.end),
    all: measure(flights, complete),
    byLaunch: group(f => launchBand(f.launch.angle)),
    byWave: group(f => waveBand(f.wave))
  };
}

function print(r) {
  const rows = [['all flights', r.all], ...Object.entries(r.byLaunch), ...Object.entries(r.byWave)];
  const fmt = v => v == null ? '–' : String(v);
  const head = ['group', 'flights', 'water s', 'air s', 'angle', 'angle IQR', 'kills', 'kills asc/apex/desc %', 'time asc/apex/desc %', 'nearest m', 'within 30 m %', 'off-screen %', 'hits/flight', 'clean %', 'tricks landed %'];
  const body = rows.map(([name, m]) => [name, m.flights, m.waterS, m.airS, m.launchAngle.median, m.launchAngle.iqr, m.killsPerFlight,
    PHASES.map(p => fmt(m.killShare[p])).join('/'), PHASES.map(p => fmt(m.timeShare[p])).join('/'), m.nearestEnemyM, m.enemyWithinReach,
    m.offScreenEnemies, m.hitsPerFlight, m.cleanFlights, m.tricksLanded].map(fmt));
  const w = head.map((h, i) => Math.max(h.length, ...body.map(b => b[i].length)));
  const line = c => c.map((v, i) => i ? v.padStart(w[i]) : v.padEnd(w[i])).join('  ');
  console.log(`${r.files} log(s); ends: ${r.ends.map(e => e ? `${e.mode} at wave ${e.wave}${e.reason ? ' (' + e.reason + ')' : ''}` : 'unfinished').join('; ')}`);
  if (!r.complete) console.log('Off-screen share omitted: a version 1 log only kept enemies within 60 m.');
  console.log(line(head)); for (const b of body) console.log(line(b));
}

if (require.main === module) {
  const args = process.argv.slice(2), json = args.includes('--json'), files = args.filter(a => a !== '--json');
  if (!files.length) { console.error('usage: node qa/flightlog-metrics.cjs run1.json [run2.json ...] [--json]'); process.exit(2) }
  const logs = files.map(f => { const l = JSON.parse(fs.readFileSync(f, 'utf8')); if (l.format !== 'icarus-flightlog') throw Error(f + ' is not a flight log'); return l });
  const r = analyse(logs);
  if (json) console.log(JSON.stringify(r, null, 1)); else print(r);
}
module.exports = { analyse, measure, VIEW_HALF };

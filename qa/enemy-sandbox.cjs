// Since the stage (docs/ENEMY_RULES.md section 3, 2026-11-07) enemies are judged on the screen: flicks, jumps, copying,
// reversals and spread are all on-screen measures (they go with the camera in the world by design); the world flick
// columns are kept only to compare with earlier builds.
// Enemy sandbox (designer, 2026-11-03: "our enemies are all bunching together ... we want enemies with brotatos behaviours
// and screen diversity ... i also dont like how they rapidly flick direction around air and water entry ... setup a
// robust enemy sandbox so we can fix and test their behaviour").
//
// Runs the built demo headless with scripted dolphins and measures what the player sees of the enemies, the same way
// for any settings or any earlier build, so behaviour changes can be compared number for number:
//   spread    Clark-Evans R of the enemies on screen above the water (1 = scattered at random, under 1 = bunched,
//             0.5 = tight clumps), the share with another enemy within 3 m (crowd) or touching it (ovl: closer than their
//             two radii, drawn overlapping), and how many
//             cells of a 6 x 4 grid over the view hold an enemy (of as many as could)
//   off       share of enemy time spent outside the view (sw/fl: while the dolphin swims / flies)
//   flicks    direction reversals: velocity turned more than 100 degrees within 0.1 s at over 5 m/s (in the world) or
//             over 120 px/s (on a 1440 px screen), per enemy-minute on screen, split by where they happen:
//             cross = within 0.35 s of the enemy or the dolphin crossing the water line, water = while the dolphin
//             swims, air = in flight
//   copy      while the dolphin swims, how much the enemies above the water copy its sideways moves: the slope of their
//             change in sideways speed over 0.25 s against the dolphin's (0 = their own path, 1 = carried with it),
//             their sideways reversals per enemy-second (rev/s) and rapid swings per enemy-minute (fast/m: past 8 m/s
//             one way, then the other, within 0.5 s)
//   line      the longest any enemy stayed within 1.5 m of the water line while the dolphin was over 4 m from it, in s
//   touch     (--json, gate) share of enemy time while you swim spent under the water within its radius + 1 m of you
//   jumps     moves of more than 60 px on the screen in one 1/120 s step, per enemy-minute on screen
//
// Scenarios (each starts with bot flights, then the scripted part, then the bot again so the breach is measured):
//   play-mid, play-high, hops     the test bot (qa/bot.cjs) flying mid, high with turn-rounds, and low rapid hops
//   swim-level                    after 2 flights, swim level one way 8 m down for 6 s
//   weave                         after 2 flights, U-turn under water every 2 s for 8 s (left, right, left ...)
//   loops                         after 2 flights, hold D (clockwise loops) under water for 8 s
//
//   node qa/enemy-sandbox.cjs [--scen=all|weave,loops] [--waves=4,12] [--seeds=3]
//        [--variant='name={"hover":0}'] (repeatable; default: current) [--build=ICARUS-demo.html|rev:<sha>]
//        [--preset=current,v3,...] [--trace=path.json] [--json] [--kinds] [--why]
// A variant's JSON is DEMO.tune; its "_settings" key, if any, is Settings panel values (e.g. {"pursuit.wet":1}); its "_mod" key, if any, is code run on each new run as (H, r) for experiments, e.g.
// ("_modFile" names a file of such code); "_patch" is [[from, to], ...] text replacements made to the build first.
//   --variant='noflock={"_mod":"r.space={...H.Space.PROFILE,weights:{trail:0,cohesion:0,separation:0,align:0}}"}'
// --trace writes the first seed of every run for the viewer, qa/enemy-sandbox.html (serve the repo, open it, pick the file).
// Presets: current (the build's own settings), v3 (step 1 spawns and flocking, the hold, hover, level hold, wet
// avoidance and the Brotato roles all off: v3's dive in and fly out), before (the settings before 2026-11-03).
const fs = require('fs'), path = require('path'), os = require('os'), { execSync } = require('child_process');
const { load } = require('./load.cjs'), { swimmer } = require('./bot.cjs');
const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const arg = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d };
const all = k => args.filter(x => x.startsWith('--' + k + '=')).map(x => x.slice(k.length + 3));
const flag = k => args.includes('--' + k);

const PRESETS = {
  current: {},
  v3: { space: 0, hold: 0, hover: 0, holdlevel: 0, wetavoid: 0, moves: 0 },
  // the settings shipped before the sandbox pass (wet avoidance is the eased one now; --build=rev:6f0c08c has the old)
  before: { hold: 1, hover: 1, holdlevel: 1, scatter: 0, flock: 1, recall: 1, _settings: { 'pursuit.wet': -1 } }
};
const SCEN = {
  'play-mid': { bot: 'mid-keep', time: 30 },
  'play-high': { bot: 'high-turn', time: 30 },
  hops: { bot: 'low-keep', time: 30 },
  'swim-level': { bot: 'mid-keep', flights: 2, water: 'level', wtime: 6, after: 5 },
  weave: { bot: 'mid-keep', flights: 2, water: 'weave', wtime: 8, after: 5 },
  loops: { bot: 'mid-keep', flights: 2, water: 'loops', wtime: 8, after: 5 }
};
const DT = 1 / 120, SW = 1440, SH = 810;
const KINDS = ['chaser', 'swarmer', 'splitter', 'charger', 'drifter', 'turret'], STATES = ['air', 'dry', 'held', 'wet', 'lurk'];
const FLICK_DEG = 100, FLICK_LAG = 12, FLICK_V = 5, FLICK_PX = 120, REFRACT = .3, CROSS_WIN = .35, JUMP = 2;

function buildFile(spec) {
  if (!spec || spec === 'current') return path.join(ROOT, 'ICARUS-demo.html');
  if (spec.startsWith('rev:')) {
    const sha = spec.slice(4), out = path.join(os.tmpdir(), 'icarus-sandbox-' + sha.replace(/\W/g, '') + '.html');
    if (!fs.existsSync(out)) fs.writeFileSync(out, execSync(`git show ${sha}:ICARUS-demo.html`, { cwd: ROOT, maxBuffer: 1 << 28 }));
    return out;
  }
  return path.resolve(spec);
}

// the water scripts: free swimming (A and D turn), as the demo plays by default
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
function waterScript(kind) {
  const mem = { t0: null, dir: null };
  return function (r) {
    const m = r.medium;
    if (mem.t0 == null) { mem.t0 = r.time; mem.dir = Math.sign(m.velocity.x) || 1; mem.flip = r.time + 2 }
    if (kind === 'loops') return { turn: -1, x: 1, y: 0, boost: false };
    if (kind === 'weave' && r.time >= mem.flip) { mem.dir = -mem.dir; mem.flip = r.time + 2; mem.turning = true }
    // level at about 8 m; a U-turn goes down and round so it never breaches
    const level = m.pos.y < -8 ? .12 : -.12, want = mem.dir > 0 ? level : Math.PI - level, d = wrap(want - m.heading);
    if (mem.turning) { if (Math.abs(d) < .3) mem.turning = false; else { const t = mem.dir > 0 ? 1 : -1; return { turn: t, x: -t, y: 0, boost: false } } }
    const turn = Math.abs(d) > .03 ? Math.sign(d) : 0;
    return { turn, x: -turn, y: 0, boost: false };
  };
}

// every enemy the player can see, in world metres: arena enemies in flight, pursuers (above or under the water)
function enemies(H, r) {
  const m = r.medium, out = [];
  if (m.kind === 'air') for (const e of r.enemies) out.push({ id: e.id, kind: e.kind, wx: m.origin.x + e.pos.x, wy: m.origin.y + e.pos.y, rad: e.radius || 1, st: 'air', role: e.mv?.role || e.boss || null });
  for (const p of r.pursuers || []) out.push({ id: p.id, kind: p.kind, wx: p.x, wy: p.y, rad: p.radius || 1, st: p.wet ? 'wet' : p.lurk ? 'lurk' : m.kind === 'water' ? 'held' : 'dry', role: p.e?.mv?.role || p.e?.boss || null });
  return out;
}

// what was going on at a jump or a flick: the enemy's kind and states over the last 0.35 s, and the dolphin's medium and
// time since it last crossed the water line (--why lists the commonest)
function why(st, what, T, e, r, wet, note) {
  const hist = (T.hist || []).filter(h => r.time - h[0] < CROSS_WIN).map(h => h[1]);
  const key = [what, e.kind, [...new Set([...hist, e.st])].join('>'), wet ? 'swimming' : 'flying', note && !/ m$/.test(note) ? note : ''].filter(Boolean).join(' | ');
  st.why[key] = (st.why[key] || 0) + 1;
}
function quantile(a, p) { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN }

function newStats() {
  return { steps: 0, enemySteps: 0, onSteps: 0, off: 0, R: [], crowd: [0, 0], cover: [], dist: [], flick: { cross: 0, water: 0, air: 0 }, sflick: { cross: 0, water: 0, air: 0 },
    copy: { xy: 0, xx: 0, n: 0 }, rev: [0, 0], jumps: 0, sjumps: 0, overlap: 0, rapid: 0, line: new Map(), lineMax: 0, touch: [0, 0], visits: [], offPh: [[0, 0], [0, 0]], kinds: {}, why: {} };
}

function runOne(H, scenName, wave, seed, trace) {
  const S = SCEN[scenName], D = H.DEMO;
  H.Camera?.reset?.();
  const r = H.Hd(seed, 'harpoon'); r.wave = wave; D.wave(r);
  if (H.mod) H.mod(H, r);
  const bot = swimmer(H, S.bot, seed);
  const st = newStats(), track = new Map(), dolphinX = [], cross = [];
  let phase = S.water ? 'bot' : 'play', flights = 0, script = null, scriptEnd = 0, end = S.water ? Infinity : S.time, prevKind = r.medium.kind, started = false;
  const maxT = 90;
  const frames = trace ? [] : null, flicks = trace ? [] : null;
  for (let i = 0; i < maxT / DT && r.time < end + (started ? 0 : maxT); i++) {
    r.hp = r.stats.maxHp; r.hurt = 99;
    if (r.mode !== 'playing') break;
    const m0 = r.medium;
    let input;
    if (phase === 'script') input = script(r); else input = bot(r);
    H.sw(r, input);
    const m = r.medium, t = r.time;
    if (m.kind !== prevKind) {
      cross.push(t);
      if (prevKind === 'air' && m.kind === 'water') {
        flights++;
        if (S.water && phase === 'bot' && flights >= S.flights) { phase = 'script'; script = waterScript(S.water); scriptEnd = t + S.wtime; end = scriptEnd + S.after }
      }
      prevKind = m.kind;
    }
    if (phase === 'script' && (t >= scriptEnd || m.kind !== 'water')) phase = 'after';
    // measure from the first launch (scripted scenarios: from the start of the script)
    if (!started) { if (S.water ? phase === 'script' : m.kind === 'air') { started = true; if (!S.water) end = t + S.time } else continue }
    measure(H, r, st, track, cross, dolphinX, frames, flicks, i);
  }
  return { st, frames, flicks, cross };
}

function measure(H, r, st, track, cross, dolphinX, frames, flicks, step) {
  const m = r.medium, t = r.time, V = H.Ovv(r), me = H.he(r), wet = m.kind === 'water';
  const dv = wet ? m.velocity : { x: m.vx + m.velocity.x, y: m.vy + m.velocity.y };
  dolphinX.push(dv.x);
  st.steps++;
  const E = enemies(H, r), nearCross = cross.length && t - cross[cross.length - 1] < CROSS_WIN;
  const sample = step % 12 === 0, seen = [];
  for (const e of E) {
    const zk = r.stageAt ? r.stageAt.k / (V.h / (H.Jt.height / 2)) : 1, sx = (e.wx - V.x) / V.w / zk, sy = (e.wy - V.y) / V.h / zk, on = Math.abs(sx) <= 1 && Math.abs(sy) <= 1;
    const px = sx * SW / 2, py = -sy * SH / 2;
    st.enemySteps++; if (!on) st.off++; else st.onSteps++;
    st.offPh[wet ? 0 : 1][1]++; if (!on) st.offPh[wet ? 0 : 1][0]++;
    if (wet) { st.touch[1]++; if (e.wy < 0 && Math.hypot(e.wx - me.x, e.wy - me.y) < e.rad + 1) st.touch[0]++ }   // R7b
    // time on the water line in a row, while the dolphin is more than 4 m from it (following one that skims is not stuck)
    const L = st.line.get(e.id) || 0, nl = Math.abs(e.wy) < 1.5 && Math.abs(me.y) > 4 ? L + DT : 0;
    st.line.set(e.id, nl); if (nl > st.lineMax) st.lineMax = nl;
    const K = st.kinds[e.kind] || (st.kinds[e.kind] = { steps: 0, flicks: 0, off: 0 }); K.steps++; if (!on) K.off++;
    let T = track.get(e.id);
    if (!T || T.step !== step - 1) { T = { v: [], s: [], lastFlick: -9, lastSFlick: -9, cross: -9, sign: 0, step }; track.set(e.id, T); T.wx = e.wx; T.wy = e.wy; T.px = px; T.py = py; T.st = e.st; T.step = step; continue }
    const vx = (e.wx - T.wx) / DT, vy = (e.wy - T.wy) / DT, svx = (px - T.px) / DT, svy = (py - T.py) / DT;
    const jump = Math.hypot(e.wx - T.wx, e.wy - T.wy) > JUMP, sjump = !jump && Math.hypot(px - T.px, py - T.py) > 60;
    if (jump) st.jumps++; if (sjump && on) st.sjumps++;
    if (jump) why(st, 'jump', T, e, r, wet, Math.hypot(e.wx - T.wx, e.wy - T.wy).toFixed(1) + ' m');
    // S8: how long each visit to the water lasts, and at what time since the splash it came out
    if (T.wy >= 0 && e.wy < 0) T.in = t; else if (T.wy < 0 && e.wy >= 0 && T.in != null) { st.visits.push(t - T.in); T.in = null }
    if ((T.wy >= 0) !== (e.wy >= 0) || T.st !== e.st) { T.cross = t; (T.hist || (T.hist = [])).push([t, T.st]); if (T.hist.length > 6) T.hist.shift() }
    const ctx = nearCross || t - T.cross < CROSS_WIN ? 'cross' : wet ? 'water' : 'air';
    if (!jump) {
      T.v.push([vx, vy]); T.s.push([svx, svy]);
      if (T.v.length > FLICK_LAG + 1) { T.v.shift(); T.s.shift() }
      if (T.v.length > FLICK_LAG && on) {
        const a = T.v[0], b = T.v[T.v.length - 1], na = Math.hypot(...a), nb = Math.hypot(...b);
        if (na > FLICK_V && nb > FLICK_V && t - T.lastFlick > REFRACT && (a[0] * b[0] + a[1] * b[1]) / (na * nb) < Math.cos(FLICK_DEG * Math.PI / 180)) {
          T.lastFlick = t; st.flick[ctx]++; K.flicks++; if (flicks) flicks.push({ t, id: e.id, ctx, w: 1 });
          why(st, 'flick', T, e, r, wet, ctx);
        }
        const c = T.s[0], d = T.s[T.s.length - 1], nc = Math.hypot(...c), nd = Math.hypot(...d);
        if (nc > FLICK_PX && nd > FLICK_PX && t - T.lastSFlick > REFRACT && (c[0] * d[0] + c[1] * d[1]) / (nc * nd) < Math.cos(FLICK_DEG * Math.PI / 180)) {
          T.lastSFlick = t; st.sflick[ctx]++; if (flicks) flicks.push({ t, id: e.id, ctx, w: 0 });
          why(st, 'screen flick', T, e, r, wet, ctx);
        }
      }
      // moving with the dolphin on the screen while it swims: stage m/s (a 76 m wide screen)
      if (wet && on) {
        const sv = svx * 76 / SW, sg = sv > 3 ? 1 : sv < -3 ? -1 : 0;
        if (sg && T.sign && sg !== T.sign) st.rev[0]++;
        if (sg) T.sign = sg;
        // a rapid swing: on-screen sideways speed past 8 m/s one way, then past 8 m/s the other within 0.5 s
        if (Math.abs(sv) > 8) { const s8 = Math.sign(sv); if (T.s8 && T.s8 !== s8 && t - T.t8 < .5) st.rapid++; T.s8 = s8; T.t8 = t }
        st.rev[1] += DT;
        T.hx = T.hx || []; T.hx.push(sv); if (T.hx.length > 31) T.hx.shift();
        if (T.hx.length > 30 && dolphinX.length > 30) {
          const de = T.hx[30] - T.hx[0], dd = dolphinX[dolphinX.length - 1] - dolphinX[dolphinX.length - 31];
          st.copy.xy += de * dd; st.copy.xx += dd * dd; st.copy.n++;
        }
      } else T.hx = null;
    } else { T.v = []; T.s = [] }
    T.wx = e.wx; T.wy = e.wy; T.px = px; T.py = py; T.st = e.st; T.step = step;
    if (sample && on) seen.push(e);
    if (sample) st.dist.push(Math.hypot(e.wx - me.x, e.wy - me.y));
  }
  for (const id of track.keys()) if (track.get(id).step < step - 240) track.delete(id);
  if (sample && seen.length >= 4) {
    const top = V.y + V.h, bottom = V.y - V.h, A = 2 * V.w * (top - bottom);
    let sum = 0, crowd = 0, overlap = 0;
    const cells = new Set();
    for (const a of seen) {
      let best = Infinity, ov = false;
      for (const b of seen) if (a !== b) { const d = Math.hypot(a.wx - b.wx, a.wy - b.wy); best = Math.min(best, d); if (d < a.rad + b.rad) ov = true }
      sum += best; if (best < 3) crowd++; if (ov) overlap++;
      cells.add(Math.min(5, Math.floor((a.wx - V.x + V.w) / (2 * V.w) * 6)) + ',' + Math.min(3, Math.floor((a.wy - bottom) / Math.max(5, top - bottom) * 4)));
    }
    st.R.push(sum / seen.length / (.5 * Math.sqrt(A / seen.length)));
    st.crowd[0] += crowd; st.crowd[1] += seen.length; st.overlap += overlap;
    st.cover.push(cells.size / Math.min(24, seen.length));
  }
  if (frames && step % 4 === 0) frames.push({ t: +t.toFixed(3), k: wet ? 'w' : 'a', d: [+me.x.toFixed(2), +me.y.toFixed(2)], V: [V.x, V.y, V.w, V.h].map(v => +v.toFixed(2)),
    e: E.map(e => [e.id, KINDS.indexOf(e.kind), STATES.indexOf(e.st), +e.wx.toFixed(2), +e.wy.toFixed(2)]) });
}

function merge(list) {
  const o = newStats();
  for (const s of list) {
    for (const k of ['steps', 'enemySteps', 'onSteps', 'off', 'jumps', 'sjumps', 'overlap', 'rapid']) o[k] += s[k];
    o.R.push(...s.R); o.cover.push(...s.cover); o.dist.push(...s.dist);
    o.crowd[0] += s.crowd[0]; o.crowd[1] += s.crowd[1]; o.rev[0] += s.rev[0]; o.rev[1] += s.rev[1];
    for (const i of [0, 1]) for (const j of [0, 1]) o.offPh[i][j] += s.offPh[i][j];
    o.visits.push(...s.visits); o.lineMax = Math.max(o.lineMax, s.lineMax); o.touch[0] += s.touch[0]; o.touch[1] += s.touch[1];
    o.copy.xy += s.copy.xy; o.copy.xx += s.copy.xx; o.copy.n += s.copy.n;
    for (const c of ['cross', 'water', 'air']) { o.flick[c] += s.flick[c]; o.sflick[c] += s.sflick[c] }
    for (const [k, v] of Object.entries(s.why)) o.why[k] = (o.why[k] || 0) + v;
    for (const [k, v] of Object.entries(s.kinds)) { const K = o.kinds[k] || (o.kinds[k] = { steps: 0, flicks: 0, off: 0 }); K.steps += v.steps; K.flicks += v.flicks; K.off += v.off }
  }
  return o;
}

function summary(s) {
  const onMin = s.onSteps * DT / 60 || 1e-9, enMin = s.enemySteps * DT / 60 || 1e-9, mean = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
  const per = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, +(v / onMin).toFixed(2)]));
  return {
    onScreen: +(s.onSteps / Math.max(1, s.steps)).toFixed(1), off: +(s.off / Math.max(1, s.enemySteps)).toFixed(3),
    offSwim: +(s.offPh[0][0] / Math.max(1, s.offPh[0][1])).toFixed(3), offFly: +(s.offPh[1][0] / Math.max(1, s.offPh[1][1])).toFixed(3),
    R: +mean(s.R).toFixed(2), crowd: +(s.crowd[0] / Math.max(1, s.crowd[1])).toFixed(3), overlap: +(s.overlap / Math.max(1, s.crowd[1])).toFixed(3), cover: +mean(s.cover).toFixed(2),
    distMed: +quantile(s.dist, .5).toFixed(1),
    flicks: per(s.flick), screenFlicks: per(s.sflick),
    // the slope needs the dolphin to change its sideways speed: under 4 m/s per 0.25 s (rms) it is noise, so none
    copy: s.copy.n && Math.sqrt(s.copy.xx / s.copy.n) >= 4 ? +(s.copy.xy / s.copy.xx).toFixed(2) : null,
    visitN: s.visits.length, visit: +(mean(s.visits) || 0).toFixed(2), visitSd: +Math.sqrt(mean(s.visits.map(x => (x - mean(s.visits)) ** 2)) || 0).toFixed(2),
    Rn: s.R.length, lineMax: +s.lineMax.toFixed(2), touch: +(s.touch[0] / Math.max(1, s.touch[1])).toFixed(4), reversals: s.rev[1] ? +(s.rev[0] / s.rev[1]).toFixed(2) : null, rapid: s.rev[1] ? +(s.rapid / s.rev[1] * 60).toFixed(2) : null,
    jumps: +(s.jumps / enMin).toFixed(2), screenJumps: +(s.sjumps / onMin).toFixed(2),
    why: Object.entries(s.why).sort((a, b) => b[1] - a[1]).slice(0, 8),
    kinds: Object.fromEntries(Object.entries(s.kinds).map(([k, v]) => [k, { flicks: +(v.flicks / (v.steps * DT / 60)).toFixed(2), off: +(v.off / v.steps).toFixed(2) }]))
  };
}

function main() {
  const scen = arg('scen', 'all') === 'all' ? Object.keys(SCEN) : arg('scen').split(',');
  const waves = arg('waves', '4,12').split(',').map(Number), seeds = +arg('seeds', flag('gate') ? 6 : 3);
  const variants = [];
  for (const p of arg('preset', all('variant').length ? '' : 'current').split(',').filter(Boolean)) variants.push({ name: p, tune: PRESETS[p] });
  for (const v of all('variant')) { const i = v.indexOf('='); variants.push({ name: v.slice(0, i), tune: JSON.parse(v.slice(i + 1)) }) }
  const builds = all('build').length ? all('build') : ['current'];
  const traceFile = arg('trace'), traces = [];
  const results = [];
  for (const b of builds) for (const v of variants) {
    const file = buildFile(b);
    const { _settings, _patch, ...tune } = v.tune || {};
    const H = load(file, new Map([['icarus.scoreshow.tune', JSON.stringify(tune)], ['icarus.scoreshow.settings.v2', JSON.stringify({ 'ro.on': 0, ..._settings })]]), { bake: true, modern: true, patch: _patch || [] });
    const modSrc = (tune._modFile ? fs.readFileSync(path.resolve(tune._modFile), 'utf8') : '') + (tune._mod || '');
    if (modSrc) H.mod = new Function('H', 'r', modSrc);
    const label = (builds.length > 1 ? (b === "current" ? "this build" : b) + (v.name === "current" ? "" : " " + v.name) : v.name);
    for (const sc of scen) for (const w of waves) {
      const list = [];
      for (let seed = 1; seed <= seeds; seed++) {
        const o = runOne(H, sc, w, seed, traceFile && seed === 1);
        list.push(o.st);
        if (traceFile && seed === 1) traces.push({ variant: label, scen: sc, wave: w, seed, frames: o.frames, flicks: o.flicks, cross: o.cross });
      }
      results.push({ variant: label, scen: sc, wave: w, ...summary(merge(list)) });
    }
  }
  if (traceFile) { fs.writeFileSync(traceFile, JSON.stringify({ made: new Date().toISOString(), kinds: KINDS, states: STATES, traces })); console.error('trace written to', traceFile) }
  if (flag('json')) { console.log(JSON.stringify(results, null, 1)); return }
  const pad = (s, n) => String(s).padEnd(n - 1) + ' ', num = (x, n) => String(x ?? '-').padStart(n);
  console.log(pad('variant', 14) + pad('scenario', 11) + pad('wave', 5) + num('on', 5) + num('off%', 6) + num('sw/fl', 8) + num('R', 6) + num('Rn', 5) + num('crowd%', 7) + num('ovl%', 5) + num('cover', 6) + num('dist', 6) +
    ' | flicks/min cross water  air | screen cross water  air |' + num('copy', 6) + num('rev/s', 6) + num('fast/m', 7) + num('jumps', 7) + num('line', 6));
  for (const x of results) console.log(pad(x.variant, 14) + pad(x.scen, 11) + pad(x.wave, 5) + num(x.onScreen, 5) + num((x.off * 100).toFixed(0), 6) + num((x.offSwim * 100).toFixed(0) + '/' + (x.offFly * 100).toFixed(0), 8) + num(x.R, 6) + num(x.Rn, 5) + num((x.crowd * 100).toFixed(0), 7) + num((x.overlap * 100).toFixed(0), 5) + num(x.cover, 6) + num(x.distMed, 6) +
    ' |            ' + num(x.flicks.cross, 5) + num(x.flicks.water, 6) + num(x.flicks.air, 5) + ' |       ' + num(x.screenFlicks.cross, 5) + num(x.screenFlicks.water, 6) + num(x.screenFlicks.air, 5) + ' |' +
    num(x.copy, 6) + num(x.reversals, 6) + num(x.rapid, 7) + num(x.screenJumps, 7) + num(x.lineMax, 6));
  if (flag('why')) for (const x of results) if (x.why.length) console.log(x.variant, x.scen, x.wave, '\n   ' + x.why.map(([k, n]) => n + '  ' + k).join('\n   '));
  if (flag('kinds')) for (const x of results) console.log(x.variant, x.scen, x.wave, JSON.stringify(x.kinds));
  if (flag('gate')) {
    let fail = 0;
    for (const x of results) for (const [ok, what] of gate(x)) if (!ok) { fail++; console.log('FAIL', x.variant, x.scen, 'wave', x.wave, what) }
    console.log(fail ? fail + ' gate checks failed' : 'PASS all gate checks');
    process.exitCode = fail ? 1 : 0;
  }
}
// The goals in docs/ENEMY_RULES.md (G1-G5, Q1-Q3) as checks (--gate; 6 seeds unless --seeds says otherwise, waves 4 and 12): enemies do not copy the dolphin's sideways moves while it swims, rarely flick direction, never teleport, and are
// not bunched on screen. The build before (6f0c08c) scored copy 0.5-1.1, flicks up to 15 a minute, R 0.55, overlap up
// to 52%, and fails 34 of these checks.
// Sideways turns of enemies above the water while you swim (6 seeds; before: 0.23-1.38 reversals a second and up to 77
// rapid swings a minute, at loops; 2026-11-04 build: at most 0.32 and 14): reversals count any turn back, rapid swings
// only past 8 m/s one way then the other within 0.5 s, the "rapidly left and right" the designer saw.
// R is judged only over GATE.Rn or more 0.1 s samples with 4+ enemies above the water on screen. Flights must reach 0.65
// (6 seeds: 0.73-0.91; before 0.59-0.79). Swims only 0.5: the enemies above the water then are the ones spawned ahead of
// you, kept there so their markers stay in view while the camera follows you (qa/wetspawn.cjs), and the ones gliding in
// after you, so R stays about where it was (0.57 at wave 4; before 0.55-0.57) though overlap fell from 20% to 1-2%.
// line: the longest any enemy stays within 1.5 m of the water line (before: up to 3.3 s; 2026-11-04 build: 1.2 s).
// spreadOut: S8, each enemy's time in the water varies by at least this share of the mean (they do not move as one).
// touch: share of enemy time while you swim spent touching you under the water (R7b; few enemies go under now, so a share
// of under-water time alone read 29% from one enemy).
// offSwim, offFly: share of enemy time off screen while you swim / fly (Q1, not left behind; HEAD 6f0c08c: up to 38% / 14%).
const GATE = { spreadOut: .25, offSwim: .25, offFly: .2, touch: .0005, line: 1, copy: .4, reversals: .45, rapid: 15, flicks: 3, jumps: 0, R: .65, Rswim: .5, Rn: 60, overlap: .2 };
function gate(x) {
  // copying is a positive slope (moving with the dolphin); a negative one is independent motion, e.g. enemies easing to
  // their glide speed while the dolphin speeds up after the splash
  return [[x.copy == null || x.copy <= GATE.copy, `copy ${x.copy} > ${GATE.copy}`],
    [x.rapid == null || x.rapid <= GATE.rapid, `rapid sideways swings ${x.rapid}/min > ${GATE.rapid}`],
    [x.screenFlicks.cross + x.screenFlicks.water + x.screenFlicks.air <= GATE.flicks, `screen flicks ${(x.screenFlicks.cross + x.screenFlicks.water + x.screenFlicks.air).toFixed(2)}/min > ${GATE.flicks}`],
    [x.screenJumps <= GATE.jumps, `screen jumps ${x.screenJumps}/min`], [x.lineMax <= GATE.line, `stuck on the water line for ${x.lineMax} s`],
    [x.touch <= GATE.touch, `under the water, touching you ${(x.touch * 100).toFixed(2)}% of the time`],
    [x.visitN < 20 || x.visitSd / x.visit >= GATE.spreadOut, `come out of the water together (${x.visit} ± ${x.visitSd} s)`],
    [x.offSwim <= GATE.offSwim, `off screen while you swim ${(x.offSwim * 100).toFixed(0)}%`], [x.offFly <= GATE.offFly, `off screen while you fly ${(x.offFly * 100).toFixed(0)}%`], [!(x.R < (SCEN[x.scen].water && x.scen !== 'loops' ? GATE.Rswim : GATE.R)) || x.Rn < GATE.Rn, `R ${x.R} too low (bunched; ${x.Rn} samples)`], [x.overlap <= GATE.overlap, `overlapping ${(x.overlap * 100).toFixed(0)}%`]];
}
if (require.main === module) main();
module.exports = { SCEN, PRESETS, runOne, summary, merge, buildFile, enemies };

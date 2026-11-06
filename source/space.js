// Step 1 of the build-and-playtest plan (ICARUS_DESIGN.md §4.18, §4.20): positional space.
// - Most spawns appear behind a marker inside the view, leaning toward the direction of travel and kept 10 m above the
//   water; a share set in Settings (20% by default) still comes in from the screen edge, as v3's did.
// - Where markers go follows docs/ENEMY_RULES.md S7: anywhere in the view at least scatterMin from the dolphin, as
//   Brotato spawns anywhere away from the player, and fixed on the stage (the screen) while they wait.
// - How enemies move is source/enemies.js; this file only places them.
// - The landing pool (late spawns holding above the predicted landing point) is built but off: the designer found
//   spawns at the water line unfair (2026-10-27).
// The profile lives on the run (r.space) so later items can change how spawns work. DEMO.tune.space 0 keeps v3's edge
// spawns and no pool. All randomness comes from the run's seeded generator (ce).
var Space = (() => {
  const PROFILE = Object.freeze({
    telegraph: .6,          // s a marker shows before its enemy appears
    ahead: [14, 24],        // m from the dolphin along the direction of travel
    spread: 9,              // m of sideways scatter
    minDist: 10,            // m kept between a new spawn and the dolphin
    margin: 3,              // m kept inside the view's edge
    minHeight: 10,          // m above the water kept by marked spawns
    pool: false,            // the landing pool; off since the 2026-10-27 playtest
    poolWindow: 3,          // s before the predicted landing when spawns go to the pool
    poolRadius: 6,          // m of scatter around the landing point
    poolHeight: 6,          // m above the water that pool enemies hold (plus up to 2)
    poolRelease: 11,        // m: closer than this, or once hurt, a pool enemy attacks
    scatterMin: 14          // m kept between a spawn and the dolphin (R8)
  });
  const on = r => !!(DEMO.tune.space && r?.demo);
  const profile = r => r.space || (r.space = { ...PROFILE, ahead: [...PROFILE.ahead] });
  const unit = (x, y) => { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n } };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // When and where the arena origin meets the water on this descent, with the frame's falling gravity (as SE).
  function landing(r, m) {
    if (m?.kind !== 'air' || m.vy >= 0) return null;
    const g = ai * Math.max(.4, 1 - .025 * (r.demo.stats.Hang || 0)), d = m.vy * m.vy - 2 * g * m.origin.y;
    if (d < 0) return null;
    const t = (-m.vy - Math.sqrt(d)) / g;
    return { t, wx: m.origin.x + m.vx * t };
  }

  // Replaces v3's edge placement (Obq) for one queued spawn: a marked point in the view.
  function place(r, m, q) {
    const P = profile(r), V = Ovv(r), o = m.origin, me = m.local, L = landing(r, m);
    let x, y, pool = null;
    if (P.pool && L && L.t <= P.poolWindow && Math.abs(L.wx - o.x) <= V.w - P.margin) {
      pool = { wx: L.wx + (ce(r) * 2 - 1) * P.poolRadius, h: P.poolHeight + ce(r) * 2 };
      x = pool.wx - o.x; y = -o.y + pool.h;
    } else ({ x, y } = scattered(r, m));
    // Ospw keeps an enemy c + 4 m above the water; s sets its first velocity (-s × speed), toward the dolphin
    const c = pool ? 1.5 : 1.5 + ce(r) * 5.5, s = x >= me.x ? 1 : -1;
    const k = Enemies.scale(r);
    (r.warns || (r.warns = [])).push({ k: q[0], x, y, s, c, t: P.telegraph, t0: P.telegraph, pool, sx: (o.x + x - V.x) / k, sy: (o.y + y - V.y) / k });
  }

  // A point in the view ahead of the dolphin along the direction of travel, scattered sideways, not too close.
  // In view means around the camera, not the frame's origin (2026-11-01): the arena is wider than the view and the camera
  // scrolls across it, and under water the frame stays where the stay began while the camera follows the dolphin, so
  // markers clamped around the origin waited at or past the screen's edge (16% of their time in a loop under water). And
  // a marker is placed at least minHeight above the water from the start: placed lower while the view's top was still
  // low, it popped up to minHeight on its next step (a 4 m flick).
  function ahead(r, m) {
    const P = profile(r), V = Ovv(r), o = m.origin, me = m.local, cx = V.x - o.x;
    const half = V.w - P.margin, low = Math.max(V.y - o.y - V.h + P.margin, -o.y + P.minHeight), top = Math.max(low, V.y - o.y + V.h - P.margin);
    const dir = unit(m.vx, m.vy), d = P.ahead[0] + ce(r) * (P.ahead[1] - P.ahead[0]), off = (ce(r) * 2 - 1) * P.spread;
    let x = clamp(me.x + dir.x * d - dir.y * off, cx - half, cx + half), y = clamp(me.y + dir.y * d + dir.x * off, low, top);
    const dx = x - me.x, dy = y - me.y, dist = Math.hypot(dx, dy);
    if (dist < P.minDist) { const u = dist > .01 ? unit(dx, dy) : dir; x = clamp(me.x + u.x * P.minDist, cx - half, cx + half); y = clamp(me.y + u.y * P.minDist, low, top) }
    return { x, y };
  }

  // S7: a point anywhere in the view, at least scatterMin from the dolphin and minHeight above the water when that is in
  // view (the farthest of 12 draws if none is far enough)
  function scattered(r, m) {
    const P = profile(r), V = Ovv(r), o = m.origin, me = m.local, cx = V.x - o.x, half = V.w - P.margin;
    const top = V.y - o.y + V.h - P.margin, low = Math.min(top, Math.max(V.y - o.y - V.h + P.margin, -o.y + P.minHeight));
    let x = me.x, y = me.y, best = -1;
    for (let k = 0; k < 12; k++) {
      const px = cx - half + ce(r) * 2 * half, py = low + ce(r) * (top - low), d = Math.hypot(px - me.x, py - me.y);
      if (d > best) { best = d; x = px; y = py }
      if (d >= P.scatterMin) break;
    }
    return { x, y };
  }

  // Resolves markers (in place of v3's Obs wrapper, so no marker is counted down twice); pool markers follow their anchor.
  // Every marker stays minHeight above the water, which rises toward the arena on a descent while the marker waits.
  function resolve(r, m, dt) {
    if (!r.warns?.length) return;
    const P = profile(r), keep = [];
    for (const w of r.warns) {
      // a pool marker still waiting after the next breach (a quick hop) is placed ahead on the new flight instead
      if (w.pool && m.vy > 0) { w.pool = null; Object.assign(w, ahead(r, m)); w.s = w.x >= m.local.x ? 1 : -1 }
      if (w.pool) { w.x = w.pool.wx - m.origin.x; w.y = -m.origin.y + w.pool.h }
      else if (w.sx != null) { const V = Ovv(r), k = Enemies.scale(r); w.x = V.x + w.sx * k - m.origin.x; w.y = V.y + w.sy * k - m.origin.y }   // S7
      w.t -= dt;
      if (w.t > 0) { keep.push(w); continue }
      const n = r.enemies.length;
      Ospw(r, m, w.k, w.x, w.y, w.s, w.pool ? w.c : -1e4);   // (Ospw lifts it above c + 4 m: the marker says where)
      const e = r.enemies.length > n ? r.enemies[r.enemies.length - 1] : null;
      if (e) e.floor = w.c;
      if (e && w.pool) { e.pool = w.pool; e.velocity = { x: -m.vx, y: -m.vy } }
    }
    r.warns = keep;
  }

  // Markers and the landing point, drawn on the renderer's telegraph layer each frame (after it is cleared).
  function draw(R, r, m) {
    const G = R.telegraphs, o = demoSeen(m), P = profile(r), pulse = .5 + .5 * Math.sin(R.time * 14);
    for (const w of r.warns || []) {
      const wx = o.x + w.x, wy = o.y + w.y, X = R.sx(wx), Y = R.sy(wy), ppm = Math.abs(R.sx(wx + 1) - X);
      const k = 1 - clamp(w.t / (w.t0 || P.telegraph), 0, 1), s = (1.05 + .55 * (1 - k)) * ppm;
      G.moveTo(X - s, Y - s).lineTo(X + s, Y + s).moveTo(X + s, Y - s).lineTo(X - s, Y + s).stroke({ color: yt.hostile, width: 2.5, alpha: .4 + .5 * k });
      G.circle(X, Y, s * 1.35).stroke({ color: yt.hostile, width: 1.5, alpha: .2 + .35 * pulse });
    }
    const L = P.pool && landing(r, m);
    if (L && L.t <= P.poolWindow + 1) {
      const X = R.sx(L.wx), Y = R.sy(0), ppm = Math.abs(R.sx(L.wx + 1) - X), a = clamp(1 - (L.t - P.poolWindow), .25, 1);
      G.ellipse(X, Y, P.poolRadius * ppm, 1.2 * ppm).stroke({ color: yt.cyan, width: 2, alpha: .55 * a });
      G.moveTo(X - .9 * ppm, Y - 2.6 * ppm).lineTo(X, Y - 1.6 * ppm).lineTo(X + .9 * ppm, Y - 2.6 * ppm).stroke({ color: yt.cyan, width: 2, alpha: .7 * a });
    }
  }

  // Whether this spawn keeps v3's edge entry: a share of them, set in Settings › Score (DEMO.tune.edge), drawn by the
  // run's generator. At 0.35 the bot's enemies sat 26 m from the screen centre; at 0.2, 15 m (2026-10-27, one seed).
  const edge = r => ce(r) < DEMO.tune.edge;

  return { PROFILE, on, profile, landing, place, ahead, scattered, edge, resolve, draw };
})();
// while you swim (the stand-in frame, t.wet) every spawn is marked in view: an edge spawn's marker waited off-screen
// and the enemy became a held pursuer at once, so it never flew in from the edge as it does in the air
{const obq0=Obq;Obq=function(r,t,q){if(Space.on(r)&&t?.kind==='air'&&(t.wet||!Space.edge(r)))return Space.place(r,t,q);return obq0(r,t,q)}}
{const obs0=Obs;Obs=function(r,t,i){if(!Space.on(r)||t?.kind!=='air')return obs0(r,t,i);Space.resolve(r,t,i);return Obs0(r,t,i)}}
// a pool enemy that becomes a pursuer stops holding
{const pz0=Pz;Pz=function(r,t,E){E.pool=null;return pz0(r,t,E)}}
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&m?.kind==='air'&&Space.on(r))Space.draw(R,r,m)}}
// Spawning goes on while the dolphin swims (designer, 2026-10-27; DEMO.tune.wetspawn). v3's wave schedule only advances
// in the air step, so a water stay paused it. Here it advances during water stays too, once the wave's first launch has
// started it (the air clock still pauses), at its usual rate. There is no arena under water, so the schedule runs
// against a still stand-in frame fixed where this stay began (r.wetFrame: origin on the water line, moving the way the
// dolphin swims so step 1's markers lean ahead of it); each enemy appears behind its marker above the water in view
// and at once becomes a pursuer (source/enemies.js moves it), joining the arena at the next launch.
Space.wetFrame = function (r) {
  const m = r.medium;
  const F = r.wetFrame || (r.wetFrame = { kind: 'air', origin: se(m.pos.x, 0), vx: 0, vy: 0, local: ye(0, 0), velocity: { x: 0, y: 0 }, elapsed: 1, wet: true });
  F.local = ye(m.pos.x - F.origin.x, m.pos.y); F.vx = m.velocity.x; F.vy = m.velocity.y;
  return F;
};
Space.wetSpawn = function (r, dt) {
  if (r.bw !== r.wave || r.mode !== 'playing' || r.armed) return;
  const F = Space.wetFrame(r), n = r.enemies.length;
  Obs(r, F, dt);
  for (const e of r.enemies.splice(n)) { Pz(r, F, e); const p = r.pursuers.at(-1); p.h = Math.atan2(0, -Math.sign(e.velocity.x) || 1); p.v = 0 }
};
// At the launch, markers still waiting move from the stand-in frame into the new arena (both sit on the water line).
Space.wetLaunch = function (r) {
  const F = r.wetFrame; r.wetFrame = null;
  if (!F || !r.warns?.length || r.medium?.kind !== 'air') return;
  for (const w of r.warns) w.x += F.origin.x - r.medium.origin.x;
};
{const pq1=Pq;Pq=function(r,e){if(DEMO.tune.wetspawn&&r?.demo&&r.medium?.kind==='water'&&e>0)Space.wetSpawn(r,e);return pq1(r,e)}}
{const zq1=Zq;Zq=function(r){zq1(r);if(r?.demo)Space.wetLaunch(r)}}
{const draw1=Otdraw;Otdraw=function(R,r,m,title){draw1(R,r,m,title);if(!title&&m?.kind==='water'&&r.wetFrame&&r.warns?.length&&Space.on(r))Space.draw(R,r,r.wetFrame)}}
// The pace of a wave's spawns (designer, 2026-11-01: match Brotato's pressure "per second of play"). The schedule is
// Brotato's zone 1 groups, timed in seconds, and with spawning while you swim it ran in the air and the water alike, but
// the wave's clock counts only air time; a wave is about half water, so it spawned about twice Brotato's enemies
// (docs/WAVE_BASELINE.md). With DEMO.tune.pace the schedule's clock runs at the share of this wave's play spent in the
// air, so its groups play out once over the whole wave, swims included, and the wave's total is Brotato's (× the spawn
// count). The share is a running one, seeded with the last wave's (0.5 before the first) worth 8 s of play. Enemies
// queued by the schedule still come out one every 0.05 s.
Space.pace = function (r) {
  const p = r.spacePace || (r.spacePace = { wave: -1, air: 0, real: 0, last: .5 });
  return (p.air + p.last * 8) / (p.real + 8);
};
{const sw2=sw;sw=function(r,input,dt){
  const on=DEMO.tune.pace&&r?.demo,d=dt??Ar;   // the game loop calls sw without dt (its default is the 1/120 s step)
  if(on){const p=r.spacePace||(r.spacePace={wave:-1,air:0,real:0,last:.5});
    if(p.wave!==r.wave){if(p.real>4)p.last=p.air/p.real;p.wave=r.wave;p.air=0;p.real=0}
    if(r.bw===r.wave&&r.mode==='playing'&&d>0){p.real+=d;if(r.medium?.kind==='air')p.air+=d}}
  return sw2(r,input,dt)}}
{const obs1=Obs;Obs=function(r,t,i){if(DEMO.tune.pace&&r?.demo&&i>0){const k=Math.max(.2,Math.min(1,Space.pace(r)));r.bt=(r.bt||0)-i*(1-k)}return obs1(r,t,i)}}

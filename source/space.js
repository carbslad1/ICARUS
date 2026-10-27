// Step 1 of the build-and-playtest plan (ICARUS_DESIGN.md §4.18, §4.20): positional space.
// - Most spawns appear behind a marker inside the view, leaning toward the direction of travel and kept 10 m above the
//   water; a share set in Settings (20% by default) still comes in from the screen edge, as v3's did.
// - Chasers, swarmers and splitters flock: they keep apart, bunch with neighbours and follow the dolphin's recent track.
// - Enemies that come back at the breach from beyond the screen (left behind when the dolphin turned underwater)
//   re-enter at the screen edge instead of being lost.
// - The landing pool (late spawns holding above the predicted landing point) is built but off: the designer found
//   spawns at the water line unfair (2026-10-27).
// The profile lives on the run (r.space) so later items can change how spawns work. DEMO.tune.space 0 keeps v3's edge
// spawns, straight chasing and no pool. All randomness comes from the run's seeded generator (ce).
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
    flockRadius: 12,        // m within which flockers count as neighbours
    separation: 6,          // m flockers try to keep between each other (3.5 felt crowded, 2026-10-27)
    weights: Object.freeze({ trail: .55, cohesion: .1, separation: 1.8, align: .15 }),
    trailDelay: .5          // s behind the dolphin that flockers follow
  });
  const FLOCK = new Set(['chaser', 'swarmer', 'splitter']);
  const on = r => !!(DEMO.tune.space && r?.demo);
  const profile = r => r.space || (r.space = { ...PROFILE, ahead: [...PROFILE.ahead], weights: { ...PROFILE.weights } });
  const unit = (x, y) => { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n } };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // When and where the arena origin meets the water on this descent, with the frame's falling gravity (as SE).
  function landing(r, m) {
    if (m?.kind !== 'air' || m.vy >= 0) return null;
    const g = -15 * Math.max(.4, 1 - .025 * (r.demo.stats.Hang || 0)), d = m.vy * m.vy - 2 * g * m.origin.y;
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
    } else ({ x, y } = ahead(r, m));
    // Ospw keeps an enemy c + 4 m above the water; s sets its first velocity (-s × speed), toward the dolphin
    const c = pool ? 1.5 : 1.5 + ce(r) * 5.5, s = x >= me.x ? 1 : -1;
    (r.warns || (r.warns = [])).push({ k: q[0], x, y, s, c, t: P.telegraph, t0: P.telegraph, pool });
  }

  // A point in the view ahead of the dolphin along the direction of travel, scattered sideways, not too close.
  function ahead(r, m) {
    const P = profile(r), V = Ovv(r), o = m.origin, me = m.local;
    const half = V.w - P.margin, top = V.y - o.y + V.h - P.margin, low = Math.min(top, Math.max(V.y - o.y - V.h + P.margin, -o.y + P.minHeight));
    const dir = unit(m.vx, m.vy), d = P.ahead[0] + ce(r) * (P.ahead[1] - P.ahead[0]), off = (ce(r) * 2 - 1) * P.spread;
    let x = clamp(me.x + dir.x * d - dir.y * off, -half, half), y = clamp(me.y + dir.y * d + dir.x * off, low, top);
    const dx = x - me.x, dy = y - me.y, dist = Math.hypot(dx, dy);
    if (dist < P.minDist) { const u = dist > .01 ? unit(dx, dy) : dir; x = clamp(me.x + u.x * P.minDist, -half, half); y = clamp(me.y + u.y * P.minDist, low, top) }
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
      else w.y = Math.max(w.y, -m.origin.y + P.minHeight);
      w.t -= dt;
      if (w.t > 0) { keep.push(w); continue }
      const n = r.enemies.length;
      Ospw(r, m, w.k, w.x, w.y, w.s, w.c);
      const e = r.enemies.length > n ? r.enemies[r.enemies.length - 1] : null;
      if (e && w.pool) { e.pool = w.pool; e.velocity = { x: -m.vx, y: -m.vy } }
    }
    r.warns = keep;
  }

  function trailPoint(r, delay) {
    const T = r.spaceTrail;
    if (!T?.length) return null;
    const at = r.time - delay;
    for (let i = T.length - 1; i >= 0; i--) if (T[i].t <= at) return T[i];
    return T[0];
  }

  // After v3's movement (ME): pool enemies hold their anchor, and flockers steer by neighbours and the trail.
  function after(r, m, dt) {
    const P = profile(r), me = m.local, flock = [];
    const T = r.spaceTrail || (r.spaceTrail = []);
    T.push({ t: r.time, x: me.x, y: me.y });
    while (T.length > 2 && T[1].t < r.time - P.trailDelay - .1) T.shift();
    for (const e of r.enemies) {
      if (e.pool) {
        if (m.vy > 0 || e.hp < e.maxHp || Math.hypot(e.pos.x - me.x, e.pos.y - me.y) < P.poolRelease) { e.pool = null; continue }
        const tx = e.pool.wx - m.origin.x, ty = -m.origin.y + e.pool.h + Math.sin(e.age * 2 + e.seed) * .6;
        e.velocity = { x: (tx - e.pos.x) / dt, y: (ty - e.pos.y) / dt };
        e.pos = ye(tx, ty);
        continue;
      }
      if (FLOCK.has(e.kind) && !e.role && m.origin.y + e.pos.y >= 0) flock.push(e);
    }
    if (!flock.length) return;
    const W = P.weights, trail = trailPoint(r, P.trailDelay) || me;
    for (const e of flock) {
      let cx = 0, cy = 0, ax = 0, ay = 0, sx = 0, sy = 0, n = 0;
      for (const f of flock) {
        if (f === e) continue;
        const dx = f.pos.x - e.pos.x, dy = f.pos.y - e.pos.y, d = Math.hypot(dx, dy);
        if (d > P.flockRadius) continue;
        n++; cx += f.pos.x; cy += f.pos.y; ax += f.velocity.x; ay += f.velocity.y;
        if (d < P.separation && d > 1e-3) { const k = (P.separation - d) / P.separation; sx -= dx / d * k; sy -= dy / d * k }
      }
      const seek = unit(me.x - e.pos.x, me.y - e.pos.y), tr = unit(trail.x - e.pos.x, trail.y - e.pos.y);
      let dx = seek.x * (1 - W.trail) + tr.x * W.trail, dy = seek.y * (1 - W.trail) + tr.y * W.trail;
      if (n) { const c = unit(cx / n - e.pos.x, cy / n - e.pos.y), a = unit(ax, ay); dx += c.x * W.cohesion + a.x * W.align; dy += c.y * W.cohesion + a.y * W.align }
      dx += sx * W.separation; dy += sy * W.separation;
      const D = unit(dx, dy), spd = (e.kind === 'swarmer' ? 25 * Osp.small : 19 + r.wave * .13) * Osp.spd * FiveCombat.movementScale(r, e);
      // ME eases velocity toward spd·seek; adding spd·(D − seek) at the same rate makes it settle on spd·D
      const k = Xe(dt, e.kind === 'swarmer' ? .16 : .24);
      e.velocity.x += spd * (D.x - seek.x) * k; e.velocity.y += spd * (D.y - seek.y) * k;
    }
  }

  // Markers and the landing point, drawn on the renderer's telegraph layer each frame (after it is cleared).
  function draw(R, r, m) {
    const G = R.telegraphs, o = m.origin, P = profile(r), pulse = .5 + .5 * Math.sin(R.time * 14);
    for (const w of r.warns || []) {
      const wx = o.x + w.x, wy = o.y + Math.max(w.y, -o.y + w.c + 4), X = R.sx(wx), Y = R.sy(wy), ppm = Math.abs(R.sx(wx + 1) - X);
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

  // At the breach, enemies returning from beyond the screen's side edges come back just inside them.
  function recall(r, returned) {
    const m = r.medium;
    if (m?.kind !== 'air' || !returned.length) return;
    const half = Ovv(r).w, h = Jt.height / 2;
    for (const e of returned) {
      if (Math.abs(e.pos.x) <= half) continue;
      const side = Math.sign(e.pos.x);
      e.pos = ye(side * (half - 1.5), clamp(e.pos.y, -m.origin.y + e.radius + 2, h - 2));
      e.velocity = { x: -side * 18 * Osp.spd, y: 0 };
    }
  }

  return { PROFILE, on, profile, landing, place, ahead, edge, resolve, after, draw, recall };
})();
{const obq0=Obq;Obq=function(r,t,q){if(Space.on(r)&&t?.kind==='air'&&!Space.edge(r))return Space.place(r,t,q);return obq0(r,t,q)}}
{const obs0=Obs;Obs=function(r,t,i){if(!Space.on(r)||t?.kind!=='air')return obs0(r,t,i);Space.resolve(r,t,i);return Obs0(r,t,i)}}
{const me0=ME;ME=function(r,t,e,i){me0(r,t,e,i);if(Space.on(r)&&t?.kind==='air'&&i>0)Space.after(r,t,i)}}
{const zq0=Zq;Zq=function(r){const n=r.enemies.length;zq0(r);if(Space.on(r))Space.recall(r,r.enemies.slice(n))}}  // pursuers return at the breach
{const pz0=Pz;Pz=function(r,t,E){E.pool=null;return pz0(r,t,E)}}  // a pool enemy that becomes a pursuer stops holding
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&m?.kind==='air'&&Space.on(r))Space.draw(R,r,m)}}
// While the dolphin is under water, v3 flies each pursuer still above the water straight on in the direction it faced
// at the splash, never turning toward the dolphin, so after a carve turns the dolphin round they leave the arena (bot,
// 2026-10-27: 23% of them off-screen, up to 98 m away). With DEMO.tune.hold they instead hold a point above the water
// ahead of the dolphin, on the side it is moving toward and inside the view (8-26 m ahead, 5-12 m up, lower when a deep
// dive brings the view's top edge down, never under 1.5 m), easing in as they arrive.
// Touching one under water still kills it, as v3's touchKill. Pursuers that went under, and lurkers, keep v3's step.
Space.holdAbove = function (r, dt) {
  const m = r.medium, d = m.pos, v = m.velocity, Cw = Ocs(r.wave), V = Ovv(r);
  for (const p of r.pursuers || []) {
    if (p.wet || p.lurk) continue;
    p.px = p.x; p.py = p.y; p.age += dt;
    const Fd = Math.abs(v.x) > Math.max(3, Cw * .12) ? Math.sign(v.x) : p.fd || Math.sign(v.x) || 1;
    p.fd = Fd;
    const w = 3.2 * p.tr, top = Math.max(Cw * 1.05 * Osp.spd, (p.kind === 'swarmer' ? 25 * Osp.small : 19 + r.wave * .13) * Osp.spd * p.sp);
    const tx = d.x + Fd * (8 + (p.seed * 7.3 % 1) * 18), ty = Math.max(1.5, Math.min(5 + (p.seed * 3.1 % 1) * 7, V.y + V.h - 3));
    const a = tx - p.x, b = ty - p.y, dist = Math.hypot(a, b);
    let c = Math.atan2(b, a) - p.h; c = Math.atan2(Math.sin(c), Math.cos(c));
    p.h += Math.max(-w * dt, Math.min(w * dt, c));
    p.v += (Math.min(top, 2 + 2.5 * dist) - p.v) * Xe(dt, .35);
    p.x += Math.cos(p.h) * p.v * dt; p.y = Math.max(1, p.y + Math.sin(p.h) * p.v * dt);
  }
  r.pursuers = (r.pursuers || []).filter(p => {
    if (p.wet || p.lurk || Math.hypot(d.x - p.x, d.y - p.y) >= p.radius + 1) return true;
    if (typeof touchKill === 'function') { touchKill(r, p); return false } return true;
  });
};
{const pq0=Pq;Pq=function(r,e){
  if(!DEMO.tune.hold||!r?.demo||r.medium?.kind!=='water'||!(e>0)||!r.pursuers?.length)return pq0(r,e);
  const dry=r.pursuers.filter(p=>!p.wet&&!p.lurk);r.pursuers=r.pursuers.filter(p=>p.wet||p.lurk);
  pq0(r,e);r.pursuers=(r.pursuers||[]).concat(dry);Space.holdAbove(r,e);
  // v3's shock rings still push the held pursuers (a zero step: the rings don't grow twice, and each hits once)
  if(typeof Orshock==='function'){const keep=r.pursuers;r.pursuers=keep.filter(p=>dry.includes(p));Orshock(r,0);r.pursuers=keep}}}

// Step 1 of the build-and-playtest plan (ICARUS_DESIGN.md §4.18, §4.20): positional space.
// - Spawns appear behind a marker inside the view, leaning toward the direction of travel. Late in the descent they go
//   to the pool at the predicted landing point instead.
// - Pool enemies hold above the water at that point until the dolphin comes close, so landing in it is a choice.
// - Chasers, swarmers and splitters flock: they keep apart, bunch with neighbours and follow the dolphin's recent track.
// The profile lives on the run (r.space) so later items can change how spawns work. DEMO.tune.space 0 keeps v3's edge
// spawns, straight chasing and no pool. All randomness comes from the run's seeded generator (ce).
var Space = (() => {
  const PROFILE = Object.freeze({
    telegraph: .6,          // s a marker shows before its enemy appears
    ahead: [14, 24],        // m from the dolphin along the direction of travel
    spread: 9,              // m of sideways scatter
    minDist: 10,            // m kept between a new spawn and the dolphin
    margin: 3,              // m kept inside the view's edge
    poolWindow: 3,          // s before the predicted landing when spawns go to the pool
    poolRadius: 6,          // m of scatter around the landing point
    poolHeight: 6,          // m above the water that pool enemies hold (plus up to 2)
    poolRelease: 11,        // m: closer than this, or once hurt, a pool enemy attacks
    flockRadius: 12,        // m within which flockers count as neighbours
    separation: 3.5,        // m flockers try to keep between each other
    weights: Object.freeze({ trail: .55, cohesion: .25, separation: 1.4, align: .15 }),
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
    if (L && L.t <= P.poolWindow && Math.abs(L.wx - o.x) <= V.w - P.margin) {
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
    const half = V.w - P.margin, top = V.y - o.y + V.h - P.margin, low = Math.min(top, Math.max(V.y - o.y - V.h + P.margin, -o.y + 2));
    const dir = unit(m.vx, m.vy), d = P.ahead[0] + ce(r) * (P.ahead[1] - P.ahead[0]), off = (ce(r) * 2 - 1) * P.spread;
    let x = clamp(me.x + dir.x * d - dir.y * off, -half, half), y = clamp(me.y + dir.y * d + dir.x * off, low, top);
    const dx = x - me.x, dy = y - me.y, dist = Math.hypot(dx, dy);
    if (dist < P.minDist) { const u = dist > .01 ? unit(dx, dy) : dir; x = clamp(me.x + u.x * P.minDist, -half, half); y = clamp(me.y + u.y * P.minDist, low, top) }
    return { x, y };
  }

  // Resolves markers (in place of v3's Obs wrapper, so no marker is counted down twice); pool markers follow their anchor.
  function resolve(r, m, dt) {
    if (!r.warns?.length) return;
    const keep = [];
    for (const w of r.warns) {
      // a pool marker still waiting after the next breach (a quick hop) is placed ahead on the new flight instead
      if (w.pool && m.vy > 0) { w.pool = null; Object.assign(w, ahead(r, m)); w.s = w.x >= m.local.x ? 1 : -1 }
      if (w.pool) { w.x = w.pool.wx - m.origin.x; w.y = -m.origin.y + w.pool.h }
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
    const L = landing(r, m);
    if (L && L.t <= P.poolWindow + 1) {
      const X = R.sx(L.wx), Y = R.sy(0), ppm = Math.abs(R.sx(L.wx + 1) - X), a = clamp(1 - (L.t - P.poolWindow), .25, 1);
      G.ellipse(X, Y, P.poolRadius * ppm, 1.2 * ppm).stroke({ color: yt.cyan, width: 2, alpha: .55 * a });
      G.moveTo(X - .9 * ppm, Y - 2.6 * ppm).lineTo(X, Y - 1.6 * ppm).lineTo(X + .9 * ppm, Y - 2.6 * ppm).stroke({ color: yt.cyan, width: 2, alpha: .7 * a });
    }
  }

  return { PROFILE, on, profile, landing, place, resolve, after, draw };
})();
{const obq0=Obq;Obq=function(r,t,q){if(Space.on(r)&&t?.kind==='air')return Space.place(r,t,q);return obq0(r,t,q)}}
{const obs0=Obs;Obs=function(r,t,i){if(!Space.on(r)||t?.kind!=='air')return obs0(r,t,i);Space.resolve(r,t,i);return Obs0(r,t,i)}}
{const me0=ME;ME=function(r,t,e,i){me0(r,t,e,i);if(Space.on(r)&&t?.kind==='air'&&i>0)Space.after(r,t,i)}}
{const pz0=Pz;Pz=function(r,t,E){E.pool=null;return pz0(r,t,E)}}  // a pool enemy that becomes a pursuer stops holding
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&m?.kind==='air'&&Space.on(r))Space.draw(R,r,m)}}

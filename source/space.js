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
    } else ({ x, y } = ahead(r, m));
    // Ospw keeps an enemy c + 4 m above the water; s sets its first velocity (-s × speed), toward the dolphin
    const c = pool ? 1.5 : 1.5 + ce(r) * 5.5, s = x >= me.x ? 1 : -1;
    (r.warns || (r.warns = [])).push({ k: q[0], x, y, s, c, t: P.telegraph, t0: P.telegraph, pool });
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
    const G = R.telegraphs, o = demoSeen(m), P = profile(r), pulse = .5 + .5 * Math.sin(R.time * 14);
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

  // At the breach, enemies returning from beyond the screen's side edges come back just inside them. Not while waiting
  // enemies hover in view under water (DEMO.tune.hover): the water view can be wider than the arena, so that moved
  // enemies you could see by up to 31 m in a step (rapid short hops, 2026-11-01); they keep their place and fly in.
  function recall(r, returned) {
    const m = r.medium;
    if (m?.kind !== 'air' || !returned.length) return;
    if (DEMO.tune.hover && DEMO.tune.hold) {
      // they were carried with the camera: their speed was their wander plus the camera's. Jq took the arena's speed off
      // the wander alone, so at 110 m/s they flew back across the screen (about 8 m in 0.12 s); keeping only the wander
      // as their speed in the arena (2026-11-01) made them jump up the screen at the breach once the camera carried its
      // own speed through it (2026-11-02: from about 4 to 11 px a frame at 30 m/s). With the camera's last step added
      // they keep their speed on the screen through the breach.
      const mv = typeof Camera !== 'undefined' && Camera.on() && Camera.moved, cv = mv ? { x: mv.x / Ar, y: mv.y / Ar } : { x: m.vx, y: m.vy };
      for (const e of returned) {
        e.velocity = { x: e.velocity.x + cv.x, y: e.velocity.y + cv.y };
        if (Math.abs(e.pos.x) > Ovv(r).w) e.velocity = { x: -Math.sign(e.pos.x) * 18 * Osp.spd, y: 0 };
      }
      return;
    }
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
// while you swim (the stand-in frame, t.wet) every spawn is marked in view: an edge spawn's marker waited off-screen
// and the enemy became a held pursuer at once, so it never flew in from the edge as it does in the air
{const obq0=Obq;Obq=function(r,t,q){if(Space.on(r)&&t?.kind==='air'&&(t.wet||!Space.edge(r)))return Space.place(r,t,q);return obq0(r,t,q)}}
{const obs0=Obs;Obs=function(r,t,i){if(!Space.on(r)||t?.kind!=='air')return obs0(r,t,i);Space.resolve(r,t,i);return Obs0(r,t,i)}}
{const me0=ME;ME=function(r,t,e,i){me0(r,t,e,i);if(Space.on(r)&&t?.kind==='air'&&i>0)Space.after(r,t,i)}}
{const zq0=Zq;Zq=function(r){const n=r.enemies.length;zq0(r);if(Space.on(r))Space.recall(r,r.enemies.slice(n))}}  // pursuers return at the breach
{const pz0=Pz;Pz=function(r,t,E){E.pool=null;const o=pz0(r,t,E),p=r.pursuers?.at(-1);if(p&&p.e===E){p.wvx=t.vx+E.velocity.x;p.wvy=t.vy+E.velocity.y}return o}}  // a pool enemy that becomes a pursuer stops holding; it swims on at the speed it had (Space.WET_ACCEL)
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&m?.kind==='air'&&Space.on(r))Space.draw(R,r,m)}}
// While the dolphin is under water, v3 flies each pursuer still above the water straight on in the direction it faced
// at the splash, never turning toward the dolphin, so after a carve turns the dolphin round they leave the arena (bot,
// 2026-10-27: 23% of them off-screen, up to 98 m away). With DEMO.tune.hold they instead hold a point above the water
// ahead of the dolphin, on the side it is moving toward and inside the view (8-26 m ahead, 5-12 m up, lower when a deep
// dive brings the view's top edge down, never under 1.5 m), easing in as they arrive.
// Touching one gives no kill (the demo has no touch kills in the water). Pursuers that went under, and lurkers, keep
// v3's step; only the pursuers above the water when the step begins are held, so none is stepped twice.
// With DEMO.tune.holdlevel (designer, 2026-11-01: looping under water holding D, "the enemies also dive down at the water
// as if they are following the dolphin's Y"): each half loop reversed the dolphin's sideways direction, so every held
// enemy turned round for the other side and, turning slowly, swooped down to the waterline (up to 11 of 20 at once).
// Now the side comes from the dolphin's sideways travel averaged over about 2.5 s (and a side change needs a clear drift), so looping in place keeps it, and an
// enemy stays level while it moves: never more than 2 m below its own holding height or 3 m above it (it can still
// climb or come down to it); at wave 15 the enemies, as fast as the dolphin, otherwise swirled up to 30 m.
Space.holdAbove = function (r, held, dt) {
  const m = r.medium, d = m.pos, v = m.velocity, Cw = Ocs(r.wave), V = Ovv(r), level = !!DEMO.tune.holdlevel;
  r.holdVx = (r.holdVx ?? v.x) + (v.x - (r.holdVx ?? v.x)) * (1 - Math.exp(-dt / 2.5));
  const vx = level ? r.holdVx : v.x;
  for (const p of held) {
    p.px = p.x; p.py = p.y; p.age += dt; p.lurk = false;
    const Fd = Math.abs(vx) > (level ? Math.max(6, Cw * .25) : Math.max(3, Cw * .12)) ? Math.sign(vx) : p.fd || Math.sign(vx) || 1;
    p.fd = Fd;
    const w = 3.2 * p.tr, top = Math.max(Cw * 1.05 * Osp.spd, (p.kind === 'swarmer' ? 25 * Osp.small : 19 + r.wave * .13) * Osp.spd * p.sp);
    const tx = d.x + Fd * (8 + (p.seed * 7.3 % 1) * 18), ty = Math.max(1.5, Math.min(5 + (p.seed * 3.1 % 1) * 7, V.y + V.h - 3));
    const a = tx - p.x, b = ty - p.y, dist = Math.hypot(a, b);
    let c = Math.atan2(b, a) - p.h; c = Math.atan2(Math.sin(c), Math.cos(c));
    p.h += Math.max(-w * dt, Math.min(w * dt, c));
    p.v += (Math.min(top, 2 + 2.5 * dist) - p.v) * Xe(dt, .35);
    p.x += Math.cos(p.h) * p.v * dt; p.y = Math.max(1, p.y + Math.sin(p.h) * p.v * dt);
    if (level) p.y = Math.min(Math.max(p.y, Math.min(p.py, ty - 2)), Math.max(p.py, ty + 3));   // level while it moves
  }
};
{const pq0=Pq;Pq=function(r,e){
  if(!DEMO.tune.hold||!r?.demo||r.medium?.kind!=='water'||!(e>0)||!r.pursuers?.length)return pq0(r,e);
  const dry=r.pursuers.filter(p=>!p.wet&&!p.lurk);r.pursuers=r.pursuers.filter(p=>p.wet||p.lurk);
  pq0(r,e);r.pursuers=(r.pursuers||[]).concat(dry);Space.holdAbove(r,dry,e);
  // v3's shock rings still push the held pursuers (a zero step: the rings don't grow twice, and each hits once)
  if(typeof Orshock==='function'){const keep=r.pursuers;r.pursuers=keep.filter(p=>dry.includes(p));Orshock(r,0);r.pursuers=keep}}}
// Spawning goes on while the dolphin swims (designer, 2026-10-27; DEMO.tune.wetspawn). v3's wave schedule only advances
// in the air step, so a water stay paused it. Here it advances during water stays too, once the wave's first launch has
// started it (the air clock still pauses), at its usual rate. There is no arena under water, so the schedule runs
// against a still stand-in frame fixed where this stay began (r.wetFrame: origin on the water line, moving the way the
// dolphin swims so step 1's markers lean ahead of it); each enemy appears behind its marker above the water in view
// and at once becomes a pursuer held ahead of the dolphin (holdAbove), joining the arena at the next launch.
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
// Designer, 2026-11-01: "enemies need to avoid the dolphin when they are both in the water, right now they just swim
// into it"; and "make enemy air placement predictable when the dolphin is turning in the water ... they are very fast
// and erratic when the dolphin is in the water planning a trajectory".
// - DEMO.tune.wetavoid: an enemy under the water (a wet pursuer; v3 makes it flee, but as fast as the dolphin and
//   turning slowly, so the dolphin still ran into it, 1.5-1.8% of the time) that is near where the dolphin will be over
//   the next 0.3 s moves sideways off that path, and none comes closer than 2.5 m.
// - DEMO.tune.hover: the enemies waiting above the water keep their place on the screen while you swim, instead of
//   chasing a point ahead of you (at 29-47 m/s, median), so you can line a breach up on them. Each has a home where it
//   was on the screen at the splash, carried along as the camera moves (homes fixed in the world were left behind:
//   swimming one way, 63-94% bunched at the screen's trailing edge, designer: "not the outcome I wanted"); homes
//   closer than 8 m drift apart, so a crowd from the splash fans out, at its own height 15-25 m up (designer: 5-12 m, then 10-18 m, were too close to the water), and
//   wanders about it as if it had lost sight of you: about 6 m/s (designer: 3 was too slow), easing its speed up and
//   down, turning at most 4 rad/s toward a new point within 9 m every 1-3 s, with a slight bob. Away from its home
//   (more than 11 m, beyond where it wanders, or more than 5 m below its height: from the splash, or pushed) it flies straight there at 8-25 m/s; eased from rest and turning slowly
//   from its fall it first dipped to the water and stayed low (half under 6 m for the first second, designer:
//   "stuck close to the water"). The view's edge pushes its home (and it) along when it reaches them.
Space.avoidWet = function (r, dt) {
  const m = r.medium, me = m.pos, v = m.velocity, AHEAD = .3, CLEAR = 6, KEEP = 2.5;
  for (const p of r.pursuers || []) {
    if (!(p.wet || p.y < 0)) continue;
    // the nearest point on the dolphin's path over the next AHEAD s
    const ex = v.x * AHEAD, ey = v.y * AHEAD, L = ex * ex + ey * ey || 1, k = Math.max(0, Math.min(1, ((p.x - me.x) * ex + (p.y - me.y) * ey) / L));
    const cx = me.x + ex * k, cy = me.y + ey * k, dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || .01, R = (p.radius || 1) + CLEAR;
    if (d < R) {   // step sideways off the path, as fast as it swims
      // within its own speed this step, with what it has already swum (on top of a flee at your speed it went 150 m/s)
      const s = Math.max(10, p.v || 0) * dt, moved = p.px == null ? 0 : Math.hypot(p.x - p.px, p.y - p.py), push = Math.min(R - d, Math.max(.25 * s, s - moved));
      p.x += dx / d * push; p.y = Math.min(-.3, p.y + dy / d * push); p.h = Math.atan2(dy, dx);
    }
    const n = Math.hypot(p.x - me.x, p.y - me.y) || .01, keep = (p.radius || 1) + KEEP;
    // out to the keep distance at most at your speed + 10 m/s a step: enemies touching you at the splash were moved 2-3 m
    // in one step (rapid short hops, 2026-11-01); you still never gain on one
    if (n < keep) { const out = Math.min(keep - n, (Math.hypot(v.x, v.y) + 10) * dt) + n; p.x = me.x + (p.x - me.x) / n * out; p.y = Math.min(-.3, me.y + (p.y - me.y) / n * out) }
  }
};
Space.hover = function (r, held, dt) {
  // the margin from the view's sides: 22% of it, at least 6 m (a fixed 6 m let 15-22% sit at the edges once the water
  // view zoomed out less, 2026-11-01)
  const V = Ovv(r), M = Math.max(6, .22 * V.w), top = V.y + V.h - 3, x0 = V.x - V.w + M, x1 = V.x + V.w - M;
  const clampX = x => Math.max(x0, Math.min(x1, x)), clampY = y => Math.max(3, Math.min(top, y));
  // the camera's sideways move this step carries every waiting enemy, its home and its wander point (a fresh start after
  // a flight: no carry on a stay's first step)
  // only from the step before: "within 0.1 s" carried the camera's whole move over a flight shorter than that (skimming at
  // 110 m/s, up to 12 m), shifting every waiting enemy at the splash (2026-11-01)
  const C = r.hoverCam, dx = C && r.time - C.t <= dt * 1.5 ? V.x - C.x : 0; r.hoverCam = { x: V.x, t: r.time };
  // homes closer than 8 m drift apart (at most 4 m/s), so a crowd from the splash fans out across the screen
  for (let i = 0; i < held.length; i++) for (let j = i + 1; j < held.length; j++) {
    const A = held[i].home, B = held[j].home; if (!A || !B) continue;
    const ex = B.x - A.x, ey = (B.y - A.y) * .5, d = Math.hypot(ex, ey); if (d >= 8) continue;
    const u = d > .01 ? ex / d : (i % 2 ? 1 : -1), k = Math.min(4 * dt, (8 - d) / 2);
    A.x -= u * k; B.x += u * k;
  }
  for (const p of held) {
    // the step's start (drawn between it and the end): before the carry, so the carry is drawn smoothly too (set after it,
    // the renderer drew the carry in jumps of a step, up to 1 m at 120 m/s, and swimming fast they jittered)
    p.px = p.x; p.py = p.y; p.age += dt; p.lurk = false;
    if (dx) { p.x += dx; if (p.home) p.home.x += dx; if (p.wp) p.wp.x += dx }
    // its home: where it was at the splash, at its own height (10-18 m); the view's edge pushes the home along
    const own = 15 + (p.seed * 3.1 % 1) * 10;
    if (!p.home) { p.home = { x: p.x, y: own }; p.h = Math.atan2(own - p.y, 0); p.wv = 0 }   // facing its place, not its fall
    p.home.x = clampX(p.home.x); p.home.y = clampY(own);
    // wandering: a new point near home every 1-3 s, or on reaching it
    p.wt = (p.wt ?? 0) - dt;
    if (!p.wp || p.wt <= 0 || Math.hypot(p.wp.x - p.x, p.wp.y - p.y) < 1) {
      p.wp = { x: p.home.x + (ce(r) * 2 - 1) * 9, y: p.home.y + (ce(r) * 2 - 1) * 4 }; p.wt = 1 + ce(r) * 2;
    }
    const far = Math.hypot(p.home.x - p.x, p.home.y - p.y), out = p.x < x0 || p.x > x1;
    if (far > 11 || p.y < p.home.y - 5 || p.y < 2) {   // getting to its place (beyond its wander, below it, or just out of the water under 2 m): straight there, no easing or turning limit
      const s = Math.min(25, 8 + far), hx = p.home.x - p.x, hy = p.home.y - p.y, n = far || 1, step = Math.min(far, s * dt);
      // the 2 m floor stops a sink; one just out of the water rises from where it is (lifting it to 2 m popped it 2 m in a step)
      p.x += hx / n * step; p.y = Math.max(Math.min(2, p.y), p.y + hy / n * step); p.h = Math.atan2(hy, hx); p.v = p.wv = s; p.wp = null;
      continue;
    }
    const tx = clampX(p.wp.x), ty = clampY(p.wp.y), a = tx - p.x, b = ty - p.y;
    // a slow wander; faster while it settles from the splash (far from home) or the edge carries it
    const sp = out ? 12 : far > 10 ? Math.min(20, 7 + far * .5) : 6 * (.75 + .5 * (p.seed * 5.3 % 1));
    let c = Math.atan2(b, a) - (p.h ?? 0); c = Math.atan2(Math.sin(c), Math.cos(c));
    p.h = (p.h ?? 0) + Math.max(-4 * dt, Math.min(4 * dt, c));   // turning at most 4 rad/s: curved paths
    const want = Math.min(sp, Math.hypot(a, b) * 2 + 1), v = (p.wv ?? 0) + (want - (p.wv ?? 0)) * (1 - Math.exp(-dt / (out ? .05 : .4)));   // speed eases (from rest at the splash)
    const bob = Math.sin(p.age * 1.7 + p.seed * 9) * .8;   // m/s, a slight bob
    p.x += Math.cos(p.h) * v * dt; p.y = Math.max(Math.min(2, p.y), p.y + (Math.sin(p.h) * v + bob) * dt);
    // the edge brings it back on screen at up to 12 m/s (pulled in at 10/s, one surfacing or spawning near the edge lunged
    // in at about 100 m/s, then slowed: a kick; 2026-11-01)
    if (out) { const g = clampX(p.x) - p.x; p.x += Math.sign(g) * Math.min(Math.abs(g), 12 * dt) }
    p.v = p.wv = v;
  }
};
{const pq3=Pq;Pq=function(r,e){
  const water=r?.demo&&r.medium?.kind==='water'&&e>0;
  if(water&&DEMO.tune.hover&&DEMO.tune.hold&&r.pursuers?.length){
    // the held ones hover; the rest (under the water, lurking) take the steps before (v3's, then the hold's)
    const held=r.pursuers.filter(p=>!p.wet&&!p.lurk);r.pursuers=r.pursuers.filter(p=>p.wet||p.lurk);
    const o=pq3(r,e);r.pursuers=held.concat(r.pursuers||[]);Space.hover(r,held,e);   // the held first, so newly spawned ones stay last
    if(DEMO.tune.wetavoid)Space.avoidWet(r,e);return o}
  const o=pq3(r,e);if(water&&DEMO.tune.wetavoid)Space.avoidWet(r,e);return o}}
// Under the water an enemy's speed (its own swimming and its step out of your way, together) changes at most
// Space.WET_ACCEL m/s² (camera rules R4, designer 2026-11-03: "the enemies cannot jump around on screen"). v3 turned an
// enemy round in one step: diving in with you at 96 m/s it swam back at 112 m/s the next step, and one beside you was
// shoved aside at your speed + 10 m/s at once (60-100 px a frame on the screen at 100 m/s). Now a full reversal takes
// about 0.13 s. It keeps the cap for SURFACE s after it comes out of the water (v3 handed a surfacing enemy to the
// hover at once: fleeing at 78 m/s it moved off the other way at the camera's 62 the next step). Pushed or hit, it
// moves as it is pushed. Otherwise, above the water and in the air, nothing is capped.
Space.WET_ACCEL = 1500; Space.SURFACE = .3;
{const pq5=Pq;Pq=function(r,e){
  if(!(r?.demo&&e>0&&r.pursuers?.length))return pq5(r,e);
  const before=new Map();for(const p of r.pursuers)if(p.wet||r.time-(p.surfT??-9)<Space.SURFACE)before.set(p,[p.x,p.y,p.e?.hp,p.wet]);
  const o=pq5(r,e),A=Space.WET_ACCEL*e;
  for(const p of r.pursuers||[]){const b=before.get(p);if(!b)continue;
    if(b[3]&&!p.wet)p.surfT=r.time;
    if(!p.wet&&!(r.time-p.surfT<Space.SURFACE))continue;
    if(p.wvx==null){p.wvx=Math.cos(p.h||0)*(p.v||0);p.wvy=Math.sin(p.h||0)*(p.v||0)}
    let vx=(p.x-b[0])/e,vy=(p.y-b[1])/e;
    if(!(p.kx||p.ky||(p.e&&p.e.hp<b[2]))){const dx=vx-p.wvx,dy=vy-p.wvy,d=Math.hypot(dx,dy);
      if(d>A){vx=p.wvx+dx*A/d;vy=p.wvy+dy*A/d;p.x=b[0]+vx*e;p.y=p.wet?Math.min(-.3,b[1]+vy*e):b[1]+vy*e}}
    // (a splash's or a breach's sliver of a step does not set it: over 2 ms the surface's hold read as hundreds of m/s)
    if(e>Ar/4){p.wvx=vx;p.wvy=p.wet&&p.y>=-.3?Math.min(vy,0):vy}}
  return o}}

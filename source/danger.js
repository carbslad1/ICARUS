// Step 2 of the build-and-playtest plan (ICARUS_DESIGN.md §4.18, §4.20): danger.
// - Aimed shots lead: a turret's shot (and the elite's, see below) aims part of the way from where the dolphin is to
//   where it will be when the shot arrives, if it keeps its current movement in the frame. Holding a line is punished;
//   changing direction dodges. The share is DEMO.tune.lead (0.5 by default: halfway; 0 is v3's aim at the dolphin).
// - Elites (the one tough enemy a boss wave sends) that are not turrets fire a slow leading shot too.
// - Mines on the arc: a few times a flight a mine is placed ahead on the dolphin's predicted world path (the arena
//   origin's ballistic arc plus the dolphin's place in the frame) behind a marker. It holds still in the world, so it
//   scrolls toward you as you fly; touching it is one hit. Mines go at the splashdown.
// The bosses' ring shots stay as they are. The profile lives on the run (r.danger) so later items can change it.
// DEMO.tune.danger 0 keeps v3's aim and no mines. All randomness comes from the run's seeded generator (ce).
var Danger = (() => {
  const PROFILE = Object.freeze({
    eliteSpeed: 14,         // m/s of the elite's shot (turrets keep v3's 17)
    eliteEvery: 2,          // s between an elite's shots
    mineAhead: [1.5, 2.5],  // s ahead on the predicted path a mine is placed, shortened to keep the marker in view
    mineMinAhead: .8,       // s: no mine closer than this on the path
    mineTelegraph: .8,      // s a mine's marker shows before it is live
    mineRadius: 1.2,        // m: touching within this (plus the dolphin's 1 m) is a hit
    mineFirst: .4,          // s into the flight before the first mine can be placed
    mineGap: 1.2,           // s between mines on one flight
    margin: 3               // m kept inside the view's edge by a mine's marker
  });
  const on = r => !!(DEMO.tune.danger && r?.demo);
  const profile = r => r.danger || (r.danger = { ...PROFILE, mineAhead: [...PROFILE.mineAhead] });
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  // per-run counts for the bot and tests: mines placed, mine hits that cost HP
  const count = r => r.dangerCount || (r.dangerCount = { mines: 0, mineHits: 0 });

  // The direction from p to where the dolphin will be, partway, when a shot at this speed gets there.
  function leadDir(m, p, speed) {
    const k = DEMO.tune.lead, me = m.local, v = m.velocity || { x: 0, y: 0 };
    let t = Math.hypot(me.x - p.x, me.y - p.y) / speed;
    for (let i = 0; i < 2; i++) t = Math.hypot(me.x + v.x * t - p.x, me.y + v.y * t - p.y) / speed;
    return { x: me.x + v.x * t * k - p.x, y: me.y + v.y * t * k - p.y };
  }

  // Where the dolphin will be in the world t seconds on, if the arc carries on and it keeps its place in the frame.
  function predict(r, m, t) {
    const g = -15 * Math.max(.4, 1 - .025 * (r.demo.stats.Hang || 0));
    return { x: m.origin.x + m.local.x + m.vx * t, y: m.origin.y + m.local.y + m.vy * t + .5 * g * t * t };
  }

  // A mine ahead on the predicted path: the furthest time in the profile's range whose point is in the view, if any.
  function placeMine(r, m) {
    const P = profile(r), V = Ovv(r), cx = V.x, cy = V.y;
    const t0 = P.mineAhead[0] + ce(r) * (P.mineAhead[1] - P.mineAhead[0]);
    for (let t = t0; t >= P.mineMinAhead; t -= .1) {
      const w = predict(r, m, t);
      if (w.y < 2) continue;
      if (Math.abs(w.x - cx) <= V.w - P.margin && Math.abs(w.y - cy) <= V.h - P.margin) {
        (r.mines || (r.mines = [])).push({ id: ++r.id, wx: w.x, wy: w.y, t: P.mineTelegraph, t0: P.mineTelegraph });
        count(r).mines++;
        return true;
      }
    }
    return false;
  }

  // After v3's enemy step: elite shots, mine placement, arming and contact.
  function after(r, m, dt) {
    const P = profile(r), me = m.local;
    for (const e of r.enemies) {
      if (e.boss !== 'elite' || e.kind === 'turret' || e.hp <= 0) continue;
      e.dshot = (e.dshot ?? P.eliteEvery) - dt;
      if (e.dshot <= 0 && !r.armed) { e.dshot = P.eliteEvery; CE(r, e, leadDir(m, e.pos, P.eliteSpeed), P.eliteSpeed) }
    }
    const n = Math.round(DEMO.tune.mines);
    r.mineFlight = r.mineFlight || { placed: 0, next: P.mineFirst };
    const F = r.mineFlight;
    if (F.placed < n && m.elapsed >= F.next && m.vy > -40 && !r.armed) {
      if (placeMine(r, m)) { F.placed++; F.next = m.elapsed + P.mineGap } else F.next = m.elapsed + .2;
    }
    if (!r.mines?.length) return;
    const keep = [];
    for (const k of r.mines) {
      if (k.t > 0) k.t -= dt;
      const lx = k.wx - m.origin.x, ly = k.wy - m.origin.y;
      if (k.t <= 0 && Math.hypot(lx - me.x, ly - me.y) < P.mineRadius + 1) {
        const hp = r.hp; rw(r, 9 + Math.floor(r.wave / 5)); if (r.hp < hp) count(r).mineHits++;
        r.events.push({ kind: 'hit', pos: { x: k.wx, y: k.wy } });
        continue;
      }
      if (Math.abs(lx) > 110 || Math.abs(ly) > 100) continue;
      keep.push(k);
    }
    r.mines = keep;
  }

  // At the splashdown the flight's mines and its count go.
  function land(r) { r.mines = []; r.mineFlight = null }

  // Mines and their markers, drawn on the renderer's telegraph layer each frame.
  function draw(R, r, m) {
    const G = R.telegraphs, P = profile(r), pulse = .5 + .5 * Math.sin(R.time * 10);
    for (const k of r.mines || []) {
      const X = R.sx(k.wx), Y = R.sy(k.wy), ppm = Math.abs(R.sx(k.wx + 1) - X), s = P.mineRadius * ppm;
      if (k.t > 0) {
        const a = 1 - clamp(k.t / k.t0, 0, 1);
        G.circle(X, Y, s * (2.2 - a)).stroke({ color: yt.amber, width: 2, alpha: .35 + .5 * a });
        continue;
      }
      G.circle(X, Y, s).fill({ color: yt.hostile, alpha: .55 + .3 * pulse }).stroke({ color: yt.amber, width: 2, alpha: .9 });
      for (let j = 0; j < 6; j++) { const a = j * Math.PI / 3; G.moveTo(X + Math.cos(a) * s, Y + Math.sin(a) * s).lineTo(X + Math.cos(a) * s * 1.5, Y + Math.sin(a) * s * 1.5).stroke({ color: yt.amber, width: 2, alpha: .9 }) }
    }
  }

  return { PROFILE, on, profile, leadDir, predict, placeMine, after, land, draw };
})();
// v3's aimed fire (CE) from a turret: its direction becomes the lead; the bosses' rings and other callers are left alone
{const ce0=CE;CE=function(r,t,e,i){const m=r.medium;if(Danger.on(r)&&m?.kind==='air'&&t?.kind==='turret'&&t.boss!=='boss'&&t.role!=='boss')e=Danger.leadDir(m,t.pos,i);return ce0(r,t,e,i)}}
{const me0=ME;ME=function(r,t,e,i){me0(r,t,e,i);if(Danger.on(r)&&t?.kind==='air'&&i>0)Danger.after(r,t,i)}}
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&m?.kind==='air'&&Danger.on(r))Danger.draw(R,r,m)}}

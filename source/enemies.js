// Enemy movement on the stage, from docs/ENEMY_RULES.md section 3 (designer, 2026-11-07). Combat happens on the screen
// rectangle, the same size at every speed and zoom; the dolphin's world speed never enters this file.
// - S1: after each step every enemy is carried by what the camera did (carry), so one that does not steer stays put on
//   the screen. Guns, tricks and drawing keep reading enemies where they always did: e.pos in the arena, p.x under the
//   water. Those are only where the stage puts them.
// - S2: enemies steer in stage metres at v3's speeds. Velocity (e.velocity, or p.sv for a pursuer) is stage velocity.
// - S3: Brotato's base-game roles. S4: each stays above the water at its own height. S6: they push apart.
// All randomness comes from the run's seeded generator (ce).
var Enemies = (() => {
  const PX = 34.2 / 450;                    // metres per Brotato pixel: its player's 450 px/s against the dolphin's 34.2 m/s
  const P = Object.freeze({
    TAU: .24,          // S2: s over which velocity eases toward the wanted one (v3's for chasers)
    ARRIVE: 4,         // S2: m from its target at which an enemy starts to slow
    EDGE: 3,           // S3: m its targets stay inside the stage's edge
    SKY: [8, 20],      // S4: m over the water line of its own height, by its seed
    SKY_X: 30,         // S4: m it moves to its own side of you at most, by its seed, once you are below its height
    CAP: 6,            // S4: m of the stage's top its height spreads over when the water is high on the screen
    GAP: 1,            // S6: m between two enemies' edges below which they push apart
    PUSH: 1,           // S6: push apart at most this share of top speed, at full overlap
    KEEP_OFF: 4,       // S6: m you count for as a neighbour under the water
    ROLES: Object.freeze({   // S3, Brotato's distances scaled to the dolphin
      keep: { range: 300 * PX, spread: 100 * PX },     // Spitter: keeps its range
      around: { range: 150 * PX, spread: 50 * PX },    // Fly: random points around you
      offset: { range: 300 * PX },                      // Slasher: its own offset from you
      elite: { range: 300 * PX, spread: 100 * PX }     // Gargoyle: random points around you, further out
    }),
    CHARGE: Object.freeze({ wind: .65, dash: .6, rest: 1.3, speed: 48, approach: 10 })   // v3's charger, in its own numbers
  });
  const YOU = { id: -1, radius: P.KEEP_OFF };
  const unit = (x, y) => { const n = Math.hypot(x, y); return n > 1e-9 ? { x: x / n, y: y / n, n } : { x: 0, y: 0, n: 0 } };
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const hash = (seed, k) => { const q = Math.sin((seed || 0) * k) * 43758.5453; return q - Math.floor(q) };

  // the stage now: world metres per stage metre (k), its half size, the water line and you on it. k is the drawn zoom:
  // the renderer eases the view's zoom (.06 s out, .2 s in), and enemies held to the view it was going to would pulse.
  const scale = r => r.stageAt?.k ?? Ovv(r).h / (Jt.height / 2);
  function stage(r) {
    const V = Ovv(r), k = scale(r), me = he(r);
    return { V, k, hw: V.w / k, hh: Jt.height / 2, line: -V.y / k, me: { x: (me.x - V.x) / k, y: (me.y - V.y) / k } };
  }

  // S3: an enemy's role, fixed when first seen. With the Brotato roles off (DEMO.tune.moves 0) every enemy chases.
  function role(r, e) {
    if (e.mv) return e.mv.role;
    if (e.mv === null) return 'chase';   // set by a caller (a test) that wants no role
    let k = 'chase';
    if (DEMO.tune.moves) {
      if (e.boss === 'elite') k = e.kind === 'charger' ? 'charge' : 'elite';
      else k = { turret: 'keep', drifter: 'around', splitter: 'offset', charger: 'charge' }[e.kind] || 'chase';
    } else if (e.kind === 'charger') k = 'charge';
    const R = P.ROLES[k];
    e.mv = { role: k, range: R ? R.range + (R.spread ? (ce(r) * 2 - 1) * R.spread : 0) : 0 };
    if (k === 'offset') e.mv.off = { x: (ce(r) * 2 - 1) * R.range, y: (ce(r) * 2 - 1) * R.range };
    return k;
  }

  const own = (r, e) => (e.kind === 'swarmer' ? 25 * Osp.small : 19 + r.wave * .13) * Osp.spd * FiveCombat.movementScale(r, e);

  // S4: the lowest its targets go on the stage
  function floorOf(e, f) {
    const lift = P.SKY[0] + hash(e.seed, 311.7) * (P.SKY[1] - P.SKY[0]);
    return { lift, y: Math.min(f.line + lift, f.hh - P.EDGE - hash(e.seed, 74.7) * P.CAP) };
  }

  // S3, S4: where it is going, on the stage
  function target(r, e, k, pos, f) {
    const F = floorOf(e, f), low = F.y - f.me.y;
    // you, or below its height the point above you, moved to its own side as you go deeper
    const me = low > 0 ? { x: f.me.x + (hash(e.seed, 127.1) * 2 - 1) * P.SKY_X * Math.min(1, low / F.lift), y: F.y } : f.me;
    let t;
    if (k === 'keep') { const u = unit(pos.x - me.x, pos.y - me.y); t = { x: me.x + (u.n ? u.x : 1) * e.mv.range, y: me.y + (u.n ? u.y : 0) * e.mv.range } }
    else if (k === 'offset') t = { x: me.x + e.mv.off.x, y: me.y + e.mv.off.y };
    else if (k === 'around' || k === 'elite') {
      const pt = e.mv.pt;
      if (!pt || Math.hypot(me.x + pt.x - pos.x, me.y + pt.y - pos.y) < 1.5) {   // a new point around you on arrival
        const a = ce(r) * Math.PI * 2, R = P.ROLES[k], d = R.range + (ce(r) * 2 - 1) * R.spread;
        e.mv.pt = { x: Math.cos(a) * d, y: Math.sin(a) * d };
      }
      t = { x: me.x + e.mv.pt.x, y: me.y + e.mv.pt.y };
    } else if (low <= 0) return { x: me.x, y: me.y };   // chasing you: right up to you, wherever you are on the stage
    else t = { x: me.x, y: me.y };
    return { x: clamp(t.x, -f.hw + P.EDGE, f.hw - P.EDGE), y: clamp(Math.max(t.y, F.y), -f.hh + P.EDGE, f.hh - P.EDGE) };
  }

  // S6: push apart from neighbours closer than both radii + GAP; `list` holds [enemy, x, y] on the stage
  function apart(list, i, top) {
    const [e, x, y] = list[i];
    let px = 0, py = 0;
    for (let j = 0; j < list.length; j++) {
      if (j === i) continue;
      const [g, gx, gy] = list[j], R = (e.radius || 1) + (g.radius || 1) + P.GAP, dx = x - gx, dy = y - gy, d = Math.hypot(dx, dy);
      if (d >= R) continue;
      const k = Math.min(1, (R - d) / P.GAP), u = d > 1e-6 ? { x: dx / d, y: dy / d } : { x: e.id > g.id ? 1 : -1, y: 0 };
      px += u.x * k; py += u.y * k;
    }
    const n = Math.min(1, Math.hypot(px, py)) * P.PUSH * top, u = unit(px, py);
    return { x: u.x * n, y: u.y * n };
  }

  // S2, S6: one step of velocity toward t at up to top; the nearer it is to touching, the more it makes room
  function steer(v, pos, t, top, push, dt) {
    const u = unit(t.x - pos.x, t.y - pos.y), s = top * Math.min(1, u.n / P.ARRIVE), q = top > 0 ? Math.min(1, Math.hypot(push.x, push.y) / top) : 0;
    const wx = u.x * s * (1 - q) + push.x, wy = u.y * s * (1 - q) + push.y, k = 1 - Math.exp(-dt / P.TAU);
    return { x: v.x + (wx - v.x) * k, y: v.y + (wy - v.y) * k };
  }

  // tricks that hold, drive or knock an enemy move it themselves
  const trickHeld = e => e && (e.heldT > 0 || e.driveT > 0 || e.knockT > 0);

  // In flight: one arena enemy's step, in place of v3's steering block in ME (t: the arena, s: the enemy, o: the vector
  // to you, i: the step). ME then moves it by its velocity.
  function air(r, t, s, o, i) {
    const k = role(r, s);
    if (s.kind === 'turret' && s.timer <= 0) { CE(r, s, o, 17); s.timer = 2.3 }
    if (trickHeld(s) || s.st?.frozen > 0) return;
    if (k === 'charge' && charge(r, s, o, i)) return;
    const f = stage(r), at = e => ({ x: (t.origin.x + e.pos.x - f.V.x) / f.k, y: (t.origin.y + e.pos.y - f.V.y) / f.k }), pos = at(s);
    // the arena's enemies where they stood at the start of this step (made once a step)
    if (r.apartT !== r.time || r.apartN !== r.enemies.length) { r.apartT = r.time; r.apartN = r.enemies.length; r.apartL = r.enemies.map(e => { const q = at(e); return [e, q.x, q.y] }); r.apartI = new Map(r.apartL.map((x, j) => [x[0], j])) }
    const top = k === 'charge' ? P.CHARGE.approach * Osp.spd * FiveCombat.movementScale(r, s) : own(r, s), j = r.apartI.get(s);
    s.velocity = steer(s.velocity, pos, target(r, s, k === 'charge' ? 'chase' : k, pos, f), top, j == null ? { x: 0, y: 0 } : apart(r.apartL, j, top), i);
  }

  // S3 Charge, v3's: wind up (slowing to a stop), dash at its own speed toward where you were, rest, then approach.
  // The dash is the one move that is not eased. Returns true while it winds up or dashes.
  function charge(r, s, o, i) {
    const C = P.CHARGE, n = Math.max(.1, Math.hypot(o.x, o.y)), W = s.velocity;
    if (s.timer <= 0 && s.charge === 0) { s.charge = C.wind; s.aim = { x: o.x / n, y: o.y / n } }
    if (s.charge > 0) {
      s.charge -= i; const q = Math.exp(-i * 9); W.x *= q; W.y *= q;
      if (s.charge <= 0) { s.charge = -C.dash; const v = C.speed * Osp.spd * FiveCombat.movementScale(r, s); s.velocity = { x: s.aim.x * v, y: s.aim.y * v } }
      return true;
    }
    if (s.charge < 0) { s.charge += i; if (s.charge >= 0) { s.charge = 0; s.timer = C.rest } return true }
    return false;
  }

  // While you swim: the pursuers' step, in place of v3's Orpq0. A pursuer is the same enemy with its position in world
  // metres, for the code that reads it there. Lurkers (v3's) keep to their own point.
  function pursuers(r, dt) {
    if (!r.pursuers?.length) return;
    const m = r.medium, swim = m.kind === 'water', f = stage(r), { V, k } = f, me = he(r), floor = Oseabed(r), keep = [];
    const list = r.pursuers.map(p => [p, (p.x - V.x) / k, (p.y - V.y) / k]);
    if (swim) list.push([YOU, f.me.x, f.me.y]);
    for (let i = 0; i < r.pursuers.length; i++) {
      const p = r.pursuers[i], e = p.e || p, pos = { x: list[i][1], y: list[i][2] };
      p.px = p.x; p.py = p.y; p.age += dt; if (swim) p.lurk = false;
      // tricks and spawns set p.h and p.v
      if (!p.sv || p.h !== p.lh || p.v !== p.lv) p.sv = { x: Math.cos(p.h) * p.v, y: Math.sin(p.h) * p.v };
      if (!trickHeld(e)) {
        const base = own(r, e), go = role(r, e), top = p.lurk ? Math.min(base, 2 + 2 * Math.hypot(p.ex - p.x, -p.ld - p.y)) : base;
        const T = p.lurk ? { x: (p.ex - V.x) / k, y: (-p.ld - V.y) / k } : target(r, e, go === 'charge' ? 'chase' : go, pos, f);
        p.sv = steer(p.sv, pos, T, top, apart(list, i, top), dt);
      }
      p.x += p.sv.x * k * dt; p.y += p.sv.y * k * dt;
      if (p.y < floor + p.radius) { p.y = floor + p.radius; p.sv.y = Math.max(0, p.sv.y) }
      p.h = p.lh = Math.atan2(p.sv.y, p.sv.x); p.v = p.lv = Math.hypot(p.sv.x, p.sv.y);
      const n = Math.hypot(me.x - p.x, me.y - p.y);
      if (n < 5) r.metrics.threats++;
      if (!swim && n < p.radius + 1 && !p.lurk) rw(r, 9 + Math.floor(r.wave / 5));
      if (n > 340) { r.departing.push({ kind: p.kind, pos: se(p.x, p.y), velocity: { x: 0, y: -6 }, age: 0, life: 1.2, seed: p.seed }); continue }
      keep.push(p);
    }
    r.pursuers = keep;
  }

  // S1, S5: after the camera's step, carry every enemy by what the camera did, and splash those the water line crossed.
  // An arena enemy has moved with the arena: only the camera's move against the arena is left. On a step with a splash or
  // a breach it moved with the old arena up to that point (r.stageCut), and carries the rest.
  function carry(r, dt) {
    const m = r.medium, V = Ovv(r), want = V.h / (Jt.height / 2), L = r.stageAt, air = m.kind === 'air', o = air ? m.origin : null, cut = r.stageCut;
    const k = L ? L.k + (want - L.k) * (1 - Math.exp(-(dt || Ar) / (want > L.k ? .06 : .2))) : want;
    r.stageAt = { x: V.x, y: V.y, k, m, kind: m.kind, o: o && { x: o.x, y: o.y } }; r.stageCut = null;
    if (!L) return;
    const q = k / L.k, wasAir = L.kind === 'air', dx = wasAir && cut ? cut.x - L.o.x : 0, dy = wasAir && cut ? cut.y - L.o.y : 0;
    for (const p of r.pursuers || []) { p.x = V.x + (p.x - dx - L.x) * q; p.y = V.y + (p.y - dy - L.y) * q }
    if (air) for (const e of r.enemies) {
      const b = L.m === m ? L.o : cut || o, wx = b.x + e.pos.x, wy = b.y + e.pos.y;   // where it stood, by the old frame
      e.pos = ye(V.x + (wx - L.x) * q - o.x, V.y + (wy - L.y) * q - o.y);
    }
    for (const p of r.pursuers || []) { const wet = p.y < 0; if (wet !== !!p.wet) { p.wet = wet; r.events.push({ kind: 'dive', pos: se(p.x, 0) }) } }
    if (air) for (const e of r.enemies) { const wet = o.y + e.pos.y < 0; if (wet !== !!e.uw) { e.uw = wet; r.events.push({ kind: 'dive', pos: se(o.x + e.pos.x, 0) }) } }
  }

  return { P, scale, stage, role, target, steer, air, pursuers, carry };
})();
// v3's seabed under the water as its pursuer step had it: deeper at waves whose launch speed needs a longer dive
function Oseabed(r) { const C = Jzt(r.wave, 1e6); return ht.seabed * Math.max(1, C * Z$.turn / (Vq(C) * Q$.base)) }
// S1: positions pass between the arena and the pursuers as they are, and the stage velocity with them
{const pz0=Pz;Pz=function(r,t,E){if(!t.wet)r.stageCut={x:t.origin.x,y:t.origin.y};const o=pz0(r,t,E),p=r.pursuers?.at(-1);if(p&&p.e===E){p.sv={x:E.velocity.x,y:E.velocity.y};p.h=p.lh=Math.atan2(p.sv.y,p.sv.x);p.v=p.lv=Math.hypot(p.sv.x,p.sv.y)}return o}}
{const jq0=Jq;Jq=function(r,p){const v=p.sv;jq0(r,p);if(v&&p.e)p.e.velocity={x:v.x,y:v.y}}}
// at the breach every enemy goes back to the arena, wherever the water line is (lurkers stay theirs)
Zq=function(r){r.stageCut={x:r.medium.origin.x,y:r.medium.origin.y};const k=[];for(const p of r.pursuers||[])p.lurk?k.push(p):Jq(r,p);r.pursuers=k};
{const sw0=sw;sw=function(r,input,dt){const o=sw0(r,input,dt);if(r?.demo&&r.mode==='playing')Enemies.carry(r,dt);return o}}

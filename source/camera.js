// The camera, the breach and the entry: one module (designer, 2026-11-03: "separate from the demo the components that
// only do breach and camera"). It owns the camera's position (EE), the view's height (Fz), the renderer's camera clamp
// (Ocy), the drawn size of things (the renderer's zoom), the arena's outline while zoomed out (Ovae) and where the arena
// is placed at the breach (Zq). Nothing else patches the camera; other modules read Camera.moved and Camera.rise.
// It is built to the rules in docs/CAMERA_RULES.md and checked by qa/camera-rules.cjs. With DEMO.tune.cam off the
// engine's (v3's) camera runs unchanged.
//
// - Under the water the view's top stays DEMO.tune.airband m above the waterline (30: enemies wait 15-25 m up), so the
//   sky is always on screen; the view's height covers the deepest point the dolphin is about to reach (its turn 0.15 s
//   ahead, plus 7 m), held and let go at 10 m/s (faster heading out), at most DEMO.tune.viewmax × the air view, past
//   which the camera follows the dolphin down (a smooth minimum, no kink). Across, a smooth follower trails the dolphin
//   (stiffer near the view's edges so it stays on screen).
// - Heading out (rising, turning under 1.5 rad/s, within 4 s of the surface) the held depth comes up at 1.6× the climb,
//   and over the last DEMO.tune.breachlead s the camera starts to climb at the launch's climb.
// - At the breach the arena is placed with its centre on the camera's next position, so the camera rides it at once.
// - In the air the camera rides the arena: its centre vertically, and across it scrolls with the dolphin as v3 does.
//   Falling, it slows its fall before the splash (the entry lead), so the water's camera starts from rest.
// - Every change of mode (breach, entry) is one blend from the camera's own place and speed into the new mode's, over a
//   time long enough that the camera's acceleration stays under the rule's limit.
// - Sprites (the dolphin, enemies, shots, orbs, effects) are drawn at their air size at every zoom.
var Camera = (() => {
  const on = () => !!(DEMO.tune.cam && lr.fit);
  const airH = () => Jt.height;
  const band = () => +(DEMO.tune.airband ?? 30);
  const maxH = () => (+DEMO.tune.viewmax || 3) * airH();
  const SHARE = .25, MARGIN = 7, LET_GO = 10, LOOK = .15, HSPRING = .3, AMAX = 200, HACC = 900;   // AMAX: m/s², under R1's 1.5 px/frame²
  const smooth = p => p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p);
  const softmin = (a, b, k) => (a + b - Math.sqrt((a - b) ** 2 + k * k)) / 2;
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  let s = null;                  // the camera's state; null until the first step
  let moved = { x: 0, y: 0 };    // the camera's last step

  // the deepest the dolphin gets over the next LOOK s if it keeps turning as it is now
  function ahead(m, w) {
    const v = Math.hypot(m.velocity.x, m.velocity.y); let y = m.pos.y, h = Math.atan2(m.velocity.y, m.velocity.x), low = y;
    for (let k = 0; k < 6; k++) { h += w * LOOK / 6; y += Math.sin(h) * v * LOOK / 6; low = Math.min(low, y) }
    return -low;
  }
  // a blend from the camera's own place and speed into a new mode: offset o and speed difference d fade over T, chosen
  // so that the peak acceleration (about 6|o|/T² + 4|d|/T) stays under AMAX
  function blend(target, tv, dt) {
    const p = { x: s.c.x + s.v.x * dt, y: s.c.y + s.v.y * dt };
    const o = { x: p.x - target.x, y: p.y - target.y }, d = { x: s.v.x - tv.x, y: s.v.y - tv.y };
    const O = Math.hypot(o.x, o.y), Dv = Math.hypot(d.x, d.y);
    const T = Math.max(.35, (4 * Dv + Math.sqrt(16 * Dv * Dv + 24 * AMAX * O)) / (2 * AMAX));
    s.bl = { o, d, t: 0, T };
  }
  function blended(target) {
    const b = s.bl; if (!b) return target;
    const p = Math.min(1, b.t / b.T), e = 1 - smooth(p), g = b.t * (1 - p) * (1 - p);
    const out = { x: target.x + b.o.x * e + b.d.x * g, y: target.y + b.o.y * e + b.d.y * g };
    if (p >= 1) s.bl = null;
    return out;
  }

  function water(r, dt) {
    const m = r.medium, me = he(r), V = m.velocity, hd = Math.atan2(V.y, V.x);
    const w = s.hPrev == null ? 0 : wrapA(hd - s.hPrev) / Math.max(dt, 1e-6); s.hPrev = hd;
    s.ws += (w - s.ws) * (1 - Math.exp(-dt / .3));
    const out = V.y > 0 && Math.abs(s.ws) < 1.5 && -me.y / V.y < 4;
    // the view's height: deep enough for the dive, the sky band always on top
    const need = Math.max(0, -me.y, ahead(m, s.ws)) + MARGIN;   // (the turn averaged over 0.3 s: a single step's turn dipped it as a turn began)
    s.depth = Math.max(need, s.depth - Math.max(LET_GO, out ? 1.6 * V.y : 0) * dt);
    const top = -softmin(-band(), -SHARE * s.depth / (1 - SHARE), 6);   // (a smooth maximum: the corner at 90 m deep jolted the camera 5.6 px/frame² at 100 m/s)
    const want = Math.min(maxH(), Math.max(airH(), top + s.depth, top - me.y + 6));
    // the height follows its target's own rate while the target grows (a fast dive: on the spring alone it trailed, the
    // camera followed the dolphin down and the sky went) and while heading out; held depth keeps loops from pumping it
    const wr0 = s.want != null ? Math.max(-150, Math.min(150, (want - s.want) / dt)) : 0, wr = out || wr0 > 0 ? wr0 : 0; s.want = want;
    // (its acceleration capped: the camera's height moves by half of it, and uncapped a splash into a dive took the
    // height's rate from 0 to 26 m/s in two frames, a 3.2 px/frame² lurch at 100 m/s)
    const k = 1 / HSPRING, ha = Math.max(-HACC, Math.min(HACC, (want - s.H) * k * k + (wr - s.Hv) * 2 * k)); s.Hv += ha * dt; s.H += s.Hv * dt;
    const base = softmin(top - s.H / 2, me.y + s.H / 2 - 4, 6);       // past the most zoom it follows the dolphin down
    const bv = s.base != null ? (base - s.base) / dt : 0; s.base = base;
    // heading out: the climb starts under water, reaching the launch's climb (as the breach scales it) at the surface
    // when the path (the turn averaged over 0.3 s) reaches the surface within TA: a breach straight out of a turn counts
    const TA = Math.max(.05, +DEMO.tune.breachlead || .35), sp = Math.max(1, Math.hypot(V.x, V.y));
    let ts = 9; { let y = me.y, h = hd; for (let k = 1; k <= 24 && ts > TA; k++) { h += s.ws * TA / 20; y += Math.sin(h) * sp * TA / 20; if (y >= 0) ts = k * TA / 20 } }
    if (V.y > 0 && Math.abs(s.ws) < 2.5) ts = Math.min(ts, -me.y / V.y);   // or straight up to it, not looping (a hold-D loop turns at 3.6 rad/s)
    if (ts <= TA) {
      // the camera's whole climb (the zoom's plus the rise) blends into the launch's climb (as the breach scales it)
      const vl = V.y * $T(r.wave, sp) * (m.sp ? Dd(r.wave) / m.sp : 1), p = smooth(1 - ts / TA);
      s.ru = p * (vl - bv - (s.blv?.y || 0));   // (and less what a blend from the entry still adds)
    } else { const kr = 1 / .3; s.ru += (-s.rise * kr * kr - 2 * kr * s.ru) * dt }
    s.rise += s.ru * dt;
    // the waiting enemies climb with the camera while it climbs out (all of its climb, the zoom's and the rise), so they
    // keep their places on the screen up to the breach; otherwise that lift settles back over about 0.3 s
    const yT = base + s.rise;
    if (ts <= TA && V.y > 0 && s.yT != null) s.lift = Math.max(0, s.lift + yT - s.yT); else s.lift *= Math.exp(-dt / .3);   // climbing only (counting the camera going down pushed them to the water in fast loops)
    s.yT = yT;
    // across: a smooth follower, stiffer as the dolphin nears the view's edge
    const half = s.H * K / W / 2, edge = Math.max(0, Math.abs(me.x - s.fx) / half - .55) / .3, wf = 2.5 * (1 + 4 * edge * edge);
    s.fv += ((me.x - s.fx) * wf * wf + (V.x - s.fv) * 2 * wf) * dt; s.fx += s.fv * dt;
    return { target: { x: s.fx, y: base + s.rise }, tv: { x: s.fv, y: bv + s.ru } };
  }
  function air(r, dt) {
    const m = r.medium, o = m.origin;
    const keepX = Math.max(4, airH() * K / W / 2 - 6) * lr.keep, Cl = Math.max(0, Jt.width / 2 - airH() * K / W / 2);
    const lx = m.local.x, ax = Math.sign(lx) * Math.max(0, Math.abs(lx) - keepX), tx = Math.max(-Cl, Math.min(Cl, ax));
    if (s.sx == null) s.sx = tx;
    const sx0 = s.sx; s.sx += (tx - s.sx) * (1 - Math.exp(-dt / .14));
    // the view eases back to the air's height (from a dive's), on the same spring
    const k = 1 / HSPRING; s.Hv += ((airH() - s.H) * k * k - 2 * k * s.Hv) * dt; s.H += s.Hv * dt;
    s.rise = 0; s.ru = 0;
    // the entry lead: falling, the camera slows its fall before the splash (from the arena's speed down to none at the
    // surface, a smooth step in speed whose peak acceleration is AMAX), so the water's camera starts from rest: carried in
    // at the arena's 80 m/s it took a 2.8 s blend to stop and the sky was off screen for over a second
    const me = he(r), vy = s.ly != null && dt > 0 ? (me.y - s.ly) / dt : m.vy; s.ly = me.y;
    const ga = s.lvy != null && dt > 0 ? (m.vy - s.lvy) / dt : 0; s.lvy = m.vy;
    if (vy < 0 && me.y > 0) {
      const a = Math.min(0, ga), tf = a < 0 ? (vy + Math.sqrt(Math.max(0, vy * vy - 2 * a * me.y))) / -a : me.y / -vy;   // seconds to the water
      if (!s.el && +DEMO.tune.entrylead > 0) { const dv = -(vy + a * tf) * Math.min(1, +DEMO.tune.entrylead), T = Math.max(.35, 1.875 * dv / AMAX); if (tf <= T) s.el = { dv, T, x: 0 } }
      if (s.el) s.el.x = Math.max(s.el.x, Math.min(1, 1 - tf / s.el.T));
    }
    let ev = 0;
    if (s.el) { const x = s.el.x; ev = s.el.dv * x * x * x * (10 - 15 * x + 6 * x * x); s.eo += ev * dt }
    return { target: { x: o.x + s.sx, y: o.y + s.eo }, tv: { x: m.vx + (s.sx - sx0) / dt, y: m.vy + ev } };
  }
  function step(r, dt) {
    const m = r.medium;
    if (!s) s = { mode: null, c: { ...r.cam }, v: { x: 0, y: 0 }, H: airH(), Hv: 0, depth: 0, ws: 0, hPrev: null, rise: 0, ru: 0, lift: 0, el: null, eo: 0, yT: null, fx: r.cam.x, fv: 0, sx: null, bl: null };
    // a jump of more than two views (the shop moves the dolphin for the next wave): cut, never chase
    if (Math.abs(he(r).x - s.c.x) > 2 * s.H * K / W) { const p = he(r); r.cam = se(p.x, p.y); s = null; return step(r, dt) }
    const mode = m.kind === 'water' ? 'water' : 'air';
    if (mode !== s.mode) {
      if (mode === 'water') { s.fx = s.c.x; s.fv = s.v.x; s.depth = 0; s.hPrev = null; s.ws = 0; s.want = null; s.base = null; s.sx = null; s.lift = 0; s.yT = null }
      else { s.sx = null; s.el = null; s.eo = 0; s.ly = null; s.lvy = null }
    }
    const { target, tv } = mode === 'water' ? water(r, dt) : air(r, dt);
    if (mode !== s.mode) { if (s.mode) blend(target, tv, dt); s.mode = mode }
    const c = blended(target);
    if (s.bl) s.bl.t += dt;
    const bo = { x: c.x - target.x, y: c.y - target.y };   // what the blend adds, and its speed
    s.blv = s.bo && dt > 0 ? { x: (bo.x - s.bo.x) / dt, y: (bo.y - s.bo.y) / dt } : { x: 0, y: 0 }; s.bo = bo;
    moved = { x: c.x - s.c.x, y: c.y - s.c.y };
    s.v = dt > 0 ? { x: moved.x / dt, y: moved.y / dt } : s.v; s.c = c;
    r.cam = se(c.x, c.y); r.camV = se(s.v.x, s.v.y); r.camLock = 0; Ocl = 0;
  }
  // the breach: the arena's centre on the camera's next position (at most 18 m up or down, 12 m across, so the dolphin
  // stays well inside it); the dolphin, the enemies and the spawn markers keep their places in the world
  function place(r) {
    const m = r.medium; if (!s || m?.kind !== 'air' || m.placed) return;
    const kx = Math.max(-12, Math.min(12, s.c.x + s.v.x * Ar - m.origin.x)), ky = Math.max(-18, Math.min(18, s.c.y + s.v.y * Ar - m.origin.y));
    m.placed = true; if (!kx && !ky) return;
    m.origin = se(m.origin.x + kx, m.origin.y + ky); m.local = ye(m.local.x - kx, m.local.y - ky);
    for (const e of r.enemies) e.pos = ye(e.pos.x - kx, e.pos.y - ky);
    for (const w of r.warns || []) { w.x -= kx; w.y -= ky }
  }
  return {
    on, step, place, reset() { s = null; moved = { x: 0, y: 0 } },
    // rise: how far the waiting enemies are lifted with the camera's climb out
    get moved() { return moved }, get rise() { return s?.mode === 'water' ? s.lift : 0 }, get H() { return s?.H ?? airH() },
    get leading() { return !!(s?.mode === 'air' && s.el) },   // the entry lead (R2 holds until it starts)
    get state() { return s },
  };
})();
// the camera's position, the view's height, the renderer's clamp, sprite sizes, the arena's outline, the breach
{const ee0=EE;EE=function(r,t){if(!Camera.on())return ee0(r,t);Camera.step(r,t)}}
{const fz0=Fz;Fz=function(m,l,c){return Camera.on()?Camera.H/(lr.width*W/K):fz0(m,l,c)}}
{const ocy0=Ocy;Ocy=function(S2,cy,l,ppm){return Camera.on()?cy:ocy0(S2,cy,l,ppm)}}
{const d=Object.getOwnPropertyDescriptor(Ul.prototype,'zoom');Object.defineProperty(Ul.prototype,'zoom',{configurable:true,get(){return Camera.on()&&!this.sizeTitle?W/Jt.height/hw:d.get.call(this)}})}
{const dr1=Ul.prototype.draw;Ul.prototype.draw=function(t,e,i,s,o=false){this.sizeTitle=o;return dr1.call(this,t,e,i,s,o)}}
{const ovae0=Ovae;Ovae=function(R,d,x){if(Camera.on()&&R.ppm>0&&W/Jt.height/R.ppm>1.05)return;return ovae0(R,d,x)}}
{const zqc=Zq;Zq=function(r){zqc(r);if(r?.demo&&Camera.on())Camera.place(r)}}

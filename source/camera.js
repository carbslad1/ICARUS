// The camera, the breach and the entry: one module (designer, 2026-11-03: "separate from the demo the components that
// only do breach and camera"). It owns the camera's position (EE), the view's height (Fz), the renderer's camera clamp
// (Ocy), the drawn size of things (the renderer's zoom) and the arena's outline while zoomed out (Ovae). Nothing else
// patches the camera; other modules read Camera.moved. Rules: docs/CAMERA_RULES.md, checked by qa/camera-rules.cjs.
// With DEMO.tune.cam off the engine's (v3's) camera runs unchanged.
//
// It is v3's camera (designer, 2026-11-03: the camera built for smoothness "feels mushy and does not feel smooth and
// speedy"; v3 keeps the dolphin within 2-6% of the centre through breaches and entries, it left it 37-65% off): one
// spring (lr.follow, 0.28 s) onto a target that moves with its own speed, so nothing blends or eases at a breach or a
// splash. In the air the target is the arena's centre (across, it scrolls once the dolphin is past the dead zone); under
// the water it is the dolphin. The one change: under the water the view widens with depth, just enough that the
// waterline and DEMO.tune.airband m of air stay on screen with the dolphin no lower than SINK of the half-view below the
// centre (v3 lost the sky below about 30 m), at most DEMO.tune.viewmax × the air view, past which it follows the
// dolphin down. Sprites are drawn at their air size at every zoom.
var Camera = (() => {
  const on = () => !!(DEMO.tune.cam && lr.fit);
  const airH = () => Jt.height;
  const sky = () => +(DEMO.tune.airband ?? 20);
  const maxH = () => (+DEMO.tune.viewmax || 3) * airH();
  const KEEP_UP = 45;            // m/s: see the spring below
  const SINK = .64;              // v3's: the dolphin at most .64 of the half-view below the centre
  let H = null;                  // the view's height (m)
  let pT = null;                 // the target's last height under the water
  let moved = { x: 0, y: 0 };    // the camera's last step

  // the view's height under the water for a dolphin at y: the waterline and sky() m of air on screen with the dolphin
  // at most SINK below the centre (a function of depth alone, so it changes as smoothly as the dolphin moves)
  // (smooth corners, CORNER m wide: where the view starts to widen, a hard corner took the camera's fall from 3 to 30 m/s
  // in three frames at 100 m/s)
  const smax = (a, b, k) => (a + b + Math.sqrt((a - b) ** 2 + k * k)) / 2, CORNER = 16;
  const waterH = y => -smax(-maxH(), -smax(airH(), 2 * (sky() - y) / (1 + SINK), CORNER), CORNER);

  function step(r, t) {
    const e = r.medium, i = he(r), c0 = { ...r.cam };
    let T, Tv;
    if (e.kind === 'air') {
      // v3's: the arena's centre; across, past the dead zone, it scrolls with the dolphin
      H = airH();
      const Cl = Math.max(0, Jt.width / 2 - Jt.height * K / W / 2), Dz = Math.max(4, Jt.height * K / W / 2 - 6) * lr.keep,
        dx = i.x - e.origin.x, px = Math.sign(dx) * Math.max(0, Math.abs(dx) - Dz);
      T = se(e.origin.x + wt(px, -Cl, Cl), e.origin.y);
      Tv = se(e.vx + (px !== 0 && Math.abs(px) < Cl ? e.velocity.x : 0), e.vy);
      pT = null;
    } else {
      // the dolphin, held down at most SINK of the half-view below the centre while the sky needs it (v3's clamp, with
      // the view's height from the depth)
      H = waterH(i.y); const h = H / 2, v = e.velocity;
      const keep = Math.min(sky() - h, i.y + SINK * h), hold = smax(i.y, keep, CORNER / 2);
      T = se(i.x, hold);
      Tv = se(v.x, pT == null || t <= 0 ? v.y : (T.y - pT) / t);   // its own speed (held, it moves as the view widens)
    }
    // v3's spring and speed cap. The spring's time (0.28 s) shortens above KEEP_UP m/s so the camera trails by no more
    // than it does at that speed (at 100 m/s it trailed 28 m: the sky went 13-38% of the time and the dolphin fell to
    // the edge in fast loops). The cap is at the dolphin's speed (at its target's, a target held at the sky line capped
    // the camera at 8 m/s and stopped it from 44 in a frame).
    r.camV || (r.camV = se(0, 0));
    const ds = e.kind === 'air' ? Math.hypot(e.vx, e.vy) : Math.hypot(e.velocity.x, e.velocity.y);
    const w = 1 / Math.max(.05, lr.follow * Math.min(1, KEEP_UP / Math.max(1, ds)));
    r.camV = se(r.camV.x + ((T.x - r.cam.x) * w * w + (Tv.x - r.camV.x) * 2 * w) * t, r.camV.y + ((T.y - r.cam.y) * w * w + (Tv.y - r.camV.y) * 2 * w) * t);
    const Sp = Math.max(Math.hypot(Tv.x, Tv.y), ds) * 1.5 + 6, vv = Math.hypot(r.camV.x, r.camV.y);
    vv > Sp && (r.camV = se(r.camV.x / vv * Sp, r.camV.y / vv * Sp));
    r.cam = se(r.cam.x + r.camV.x * t, r.cam.y + r.camV.y * t);
    if (e.kind !== 'air') pT = T.y;
    r.camFree = se(T.x, T.y); r.camLock = 0; Ocl = 0;
    moved = { x: r.cam.x - c0.x, y: r.cam.y - c0.y };
  }
  return {
    on, step, reset() { H = null; pT = null; moved = { x: 0, y: 0 } },
    get moved() { return moved }, get H() { return H ?? airH() },
  };
})();
// the camera's position, the view's height, the renderer's clamp, sprite sizes, the arena's outline
{const ee0=EE;EE=function(r,t){if(!Camera.on())return ee0(r,t);Camera.step(r,t)}}
{const fz0=Fz;Fz=function(m,l,c){return Camera.on()?Camera.H/(lr.width*W/K):fz0(m,l,c)}}
{const ocy0=Ocy;Ocy=function(S2,cy,l,ppm){return Camera.on()?cy:ocy0(S2,cy,l,ppm)}}
{const d=Object.getOwnPropertyDescriptor(Ul.prototype,'zoom');Object.defineProperty(Ul.prototype,'zoom',{configurable:true,get(){return Camera.on()&&!this.sizeTitle?W/Jt.height/hw:d.get.call(this)}})}
{const dr1=Ul.prototype.draw;Ul.prototype.draw=function(t,e,i,s,o=false){this.sizeTitle=o;return dr1.call(this,t,e,i,s,o)}}
{const ovae0=Ovae;Ovae=function(R,d,x){if(Camera.on()&&R.ppm>0&&W/Jt.height/R.ppm>1.05)return;return ovae0(R,d,x)}}

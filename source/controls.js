// Water controls and the water camera (designer request, 2026-10-27).
// - Space carves (DEMO.tune.carve): Space is the carve key in place of W / up, under water and in the air (held into the
//   splash it carves from the first frame; held through the surface it adds the corkscrew). W / up only move you in
//   the air. Boost is gone. The touch button and gamepad A carve too.
// - Carving is always anticlockwise (DEMO.tune.ccw, off by default: the designer reverted it after trying it): v3 turns the nose up toward the side you face, so a dive to the
//   left carved clockwise. Here the carve always faces right, so a dive to the left first swings down through
//   straight down and then up to the right. Letting go past straight up no longer turns you round.
// - The water camera (DEMO.tune.sky, metres): the camera sits this far above the dolphin, so more of the screen is sky
//   (12 m, the default since the first playtest, puts the dolphin about a fifth of the way up a 43.2 m view; 7.2 m showed too little sky). It has no lead from your velocity in either
//   direction, so it never swings sideways when a carve turns you round. 0 keeps v3's camera.
var Controls = (() => {
  // the Space carve belongs to forward-only swimming (Orw.on); with it off (the default since 2026-10-31) the water
  // controls are v3's: A and D turn, W or Space boosts
  const carve = () => !!DEMO.tune.carve && !!Orw.on, ccw = () => !!DEMO.tune.ccw;
  // the words for the carve key in hints, for the current setting
  const key = () => carve() ? 'Space' : 'W / ↑';
  // the boost meter goes and the touch button becomes the carve button while Space carves (run with the hint)
  function sync() {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle('space-carve', carve());
    const b = document.getElementById('touch-boost');
    if (b) { b.textContent = carve() ? 'CARVE' : 'BOOST'; b.setAttribute('aria-label', carve() ? 'Hold to carve' : 'Hold to boost underwater') }
  }
  const hint = air => { sync(); return air ? 'W A S D / arrows: steer' + (DEMO.tune.verbs ? ' · hold S to dive · Space dashes' : '') : !Orw.on ? 'A / D to turn · W or Space to boost' + (DEMO.tune.tricks && DEMO.tune.rules ? ' · hold D, A, W or S as you breach for a trick' : '') : carve() ? 'Hold Space to carve · release to launch' : 'Hold W / up to carve · release to launch · space to boost' };
  return { carve, ccw, key, hint };
})();
// input: with Space carving, w comes from Space, the touch button (Gr) or gamepad A, and nothing boosts
{const nf0=nf;nf=function(){const o=nf0();if(!Controls.carve())return o;let w=It.has(' ')||Gr;try{const g=navigator.getGamepads?.()[0];w||=!!g?.buttons[0]?.pressed}catch{}return{...o,w,boost:!1}}}
// the water/air switch: no boost for anyone (bots included); with Space carving, W near the water lifts you as
// anywhere else (v3 dropped W's lift there because W also armed the carve); anticlockwise: no turning round on release
{const il0=Il;Il=function(r,t,e,i){
  if(t&&Controls.carve())t={...t,boost:!1};
  if(Controls.ccw()&&r?.medium?.kind==='water'&&!t?.w)r.row=!1;
  if(!Controls.carve())return il0(r,t,e,i);
  const arm=Ocv.arm;Ocv.arm=0;try{return il0(r,t,e,i)}finally{Ocv.arm=arm}}}
// facing under water: always right while anticlockwise, so the carve's pull (+1) turns the nose anticlockwise
{const of0=Orface;Orface=function(m){return Controls.ccw()?1:of0(m)}}
// The water view (designer, 2026-11-01): "at all speeds the air needs to be visible and the camera needs to be smooth".
// With "Lock view to arena" the view under water was the air view (43.2 m tall), centred 12 m above the dolphin, so at
// high speed the waterline and the enemies waiting above it went off the top. Two tries that chased the dolphin (a
// zoom-and-shift spring, then a hard limit on it) lost the air or jerked (qa/watercam.cjs). With DEMO.tune.viewfit:
// - the top of the view is pinned above the waterline, so the air is always in view, and the camera only moves up and
//   down as the zoom changes. The band of air is DEMO.tune.airband m (30: enemies wait 15-25 m up), and at least DEMO.tune.airshare of the view
//   (a quarter) so it stays a real strip when the view zooms out (designer, 2026-11-01: "widen the air band");
// - the view's height covers the deepest point the dolphin is about to reach: where its current turn takes it over the
//   next 0.6 s (a loop is foreseen, not chased), plus a margin. That depth is held and let go slowly (zoom in over
//   about 2 s) and the height follows it on a smooth spring, so loops do not pump the zoom;
// - at most DEMO.tune.viewmax times the air view's height; deeper than that, the camera follows the dolphin down;
// - entering the water the view carries on from the air's: same top, same height; the bottom edge reaches down for the
//   dive and the top eases down to the band over about 0.6 s, so the splash zooms instead of panning (a 0.4 s blend
//   to the new framing panned up to 40 m in a dive at wave 20). Across it does as before (v3's spring);
// - leaving the water, the view eases from the dive's height back to the air view's over 0.35 s (it snapped back in
//   0.2 s, 4-8 zooms a second at wave 20). Visual only: the arena keeps its size;
// - in the air the camera is set in the arena's own frame (designer, 2026-11-01: "the arena doesn't track the screen
//   boundary at high speeds"): locked to the arena vertically and scrolling with the dolphin across it as v3 does (the
//   arena is wider than the view), and after a breach only the offset from the water's framing eases out, over 0.35 s.
//   v3 faded a lock in over a camera that trailed the arena by its speed x 0.14 s, so at 125 m/s the arena sat up to
//   36 m off the screen's edges for over half a second.
// Enemies still above the view get a chevron at the top edge. No cap on the water speed (designer, 2026-11-01).
var WaterView = (() => {
  const LOOK = .6, MARGIN = 7, LET_GO = 10, SPRING = .3, SETTLE = .6, LEAVE = .35, CATCH = .35;   // s, m, m/s the held depth rises back, s, s, s
  // st: { depth (held), H and Hv (the height and its rate), top and tv (the top edge and its rate), hPrev }, null in the
  // air; leave: { H, t } easing back to the air view after a breach
  let st = null, leave = null, ac = null;   // ac: the air camera { sx (scroll across the arena), off (breach offset), t }
  const on = () => !!(DEMO.tune.viewfit && lr.fit);
  const airH = () => Jt.height;                      // the air view's height (m)
  // the deepest the dolphin gets over the next LOOK s if it keeps turning as it is now (from the heading's change)
  function ahead(m, w) {
    const v = Math.hypot(m.velocity.x, m.velocity.y); let x = 0, y = m.pos.y, h = Math.atan2(m.velocity.y, m.velocity.x), low = y;
    for (let k = 0; k < 12; k++) { h += w * LOOK / 12; y += Math.sin(h) * v * LOOK / 12; low = Math.min(low, y) }
    return -low;
  }
  function step(r, dt) {
    const m = r.medium, band = DEMO.tune.airband ?? 30, share = Math.min(.6, Math.max(0, +DEMO.tune.airshare || 0)), max = (+DEMO.tune.viewmax || 3) * airH();
    const hd = Math.atan2(m.velocity.y, m.velocity.x);
    if (!st) st = { depth: 0, H: airH(), Hv: 0, top: r.cam.y + airH() / 2, tv: 0, hPrev: hd };
    const w = Math.atan2(Math.sin(hd - st.hPrev), Math.cos(hd - st.hPrev)) / Math.max(dt, 1e-6); st.hPrev = hd;
    const need = Math.max(0, -m.pos.y, ahead(m, w)) + MARGIN;
    st.depth = Math.max(need, st.depth - LET_GO * dt);
    // the band: its metres, or its share of a view tall enough for band + depth, whichever is more
    const top = Math.max(band, share * st.depth / (1 - share));
    const kt = 1 / SETTLE; st.tv += ((top - st.top) * kt * kt - 2 * kt * st.tv) * dt; st.top += st.tv * dt;
    const want = Math.min(max, Math.max(airH(), st.top + st.depth)), k = 1 / SPRING;
    st.Hv += ((want - st.H) * k * k - 2 * k * st.Hv) * dt; st.H += st.Hv * dt;
    st.H = Math.min(max, Math.max(st.H, st.top - m.pos.y + 3));      // never so far behind that the dolphin leaves the view
    return Math.min(st.top - st.H / 2, m.pos.y + st.H / 2 - 3);       // deeper than the most zoom: follow the dolphin down
  }
  // in the air: the height eased back from the last dive's (null once it is back to the air view's)
  function air(dt) {
    if (st) { leave = { H: st.H, t: 0 }; st = null }
    if (!leave) return null;
    leave.t += dt; if (leave.t >= LEAVE || leave.H <= airH()) { leave = null; return null }
    const p = leave.t / LEAVE, e = p * p * (3 - 2 * p); return airH() + (leave.H - airH()) * (1 - e);
  }
  // the air camera, in the arena's frame; prev: the camera before this step
  function airCam(r, dt, prev) {
    const m = r.medium, o = m.origin, keepX = Math.max(4, Jt.height * K / W / 2 - 6) * lr.keep, Cl = Math.max(0, Jt.width / 2 - Jt.height * K / W / 2);
    const lx = m.local.x, ax = Math.sign(lx) * Math.max(0, Math.abs(lx) - keepX), tx = Math.max(-Cl, Math.min(Cl, ax));
    if (!ac) ac = { sx: tx, off: { x: prev.x - (o.x + tx), y: prev.y - o.y }, t: 0 };
    ac.sx += (tx - ac.sx) * (1 - Math.exp(-dt / .14)); ac.t += dt;
    const p = Math.min(1, ac.t / CATCH), e = 1 - p * p * (3 - 2 * p);
    r.cam = se(o.x + ac.sx + ac.off.x * e, o.y + ac.off.y * e);
  }
  return { on, step, air, airCam, reset() { st = null; leave = null; ac = null }, leaveWater() { ac = null }, get H() { return st?.H ?? null }, get airH() { return leave ? airH() + (leave.H - airH()) * (1 - (p => p * p * (3 - 2 * p))(Math.min(1, leave.t / LEAVE))) : null } };
})();
{const fz0=Fz;Fz=function(m,l,c){if(!WaterView.on())return fz0(m,l,c);const H=m?.kind==='water'?WaterView.H:WaterView.airH;return H!=null?H/(lr.width*W/K):fz0(m,l,c)}}
// the water camera: v3's spring, with the target this far above the dolphin and no velocity lead (or WaterView's height)
{const ee0=EE;EE=function(r,t){
  const e=r.medium,lift=+DEMO.tune.sky||0;
  if(e.kind==='air'&&lr.fit&&WaterView.on()){const pc={...r.cam};WaterView.air(t);ee0(r,t);WaterView.airCam(r,t,pc);return}
  if(e.kind==='air')WaterView.reset();else WaterView.leaveWater();
  if(!lr.fit||e.kind==='air'||lift<=0)return ee0(r,t);
  const i=he(r),s=Fl(r),wy=WaterView.on()?WaterView.step(r,t):null,h=lr.width*W/K*Fz(e,i,r.cam)/2;
  const T=se(i.x,wy??Math.max(i.y+lift,Math.min(-.76*h,i.y+.64*h))),Tv=se(s.x,s.y);
  r.camFree=se(T.x,T.y);r.camV||(r.camV=se(0,0));
  const w=1/Math.max(.05,lr.follow);
  r.camV=se(r.camV.x+((T.x-r.cam.x)*w*w+(Tv.x-r.camV.x)*2*w)*t,r.camV.y+((T.y-r.cam.y)*w*w+(Tv.y-r.camV.y)*2*w)*t);
  const Sp=Math.hypot(s.x,s.y)*1.5+6,vv=Math.hypot(r.camV.x,r.camV.y);
  vv>Sp&&(r.camV=se(r.camV.x/vv*Sp,r.camV.y/vv*Sp));
  r.cam=se(r.cam.x+r.camV.x*t,r.cam.y+r.camV.y*t);
  if(wy!=null){r.cam=se(r.cam.x,wy);r.camV=se(r.camV.x,0)}   // the view's height and pinned top set the height
  r.camLock=(r.camLock==null?0:r.camLock)+(0-(r.camLock||0))*Xe(t,.18);Ocl=r.camLock}}
// v3's opening hint names W as the carve key; with Space carving it names Space (and W A S D choose a trick, source/tricks.js)
{const zd0=Zd;Zd=function(...a){const o=zd0(...a);const tk=DEMO.tune.tricks&&DEMO.tune.rules;if(Controls.carve())ci='HOLD SPACE TO CARVE \xB7 LET GO TO LAUNCH';else if(!Orw.on)ci='A / D TO TURN \xB7 W OR SPACE TO BOOST';if(tk)ci+=' \xB7 HOLD A KEY AS YOU BREACH FOR A TRICK';return o}}
// The steady camera (designer, 2026-11-01: "make the camera not feel like it's bouncing and zooming in and out around
// the water line during breach and entry"; DEMO.tune.steadycam). It replaces the water view and the arena lock above:
// - one view height for the whole wave, in the air and the water: room for the band of air (DEMO.tune.airband) and a
//   typical dive at this wave's launch speed (+ 0.35 s of it), at least the arena's height, at most 3×; it changes only
//   with the wave, easing over about a second. No zoom at the water line;
// - under the water the water line holds still with the band of air above it, and sideways it follows the dolphin as
//   v3's water camera does. Only deeper than the wave's view can hold does the view grow (downward: its top stays on
//   the band, so the air stays in view at any depth; following the dolphin down lost it, 71-80% at waves 10-20); it
//   is back to the wave's height well before the surface, so there is no zoom at the water line;
// - in the air it rides the arena with the arena's top at the view's top (when the view is taller than the arena, the
//   extra shows below it, the water). At the breach the arena is placed so its top meets the band (space.js), so the
//   camera's place does not jump, and from then on enemies and the dolphin hold still on screen while the water drops
//   away (the waiting enemies join the arena and rise with it: a camera that held still and caught up later made them
//   shoot up and settle back, a bounce). So that the camera does not lurch from still to the launch speed, when the
//   dolphin's path (its current turn) reaches the surface within 0.35 s the camera starts rising with it, reaching its
//   speed as it breaks out, and the arena is placed where the camera then is; a rise that comes to nothing settles back.
//   Sideways the camera's offset from the arena at the breach eases out (0.6 s);
// - coming down, in the last 0.7 s before the water (from the arena's fall), it eases out of the arena's fall into the
//   water framing, so it arrives still and the splash moves nothing.
var SteadyCam = (() => {
  const on = () => !!(DEMO.tune.steadycam && lr.fit);
  const airH = () => Jt.height, band = () => +DEMO.tune.airband || 30;
  const smooth = p => p <= 0 ? 0 : p >= 1 ? 1 : p * p * (3 - 2 * p);
  const softmin = (a, b, k) => (a + b - Math.sqrt((a - b) ** 2 + k * k)) / 2;
  let st = null;   // { H (the wave's view height, eased), E (the extra height for a deep dive, eased), x, vx, ox, ov, oy, oyv, rise, ru }
  const height = r => Math.min(3 * airH(), Math.max(airH(), band() + .35 * Dd(r.wave) + 7));
  function step(r, dt) {
    const m = r.medium, me = he(r);
    // a new wave (the shop moves the dolphin) or any jump of more than two views: cut, never chase
    if (st && (st.wave !== r.wave || Math.abs(me.x - r.cam.x) > 2 * (st.H + st.E) * K / W)) { st = null; r.camVel = null }
    if (!st) st = { wave: r.wave, cut: 1, H: height(r), E: 0, x: me.x, vx: m.kind === 'water' ? m.velocity.x : 0, ox: null, ov: 0, kind: m.kind };
    st.H += (height(r) - st.H) * (1 - Math.exp(-dt / 1.2));
    // a deep dive: the extra height to keep the dolphin 6 m above the view's bottom, smoothly (a soft ramp from the depth
    // the wave's view holds), at most 3 × the arena's height in all
    const d0 = st.H - band() - 6, depth = m.kind === 'water' ? -me.y : 0, need = Math.min(3 * airH() - st.H, Math.max(0, (depth - d0 + Math.sqrt((depth - d0) ** 2 + 36)) / 2 - 3));
    // slow just after a splash (no zoom at the water line), quick once the dive is under way (the air stays in view)
    st.tw = m.kind === 'water' ? (st.kind === 'water' ? (st.tw ?? 9) + dt : 0) : 0;
    st.E += (need - st.E) * (1 - Math.exp(-dt / (.2 + .8 * (1 - smooth(st.tw / .8)))));
    const HH = st.H + st.E, h = HH / 2, yWater = softmin(band() - h, me.y + h - 6, 8);
    if (m.kind === 'water') {
      const w = 1 / Math.max(.05, lr.follow), v = m.velocity;
      if (st.kind === 'air') { st.rise = 0; st.ru = 0; st.hPrev = null }
      // rising to breach: when its path (the current turn) reaches the surface, and how soon
      const hd = Math.atan2(v.y, v.x), wt = st.hPrev == null ? 0 : Math.atan2(Math.sin(hd - st.hPrev), Math.cos(hd - st.hPrev)) / Math.max(dt, 1e-6); st.hPrev = hd;
      let tb = null; { let yy = me.y, hh = hd; const sp = Math.hypot(v.x, v.y); for (let k = 0; k < 24 && tb == null; k++) { hh += wt * .025; yy += Math.sin(hh) * sp * .025; if (yy >= 0) tb = (k + 1) * .025 } }
      const T = .35; st.rise ??= 0; st.ru ??= 0;
      if (v.y > 0 && tb != null && tb <= T) { const want = v.y * smooth(1 - tb / T); st.ru += (want - st.ru) * (1 - Math.exp(-dt / .04)) }
      else { const kr = 1 / .3; st.ru += (-st.rise * kr * kr - 2 * kr * st.ru) * dt }
      st.rise += st.ru * dt;
      if (st.kind === 'air' && st.ox != null) { st.x = r.cam.x; st.vx = (r.camVel?.x ?? v.x) }   // carry on from the air
      st.vx += ((me.x - st.x) * w * w + (v.x - st.vx) * 2 * w) * dt; st.x += st.vx * dt;
      st.ox = null; st.kind = 'water'; st.cut = 0;
      const pc = r.cam; r.cam = se(st.x, yWater + st.rise); if (dt > 0) r.camVel = se((r.cam.x - pc.x) / dt, (r.cam.y - pc.y) / dt); return;
    }
    // the air: the arena's top at the view's top; sideways v3's scroll across the arena plus the offset at the breach
    const o = m.origin, keepX = Math.max(4, Jt.height * K / W / 2 - 6) * lr.keep, Cl = Math.max(0, Jt.width / 2 - Jt.height * K / W / 2);
    const lx = m.local.x, ax = Math.sign(lx) * Math.max(0, Math.abs(lx) - keepX), tx = Math.max(-Cl, Math.min(Cl, ax));
    // the offsets from the arena's framing at the breach, and their rates, so the camera keeps its place and speed there
    // (the arena is placed partway through the breach's step: locking to it at once dipped the camera for a frame)
    const ay = o.y + airH() / 2 - h;
    if (st.ox == null && st.cut) { st.sx = tx; st.ox = st.ov = st.oy = st.oyv = 0 }
    if (st.ox == null) { const cv = r.camVel || { x: m.vx, y: m.vy }; st.sx = tx; st.ov = cv.x - m.vx; st.oyv = cv.y - m.vy; st.ox = r.cam.x + cv.x * dt - (o.x + tx) - st.ov * dt; st.oy = r.cam.y + cv.y * dt - ay - st.oyv * dt }   // (less this step's own move of the offset)
    st.sx += (tx - st.sx) * (1 - Math.exp(-dt / .14));
    const k = 1 / .3;
    st.ov += (-st.ox * k * k - 2 * k * st.ov) * dt; st.ox += st.ov * dt;
    st.oyv += (-st.oy * k * k - 2 * k * st.oyv) * dt; st.oy += st.oyv * dt;
    let y = ay + st.oy;
    // coming down to the water: ease into the water framing over the last 0.7 s (from the arena's fall)
    const fall = Math.max(0, -m.vy), alt = o.y + m.local.y, g = 15, tl = fall > 0 ? (-fall + Math.sqrt(fall * fall + 2 * g * Math.max(0, alt))) / g : 9;
    if (fall > 1 && tl < .7) y += (yWater - y) * smooth(1 - tl / .7);
    st.kind = 'air'; st.cut = 0;
    const pc = r.cam; r.cam = se(o.x + st.sx + st.ox, y); if (dt > 0) r.camVel = se((r.cam.x - pc.x) / dt, (r.cam.y - pc.y) / dt);
  }
  // the breach: where the arena's origin goes so that, with its top at the view's top, the camera stays where it is
  const breachOrigin = r => r.cam.y + (st ? st.H + st.E : airH()) / 2 - airH() / 2;
  return { on, step, breachOrigin, reset() { st = null }, get H() { return st ? st.H + st.E : null } };
})();
{const fz1=Fz;Fz=function(m,l,c){return SteadyCam.on()&&SteadyCam.H!=null?SteadyCam.H/(lr.width*W/K):fz1(m,l,c)}}
{const ee1=EE;EE=function(r,t){if(!SteadyCam.on()){SteadyCam.reset();return ee1(r,t)}SteadyCam.step(r,t);r.camLock=0;Ocl=0}}
// chevrons at the top edge over the enemies waiting above the water that are still above the view
{const d0=Otdraw;Otdraw=function(R,r,m,title){d0(R,r,m,title);if(title||m?.kind!=='water'||!WaterView.on())return;
  const G=R.telegraphs;for(const p of r.pursuers||[]){if(p.wet||p.y<=0)continue;const X=R.sx(p.x),Y=R.sy(p.y);if(Y>8||X<12||X>K-12)continue;
    G.poly([X,10,X-7,22,X+7,22]).fill({color:yt.hostile,alpha:.85})}}}
{if(typeof document!=='undefined'&&document.head){const st=document.createElement('style');st.textContent='body.space-carve .boost-meter{display:none}';document.head.appendChild(st)}}

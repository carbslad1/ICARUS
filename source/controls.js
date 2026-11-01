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
  const LOOK = .6, MARGIN = 7, LET_GO = 10, SPRING = .3, SETTLE = .6, LEAVE = .6, CATCH = .35;   // s, m, m/s the held depth rises back, s, s, s
  // st: { depth (held), H and Hv (the height and its rate), top and tv (the top edge and its rate), hPrev }, null in the
  // air; leave: { H, t } easing back to the air view after a breach
  let st = null, leave = null, ac = null;   // ac: the air camera { sx (scroll across the arena), off (breach offset), t }
  const on = () => !!(DEMO.tune.viewfit && lr.fit);
  const airH = () => Jt.height;                      // the air view's height (m)
  // the deepest the dolphin gets over the next LOOK s if it keeps turning as it is now (from the heading's change)
  function ahead(m, w) {
    const v = Math.hypot(m.velocity.x, m.velocity.y); let x = 0, y = m.pos.y, h = Math.atan2(m.velocity.y, m.velocity.x), low = y;
    ahead.tb = null;   // when that path reaches the surface (a breach), if it does within LOOK s
    for (let k = 0; k < 12; k++) { h += w * LOOK / 12; y += Math.sin(h) * v * LOOK / 12; low = Math.min(low, y); if (ahead.tb == null && y >= 0) ahead.tb = (k + 1) * LOOK / 12 }
    return -low;
  }
  function step(r, dt) {
    const m = r.medium, band = DEMO.tune.airband ?? 30, share = Math.min(.6, Math.max(0, +DEMO.tune.airshare || 0)), max = (+DEMO.tune.viewmax || 3) * airH();
    const hd = Math.atan2(m.velocity.y, m.velocity.x);
    // at the splash it carries on from the air's framing: same top and height, and the camera's own speed (it was
    // falling with the arena; starting the framing still stopped it dead, a lurch of 139-240 view heights/s²). That fall
    // fades out over about 0.15 s on its own (st.fall): carried into the band's spring, at 100 m/s it plunged the view
    // far below the band, off the water line.
    // (tall enough from the start to hold the dolphin, about the same centre: growing it on the first step moved the
    // camera in a frame)
    if (!st) { const cv = r.camVel || { x: 0, y: 0 }, H0 = Math.max(airH(), 2 * (r.cam.y - m.pos.y + 3)); st = { depth: 0, H: H0, Hv: 0, top: r.cam.y + H0 / 2, tv: 0, ta: 0, fall: cv.y, hPrev: hd }; r.camV = se(cv.x, cv.y) }
    const w = Math.atan2(Math.sin(hd - st.hPrev), Math.cos(hd - st.hPrev)) / Math.max(dt, 1e-6); st.hPrev = hd;
    const need = Math.max(0, -m.pos.y, ahead(m, w)) + MARGIN;
    st.depth = Math.max(need, st.depth - LET_GO * dt);
    // the band: its metres, or its share of a view tall enough for band + depth, whichever is more
    const top = Math.max(band, share * st.depth / (1 - share));
    // about to breach (its path reaches the surface within 0.5 s): the top starts rising with the dolphin, so the camera
    // is already moving at about its speed when it leaves the water (the arena takes over without a lurch); otherwise
    // the top settles to the band, its pull easing in (0.08 s)
    const breaching = m.velocity.y > 0 && ahead.tb != null && ahead.tb <= .5;
    if (breaching) {
      const p = 1 - ahead.tb / .5, want = m.velocity.y * p * p * (3 - 2 * p) + st.Hv / 2;
      st.tv += (want - st.tv) * (1 - Math.exp(-dt / .06)); st.ta = 0; st.top += st.tv * dt;
    } else {
      const kt = 1 / SETTLE, pull = (top - st.top) * kt * kt - 2 * kt * st.tv;
      st.ta += (pull - st.ta) * (1 - Math.exp(-dt / .08)); st.tv += st.ta * dt; st.top += st.tv * dt;
    }
    if (st.fall) { st.top += st.fall * dt; st.fall *= Math.exp(-dt / .15); if (Math.abs(st.fall) < .05) st.fall = 0 }
    // about to breach, the height heads for the air view's (never losing the dolphin), so there is little zoom left then
    const want = breaching ? airH() : Math.min(max, Math.max(airH(), st.top + st.depth)), k = 1 / SPRING;
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
    // the offset from the arena's framing and its rate: at the breach the camera keeps its own speed (r.camVel, from
    // under water) and a critically damped spring brings both to the arena's over about CATCH s. Easing only the
    // position, the camera went from still to the launch speed in a frame (a lurch: 124-286 view heights/s² at the breach).
    // (the offset is taken against the arena where it was a step ago: this step has already moved it, and measuring
    // against that made the camera jump back for a frame)
    // vertically the view keeps the arena's top edge where it is while its height eases back to the arena's (the arena
    // was lifted at the breach to meet the water view's top, space.js), so the zoom happens about the top edge
    const Hv = leave ? airH() + (leave.H - airH()) * (1 - (p => p * p * (3 - 2 * p))(Math.min(1, leave.t / LEAVE))) : airH(), ty = Jt.height / 2 - Hv / 2;
    if (!ac) { const cv = r.camVel || { x: 0, y: 0 }, ox = o.x - m.vx * dt, oy = o.y - m.vy * dt; ac = { sx: tx, off: { x: prev.x - (ox + tx), y: prev.y - (oy + ty) }, v: { x: cv.x - m.vx, y: cv.y - m.vy }, a: { x: 0, y: 0 } } }
    ac.sx += (tx - ac.sx) * (1 - Math.exp(-dt / .14));
    const k = 4 / CATCH;
    // the spring's pull itself eases in (0.08 s): a spring pulls hardest at its start, a jolt on the breach's first frame
    for (const a of ['x', 'y']) { const want = -ac.off[a] * k * k - 2 * k * ac.v[a]; ac.a[a] += (want - ac.a[a]) * (1 - Math.exp(-dt / .08)); ac.v[a] += ac.a[a] * dt; ac.off[a] += ac.v[a] * dt }
    // about to land (falling, at the water within 0.7 s): the camera eases out of the arena's fall to where the water
    // view will want it (the band of air above the water line), so it arrives still and the splash needs no lurch
    // (it fell into the water at up to 150 m/s, the view's top a few metres above the water)
    let cy = o.y + ty + ac.off.y;
    // (from the arena's fall only: the dolphin's own moves in the arena change abruptly with the keys, and made the
    // predicted landing, and so the camera, jump)
    const alt = o.y + m.local.y, fall = Math.max(0, -m.vy);
    const g = 15, tl = fall > 0 ? (-fall + Math.sqrt(fall * fall + 2 * g * Math.max(0, alt))) / g : 9;   // seconds to the water, with gravity
    if (fall > 1 && tl < .7) { const p = 1 - tl / .7, s = p * p * (3 - 2 * p), band = +DEMO.tune.airband || 30; cy += ((band - Hv / 2) - cy) * s }
    r.cam = se(o.x + ac.sx + ac.off.x, cy);
  }
  return { on, step, air, airCam, get top() { return st?.top ?? null }, reset() { st = null; leave = null; ac = null }, leaveWater() { ac = null }, get H() { return st?.H ?? null }, get airH() { return leave ? airH() + (leave.H - airH()) * (1 - (p => p * p * (3 - 2 * p))(Math.min(1, leave.t / LEAVE))) : null } };
})();
{const fz0=Fz;Fz=function(m,l,c){if(!WaterView.on())return fz0(m,l,c);const H=m?.kind==='water'?WaterView.H:WaterView.airH;return H!=null?H/(lr.width*W/K):fz0(m,l,c)}}
// the water camera: v3's spring, with the target this far above the dolphin and no velocity lead (or WaterView's height)
{const ee0=EE;EE=function(r,t){
  const e=r.medium,lift=+DEMO.tune.sky||0;
  if(e.kind==='air'&&lr.fit&&WaterView.on()){const pc={...r.cam};WaterView.air(t);ee0(r,t);WaterView.airCam(r,t,pc);r.camVel=t>0?se((r.cam.x-pc.x)/t,(r.cam.y-pc.y)/t):r.camVel;return}
  if(e.kind==='air')WaterView.reset();else WaterView.leaveWater();
  if(!lr.fit||e.kind==='air'||lift<=0)return ee0(r,t);
  const pc0={...r.cam},i=he(r),s=Fl(r),wy=WaterView.on()?WaterView.step(r,t):null,h=lr.width*W/K*Fz(e,i,r.cam)/2;
  const T=se(i.x,wy??Math.max(i.y+lift,Math.min(-.76*h,i.y+.64*h))),Tv=se(s.x,s.y);
  r.camFree=se(T.x,T.y);r.camV||(r.camV=se(0,0));
  const w=1/Math.max(.05,lr.follow);
  r.camV=se(r.camV.x+((T.x-r.cam.x)*w*w+(Tv.x-r.camV.x)*2*w)*t,r.camV.y+((T.y-r.cam.y)*w*w+(Tv.y-r.camV.y)*2*w)*t);
  const Sp=Math.hypot(s.x,s.y)*1.5+6,vv=Math.hypot(r.camV.x,r.camV.y);
  vv>Sp&&(r.camV=se(r.camV.x/vv*Sp,r.camV.y/vv*Sp));
  r.cam=se(r.cam.x+r.camV.x*t,r.cam.y+r.camV.y*t);
  if(wy!=null){r.cam=se(r.cam.x,wy);r.camV=se(r.camV.x,0)}   // the view's height and pinned top set the height
  if(t>0)r.camVel=se((r.cam.x-pc0.x)/t,(r.cam.y-pc0.y)/t);   // the camera's speed, for the breach (WaterView.airCam)
  r.camLock=(r.camLock==null?0:r.camLock)+(0-(r.camLock||0))*Xe(t,.18);Ocl=r.camLock}}
// v3's opening hint names W as the carve key; with Space carving it names Space (and W A S D choose a trick, source/tricks.js)
{const zd0=Zd;Zd=function(...a){const o=zd0(...a);const tk=DEMO.tune.tricks&&DEMO.tune.rules;if(Controls.carve())ci='HOLD SPACE TO CARVE \xB7 LET GO TO LAUNCH';else if(!Orw.on)ci='A / D TO TURN \xB7 W OR SPACE TO BOOST';if(tk)ci+=' \xB7 HOLD A KEY AS YOU BREACH FOR A TRICK';return o}}
// chevrons at the top edge over the enemies waiting above the water that are still above the view
{const d0=Otdraw;Otdraw=function(R,r,m,title){d0(R,r,m,title);if(title||m?.kind!=='water'||!WaterView.on())return;
  const G=R.telegraphs;for(const p of r.pursuers||[]){if(p.wet||p.y<=0)continue;const X=R.sx(p.x),Y=R.sy(p.y);if(Y>8||X<12||X>K-12)continue;
    G.poly([X,10,X-7,22,X+7,22]).fill({color:yt.hostile,alpha:.85})}}}
{if(typeof document!=='undefined'&&document.head){const st=document.createElement('style');st.textContent='body.space-carve .boost-meter{display:none}';document.head.appendChild(st)}}

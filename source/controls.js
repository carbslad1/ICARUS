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
  let st = null, leave = null, ac = null, moved = null;   // moved: the camera's last step   // ac: the air camera { sx (scroll across the arena), off (breach offset), t }
  const on = () => !!(DEMO.tune.viewfit && lr.fit);
  const airH = () => Jt.height;                      // the air view's height (m)
  // the deepest the dolphin gets over the next DEMO.tune.viewlook s if it keeps turning as it is now (from the heading's
  // change). 0.15 s since 2026-11-01: at 0.6 s a short hop's dive looked 45 m ahead at wave 10 (37 m deep, for a hop that
  // turns up at 4 m), so every hop zoomed out 1.2-1.5x and back ("expanding in and out"); now 1.0x at wave 3, 1.24x at 10
  function ahead(m, w) {
    const v = Math.hypot(m.velocity.x, m.velocity.y); let x = 0, y = m.pos.y, h = Math.atan2(m.velocity.y, m.velocity.x), low = y;
    const L = Math.max(0, DEMO.tune.viewlook ?? LOOK);
    for (let k = 0; k < 12; k++) { h += w * L / 12; y += Math.sin(h) * v * L / 12; low = Math.min(low, y) }
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
    // from where the water camera would be after this step (its last step's move added): starting where it was stood the
    // camera still for the breach's step, half the motion for that frame at 105 m/s (a stutter at every breach)
    const mv = moved || { x: 0, y: 0 };
    if (DEMO.tune.breachspring) {
      // the offset from the arena's framing eases out as before (smoothly, over DEMO.tune.breachT s), plus a term that
      // starts at the camera's own speed less the arena's and fades to nothing over the same time, so the camera's speed
      // carries through the breach as well as its place (the ease alone started from rest: the camera took the arena's
      // climb, about 19 m/s at 30 m/s, in one frame, then swung back; designer, 2026-11-01: "the camera lurches on
      // breach ... a little jolt, even at 30"; a spring that started at the camera's speed jolted more, 3.7 against 1.3
      // px/frame² at the 95th percentile, from its pull on the offset)
      const T = Math.max(.1, +DEMO.tune.breachT || .5);
      if (!ac?.ov) ac = { sx: tx, off: { x: prev.x + mv.x - (o.x + tx), y: prev.y + mv.y - o.y }, ov: { x: mv.x / Math.max(dt, 1e-6) - m.vx, y: mv.y / Math.max(dt, 1e-6) - m.vy }, t: 0 };
      else { ac.sx += (tx - ac.sx) * (1 - Math.exp(-dt / .14)); ac.t += dt }
      const p = Math.min(1, ac.t / T), e = 1 - p * p * (3 - 2 * p), g = ac.t * (1 - p) * (1 - p);
      r.cam = se(o.x + ac.sx + ac.off.x * e + ac.ov.x * g, o.y + ac.off.y * e + ac.ov.y * g);
      return;
    }
    if (!ac || ac.t == null) ac = { sx: tx, off: { x: prev.x + mv.x - (o.x + tx), y: prev.y + mv.y - o.y }, t: 0 };
    ac.sx += (tx - ac.sx) * (1 - Math.exp(-dt / .14)); ac.t += dt;
    const p = Math.min(1, ac.t / CATCH), e = 1 - p * p * (3 - 2 * p);
    r.cam = se(o.x + ac.sx + ac.off.x * e, o.y + ac.off.y * e);
  }
  return { on, step, air, airCam, reset() { st = null; leave = null; ac = null }, leaveWater() { ac = null }, set moved(v) { moved = v }, get H() { return st?.H ?? null }, get airH() { return leave ? airH() + (leave.H - airH()) * (1 - (p => p * p * (3 - 2 * p))(Math.min(1, leave.t / LEAVE))) : null } };
})();
{const fz0=Fz;Fz=function(m,l,c){if(!WaterView.on())return fz0(m,l,c);const H=m?.kind==='water'?WaterView.H:WaterView.airH;return H!=null?H/(lr.width*W/K):fz0(m,l,c)}}
// Sizes held at 30 m/s (designer, 2026-11-01: "i want the enemies and dolphin to be the same size as they are at 30 at all
// speeds"). Everything the renderer sizes by its zoom (the dolphin, enemies, shots, orbs, trail, bubbles, particles) stops
// shrinking once the view is zoomed out past DEMO.tune.sizeref × the air view (1.12: the water view's median at 30 m/s;
// its median at 125 m/s is 1.38, its most 2.7). Positions, hitboxes and the air (no zoom-out there) are unchanged.
var SizeHold = { factor(ppm) { const ref = +DEMO.tune.sizeref || 1.12, z = W / Jt.height / ppm; return DEMO.tune.sizehold && lr.fit && z > ref ? z / ref : 1 } };
{const d=Object.getOwnPropertyDescriptor(Ul.prototype,'zoom');Object.defineProperty(Ul.prototype,'zoom',{configurable:true,get(){const z=d.get.call(this);return this.sizeTitle?z:z*SizeHold.factor(this.ppm)}})}
{const dr1=Ul.prototype.draw;Ul.prototype.draw=function(t,e,i,s,o=false){this.sizeTitle=o;return dr1.call(this,t,e,i,s,o)}}
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
// the camera's move each step, for the air camera to carry on from at the breach
{const ee1=EE;EE=function(r,t){const p=r.cam?{x:r.cam.x,y:r.cam.y}:null;ee1(r,t);if(p&&r.cam)WaterView.moved={x:r.cam.x-p.x,y:r.cam.y-p.y}}}
// v3's opening hint names W as the carve key; with Space carving it names Space (and W A S D choose a trick, source/tricks.js)
{const zd0=Zd;Zd=function(...a){const o=zd0(...a);const tk=DEMO.tune.tricks&&DEMO.tune.rules;if(Controls.carve())ci='HOLD SPACE TO CARVE \xB7 LET GO TO LAUNCH';else if(!Orw.on)ci='A / D TO TURN \xB7 W OR SPACE TO BOOST';if(tk)ci+=' \xB7 HOLD A KEY AS YOU BREACH FOR A TRICK';return o}}
// chevrons at the top edge over the enemies waiting above the water that are still above the view
{const d0=Otdraw;Otdraw=function(R,r,m,title){d0(R,r,m,title);if(title||m?.kind!=='water'||!WaterView.on())return;
  const G=R.telegraphs;for(const p of r.pursuers||[]){if(p.wet||p.y<=0)continue;const X=R.sx(p.x),Y=R.sy(p.y);if(Y>8||X<12||X>K-12)continue;
    G.poly([X,10,X-7,22,X+7,22]).fill({color:yt.hostile,alpha:.85})}}}
{if(typeof document!=='undefined'&&document.head){const st=document.createElement('style');st.textContent='body.space-carve .boost-meter{display:none}';document.head.appendChild(st)}}

// Water controls and the water camera (designer request, 2026-10-27).
// - Space carves (DEMO.tune.carve): Space is the carve key in place of W / up, under water and in the air (held into the
//   splash it carves from the first frame; held through the surface it adds the corkscrew). W / up only move you in
//   the air. Boost is gone. The touch button and gamepad A carve too.
// - Carving is always anticlockwise (DEMO.tune.ccw): v3 turns the nose up toward the side you face, so a dive to the
//   left carved clockwise. Here the carve always faces right, so a dive to the left first swings down through
//   straight down and then up to the right. Letting go past straight up no longer turns you round.
// - The water camera (DEMO.tune.sky, metres): the camera sits this far above the dolphin, so more of the screen is sky
//   (12 m, the default since the first playtest, puts the dolphin about a fifth of the way up a 43.2 m view; 7.2 m showed too little sky). It has no lead from your velocity in either
//   direction, so it never swings sideways when a carve turns you round. 0 keeps v3's camera.
var Controls = (() => {
  const carve = () => !!DEMO.tune.carve, ccw = () => !!DEMO.tune.ccw;
  // the words for the carve key in hints, for the current setting
  const key = () => carve() ? 'Space' : 'W / ↑';
  // the boost meter goes and the touch button becomes the carve button while Space carves (run with the hint)
  function sync() {
    if (typeof document === 'undefined' || !document.body) return;
    document.body.classList.toggle('space-carve', carve());
    const b = document.getElementById('touch-boost');
    if (b) { b.textContent = carve() ? 'CARVE' : 'BOOST'; b.setAttribute('aria-label', carve() ? 'Hold to carve' : 'Hold to boost underwater') }
  }
  const hint = air => { sync(); return air ? 'W A S D / arrows: steer' : carve() ? 'Hold Space to carve · release to launch' : 'Hold W / up to carve · release to launch · space to boost' };
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
// the water camera: v3's spring, with the target this far above the dolphin and no velocity lead
{const ee0=EE;EE=function(r,t){
  const e=r.medium,lift=+DEMO.tune.sky||0;
  if(!lr.fit||e.kind==='air'||lift<=0)return ee0(r,t);
  const i=he(r),s=Fl(r),h=lr.width*W/K*Fz(e,i,r.cam)/2;
  const T=se(i.x,Math.max(i.y+lift,Math.min(-.76*h,i.y+.64*h))),Tv=se(s.x,s.y);
  r.camFree=se(T.x,T.y);r.camV||(r.camV=se(0,0));
  const w=1/Math.max(.05,lr.follow);
  r.camV=se(r.camV.x+((T.x-r.cam.x)*w*w+(Tv.x-r.camV.x)*2*w)*t,r.camV.y+((T.y-r.cam.y)*w*w+(Tv.y-r.camV.y)*2*w)*t);
  const Sp=Math.hypot(s.x,s.y)*1.5+6,vv=Math.hypot(r.camV.x,r.camV.y);
  vv>Sp&&(r.camV=se(r.camV.x/vv*Sp,r.camV.y/vv*Sp));
  r.cam=se(r.cam.x+r.camV.x*t,r.cam.y+r.camV.y*t);
  r.camLock=(r.camLock==null?0:r.camLock)+(0-(r.camLock||0))*Xe(t,.18);Ocl=r.camLock}}
{if(typeof document!=='undefined'&&document.head){const st=document.createElement('style');st.textContent='body.space-carve .boost-meter{display:none}';document.head.appendChild(st)}}

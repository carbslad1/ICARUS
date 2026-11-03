// Water controls (designer request, 2026-10-27). The camera is source/camera.js.
// - Space carves (DEMO.tune.carve): Space is the carve key in place of W / up, under water and in the air (held into the
//   splash it carves from the first frame; held through the surface it adds the corkscrew). W / up only move you in
//   the air. Boost is gone. The touch button and gamepad A carve too.
// - Carving is always anticlockwise (DEMO.tune.ccw, off by default: the designer reverted it after trying it): v3 turns the nose up toward the side you face, so a dive to the
//   left carved clockwise. Here the carve always faces right, so a dive to the left first swings down through
//   straight down and then up to the right. Letting go past straight up no longer turns you round.
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
// The breach shockwave in free swimming (designer, 2026-11-02: "turn the splash knockback/rocketboost that pushed
// enemies back on"): forward-only swimming fires a rocket blast as you leave the water and the Space carve a breach burst,
// but free swimming fired neither. With DEMO.tune.breachblast every breach fires v3's exit blast where you leave the water,
// leaning the way you launch: Settings › Launch › Rocket boost sets its size (shockwave size × exit blast), push and
// spread; v3's shock code then pushes the enemies it reaches (Orshock, every step).
{const zqb=Zq;Zq=function(r){zqb(r);const m=r.medium;
  if(!r?.demo||!DEMO.tune.breachblast||Orw.on||Controls.carve()||m?.kind!=='air')return;
  const R=Orw.srad*Orw.xb;if(!(R>0))return;const a=Math.atan2(m.vy,m.vx);
  Orring(r,m.origin.x,0,R,a);r.events.push({kind:'rocketout',pos:se(m.origin.x,0),a,e:wt(Orw.sbias,0,.8),splash:Orw.splash,R,T:Math.max(.05,Orw.stime)})}}
// Breach latch (DEMO.tune.airlatch; designer, 2026-11-03: holding D "i have to let go to stop the dolphin hitting the
// edge of the screen"): a direction held as you leave the water is the trick's (the key held at the breach chooses it), so
// in the air it does not move the dolphin until it is let go; a direction pressed in the air moves it at once. Each axis
// separately: holding D through the breach, W still lifts you.
{const swl=sw;sw=function(r,t,...a){
  if(r?.demo&&DEMO.tune.airlatch&&t){const k=r.medium?.kind,L=r.airLatch||(r.airLatch={x:0,y:0,k});
    if(k==='air'&&L.k==='water'){L.x=Math.sign(t.x||0);L.y=Math.sign(t.y||0)}
    if(k!=='air'){L.x=L.y=0}else if(L.x||L.y){const x=t.x||0,y=t.y||0;if(L.x&&Math.sign(x)!==L.x)L.x=0;if(L.y&&Math.sign(y)!==L.y)L.y=0;if(L.x||L.y)t={...t,x:L.x?0:x,y:L.y?0:y}}
    L.k=k}
  return swl(r,t,...a)}}
// v3's opening hint names W as the carve key; with Space carving it names Space (and W A S D choose a trick, source/tricks.js)
{const zd0=Zd;Zd=function(...a){const o=zd0(...a);const tk=DEMO.tune.tricks&&DEMO.tune.rules;if(Controls.carve())ci='HOLD SPACE TO CARVE \xB7 LET GO TO LAUNCH';else if(!Orw.on)ci='A / D TO TURN \xB7 W OR SPACE TO BOOST';if(tk)ci+=' \xB7 HOLD A KEY AS YOU BREACH FOR A TRICK';return o}}
// chevrons at the top edge over the enemies waiting above the water that are still above the view
{const d0=Otdraw;Otdraw=function(R,r,m,title){d0(R,r,m,title);if(title||m?.kind!=='water'||!Camera.on())return;
  const G=R.telegraphs;for(const p of r.pursuers||[]){if(p.wet||p.y<=0)continue;const X=R.sx(p.x),Y=R.sy(p.y);if(Y>8||X<12||X>K-12)continue;
    G.poly([X,10,X-7,22,X+7,22]).fill({color:yt.hostile,alpha:.85})}}}
{if(typeof document!=='undefined'&&document.head){const st=document.createElement('style');st.textContent='body.space-carve .boost-meter{display:none}';document.head.appendChild(st)}}

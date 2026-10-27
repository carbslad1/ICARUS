/* Flight Deck vertical slice. The reference renderer and carve are retained; this block owns the
   combat, deck, score, economy and wave state. Prototype tuning is deliberately centralised below. */
var DEMO = (() => {
  // Weapon roles balanced 20 Oct with qa/weapons.cjs through delivery, coverage and cadence, not coefficients: Close is the
  // safest against swarms and divers, Shot the fastest against tanks and shooters, Blast the fastest against dense crowds.
  const weapons = {
    fin: {type:'Close',cad:'Rapid',coef:.7,damage:[6,9,12,20],cd:[22,18,15,11],range:6,crit:[.2,.3,.4,.5],cx:[1.75,2,2.25,2.5],kb:7,description:'Fast thrusts cleave nearby enemies. Strong critical hits.'},
    sonic: {type:'Close',cad:'Steady',coef:.9,damage:[5,8,11,16],cd:[36,32,28,24],range:6,crit:.03,cx:1.5,kb:13,side:'Armour',sideScale:.5,description:'A wide cone clears space. Armour also adds damage.'},
    arc: {type:'Close',cad:'Heavy',coef:1.5,damage:[10,14,19,28],cd:[42,38,34,30],range:6,crit:.03,cx:1.5,kb:3,description:'Lightning jumps to three further nearby enemies.'},
    minigun: {type:'Shot',cad:'Rapid',coef:.7,damage:[8,11,15,20],cd:[15,15,13,11],range:30,crit:[.05,.07,.09,.12],cx:2.5,kb:1,description:'Fast single-target rounds. Flat Shot damage scales every round.'},
    harpoon: {type:'Shot',cad:'Steady',coef:.9,damage:[14,24,36,50],cd:[40,36,32,28],range:30,crit:[.3,.35,.4,.45],cx:[2.25,2.5,2.75,3],kb:2,side:'Luck',sideScale:.1,description:'Accurate shots. Critical hits pierce; Luck also adds damage.'},
    laser: {type:'Shot',cad:'Heavy',coef:1.5,damage:[30,38,48,65],cd:[58,58,56,52],range:30,crit:[.1,.12,.15,.2],cx:[2.25,2.5,2.75,3],kb:0,description:'An instant beam pierces two additional enemies.'},
    flak: {type:'Blast',cad:'Rapid',coef:.7,damage:[4,6,9,13],cd:[42,38,34,30],range:18,crit:.03,cx:1.5,kb:4,blast:4,description:'Three shells spread into small explosions.'},
    rocket: {type:'Blast',cad:'Steady',coef:.9,damage:[10,16,25,38],cd:[56,48,42,36],range:18,crit:.03,cx:1.5,kb:7,blast:7,description:'A guided aim point and an impact blast. Edge hits deal less damage.'},
    depth: {type:'Blast',cad:'Heavy',coef:1.5,damage:[24,36,52,80],cd:[64,56,48,40],range:18,crit:.03,cx:1.5,kb:9,blast:8.5,side:'Max HP',sideScale:.15,description:'A lobbed charge aimed to intercept its target. Max HP also adds damage.'}
  };
  // Hand-cap levers (structure doc 5.4): kept open and tunable, to be balanced in play. The tuning panel edits these live.
  const TUNE_DEFAULT={bro:1,shake:1,flash:1,space:1,edge:.2,danger:1,lead:.5,mines:0,carve:1,ccw:0,sky:12,verbs:0,hop:6,dive:2,dashes:2,hold:1};  // space: step 1 (space.js); edge: share of its spawns from the screen edge; danger, lead, mines: step 2 (danger.js)
  const tune={...TUNE_DEFAULT};
  try{Object.assign(tune,JSON.parse(localStorage.getItem('icarus.scoreshow.tune')||'{}'))}catch(e){}
  const saveTune=()=>{try{localStorage.setItem('icarus.scoreshow.tune',JSON.stringify(tune))}catch(e){}};
  // Five independent trick identities. Their identity never gates movement or weapon damage.
  const cards=Object.fromEntries(FiveScore.faces.map(id=>[id,{name:FiveScore.names[id],family:['front','back'].includes(id)?'Flip':id==='cork'?'Corkscrew':id==='star'?'Pose':'Spout',mult:1,time:1}]));
  const charms=FiveScore.charms;
  // Brotato pressure (23 Oct, user: "do 1"): each zone 1 enemy's own health and contact damage growth, from Brotato's
  // data (brotato-reference/tables/enemies.md, reference only), in Obnm order: [health, +/wave, damage, +/wave].
  // Health is × OwB.hp, the factor v3 already used to put Brotato's wave-1 health in ICARUS units, so wave 1 is unchanged.
  // Damage is × 10, ICARUS's health scale (100 HP for Brotato's 10); the player's health gains follow the same × 10
  // (hpScale), so levels and Max HP keep pace as they do in Brotato. Off (tune.bro 0): v3's curves, as before.
  const BRO=[[3,2,1,.6],[1,1,1,.6],[4,2.5,1,.85],[8,1,1,.6],[15,4,1,.85],[8,4,1,1],[12,2,1,1],[20,11,2,.85],[30,22,1,1.15],
    [12,5,1,1.1],[10,24,1,1.2],[10,8,1,.85],[20,3,1,.6],[10,1,1,.85],[5,5,1,1],[5,3,1,.25],[100,20,1,1],[5,30,1,.85]],HPX=10;
  const hpScale=()=>tune.bro?HPX:1;
  function broEnemy(r,e,k){const b=tune.bro&&BRO[k];if(!b||!e)return;const w=r.wave,dk=Obk();
    e.hp=e.maxHp=Math.max(1,Math.round((b[0]+b[1]*(w-1))*OwB.hp*dk));e.dmg=(b[2]+b[3]*(w-1))*HPX*dk}
  // Contact and hostile-shot damage. v3's enemy step calls rw with one flat value (9 + wave/5) for any contact; with
  // Brotato pressure that becomes the touching enemy's own damage, and each new hostile shot carries its shooter's.
  function withContact(r,fn){if(!tune.bro)return fn();const rw0=rw,flat=9+Math.floor(r.wave/5),m=r.medium,me=he(r);
    rw=function(rr,a){if(a===flat){let src=null,best=1e9;
      for(const e of r.enemies){const x=m.kind==='air'?m.origin.x+e.pos.x:NaN,y=m.kind==='air'?m.origin.y+e.pos.y:NaN,d=Math.hypot(x-me.x,y-me.y)-e.radius;if(d<best){best=d;src=e}}
      for(const p of r.pursuers||[]){const d=Math.hypot(p.x-me.x,p.y-me.y)-p.radius;if(d<best){best=d;src=p.e}}
      if(src?.dmg!=null&&best<1.5)a=src.dmg}return rw0(rr,a)};
    try{return fn()}finally{rw=rw0}}
  function tagShots(r){if(!tune.bro)return;for(const sh of r.shots){if(sh.weapon!=='hostile'||sh.bd)continue;sh.bd=1;let src=null,best=1e9;
    for(const e of r.enemies){const d=Math.hypot(e.pos.x-sh.pos.x,e.pos.y-sh.pos.y);if(d<best){best=d;src=e}}if(src?.dmg!=null&&best<4)sh.damage=src.dmg}}
  const stats = {
    Close:{group:'combat',sizes:[1,2,3,4]},Shot:{group:'combat',sizes:[1,2,3,4]},Blast:{group:'combat',sizes:[1,2,3,4]},
    'Damage %':{group:'combat',sizes:[.04,.06,.10,.13]},'Attack speed':{group:'combat',sizes:[.04,.08,.12,.16]},Crit:{group:'combat',sizes:[.05,.08,.11,.14]},
    Reach:{group:'combat',sizes:[1,2,3,4]},Area:{group:'combat',sizes:[.05,.10,.15,.20]},
    'Max HP':{group:'defence',sizes:[3,6,9,12]},Armour:{group:'defence',sizes:[1,2,3,4]},Regen:{group:'defence',sizes:[2,3,4,5]},
    Lift:{group:'flight',sizes:[1,2,3,4]},Hang:{group:'flight',sizes:[1,2,3,4]},Drive:{group:'flight',sizes:[1,2,3,4]},'Air steering':{group:'flight',sizes:[.03,.06,.09,.12]},
    Pickup:{group:'economy',sizes:[1,2,3,4]},Luck:{group:'economy',sizes:[5,10,15,20]},'XP gain':{group:'economy',sizes:[.05,.10,.15,.20]}
  };
  const items = [
    {name:'Close training',up:'Close',value:3,down:'Shot',loss:1}, {name:'Sight glass',up:'Shot',value:3,down:'Armour',loss:1},
    {name:'Blast casing',up:'Blast',value:3,down:'Close',loss:1}, {name:'Hot rounds',up:'Damage %',value:.10},
    {name:'Quick mechanism',up:'Attack speed',value:.12,down:'Damage %',loss:.04}, {name:'Fine point',up:'Crit',value:.10},
    {name:'Wide field',up:'Area',value:.15}, {name:'Long sight',up:'Reach',value:3},
    {name:'Reinforced scales',up:'Max HP',value:9,down:'Damage %',loss:.04}, {name:'Shell weave',up:'Armour',value:3},
    {name:'Recovery tissue',up:'Regen',value:3}, {name:'Rising fin',up:'Lift',value:3},
    {name:'Floating fin',up:'Hang',value:3}, {name:'Driving fin',up:'Drive',value:3},
    {name:'Collector',up:'Pickup',value:3}, {name:'Lucky shell',up:'Luck',value:10}, {name:'Fast learner',up:'XP gain',value:.15},
    {name:'Steering fin',up:'Air steering',value:.09}
  ];
  // Stats come from Gear and level-up picks (design doc §4.10). Driving fin stays out of offers, as before.
  const gearStats=items.map((x,i)=>i).filter(i=>items[i].up!=='Drive');
  const tier=(v,l)=>Array.isArray(v)?v[l-1]:v;
  const choose=(r,a)=>a[Math.floor(ce(r)*a.length)];
  const shuffle=(r,a)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(ce(r)*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  const fmt=n=>Number.isInteger(n)?String(n):n.toFixed(1);
  const statText=(k,v)=>(v=k==='Max HP'?v*hpScale():v,(v>=0?'+':'')+fmt(v*(k.includes('%')||['Attack speed','Crit','Area','Air steering'].includes(k)?100:1))+(k.includes('%')||['Attack speed','Crit','Area','Air steering'].includes(k)?'%':'')+' '+k);
  // The standard flight uses the wave's launch speed (Wave schedule sliders × rocket speed), so card requirements follow the settings.
  const launchSpeed=w=>Dd(w)*(Orw.on?Orw.rk:1);
  const standard=w=>{const v=launchSpeed(w),vy=v*Math.sin(59*Math.PI/180),air=2*vy/15;return{height:vy*vy/30,air,apex:vy/15,distance:v*Math.cos(59*Math.PI/180)*air}};
  const clock=w=>w===20?90:Math.min(60,20+5*(w-1));
  const groups=w=>Obw[Math.min(20,Math.max(1,w))-1][1].filter(g=>g[8]<=0).concat(Obz);
  function expectedChips(w){let total=0;for(const g of groups(w)){
    let time=g[0],interval=g[2],left=g[1],first=true;
    while(time<clock(w)){for(const u of g[9])total+=(u[1]+u[2])/2*u[3]*(Obt[u[0]]?.[2]||1)*(first?g[5]:1);if(left--<=0)break;time+=interval;interval=Math.max(g[4],interval-g[3]);first=false;if(interval<=0)break}
  }return total+(w%10===0?25:0)}
  // The required mult grows geometrically, like a blind ladder, because the score machine now compounds (§4.3). [TUNE]
  const quota=w=>Math.max(1,Math.ceil(expectedChips(w)*2.2*Math.pow(1.23,w-1)));
  const cap=r=>FiveScore.draws(r.demo.score,r.demo.charms);
  // A hit bails the trick in progress; 0 HP busts the jump (design doc §4.6). Tuning values.
  const BUST={fall:24,revive:.5};
  const charmSlots=r=>5+(r.demo.charmBonus||0);
  function phase(r){const h=r.hand,t=h?.activeAir||0,p=h?.pred||{air:1,apex:.5};return t<p.apex-p.air*.1?'ascent':t<=p.apex+p.air*.1?'apex':'descent'}
  function strongest(r){return r.slots.map((g,slot)=>({id:g.id,slot,amount:weaponDamage(r,weapons[g.id],g.lvl,false)})).sort((a,b)=>b.amount-a.amount||a.slot-b.slot)[0]||{id:'',slot:-1,amount:0}}
  function ledger(r){const h=r.hand;return {K:h.K,kills:h.kills,hits:h.hits,air:h.activeAir,bails:h.bails,busted:!!h.busted,netUsed:!!h.netUsed,hpFrac:r.hp/Math.max(1,r.stats.maxHp),banked:r.demo.history.filter(x=>x.score>0).length,closeWeapons:r.slots.filter(g=>weapons[g.id]?.type==='Close').length,maxMulti:h.maxMulti,wave:r.wave,bankId:h.n,luck:r.demo.stats.Luck,angle:Math.abs(Math.atan2(Math.sin(h.launch.angle),Math.abs(Math.cos(h.launch.angle))))*180/Math.PI}}
  function returnBoss(r,e,pursuer=null){
    if(!e||e.hp<=0||r.demo.bossDefeated)return;
    if(r.enemies.some(q=>q.id===e.id)||(r.pursuers||[]).some(q=>q.id===e.id))return;
    // A boss cannot be retired by the inherited ordinary-enemy cleanup. Return its same living body and HP.
    while(r.enemies.length+(r.pursuers?.length||0)>=100){const index=r.enemies.findLastIndex(q=>q.role!=='boss');if(index>=0)r.enemies.splice(index,1);else{const j=r.pursuers.findLastIndex(q=>q.e?.role!=='boss');if(j<0)return;r.pursuers.splice(j,1)}}
    const me=he(r);e.off=0;e.pin=0;e.floor=-1e6;e.charge=0;e.velocity={x:0,y:0};
    if(r.medium.kind==='air'){e.pos=ye(r.medium.local.x+18,r.medium.local.y+7);e.px=r.medium.origin.x+e.pos.x;e.py=r.medium.origin.y+e.pos.y;r.enemies.push(e)}
    else if(pursuer){const p=pursuer;Object.assign(p,{x:me.x+24,y:8,px:me.x+24,py:8,off:0,wet:false,lurk:false,h:Math.PI,v:12});r.pursuers.push(p)}
    r.demo.bossRecoveries=(r.demo.bossRecoveries||0)+1;
  }
  function bossAlive(r){return r.enemies.some(e=>e.role==='boss'&&e.hp>0)||(r.pursuers||[]).some(p=>p.e?.role==='boss'&&p.e.hp>0)}
  function diagnosis(r){const t=r.demo.waveTelemetry||{},h=r.hand;return {wave:r.wave,reason:r.endReason||null,score:r.wscore,quota:r.quota,quotaRatio:r.wscore/Math.max(1,r.quota),quotaMet:r.wscore>=r.quota,hp:r.hp,maxHp:r.stats.maxHp,armour:r.stats.armour,regen:r.demo.stats.Regen,activeAir:r.demo.air,airRemaining:r.budget,overtime:!!r.demo.overtime,overtimeAir:r.demo.overtimeAir||0,damageTaken:t.damageTaken||0,acceptedHits:t.hits||0,primaryApplied:t.primaryApplied||0,secondaryApplied:t.secondaryApplied||0,chips:r.wkill,bankedFlights:r.demo.history.length,busts:t.busts||0,bails:t.bails||0,unbankedChips:h?.open?h.K:0,unbankedBaseEstimate:h?.open?Math.round(h.K*h.mult):0,slots:r.slots.map(g=>({id:g.id,tier:g.lvl})),lastHits:(t.lastHits||[]).slice(-6),bossSpawned:!!r.demo.bossSpawned,bossDefeated:!!r.demo.bossDefeated,bossRecoveries:r.demo.bossRecoveries||0};}
  // Kills are chips, plus chip bonuses for how they happened (design doc §4.2). Score only; damage is untouched.
  function recordKill(r,e,ctx){const h=r.hand;if(!h)return;const t=h.activeAir,ph=phase(r),kv=e.kv||1,B=FiveScore.chipBonus;
    let multi=0;if(ctx.primary){const id=ctx.attackId||0;h.attackKills[id]=(h.attackKills[id]||0)+1;h.maxMulti=Math.max(h.maxMulti,h.attackKills[id]);if(h.attackKills[id]>=2)multi=B.multi}
    const apex=ph==='apex'?B.apex:0,crit=ctx.crit?B.crit:0,bonus=multi+apex+crit;
    h.K+=kv+bonus;h.phaseChips[ph]+=kv+bonus;h.bonus.multi+=multi;h.bonus.apex+=apex;h.bonus.crit+=crit;
    ScoreCues.chips(r,kv+bonus,Mr(r.medium.origin,e.pos),bonus?{multi,apex,crit}:null);
    h.kills.push({t,phase:ph,kv,bonus,weaponType:weapons[ctx.weapon]?.type,primary:ctx.primary,attackId:ctx.attackId,above:e.pos.y-r.medium.local.y>=2,crit:!!ctx.crit,opening:t<=1,late:h.pred.air-t<=1,entry:ctx.item==='I07'});
  }
  function sync(r){
    const s=r.demo.stats;
    r.stats.damage=Math.max(.05,1+s['Damage %']);r.stats.fireRate=Math.max(.1,1+s['Attack speed']);
    r.stats.armour=s.Armour+2*r.slots.filter(g=>weapons[g.id]?.type==='Close').length;
    // Levels do not add Max HP (design doc §4.10): only the Max HP stat does.
    r.stats.maxHp=100+s['Max HP']*hpScale();r.stats.magnet=13+s.Pickup;r.stats.xpRate=Math.max(.1,1+s['XP gain']);
    r.hp=Math.min(r.hp,r.stats.maxHp);
  }
  function init(r,starter){
    r.world='open';r.diff='standard';r.demo={stats:Object.fromEntries(Object.keys(stats).map(k=>[k,0])),deck:[],draw:[],discard:[],charms:[],history:[],offers:[],rerolls:{},handBonus:0,skim:0,skipRun:0,dirs:[],charmBonus:0,uid:20,regen:0,air:0,spawn:0,lastDir:0,toast:'',last:null};
    r.slots=[Owslot(weapons[starter]?starter:'harpoon',1,++r.demo.uid)];r.slots[0].paid=0;r.slots[0].cd=0;
    Object.assign(r.demo,{score:FiveScore.create(),heldHand:null,itemCounts:{},itemState:FiveCombat.create(),charmPaid:{},charmFaces:{},statInventory:[],pack:null,shelfBonus:0,rerollDiscount:0,shopMultiplier:1,attackSeq:0});
    r.hp=100;r.xp=0;r.lvl=0;r.lxp=0;r.lvup=0;r.bag=0;r.eorbs=[];r.crow=[];r.items={};r.vouchers={};r.hands=[];
    wave(r);sync(r);return r;
  }
  // A wave starts diving to the right (lastDir 1), so coming round in the first dive counts as a turn-round.
  function wave(r){
    const d=r.demo;r.budget=clock(r.wave);r.quota=quota(r.wave);r.wscore=0;r.wkill=0;r.armed=false;r.hand=null;r.hands=[];r.aft=null;r.endReason=null;
    d.air=0;d.spawn=0;d.skim=0;d.skipRun=0;d.dirs=[];d.draw=[];d.discard=[];d.heldHand=null;{const relay=d.score.relay;FiveScore.resetWave(d.score);d.score.relay=relay}FiveCombat.initWave(r);d.history=[];d.bossSpawned=false;d.bossDefeated=false;d.bossRecoveries=0;d.overtime=false;d.overtimeAir=0;d.overtimeRecycles=0;d.waveTelemetry={damageTaken:0,hits:0,primaryApplied:0,secondaryApplied:0,lastHits:[]};d.lastFailure=null;d.lastDir=1;
    
    r.enemies=[];r.pursuers=[];r.shots=[];r.wshots=[];r.eorbs=[];r.departing=[];r.warns=[];r.bw=-1;r.bq=[];r.spawnRemaining=0;r.boss=null;
    r.medium={kind:'water',pos:se(0,-10.5),heading:-Math.PI/4,velocity:{x:18,y:-18}};r.cam=se(0,-10.5);r.camV=se(0,0);r.row=false;r.tkq=null;
  }
  function forecast(r,m){const s=r.demo.stats,vy=Math.max(.1,m.vy),g=15*Math.max(.4,1-.025*s.Hang),air=vy/15+Math.sqrt((vy*vy/15)/g);return{height:vy*vy/30,air,apex:vy/15,distance:Math.abs(m.vx)*air,turned:r.demo.lastDir!==0&&r.demo.lastDir!==Math.sign(m.vx)}};
  function open(r){const d=r.demo,m=r.medium,s=d.stats;m.vx*=Math.max(.25,1+.03*s.Drive);m.vy*=Math.max(.25,1+.03*s.Lift);
    const pred=forecast(r,m),hand=d.heldHand||FiveScore.draw(d.score,cap(r),()=>ce(r));d.heldHand=hand;
    const raw=FiveScore.evaluate(d.score,hand,{K:0,wave:r.wave,preview:true},[],()=>.5);
    r.hand={n:d.history.length+1,open:1,K:0,M:raw.mult,mult:raw.mult,banked:0,drawn:hand.slice(),parts:[],trick:'plain',kills:[],completed:hand.map(id=>({id,name:cards[id].name,family:cards[id].family})),controls:[],slots:hand.length,cap:cap(r),air:0,activeAir:0,airAll:0,t0:r.time,x0:m.origin.x,peak:0,dist:0,hits:0,hpLost:0,
      launch:{angle:Math.atan2(m.vy,m.vx),speed:Math.hypot(m.vx,m.vy)},pred,ref:standard(r.wave),apex:false,active:null,held:[],lit:[],fizzles:[],phaseChips:{ascent:0,apex:0,descent:0},bonus:{multi:0,apex:0,crit:0},bails:[],busted:false,netUsed:false,attackKills:{},maxMulti:0};
    ScoreCues.begin(r);FiveCombat.breach(r);r.hand.itemStart={...r.demo.itemState.triggers};
  }
  function fireCharms(){} // Phase facts are accumulated in combat; score charms resolve exactly once at entry.
  function nextCard(){}
  function tickCards(r){const h=r.hand;if(!h?.open)return;if(h.busted){h.active=null;return}ScoreCues.tick(r);const n=h.drawn.length,i=Math.min(n-1,Math.floor(h.air/Math.max(.1,h.pred.air)*n)),id=h.drawn[i];h.active={list:[{id}],elapsed:(h.air/Math.max(.1,h.pred.air)*n)%1,time:1};h.parts=[{spout:'spout',front:'front',back:'front',cork:'cork',star:'pose'}[id]]}
  function bank(r){const h=r.hand;if(!h?.open)return;const d=r.demo;d.score.luck=d.stats.Luck;
    const result=FiveScore.evaluate(d.score,h.drawn,ledger(r),d.charms.map(id=>({id,face:d.charmFaces[id]})),()=>ce(r));
    h.active=null;h.open=0;h.M=h.mult=result.mult;h.chips=result.chips;h.banked=result.score;r.wscore+=h.banked;d.pendingPearls=(d.pendingPearls||0)+(result.pearls||0);
    if(h.busted)r.hp=Math.max(1,Math.round(r.stats.maxHp*BUST.revive));
    ScoreCues.finish(r,result);
    const items=Object.entries(d.itemState.triggers).map(([id,n])=>({id,name:FiveCombat.items[id].name,count:n-(h.itemStart[id]||0)})).filter(x=>x.count>0);
    d.history.push({base:result.base,items,techniqueLog:result.techniqueLog,predAir:h.pred.air,apexWeapon:d.itemState.apex.id,chips:result.chips,killChips:h.K,bonus:{...h.bonus},mult:h.mult,score:h.banked,pearls:result.pearls||0,busted:!!h.busted,bails:result.bails.slice(),cards:h.drawn.map(id=>cards[id].name),drawn:h.drawn.slice(),combos:result.combos,charmLog:result.charmLog,kills:h.kills.length,air:h.activeAir,physicalAir:h.air,peak:h.peak,hits:h.hits,hpLost:h.hpLost,launch:{...h.launch},slots:h.slots,cap:h.cap,phases:{...h.phaseChips},entryKills:h.kills.filter(k=>k.entry).length});d.last=d.history.at(-1);
    for(const c of result.charmLog||[])if(c.active){const effect=c.factor>1?'×mult':c.chips?'+chips':c.pearls?'pearls':c.after!==c.before?'+mult':null,amount=c.factor>1?c.factor:c.chips||c.pearls||c.after-c.before;if(!effect)continue;d.lastCharm={name:c.name,effect,value:amount,t:r.time};r.events.push({kind:'charm',pos:he(r),name:c.name,effect,value:amount,seq:(r.events.filter(e=>e.kind==='charm').length+1)})}
    r.events.push({kind:'bank',pos:he(r),value:h.banked,K:result.chips,M:h.mult,n:h.drawn.length,busted:!!h.busted,trick:'plain'});
    if(h.K>0||h.busted)d.heldHand=null;
  }
  function damage(r,e,amount,weapon,dx=0,dy=0,kb=0,crit=false,ctx=null){
    if(r.mode!=='playing'||r.medium.kind!=='air'||r.armed||r.hand?.busted||!r.enemies.includes(e)||e.hp<=0)return;
    ctx={...(ctx||r.demo.currentAttack||{primary:false,weapon,base:amount}),beforeHP:e.hp,amount};
    amount=FiveCombat.beforeDamage(r,e,amount,ctx);e.hp-=amount;ctx.amount=amount;ctx.killed=e.hp<=0;const applied=Math.min(ctx.beforeHP,amount);if(r.demo.waveTelemetry)r.demo.waveTelemetry[ctx.primary?'primaryApplied':'secondaryApplied']+=applied;r.events.push({kind:'damage',pos:Mr(r.medium.origin,e.pos),value:amount,applied:Math.min(ctx.beforeHP,amount),primary:ctx.primary,item:ctx.item,weapon,id:e.id,crit:!!crit});
    if(e.hp>0){e.velocity.x+=dx*kb;e.velocity.y+=dy*kb;FiveCombat.afterDamage(r,e,ctx);return}
    r.enemies=r.enemies.filter(x=>x!==e);r.kills++;r.flightKills++;r.wkill+=e.kv;r.waveKills++;
    // as v3's kill (lw): a splitter breaks into two swarmers
    if(e.kind==='splitter')for(let s=0;s<2&&r.enemies.length+(r.pursuers?.length||0)<100;s++){const o=6*Ld(r.wave);r.enemies.push({...e,id:++r.id,kind:'swarmer',xp:Osp.xp,tint:0,pos:ye(e.pos.x+(s?1.3:-1.3),e.pos.y+1.5),hp:o,maxHp:o,radius:ObR(1),age:0,velocity:{x:s?12:-12,y:8}})}
    if(e.role==='boss')r.demo.bossDefeated=true;recordKill(r,e,ctx);FiveCombat.afterDamage(r,e,ctx);
    Oxedrop(r,r.medium,e);r.events.push({kind:'kill',pos:Mr(r.medium.origin,e.pos),enemy:e.kind,weapon,value:e.kv});
  }
  function hit(r,amount){
    if(r.medium.kind!=='air'||r.armed||r.hand?.busted||r.hurt>0||r.medium.elapsed<.3)return;
    const a=r.stats.armour,f=a>=0?15/(15+a):1-a/15,value=FiveCombat.acceptedHit(r,amount*f);
    r.hp=Math.max(0,r.hp-value);r.hurt=tune.bro?Math.min(.4,Math.max(.2,value/Math.max(1,r.stats.maxHp)*.4/.15)):.7;r.metrics.hits++;if(r.hand){r.hand.hits++;r.hand.hpLost+=value}
    const t=r.demo.waveTelemetry;if(t){t.damageTaken+=value;t.hits++;t.lastHits.push({air:r.demo.air,value,hp:r.hp,phase:r.hand?phase(r):'air',enemies:r.enemies.length});if(t.lastHits.length>12)t.lastHits.shift();}
    r.events.push({kind:'hit',pos:he(r),value});if(value>0)bail(r);if(r.hp<=0)bust(r);
  }
  // A hit bails the trick in progress: it pays nothing and does not count for combos. Landed tricks keep their value.
  function bail(r){const h=r.hand;if(!h?.open||h.busted)return;const n=h.drawn.length,i=Math.floor(h.air/Math.max(.1,h.pred.air)*n);
    if(i>=n||i<(h.scoreShow?.count||0)||h.bails.includes(i))return;
    if(r.demo.charms.includes('N15')&&!h.netUsed){h.netUsed=true;ScoreCues.saved(r,i);return}
    h.bails.push(i);r.demo.waveTelemetry&&(r.demo.waveTelemetry.bails=(r.demo.waveTelemetry.bails||0)+1);ScoreCues.bail(r,i);
  }
  // 0 HP busts the jump: out of combat, the dolphin falls from where it is, spending air clock; it banks nothing at the water.
  function bust(r){const h=r.hand,m=r.medium;r.hp=0;if(!h?.open||h.busted)return;h.busted=true;h.active=null;m.vy=Math.min(m.vy,-BUST.fall);m.vx*=.4;
    r.demo.waveTelemetry&&(r.demo.waveTelemetry.busts=(r.demo.waveTelemetry.busts||0)+1);r.events.push({kind:'bust',pos:he(r)});ScoreCues.bust(r);
  }
  // Enemies are v3 carve's: its spawn schedule (Obs, called from ME), bodies, health and movement. spawn() is for the
  // demo's boss and for tests; an ordinary enemy is made by v3's own Ospw, just outside the view's edge as v3's Obq does.
  function spawn(r,boss=false,kindIndex=null){
    if(r.enemies.length+(r.pursuers?.length||0)>=100)return;
    const w=r.wave,V=Ovv(r),o=r.medium.origin,side=ce(r)<.5?-1:1,x=V.x-o.x+side*(V.w+1),y=Math.max(V.y-o.y-V.h+4+ce(r)*Math.max(0,2*V.h-8),-o.y+5);
    if(!boss){const k=kindIndex??choose(r,groups(w).flatMap(g=>g[9].map(u=>u[0])));Ospw(r,r.medium,k,x,y,side);return}
    r.enemies.push({id:++r.id,kind:'charger',role:'boss',pos:ye(x,y),px:o.x+x,py:o.y+y,velocity:{x:0,y:0},hp:900+w*120,maxHp:900+w*120,radius:3.2,kv:25,xp:25,tint:0xff665e,age:0,seed:ce(r)*10,timer:2,shoot:2,charge:0,aim:{x:0,y:0},orbitHit:0,floor:-1e6,bk:18,boss:'boss'});
  }
  function weaponDamage(r,d,l,crit){const s=r.demo.stats,side=d.side==='Armour'?r.stats.armour:d.side==='Max HP'?r.stats.maxHp:s[d.side]||0;
    return Math.max(1,(tier(d.damage,l)+d.coef*s[d.type]+(d.sideScale||0)*side)*r.stats.damage)*OwB.hp*(crit?tier(d.cx,l):1)}
  function burst(r,x,y,rad,amount,id,kb,skip,crit=false,ctx=null){
    for(const e of [...r.enemies]){const dist=Math.hypot(e.pos.x-x,e.pos.y-y);if(e.id===skip||dist>rad+e.radius)continue;
      damage(r,e,amount*(1-.35*Math.min(1,dist/rad)),id,(e.pos.x-x)/(dist||1),(e.pos.y-y)/(dist||1),kb,crit,ctx)}
    r.events.push({kind:'boom',pos:Mr(r.medium.origin,{x,y}),value:rad,weapon:id});
  }
  function fire(r,dt){
    const m=r.medium,air=m.kind==='air',s=r.demo.stats;
    const me=m.local,T=air&&!r.armed?[...r.enemies].sort((a,b)=>Math.hypot(a.pos.x-me.x,a.pos.y-me.y)-Math.hypot(b.pos.x-me.x,b.pos.y-me.y)):[];
    for(const g of r.slots){const d=weapons[g.id],l=g.lvl;g.fx+=dt;g.cd=Math.max(0,(g.cd||0)-dt*r.stats.fireRate);
      // The gun ring turns each gun towards its target every tick, as in v3: the nearest enemy within range + 8 m (none: it
      // faces forward). It keeps its current target until another is clearly nearer (×0.8), so it doesn't swing between two.
      const range=d.range+s.Reach*(d.type==='Close'?.5:1),dist=e=>Math.hypot(e.pos.x-me.x,e.pos.y-me.y),near=T.find(e=>e.hp>0&&dist(e)<=range+8+e.radius);
      const held=g.tg&&near&&near.id!==g.tg?T.find(e=>e.id===g.tg&&e.hp>0&&dist(e)<=range+8+e.radius):null;
      g.tg=held&&dist(near)>dist(held)*.8?held.id:near?near.id:0;
      if(!air||r.armed||r.hand?.busted||g.cd>0)continue;
      const tgt=g.tg&&T.find(e=>e.id===g.tg&&e.hp>0&&dist(e)<=range+e.radius),target=tgt||T.find(e=>e.hp>0&&dist(e)<=range+e.radius);if(!target)continue;  // hp>0: an earlier weapon this tick may have killed it
      const angle=Math.atan2(target.pos.y-me.y,target.pos.x-me.x),c=Math.cos(angle),sn=Math.sin(angle),crit=ce(r)<wt(tier(d.crit,l)+s.Crit,0,1),amount=weaponDamage(r,d,l,crit);
      r.demo.currentAttack={primary:true,attackId:++r.demo.attackSeq,weapon:g.id,slot:r.slots.indexOf(g),base:weaponDamage(r,d,l,false),crit};
      g.aim=angle;g.fx=0;g.cd=tier(d.cd,l)/60;g.tg=target.id;
      if(g.id==='fin'||g.id==='sonic'){
        const radius=range*(1+s.Area),cone=g.id==='sonic'?Math.min(Math.PI*2,1.7*(1+s.Area)):Math.PI*2;
        for(const e of T){const dx=e.pos.x-me.x,dy=e.pos.y-me.y,dist=Math.hypot(dx,dy),da=Math.atan2(Math.sin(Math.atan2(dy,dx)-angle),Math.cos(Math.atan2(dy,dx)-angle));if(dist<=radius+e.radius&&Math.abs(da)<=cone/2)damage(r,e,amount,g.id,dx/(dist||1),dy/(dist||1),d.kb,crit)}
        r.events.push({kind:g.id==='fin'?'thrust':'pulse',pos:Mr(m.origin,me),to:Mr(m.origin,{x:me.x+c*range,y:me.y+sn*range}),value:radius,aim:angle,cone,weapon:g.id,crit});
      }else if(g.id==='arc'){
        let at=me,remaining=[...T];for(let i=0;i<4;i++){remaining.sort((a,b)=>Math.hypot(a.pos.x-at.x,a.pos.y-at.y)-Math.hypot(b.pos.x-at.x,b.pos.y-at.y));const e=remaining.shift();if(!e||Math.hypot(e.pos.x-at.x,e.pos.y-at.y)>(i?5*(1+s.Area):range)+e.radius)break;
          r.events.push({kind:'beam',pos:Mr(m.origin,at),to:Mr(m.origin,e.pos),weapon:'arc'});damage(r,e,amount*Math.pow(.85,i),'arc',0,0,0,crit);at=e.pos}
      }else if(g.id==='laser'){
        const line=T.map(e=>({e,u:(e.pos.x-me.x)*c+(e.pos.y-me.y)*sn})).filter(q=>q.u>0&&q.u<range+q.e.radius&&Math.abs(-(q.e.pos.x-me.x)*sn+(q.e.pos.y-me.y)*c)<q.e.radius+1).sort((a,b)=>a.u-b.u);
        line.slice(0,3).forEach((q,i)=>damage(r,q.e,amount*Math.pow(.8,i),g.id,0,0,0,crit));r.events.push({kind:'beam',pos:Mr(m.origin,me),to:Mr(m.origin,{x:me.x+c*range,y:me.y+sn*range}),weapon:g.id,crit});
      }else{
        for(let j=0;j<(g.id==='flak'?3:1);j++){
          const a=angle+(g.id==='flak'?(j-1)*.16:0),speed=d.type==='Shot'?100:70,gravity=g.id==='depth'?25:0,flight=Math.max(.15,Math.min(.8,Math.hypot(target.pos.x-me.x,target.pos.y-me.y)/speed));
          const velocity=gravity?{x:(target.pos.x-me.x)/flight+target.velocity.x,y:(target.pos.y-me.y)/flight+target.velocity.y+gravity*flight/2}:{x:Math.cos(a)*speed,y:Math.sin(a)*speed};
          r.shots.push({id:++r.id,weapon:g.id,pos:{...me},velocity,damage:amount,radius:g.id==='depth'?.55:.3,life:gravity?flight+.15:(range+3)/speed,pierce:g.id==='harpoon'&&crit?2:1,pdr:0,hit:[],slot:r.slots.indexOf(g),ctx:{...r.demo.currentAttack},crit,kb:d.kb,ex:(d.blast||0)*(1+s.Area),g:gravity});
        }
      }
      r.events.push({kind:'shot',pos:Mr(m.origin,me),weapon:g.id,slot:r.slots.indexOf(g)});r.demo.currentAttack=null;
    }
  }
  // v3 carve's enemy step (ME): the spawn schedule, each kind's movement, turret fire, contact damage, hostile shots
  // and the seabed. v3's weapons (AE) are off in the demo, and ME is shown only the hostile shots, so the demo's own
  // shots (lobbing, blasts, knockback) are moved and resolved below.
  function continueSchedule(r){
    if(r.budget>1e-8||!r.bg?.length||r.bg.some(G=>!G.d))return;
    // Keep the current wave roster and its terminal cadence if every finite scheduled lane is exhausted.
    // Normal 999-repeat lanes continue through the inherited scheduler without any extra spawns.
    const k=Math.floor((r.bt||0)/Math.max(.05,Osp.len)+1e-9),eligible=r.bg.filter(G=>G.g?.[1]>0&&G.g[8]<=0&&!Obz.includes(G.g));
    for(const G of eligible){G.d=0;G.f=1;G.l=Math.max(1,G.g[1]);G.v=Math.max(G.g[4],G.v||G.g[2],.05);G.n=k+G.v;}
    if(eligible.length)r.demo.overtimeRecycles=(r.demo.overtimeRecycles||0)+1;
  }
  function enemies(r,m,input,dt){
    const mine=r.shots.filter(s=>s.weapon!=='hostile');r.shots=r.shots.filter(s=>s.weapon==='hostile');
    const bosses=r.enemies.filter(e=>e.role==='boss'&&e.hp>0);try{withContact(r,()=>ME(r,m,input,dt))}finally{r.shots=r.shots.concat(mine)}for(const e of bosses)returnBoss(r,e);continueSchedule(r);tagShots(r);
    // the demo's boss (waves 10 and 20) also fires at you
    for(const e of r.enemies)if(e.role==='boss'&&(e.shoot-=dt)<=0&&!r.armed){e.shoot=1.4;const dx=m.local.x-e.pos.x,dy=m.local.y-e.pos.y,dist=Math.hypot(dx,dy)||1;r.shots.push({id:++r.id,weapon:'hostile',pos:{...e.pos},velocity:{x:dx/dist*19,y:dy/dist*19},life:4,radius:.45,damage:7+r.wave*.4,hit:[],bd:1})}
  }
  function shots(r,dt,live){
    for(const sh of [...r.shots]){
      if(sh.life<=0||sh.weapon==='hostile')continue;const from={...sh.pos};sh.g&&(sh.velocity.y-=sh.g*dt);sh.pos.x+=sh.velocity.x*dt;sh.pos.y+=sh.velocity.y*dt;sh.life-=dt;
      if(!live)continue;
      for(const e of [...r.enemies]){if(sh.life<=0||sh.hit.includes(e.id)||ew(e.pos,from,sh.pos)>sh.radius+e.radius)continue;
        sh.hit.push(e.id);const dx=e.pos.x-from.x,dy=e.pos.y-from.y,dist=Math.hypot(dx,dy)||1;damage(r,e,sh.damage,sh.weapon,dx/dist,dy/dist,sh.kb,sh.crit,sh.ctx);
        if(sh.ex){burst(r,e.pos.x,e.pos.y,sh.ex,sh.damage,sh.weapon,sh.kb,e.id,sh.crit,sh.ctx);sh.ex=0}if(--sh.pierce<=0)sh.life=0;
      }
      if(sh.life<=0&&sh.ex){burst(r,sh.pos.x,sh.pos.y,sh.ex,sh.damage,sh.weapon,sh.kb,0,sh.crit,sh.ctx);sh.ex=0}
    }
    const hostile=r.shots.filter(x=>x.weapon==='hostile'),own=r.shots.filter(x=>x.weapon!=='hostile'&&x.life>0).slice(-240);r.shots=hostile.concat(own);
  }
  function combat(r,m,input,dt){
    const d=r.demo;d.air+=dt;d.overtimeAir+=Math.max(0,dt-Math.max(0,r.budget));r.hand.activeAir+=dt;FiveCombat.tick(r,dt);
    if(!d.bossSpawned&&r.wave%10===0&&d.air>=clock(r.wave)*.3){spawn(r,true);d.bossSpawned=bossAlive(r)}
    fire(r,dt);enemies(r,m,input,dt);if(r.mode!=='playing')return;shots(r,dt,true);
    Oxeair(r,m,dt);
    if(r.hand?.busted){}else if(tune.bro){const R=d.stats.Regen;if(R>0&&r.hp<r.stats.maxHp){d.regenT=(d.regenT||0)+dt;const period=5/(1+(R-1)/2.25);
      while(d.regenT>=period){d.regenT-=period;r.hp=Math.min(r.stats.maxHp,r.hp+hpScale())}}else d.regenT=0}
    else r.hp=Math.min(r.stats.maxHp,r.hp+Math.max(0,d.stats.Regen)*dt/5);r.metrics.peakEnemies=Math.max(r.metrics.peakEnemies,r.enemies.length);
  }
  // Retained diagnostic drift helper; normal play keeps live combat after timer expiry until actual water entry.
  function drift(r,m,input,dt){enemies(r,m,input,dt);shots(r,dt,false)}
  function finish(r){
    if(r.mode!=='playing')return;const d=r.demo;const report={wave:r.wave,score:r.wscore,quota:r.quota,killed:r.wkill,hands:d.history.length,diagnosis:diagnosis(r)};r.lastWave=report;
    if(r.wscore<r.quota){r.mode='dead';r.endReason='quota';d.lastFailure=diagnosis(r);return}
    // Overscore funds the build: half the base pay per full quota beaten, up to one more base pay (design doc §4.10). [TUNE]
    const base=24+r.wave*4,bonus=Math.min(base,Math.floor(base*.5*Math.max(0,r.wscore/r.quota-1))),interest=Math.min(8,Math.floor(r.xp*.1)),extra=d.pendingPearls||0;
    report.pay={clear:base,score:bonus,interest,charms:extra,total:base+bonus+interest+extra};d.pendingPearls=0;r.xp+=report.pay.total;r.earned+=report.pay.total;r.hp=r.stats.maxHp;
    if(r.wave===20){r.mode='won';r.milestones.victory=true}else{r.mode='shop';shop(r);levelChoices(r)}
  }
  function rarity(r){const a=ce(r),luck=Math.max(0,r.demo.stats.Luck)*.001;return a<.015+r.wave*.002+luck?4:a<.10+r.wave*.007+luck?3:a<.35+r.wave*.01+luck?2:1}
  const price=(r,base)=>Math.max(1,Math.floor((base+r.wave+.1*base*r.wave)*r.demo.shopMultiplier));
  // Rarity sets how often an offer appears, not only its price (design doc §4.10). Luck and later waves lift rarer odds.
  function rarityWeight(r,level){const luck=Math.max(0,r.demo.stats.Luck)*.002,late=Math.min(.3,.015*r.wave);return level>=3?.2+late+luck:level===2?.55+late/2+luck:1}
  function weighted(r,list,weight){const ws=list.map(weight),sum=ws.reduce((a,b)=>a+b,0);if(!list.length||!(sum>0))return undefined;let q=ce(r)*sum;for(let i=0;i<list.length;i++){q-=ws[i];if(q<0)return list[i]}return list.at(-1)}
  const types=r=>new Set(r.slots.map(g=>weapons[g.id].type));
  // After the commit offer, Routine offers favour the most-drawn trick.
  function routineFace(r){const s=r.demo.score;if(s.focus&&ce(r)<.65)return FiveScore.faces.reduce((a,b)=>s.weights[b]>s.weights[a]?b:a);return choose(r,FiveScore.faces)}
  function boundFace(r){const s=r.demo.score;return weighted(r,FiveScore.faces,f=>s.weights[f]+.05)}
  // Charm and gear offers lean towards the held build (design doc §4.10).
  function charmFit(r,id){const d=r.demo,s=d.score,top=Math.max(...FiveScore.faces.map(f=>s.weights[f]));
    if(['N12','S06','N09'].includes(id))return top>=.4||s.routines.Repeat>0?2:1;
    if(id==='N13')return s.routines.Formation>0?2:1;
    if(['S05','S02'].includes(id))return s.routines.Variety>0?2:1;
    if(['S13','N04'].includes(id))return 2;
    if(['S10','N01'].includes(id))return d.itemCounts.I05?2:1;
    return 1}
  function charmPool(r){const d=r.demo,n=cap(r),t=types(r);return Object.keys(charms).filter(id=>!d.charms.includes(id)&&!d.offers.some(o=>!o.bought&&o.row==='charm'&&o.id===id)&&!(id==='S05'&&n<5)&&!(charms[id].requires&&!d.itemCounts[charms[id].requires])&&!(id==='N04'&&!t.has('Close'))&&!(id==='N16'&&n>=FiveScore.tune.maxDraws))}
  // Defence gear is the only way to buy survival now that levels are gone, so it is offered more often.
  function gearFit(r,kind,id){const t=types(r),d=r.demo;if(kind==='stat'){const x=items[id];return (t.has(x.up)?2:x.down&&t.has(x.down)?.5:1)*(stats[x.up]?.group==='defence'?2:1)}
    return id==='I07'&&d.charms.includes('S13')||id==='I05'&&(d.charms.includes('S10')||d.charms.includes('N01'))?2:1}
  // One Routine upgrade: trick value, combo level, draw odds, an extra draw, a technique or the commit offer (design doc §4.9).
  function routineChoice(r){const d=r.demo,s=d.score,T=FiveScore.tune,kinds=[['polish',3],['routine',2],['transfer',2]];
    if(s.draws<T.maxBought)kinds.push(['draw',1.4]);if(r.wave>=4)kinds.push(['technique',.7]);if(!s.focus&&r.wave>=3)kinds.push(['focus',.25]);
    const kind=weighted(r,kinds,k=>k[1])[0],face=routineFace(r);
    if(kind==='routine'){const id=choose(r,['Repeat','Formation','Variety'].filter(g=>s.routines[g]<T.routineCap));if(id)return {kind,id}}
    if(kind==='draw'||kind==='focus')return {kind};
    if(kind==='technique'){const open=FiveScore.faces.filter(f=>!s.techniques[f]);if(open.length)return {kind,face:open.includes(face)?face:choose(r,open),id:choose(r,['lucky','gold','echo'])}}
    if(kind==='transfer'){const recipients=FiveScore.faces.filter(f=>s.weights[f]+T.transfer<=T.weightCap+1e-8),recipient=recipients.includes(face)?face:choose(r,recipients),donor=choose(r,FiveScore.faces.filter(f=>f!==recipient&&s.weights[f]>=T.transfer-1e-8));if(recipient&&donor)return {kind,donor,recipient}}
    const open=FiveScore.faces.filter(f=>s.polish[f]<T.polishCap);return {kind:'polish',face:open.includes(face)?face:choose(r,open)||face}}
  const routinePrice={polish:6,routine:8,transfer:5,technique:14,focus:18};
  function choicePrice(r,c){return c.kind==='draw'?22+12*(r.demo.score.draws-FiveScore.tune.baseDraws):routinePrice[c.kind]||8}
  function applyChoice(r,c){const s=r.demo.score;
    if(c.kind==='routine')return FiveScore.routine(s,c.id);if(c.kind==='polish')return FiveScore.polish(s,c.face);if(c.kind==='transfer')return FiveScore.transfer(s,c.donor,c.recipient);
    if(c.kind==='technique')return FiveScore.technique(s,c.face,c.id);if(c.kind==='draw')return FiveScore.addDraw(s);if(c.kind==='focus'){if(s.focus)return false;s.focus=true;return true}return false}
  const ruleIds=r=>['charm','reroll',...(r.demo.shelfBonus<1?['shelf']:[])];
  function offer(r,row){const d=r.demo,uid=++d.uid;
    if(row==='weapon'){const owned=r.slots.map(g=>g.id),types=r.slots.map(g=>weapons[g.id].type),pool=Object.keys(weapons),q=ce(r),id=q<.35?choose(r,owned):q<.7?choose(r,pool.filter(k=>types.includes(weapons[k].type))):choose(r,pool),level=q<.35&&ce(r)<.7?choose(r,r.slots.filter(g=>g.id===id&&g.lvl<4).map(g=>g.lvl))||Math.min(rarity(r),1+Math.floor(r.wave/4)):Math.min(rarity(r),1+Math.floor(r.wave/4));return {uid,row,id,level,price:price(r,[12,24,48,96][level-1])}}
    if(row==='charm'){const id=weighted(r,charmPool(r),id=>rarityWeight(r,charms[id].rarity)*charmFit(r,id));if(!id)return offer(r,'gear');return {uid,row,id,face:charms[id].bound?boundFace(r):null,price:price(r,charms[id].price)}}
    if(row==='gear')return offer(r,ce(r)<.45?'item':'stat');
    if(row==='item'){const pool=Object.keys(FiveCombat.items).filter(id=>!(id==='I05'&&r.wave<5)&&!(id==='I07'&&r.wave<3));const id=weighted(r,pool,id=>rarityWeight(r,FiveCombat.items[id].rarity)*gearFit(r,'item',id));return {uid,row,id,price:price(r,FiveCombat.items[id].price||18)}}
    if(row==='stat'){const id=weighted(r,gearStats,i=>gearFit(r,'stat',i));return {uid,row,id,price:price(r,10)}}
    if(row==='routine'){const choice=routineChoice(r);return {uid,row,id:choice.kind,choice,price:price(r,choicePrice(r,choice))}}
    if(row==='pack'){const mega=r.wave>=8&&ce(r)<.25,charmOk=d.charms.length+(mega?2:1)<=charmSlots(r)&&charmPool(r).length>0;return {uid,row,id:charmOk&&ce(r)<.4?'charm':'routine',mega,fallback:'',price:price(r,mega?12:7)}}
    return {uid,row:'voucher',id:choose(r,ruleIds(r)),price:price(r,35)};
  }
  // Shelf: weapon, gear, charm (+1 with the extra shelf); permanent run rules appear there as rare offers. Routine row: two offers.
  const inRoutineRow=o=>o.row==='routine'||o.row==='pack';
  function shelfOffer(r,i){if(r.wave>=2&&i>0&&ce(r)<.07)return offer(r,'voucher');return offer(r,i===0?'weapon':i===1?'gear':i===2?'charm':choose(r,['weapon','gear','charm']))}
  function routineOffer(r,i){return offer(r,i===0||ce(r)<.5?'routine':'pack')}
  function shop(r){const d=r.demo,held=[...new Map([...d.offers,...(d.deferredOffers||[])].filter(o=>o.locked&&!o.bought&&o.row!=='voucher').map(o=>[o.uid,o])).values()];
    d.offers=held.slice(0,6);d.deferredOffers=held.slice(6);d.pack=null;d.weaponChoice=null;d.rerolls={shelf:0,pack:0};
    const shelves=3+d.shelfBonus;for(let i=d.offers.filter(o=>!inRoutineRow(o)).length;i<shelves&&d.offers.length<6;i++)d.offers.push(shelfOffer(r,i));
    for(let i=d.offers.filter(inRoutineRow).length;i<2&&d.offers.length<6;i++)d.offers.push(routineOffer(r,i));
  }
  function levelChoices(r){if(!r.lvup){r.demo.levelChoices=[];return}const types=new Set(r.slots.map(g=>weapons[g.id].type)),all=Object.keys(stats).filter(k=>k!=='Drive');r.demo.levelChoices=['combat','defence','flight'].map(group=>{const pool=all.filter(k=>(stats[k].group===group||group==='flight'&&stats[k].group==='economy')&&(!['Close','Shot','Blast'].includes(k)||types.has(k)));return{id:choose(r,pool),level:rarity(r)}})}
  function addStat(r,k,v){r.demo.stats[k]+=v;sync(r);if(k==='Max HP'&&v>0)r.hp=Math.min(r.stats.maxHp,r.hp+v*hpScale())}
  const choiceKey=c=>[c.kind,c.id||'',c.face||'',c.donor||'',c.recipient||''].join(':');
  function packChoices(r,o){const d=r.demo,out=[],n=o.mega?5:3;
    for(let tries=0;out.length<n&&tries<60;tries++){let c=null;
      if(o.id==='charm'){const id=weighted(r,charmPool(r).filter(id=>!out.some(x=>x.id===id)),id=>rarityWeight(r,charms[id].rarity)*charmFit(r,id));if(id)c={kind:'charm',id,face:charms[id].bound?boundFace(r):null}}
      if(!c)c=routineChoice(r);
      if(!out.some(x=>choiceKey(x)===choiceKey(c)))out.push(c)}
    return out;
  }
  function packChoiceValid(r,c){const d=r.demo,s=d.score,T=FiveScore.tune;if(!c||c.used)return false;
    if(c.kind==='charm')return d.charms.length<charmSlots(r)&&!d.charms.includes(c.id);
    if(c.kind==='routine')return (s.routines[c.id]||0)<T.routineCap;
    if(c.kind==='polish')return (s.polish[c.face]||0)<T.polishCap;
    if(c.kind==='transfer')return c.donor!==c.recipient&&s.weights[c.donor]>=T.transfer-1e-5&&s.weights[c.recipient]+T.transfer<=T.weightCap+1e-5;
    if(c.kind==='technique')return ['gold','lucky','echo'].includes(c.id)&&s.techniques[c.face]!==c.id;
    if(c.kind==='draw')return s.draws<T.maxBought;
    if(c.kind==='focus')return !s.focus;
    return false;
  }
  function repairPack(r,p){const all=[];
    if(p.id==='charm')for(const id of charmPool(r))all.push({kind:'charm',id,face:charms[id].bound?boundFace(r):null});
    const routine=[{kind:'draw'},{kind:'focus'},...['Repeat','Formation','Variety'].map(id=>({kind:'routine',id}))];
    for(const face of FiveScore.faces){routine.push({kind:'polish',face});for(const id of ['lucky','gold','echo'])routine.push({kind:'technique',face,id});
      for(const recipient of FiveScore.faces)if(face!==recipient)routine.push({kind:'transfer',donor:face,recipient})}
    if(p.id!=='charm')all.push(...routine);
    const used=new Set(p.choices.filter(c=>c.used||packChoiceValid(r,c)).map(choiceKey)),seen=new Set();
    for(let i=0;i<p.choices.length;i++){const current=p.choices[i],k=choiceKey(current);if(current.used){seen.add(k);continue}if(packChoiceValid(r,current)&&!seen.has(k)){seen.add(k);continue}
      let pool=all.filter(c=>packChoiceValid(r,c)&&!used.has(choiceKey(c)));
      if(!pool.length){pool=routine.filter(c=>packChoiceValid(r,c)&&!used.has(choiceKey(c)));if(p.id==='charm'&&pool.length)p.fallback='No charm can be added now, so the remaining choices are Routine upgrades.'}
      if(pool.length){p.choices[i]=choose(r,pool);used.add(choiceKey(p.choices[i]));seen.add(choiceKey(p.choices[i]))}
    }
  }
  function command(r,action,index){const d=r.demo;if(r.mode!=='shop')return false;d.toast='';if(r.lvup&&action!=='level'){d.toast='Choose your level upgrades first.';return false}
    if(action==='level'){const c=d.levelChoices[index];if(!c||!r.lvup)return false;addStat(r,c.id,stats[c.id].sizes[c.level-1]);r.lvup--;levelChoices(r);return true}
    if(action==='next'){if(r.lvup||d.pack||d.weaponChoice){d.toast=r.lvup?'Choose your level upgrades first.':d.pack?'Finish choosing from your open pack.':'Choose a replacement or cancel it first.';return false}r.wave++;wave(r);sync(r);r.mode='playing';return true}
    if(action==='lock'){const o=d.offers.find(x=>x.uid===+index);if(!o||o.bought||o.row==='voucher')return false;o.locked=!o.locked;return true}
    if(action==='reroll'){const row=index==='weapon'?'shelf':index,cost=Math.max(1,2+(d.rerolls[row]||0)-d.rerollDiscount);if(!['shelf','pack'].includes(row)||r.xp<cost||d.pack)return false;const pred=o=>row==='pack'?inRoutineRow(o):!inRoutineRow(o),canChange=d.offers.some(o=>pred(o)&&(!o.locked||o.bought));if(!canChange){d.toast='Unlock an offer before rerolling this row.';return false}d.weaponChoice=null;r.xp-=cost;d.rerolls[row]=(d.rerolls[row]||0)+1;const n=d.offers.filter(pred).length;d.offers=d.offers.filter(o=>!pred(o)||o.locked&&!o.bought);for(let i=d.offers.filter(pred).length;i<n;i++)d.offers.push(row==='pack'?routineOffer(r,i):shelfOffer(r,i));return true}
    if(action==='weaponChoice'){const o=d.offers.find(x=>x.uid===+index);if(!o||o.bought||o.row!=='weapon'||d.pack||r.slots.length!==6)return false;d.weaponChoice=o.uid;return true}
    if(action==='weaponCancel'){d.weaponChoice=null;return true}
    if(action==='replaceWeapon'){const i=+index,o=d.offers.find(x=>x.uid===d.weaponChoice),g=r.slots[i];if(!g||!o||o.bought||o.row!=='weapon'||d.pack)return false;const refund=Math.floor((g.paid||0)/2),cost=o.price-refund;if(r.xp<cost)return false;const next=Owslot(o.id,o.level,++d.uid);next.paid=o.price;next.cd=0;r.slots[i]=next;r.xp-=cost;o.bought=true;o.locked=false;d.weaponChoice=null;sync(r);return true}
    if(action==='buy'){const o=d.offers.find(x=>x.uid===+index);if(!o||o.bought||r.xp<o.price||d.pack)return false;
      if(o.row==='pack'&&o.id==='charm'&&d.charms.length>=charmSlots(r)){d.toast='Sell a charm or gain a charm slot before opening this Charm pack.';return false}
      if(o.row==='weapon'){if(r.slots.length>=6){const g=r.slots.find(g=>g.id===o.id&&g.lvl===o.level&&g.lvl<4);if(!g){d.toast='Choose a weapon to replace, or combine an existing pair.';return false}g.lvl++;g.paid=(g.paid||0)+o.price;g.cd=0}else{const g=Owslot(o.id,o.level,++d.uid);g.paid=o.price;g.cd=0;r.slots.push(g)}}
      else if(o.row==='charm'){if(d.charms.length>=charmSlots(r)||d.charms.includes(o.id))return false;d.charms.push(o.id);d.charmPaid[o.id]=o.price;d.charmFaces[o.id]=o.face}
      else if(o.row==='item'){FiveCombat.buy(r,o.id);(d.itemPaid??={})[o.id]=[...(d.itemPaid?.[o.id]||[]),o.price]}
      else if(o.row==='stat'){const a=items[o.id];addStat(r,a.up,a.value);if(a.down)addStat(r,a.down,-a.loss);d.statInventory.push({id:o.id,paid:o.price,uid:o.uid})}
      else if(o.row==='routine'){if(!packChoiceValid(r,o.choice)){d.toast='That upgrade is already at its cap.';return false}applyChoice(r,o.choice)}
      else if(o.row==='voucher'){if(o.id==='shelf'&&d.shelfBonus>=1){d.toast='Your extra shelf is already active.';return false}if(o.id==='charm')d.charmBonus++;if(o.id==='reroll')d.rerollDiscount++;if(o.id==='shelf')d.shelfBonus=Math.min(1,d.shelfBonus+1)}
      else if(o.row==='pack'){d.pack={id:o.id,remaining:o.mega?2:1,picks:o.mega?2:1,taken:0,price:o.price,choices:packChoices(r,o)};repairPack(r,d.pack)};
      r.xp-=o.price;o.bought=true;o.locked=false;sync(r);return true;
    }
    if(action==='packPick'){const p=d.pack,c=p?.choices[+index];if(!c||c.used)return false;let ok=false;
      if(c.kind==='charm'){if(d.charms.length>=charmSlots(r)||d.charms.includes(c.id))return false;d.charms.push(c.id);d.charmPaid[c.id]=Math.floor(p.price/p.picks)+(p.taken<p.price%p.picks?1:0);d.charmFaces[c.id]=c.face;ok=true}
      else ok=packChoiceValid(r,c)&&applyChoice(r,c);
      if(!ok){d.toast='That choice is at its cap; choose another.';repairPack(r,p);return false}c.used=true;p.taken++;p.remaining--;if(!p.remaining)d.pack=null;else repairPack(r,p);return true;
    }
    if(action==='packSkip'){if(!d.pack)return false;d.pack=null;return true}
    if(action==='combine'){const i=+index,a=r.slots[i],j=r.slots.findIndex((b,k)=>k!==i&&b.id===a?.id&&b.lvl===a?.lvl);if(!a||a.lvl>=4||j<0)return false;const b=r.slots[j];a.lvl++;a.paid=(a.paid||0)+(b.paid||0);a.cd=0;r.slots.splice(j,1);sync(r);return true}
    if(action==='sell'){const g=r.slots[+index];if(!g||r.slots.length<=1)return false;r.xp+=Math.floor((g.paid||0)/2);r.slots.splice(+index,1);sync(r);return true}
    if(action==='charmLeft'){const i=+index;if(i<=0||i>=d.charms.length)return false;[d.charms[i-1],d.charms[i]]=[d.charms[i],d.charms[i-1]];return true}
    if(action==='charmSell'){const id=d.charms[+index];if(!id)return false;r.xp+=Math.floor((d.charmPaid[id]||0)/2);d.charms.splice(+index,1);FiveScore.sellCharm(d.score,id);delete d.charmPaid[id];delete d.charmFaces[id];return true}
    if(action==='itemSell'){const id=index;if(!d.itemCounts[id])return false;const paid=(d.itemPaid[id]||[]).pop()||0;if(!FiveCombat.sell(r,id))return false;r.xp+=Math.floor(paid/2);return true}
    if(action==='statSell'){const i=d.statInventory.findIndex(a=>a.uid===+index);if(i<0)return false;const a=d.statInventory[i],x=items[a.id];addStat(r,x.up,-x.value);if(x.down)addStat(r,x.down,x.loss);r.xp+=Math.floor(a.paid/2);d.statInventory.splice(i,1);return true}
    return false;
  }
  function preview(r){return null}

  return {broEnemy,withContact,hpScale,tune,TUNE_DEFAULT,saveTune,charmSlots,weapons,cards,charms,stats,items,tier,fmt,phase,strongest,ledger,diagnosis,bossAlive,returnBoss,continueSchedule,statText,standard,clock,quota,expectedChips,cap,init,wave,sync,open,fireCharms,nextCard,tickCards,bank,damage,hit,spawn,fire,weaponDamage,combat,drift,finish,shop,levelChoices,command,preview,applyChoice,packChoiceValid,routineChoice,charmPool,BUST};
})();

/* The existing simulation entry points now use the vertical slice. */
FiveCombat.configure({damage:(r,e,a,c)=>DEMO.damage(r,e,a,c.weapon||('item-'+c.item),0,0,0,false,c),strongest:r=>DEMO.strongest(r),phase:r=>DEMO.phase(r),position:r=>r.medium.local});
// Match automatic XP level gains to the same HP scale as explicit upgrades.
// XP orbs and level-ups as v3, except a level adds no Max HP (design doc §4.10); the level-up stat pick is the reward.
{const xp0=Oxepay;Oxepay=function(r,m,pos){const hp=r.hp;xp0(r,m,pos);if(r.demo){r.hp=hp;DEMO.sync(r)}}}
var DemoHd=Hd;
Hd=function(seed,starter='harpoon',record=0){return DEMO.init(DemoHd(seed,starter,record),starter)};
Owsetup=function(r){r.world='open';r.diff='standard';return r};
Ocvtk=function(){};Otpick=function(){return []};Ovq=function(){return false};AE=function(){};
touchKill=function(r,p){r.kills++;r.waveKills++;r.flightKills++;r.events.push({kind:'kill',pos:se(p.x,p.y),weapon:'touch',enemy:p.kind})};
{const pq0=Pq;Pq=function(r,dt){const bosses=(r.pursuers||[]).filter(p=>p.e?.role==='boss'&&p.e.hp>0);pq0(r,dt);if(r.demo)for(const p of bosses)DEMO.returnBoss(r,p.e,p)}}
{const ovr0=Ovr;Ovr=function(r,e){const B=r.enemies.filter(x=>x.role==='boss'),P=(r.pursuers||[]).filter(p=>p.e?.role==='boss');ovr0(r,e);for(const b of B)r.enemies.includes(b)||r.enemies.push(b);for(const p of P)r.pursuers.includes(p)||r.pursuers.push(p)}}  // the demo's boss never despawns

Oqpost=function(){};Ovn=function(){};Olp.on=0;Oxe.quota=1;Oq.on=1;Oq.kv=1;Oxe.pv=0;Otk.on=1;Owp.try=0;Ocv.on=1;Orw.on=1;Orw.both=1;ai=-15;li.gravity=-15;
for(const [id,d] of Object.entries(DEMO.weapons)){Object.assign(Owc[id],{pref:'nearest',media:'air',start:['sonic','harpoon','rocket'].includes(id),min:1,trig:null,leap:0,blurb:d.description,dmg:d.damage,cd:d.cd,crit:d.crit,critx:d.cx,rng:d.range*OwB.ppm})}
OwK=Object.keys(DEMO.weapons);En='harpoon';Owp.dmg=Owp.cd=Owp.rng=Owp.kb=Owp.ex=1;
/* 20 Oct (user): the movement settings copied from the v3 carve's panel are the demo's defaults (RESET returns to them),
   except launch speed: 30 m/s at wave 1, +5 a wave (the user's correction; the copy had 28 and +0.5).
   Three keep the demo's own value because the demo replaces what they drive: leap.on 0 (no leap weapons), econ.pv 0
   (pearls come from the wave payout) and hand.kv 1 (one orb material per chip). The panel now saves under a new key,
   so values saved before these defaults (or copied from the v3 carve on first open) are set aside once. */
const DemoSettings={"ro.on":1,"ro.max":85,"ro.rate":0.7,"ro.lmin":10,"ro.both":1,"carve.on":1,"carve.hold":0.7,"carve.lift":0.1,"carve.catch":4,"carve.nd":1,"carve.k":0.4,"carve.soft":20,"carve.bite":0.04,"carve.ease":0.06,"carve.arm":0.25,"carve.blast":1,"carve.bmin":20,"carve.spin":1,"carve.fx":2,"carve.ovmin":0.3,"ro.rk":1,"ro.rtime":0.12,"ro.srad":14,"ro.sbias":0.5,"ro.spush":30,"ro.stime":0.5,"ro.splash":1,"ro.xb":1,"wave.base":30,"wave.step":5,"wave.pin":1,"wave.boost":1,"wave.cap":0,"wave.charge":10,"swim.turn":3.6,"swim.hold":1,"swim.thrust":89.75,"air.gravity":-15,"swim.gravity":-30,"swim.drag":1.12,"swim.align":6.5,"swim.maxSpeed":72.5,"swim.seabed":-117,"swim.boostMultiplier":2.45,"swim.boostDrain":58,"swim.boostRegen":7,"pursuit.on":1,"pursuit.speed":1,"pursuit.turn":1,"pursuit.lead":1,"pursuit.wet":-1,"spawn.danger":0,"spawn.count":1.1,"spawn.spd":0.7,"spawn.small":0.5,"spawn.xp":2,"spawn.len":1,"spawn.cap":100,"spawn.off":2,"spawn.warn":1,"overtime.bar":0.85,"overtime.drop":0.1,"overtime.xp":0.1,"overtime.safe":0,"overtime.stuck":0.25,"air.speed":1.9,"air.snap":1,"air.grace":0.3,"air.climb":0,"arena.width":76,"arena.height":43.2,"frame.fit":1,"frame.width":57,"frame.keep":1,"frame.zoom":0,"frame.follow":0.28,"frame.lead":0,"frame.deep":0,"roll.window":0.5,"roll.torque":2,"roll.cap":1.3,"roll.deadzone":0.15,"roll.peak":7,"roll.align":1,"roll.ease":0.3,"roll.memory":1.2,"roll.wind":1.4,"roll.arc":0.5,"roll.swing":2.2,"view.guideStep":1.8,"view.guideDots":64,"view.guideAlpha":0.32,"sprite.on":1,"sprite.cork":1,"sprite.ctime":1.4,"sprite.swim":0.97,"sprite.turn":1,"sprite.upright":1,"sprite.utime":0.35,"ring.on":1,"ring.alpha":0.05,"ring.size":0.45,"ring.tilt":27,"ring.lean":20,"ring.gun":2,"ring.aim":0.05,"weap.on":1,"weap.dmg":1,"weap.cd":1,"weap.rng":1,"weap.spd":1,"weap.kb":1,"weap.ex":1,"weap.price":1,"weap.try":0,"weap.tryl":1,"econ.on":1,"econ.pv":0,"econ.pick":6,"econ.drift":2.5,"econ.sink":1.2,"econ.float":1.2,"econ.bag":1,"econ.lv":1,"leap.on":0,"leap.dmg":1,"leap.depth":20,"leap.climb":3,"leap.drop":15,"leap.ram":1,"leap.fmin":0.4,"hand.on":1,"hand.kv":1,"quota.q1":0.25,"quota.q20":0.6,"quota.ks":1.6,"quota.m1":1.5,"quota.m20":60,"quota.mk":0.52,"quota.pk":0.25,"hand.aft":1.5,"hand.pay":1,"boss.on":1,"boss.elite":1,"boss.fin":1,"boss.hp":1,"trick.on":1,"trick.flip":1.1,"trick.cork":0.9,"trick.spout":0.45,"trick.lvl":0.5,"trick.rep":0.15,"trick.rmin":0.4,"scale.esz":1,"scale.epic":1,"scale.dsz":1.7};
Qd='icarus.scoreshow.settings.v2';
{const gun=hi.find(r=>r.id==='ring.gun'),pv=hi.find(r=>r.id==='econ.pv');if(gun)gun.max=10;if(pv)pv.min=0;
 for(const r of hi)if(DemoSettings[r.id]!=null)r.home=DemoSettings[r.id];
 ww(DemoSettings);ww(Wl(Qd,{}));ai=li.gravity}
SE=function(r,m,input,dt,depth){
  if(!r.hand?.open)DEMO.open(r);
  const n=r.stats,mag=Math.max(1,Math.hypot(input.x,input.y)),move={x:input.x/mag*n.moveSpeed*li.speed*(1+r.demo.stats['Air steering']),y:input.y/mag*n.moveSpeed*li.speed*(1+r.demo.stats['Air steering'])},bounds={x0:-Jt.width/2+1.6,x1:Jt.width/2-1.6,y0:-Jt.height/2+1.6,y1:Jt.height/2-1.6};
  const gravity=m.vy<0?-15*Math.max(.4,1-.025*r.demo.stats.Hang):-15;
  const at=t=>wE(m,move,n.response/Math.max(.05,li.snap),t,bounds),height=t=>m.origin.y+m.vy*t+gravity*t*t/2+at(t).pos.y;
  let land=null;if(height(dt)<=0&&m.elapsed>.02){let lo=0,hi=dt;for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(height(mid)>0)lo=mid;else hi=mid}land=(lo+hi)/2}
  const apex=m.vy>0&&m.vy+gravity*dt<=0?-m.vy/gravity:null,t=Math.min(dt,land??dt,apex??dt),p=at(t);
  m.po={...m.origin};m.origin=se(m.origin.x+m.vx*t,m.origin.y+m.vy*t+gravity*t*t/2);m.vy+=gravity*t;m.local=p.pos;m.velocity=p.velocity;m.elapsed+=t;r.boost=Math.min(100,r.boost+ht.boostRegen*t);
  const heading=Math.atan2(m.vy,m.vx);m.heading=gn(m.heading+Math.atan2(Math.sin(heading-m.heading),Math.cos(heading-m.heading))*Xe(t,.09));r.metrics.air+=t;
  const h=r.hand;h.air+=t;h.airAll=h.air;h.peak=Math.max(h.peak,he(r).y);h.dist=Math.abs(he(r).x-h.x0);
  if(t>0&&r.mode==='playing'){DEMO.combat(r,m,input,t);DEMO.tickCards(r,t)}
  r.budget=Math.max(0,r.budget-t);if(r.budget<=1e-8&&!r.demo.overtime){r.demo.overtime=true;r.events.push({kind:'overtime',pos:he(r)})}
  if(r.mode==='playing')DEMO.withContact(r,()=>Pq(r,t));  // as v3's air step: pursuers still in the air, and the carve's breach shockwave
  if(r.mode!=='playing')return;
  if(apex!==null&&apex<=t+1e-9&&!h.apex){h.apex=true;if(!r.armed)DEMO.fireCharms(r,'apex');r.events.push({kind:'apex',pos:he(r)});if(dt-t>1e-9)Il(r,input,dt-t,depth+1);return}
  if(land!==null&&land<=t+1e-9){
    const pos=he(r);if(!r.armed&&!r.hand?.busted)FiveCombat.entry(r);DEMO.bank(r);Oxebag(r,pos,m);r.shots=[];if(typeof Danger!=='undefined')Danger.land(r);if(typeof Verbs!=='undefined')Verbs.land(r);
    // as v3 carve: at the entry every enemy becomes a pursuer (or flies off, with pursuit off). Pursuers hold above the
    // sea while you swim and come back as enemies at the breach (Zq).
    for(const E of [...r.enemies])Qz.on?Pz(r,m,E):nw(r,m,E);r.enemies=[];
    const velocity=Owe(r,{x:(m.vx+m.velocity.x)/m.waterScale,y:Math.min(-.1,m.vy+m.velocity.y)/m.waterScale});
    r.medium={kind:'water',pos:se(pos.x,0),heading:m.heading,velocity,ent:1.34};r.metrics.landings++;r.events.push({kind:'splash',pos:se(pos.x,0),value:1.34});
    if(r.demo.overtime||r.budget<=1e-8)DEMO.finish(r);else if(dt-t>1e-9)Il(r,input,dt-t,depth+1);
  }
};
sw=function(r,input,dt=Ar){
  if(r.mode!=='playing')return;if(!r.demo)throw Error('Demo state missing');
  r.events=[];r.tick++;r.time+=dt;r.hurt=Math.max(0,r.hurt-dt);if(!input.boost)r.boostLocked=false;
  const wasWater=r.medium.kind==='water';if(wasWater)DEMO.fire(r,dt);
  // The renderer draws enemies between their position at the start of this tick and the end (Oep), so record the
  // start once per tick in the air, from the arena origin before it moves (also while the clock is out). Water leaves them untouched.
  Il(r,input,dt,0);if(r.medium.kind==='water')r.metrics.water+=0;
  EE(r,dt);const pos=he(r);r.best=Math.max(r.best,pos.y);r.flightBest=Math.max(r.flightBest,pos.y);
  for(const e of r.departing){e.age+=dt;e.pos=se(e.pos.x+e.velocity.x*dt,e.pos.y+e.velocity.y*dt)}r.departing=r.departing.filter(e=>e.age<e.life).slice(-100);
  Ovr(r,dt);
};
rw=function(r,a){DEMO.hit(r,a)};
Oscore=function(r,h){return{chips:h.K,mult:h.mult||1,score:Math.round(h.K*(h.mult||1)),trick:{n:h.completed?.length||0,m:(h.mult||1)-1},lit:[]}};
Otdraw=function(R,r,m,title){if(title||m.kind!=='air')return;const a=r.hand?.active;R.rollOffset=0;if(!a)return;const progress=a.elapsed/a.time,dir=Math.sign(m.vx)||1;
  const flip=a.list.find(c=>DEMO.cards[c.id].family==='Flip');if(flip)R.rollOffset=(flip.id==='back'?1:-1)*dir*progress*Math.PI*2*(flip.id==='doubleFlip'?2:1);
  if(a.list.some(c=>DEMO.cards[c.id].family==='Corkscrew'))R.odC=Math.max(R.odC||0,30);
};

/* The same renderer and movement, with a compact score display and five-offer shop. */
var DemoOf=of;
Oqhud=function(){};Ocbar=function(){};Orhud=function(){};
function DemoEscape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function DemoButton(action,index,label,disabled=false,extra=''){return `<button class="demo-button ${extra}" data-demo="${action}" data-index="${index}" ${disabled?'disabled':''}>${label}</button>`}
function DemoCap(n){return n}
function DemoSet(id,text){const el=document.getElementById(id);if(el&&el.textContent!==text)el.textContent=text}
function DemoCharmText(e,v){return (e==='×mult'?'×':'+')+DEMO.fmt(v)+' MULT'}
function DemoPhaseSummary(last){const total=Math.max(1,last.killChips??last.chips);return `<div class="demo-phases" aria-label="Chips by flight phase">${['ascent','apex','descent'].map(p=>`<span class="phase-${p}"><i style="width:${100*(last.phases?.[p]||0)/total}%"></i><b>${p[0].toUpperCase()+p.slice(1)}</b> ${last.phases?.[p]||0}</span>`).join('')}</div>`}
function DemoBankBreakdown(last){const b=last.bonus||{},extra=(b.multi||0)+(b.apex||0)+(b.crit||0),charmChips=(last.charmLog||[]).reduce((s,c)=>s+(c.chips||0),0),bails=last.bails||[];
  return `<div class="demo-bank-detail">${last.busted?`<p class="demo-bust"><b>BUST</b> · 0 HP · banked ${last.score}</p>`:''}<p class="demo-drawn">${(last.drawn||[]).map((id,i)=>`<span class="${bails.includes(i)?'bailed':'landed'}">${DemoEscape(FiveScore.names[id])}${bails.includes(i)?' · BAIL':''}</span>`).join(' · ')}</p><p>Chips ${DEMO.fmt(last.chips)}: kills ${DEMO.fmt((last.killChips??last.chips)-extra)} · multi-kill +${b.multi||0} · apex +${b.apex||0} · crit +${b.crit||0}${charmChips?' · charms +'+DEMO.fmt(charmChips):''}</p><p>Tricks +${DEMO.fmt(last.base||0)} · Combos +${DEMO.fmt((last.combos||[]).reduce((s,c)=>s+c.value,0))}${last.techniqueLog?.length?' · Lucky +'+DEMO.fmt(last.techniqueLog.reduce((s,t)=>s+t.value,0)):''}</p><div class="demo-combo-line">${(last.combos||[]).map(c=>`<span>${c.name} +${DEMO.fmt(c.value)}</span>`).join('')||'No matching combo'}</div>${DemoPhaseSummary(last)}<p>${(last.air||0).toFixed(1)}s of flight · ${last.hits||0} hits · ${bails.length} Bail${bails.length===1?'':'s'}${last.pearls?` · +${last.pearls} pearls`:''}</p><div class="demo-charm-report">${(last.charmLog||[]).map(c=>`<div class="${c.active?'paid':'missed'}"><b>${c.active?'PAID':'MISSED'} · ${DemoEscape(c.name)}</b><strong>${c.chips?'+'+DEMO.fmt(c.chips)+' chips':c.pearls?'+'+c.pearls+' pearls':DEMO.fmt(c.before)+' → '+DEMO.fmt(c.after)}</strong><span>${DemoEscape(c.reason||'')}</span></div>`).join('')}</div><p>Items this flight: ${(last.items||[]).map(x=>x.name+' ×'+x.count).join(' · ')||'none activated'}.</p></div>`}

of=function(){if(!S?.demo||!document.getElementById('wave-number'))return;DemoOf();const d=S.demo,h=S.hand,air=S.medium.kind==='air',last=d.last;
  DemoSet('phase-label',S.armed?'CLOCK OUT · LAND TO BANK':air?'AIRBORNE':'SAFE WATER');DemoSet('budget-label','AIR REMAINING');DemoSet('budget-value',Math.max(0,S.budget).toFixed(1)+'s');DemoSet('budget-caption',`BANKED ${Math.round(S.wscore)} / ${S.quota} · ${S.wscore>=S.quota?'QUOTA MET':'QUOTA'}`);
  DemoSet('control-hint',Controls.hint(air));
  const fill=document.getElementById('budget-fill');if(fill)fill.style.width=`${Math.max(0,S.budget)/DEMO.clock(S.wave)*100}%`;
  let panel=document.getElementById('demo-readout');if(!panel){panel=document.createElement('section');panel.id='demo-readout';document.querySelector('.hud')?.appendChild(panel)}
  const html=air?`<div class="demo-hand"><strong>${h?.K||0} <i>×</i> ${DEMO.fmt(h?.mult||1)}</strong>${d.itemCounts.I05?`<div class="demo-apex-charge" aria-label="Apex charges" title="${DemoEscape(Owc[d.itemState.apex.id]?.name||'Apex lens')}">${[0,1,2,3].map(i=>`<i class="${i<d.itemState.apex.charges?'loaded':''} ${d.itemState.apex.released?'released':''}"></i>`).join('')}</div>`:''}</div>`:`<div class="demo-hand"><small>${last?'LAST BANK':'YOUR NEXT FLIGHT'}</small><strong>${last?`${last.chips} <i>×</i> ${DEMO.fmt(last.mult)} <i>=</i> ${last.score}`:'CHIPS × MULT'}</strong><span>${d.heldHand?'No kills: this routine carries into your next flight.':`${DEMO.cap(S)} tricks drawn at breach · every trick lands`}</span></div>${last?`<div class="demo-next"><small>${last.cards.map(DemoEscape).join(' · ')}</small><div>${(last.combos||[]).map(c=>`<span class="demo-preview">${c.name} +${DEMO.fmt(c.value)}</span>`).join('')}</div><span class="demo-forecast">${(last.charmLog||[]).filter(c=>c.active).map(c=>`${c.name}: ${DEMO.fmt(c.before)} → ${DEMO.fmt(c.after)}`).join(' · ')}</span>${DemoPhaseSummary(last)}<span class="demo-forecast">${(last.items||[]).map(x=>x.name+' ×'+x.count).join(' · ')}</span></div>`:''}`;
  if(panel.innerHTML!==html)panel.innerHTML=html;panel.classList.toggle('in-air',air);
};
function DemoBind(){for(const b of hr.querySelectorAll('[data-demo]'))b.onclick=()=>{const a=b.dataset.demo,i=b.dataset.index;
  if(a==='starter'){En=i;ql();return}if(a==='begin'){Zd(En);return}if(a==='tune'){document.getElementById('tune')?DemoPanel(false):DemoTune(true);return}if(a==='help'){const el=document.getElementById('demo-how');if(el)el.hidden=!el.hidden;return}if(a==='home'){ql();return}
  if(a==='next'){if(DEMO.command(S,a,i)){ke=0;as=Br(S);sf()}else Xl();return}DEMO.command(S,a,i);Xl();if(a==='level'){(hr.querySelector('[data-demo=level]:not(:disabled)')||hr.querySelector('[data-demo=buy]:not(:disabled)'))?.focus({preventScroll:true})}else if(S.demo.pack){const choice=hr.querySelector('[data-demo=packPick]:not(:disabled)');choice?.focus({preventScroll:true});choice?.scrollIntoView?.({block:'nearest'})}
}}
ql=function(){ft='title';St=null;ur.reset();hr.innerHTML=`${_w()}<section class="title-content demo-title"><div class="eyebrow">CHIPS × MULT · SCORE FEEL TEST</div><h1>ICARUS<span>BUILD YOUR ASCENT</span></h1><p class="intro">Carve your launch.<br>Build the flight you want.</p><p class="title-description">Automatic weapons turn kills into chips.<br>Your tricks are the reels: they build mult.<br>Get hit and the trick in progress bails. Land to bank.</p><div class="demo-starters">${['sonic','harpoon','rocket'].map(id=>DemoButton('starter',id,`<b>${Owc[id].name}</b><span>${DEMO.weapons[id].type} · ${DEMO.weapons[id].description}</span>`,false,id===En?'selected':'')).join('')}</div><div class="launch-row">${DemoButton('begin','','BEGIN RUN ↗',false,'demo-primary')}${DemoButton('help','','HOW TO PLAY')}${DemoButton('tune','','SETTINGS')}</div><div id="demo-how" hidden><p><b>Launch:</b> hold ${Controls.carve()?'Space':'W or up'} to carve upward. Release to ride out.${Controls.carve()?'':' Space boosts.'} Water is safe and pauses the air clock.</p><p><b>Fight:</b> W A S D / arrows steer within your launch path. Weapons fire automatically. Kills give chips, plus bonus chips for multi-kills, apex kills and crits. Land in water to bank chips × mult. Meet every wave's quota for 20 waves; missing one ends the run.</p><p><b>Tricks:</b> each jump draws tricks (3 to start; buy more) that play automatically, like reels. A hit bails the trick in progress: it pays nothing. At 0 HP the jump busts: you fall, bank nothing and come back at half HP.</p><p><b>Build:</b> kills drop XP orbs; steer through them to level up. Each level gives a free stat pick before the shop. Then buy weapons and gear for chips and survival, charms that rewrite the scoring, and Routine upgrades for your tricks. Charms resolve left to right at the bank.</p></div></section><footer class="title-footer"><div><b>${Object.keys(DEMO.weapons).length}</b><span>WEAPONS · SIX SLOTS</span></div><div><b>5</b><span>TRICKS · DRAWS 3→7</span></div><div><b>${Object.keys(FiveScore.charms).length}</b><span>CHARMS</span></div><div><b>${FiveCombat.catalogue.length}</b><span>COMBAT ITEMS</span></div></footer>`;Kl();DemoBind()};
jl=function(){const won=S.mode==='won';Ir(`<section class="scrim"><div class="summary-panel"><div class="eyebrow">${won?'TWENTY WAVES CLEARED':'QUOTA MISSED'}</div><h2>${won?'An extraordinary ascent.':'Every flight counts.'}</h2><p>Wave ${S.wave} · ${S.wscore} / ${S.quota} banked · ${S.kills} kills.</p><p>${won?'Your build carried the run.':'Bigger banks come from more chips, more mult or fewer Bails: weapons, charms, Routine upgrades and gear.'}</p><div class="demo-summary-hands">${S.demo.history.slice(-5).map(h=>`<div>${h.busted?'BUST':`${h.chips} × ${DEMO.fmt(h.mult)}`} = <b>${h.score}</b><small>${h.cards.join(' · ')}${h.bails?.length?` · ${h.bails.length} Bail${h.bails.length>1?'s':''}`:''}</small></div>`).join('')}</div>${DemoButton('home','','BACK TO START',false,'demo-primary')}</div></section>`);DemoBind()};
ls=function(){if(ft!=='game'||S.mode!=='playing')return;ft='pause';It.clear();Gr=false;je={x:0,y:0};ke=0;Ir(`<section class="scrim"><div class="modal pause-modal"><div class="eyebrow">TAKE A BREATH</div><h2>Your flight can wait.</h2><p>Hold ${Controls.carve()?'Space':'W / up'} underwater to carve. Release to launch${Controls.carve()?'':'; space boosts'}. In air, W A S D / arrows steer within the launch path.</p><p>Every drawn trick lands unless a hit bails it. At 0 HP the jump busts and banks nothing. Charms resolve at the bank. A flight with no kills keeps the same tricks.</p><p>Wave ${S.wave} · ${S.wscore} / ${S.quota} banked · ${S.budget.toFixed(1)}s air left.</p><div class="modal-actions">${kt('resume','RESUME FLIGHT ↗','primary')}${kt('end','END RUN')}${DemoButton('tune','','SETTINGS')}</div></div></section>`);DemoBind()};
Owstarter=function(){return ''};

/* Settings: one panel in tabs (T, the backquote key, or SCORE TUNING). Score holds the hand-cap levers (structure doc 5.4,
   kept open to balance in play); the other tabs hold the v3 carve's movement sliders, grouped by what they change. */
const DemoTuneDefs=[['shake','Screen shake',0,2,.1],['flash','Enemy hit flash',0,1,.1],['space','Marked spawns ahead and flocking (step 1)',0,1,1,'check'],['edge','Step 1: share of spawns from the screen edge',0,1,.05],['danger','Leading shots and mines on the arc (step 2)',0,1,1,'check'],['lead','Step 2: how far shots lead you',0,1,.05],['mines','Step 2: mines per flight',0,4,1],['carve','Space carves (no boost)',0,1,1,'check'],['ccw','Carving always anticlockwise',0,1,1,'check'],['sky','Water camera: metres above the dolphin (0 = old camera)',0,20,.1],['hold','Enemies above the water stay ahead of you in view while you swim',0,1,1,'check'],['verbs','Experimental: stomp, dive (S) and dash (Space) in the air (parked; to become tricks)',0,1,1,'check'],['hop','Step 3: stomp lift (m/s)',0,15,.5],['dive','Step 3: dive gravity (x)',1,4,.1],['dashes','Step 3: dash charges',0,4,1]];
const DemoTabs=[
  ['Score',null,'Each jump draws 3 tricks; buy more in the Routine row. A hit bails the trick in progress; 0 HP busts the jump.'],
  ['Launch',['Forward only','Rocket boost','Carve','Wave schedule'],'The carve and the launch. Launch speed rises5 per wave.'],
  ['Swimming',['Swimming','Boost'],''],
  ['Air',['Air controls','Carried roll','Camera'],''],
  ['Enemies',['Spawning','Pursuit','Boss waves','Overtime','Economy'],'The demo spawns, moves and pays for enemies with its own rules (source/demo.js), so not every slider here has an effect.'],
  ['Look',['Gun ring','Dolphin sprite','Flight path','Brotato scale'],''],
  ['About',[],'Five trick identities. Kills are chips; tricks, combos and charms are mult. Combat items alter the fight; charms resolve the score at water entry.']];
let DemoTab='Score';
function DemoTuneSummary(){return 'Every trick completes. Adjust presentation here; run upgrades live in the shop.'}
function DemoTabGroups(name){const listed=new Set(DemoTabs.flatMap(t=>t[1]||[]));const tab=DemoTabs.find(t=>t[0]===name);
  return name==='v3 systems'?Tw.filter(g=>tab[1].includes(g.group)||!listed.has(g.group)):Tw.filter(g=>tab[1].includes(g.group))}
function DemoPanelBody(box){
  const body=box.querySelector('.demo-set-body'),tab=DemoTabs.find(t=>t[0]===DemoTab),T=DEMO.tune;
  for(const b of box.querySelectorAll('[role=tab]')){const on=b.dataset.tab===DemoTab;b.setAttribute('aria-selected',on);b.tabIndex=on?0:-1}
  if(DemoTab==='About'){body.innerHTML=`<p class="demo-set-note">${tab[2]}</p>`;return}
  if(DemoTab==='Score'){
    body.innerHTML=`<p class="demo-set-note">${tab[2]}</p>${DemoTuneDefs.map(([k,label,lo,hi,step,kind])=>kind==='check'
      ?`<label class="demo-tune-check"><input type="checkbox" name="${k}" ${T[k]?'checked':''}> ${label}</label>`
      :`<label><span>${label} <output data-for="${k}">${T[k]}</output></span><input type="range" name="${k}" min="${lo}" max="${hi}" step="${step}" value="${T[k]}"></label>`).join('')}
      <p id="demo-tune-summary">${DemoTuneSummary()}</p><div class="demo-set-acts">${DemoButton('tuneReset','','DEFAULTS')}</div>`;
    for(const el of body.querySelectorAll('input'))el.oninput=()=>{T[el.name]=el.type==='checkbox'?+el.checked:+el.value;DEMO.saveTune();
      const o=body.querySelector(`output[data-for="${el.name}"]`);if(o)o.textContent=T[el.name];body.querySelector('#demo-tune-summary').textContent=DemoTuneSummary()};
    body.querySelector('[data-demo="tuneReset"]').onclick=()=>{Object.assign(T,DEMO.TUNE_DEFAULT);DEMO.saveTune();DemoPanelBody(box)};
    return;
  }
  const groups=DemoTabGroups(DemoTab),rows=groups.flatMap(g=>g.rows);
  body.innerHTML=(tab[2]?`<p class="demo-set-note">${tab[2]}</p>`:'')+groups.map(g=>`<h4>${DemoEscape(g.group)}</h4>`+g.rows.map(r=>`<label><span>${DemoEscape(r.label)} <output data-for="${r.id}">${Yd(r)}</output></span><input type="range" data-knob="${r.id}" min="${r.min}" max="${r.max}" step="${r.step}" value="${r.read()}"></label>`).join('')).join('')
    +`<div class="demo-set-acts">${DemoButton('setReset','','RESET TAB')}${DemoButton('setCopy','','COPY ALL')}${DemoButton('setPaste','','PASTE')}</div><p class="demo-set-note" id="tune-note"></p>`;
  const show=()=>{for(const r of rows){const el=body.querySelector(`[data-knob="${r.id}"]`);el.value=String(r.read());body.querySelector(`output[data-for="${r.id}"]`).textContent=Yd(r)}};
  for(const r of rows){const el=body.querySelector(`[data-knob="${r.id}"]`);el.oninput=()=>{r.write(parseFloat(el.value));if(r.id==='air.gravity')ai=li.gravity;body.querySelector(`output[data-for="${r.id}"]`).textContent=Yd(r);Ll()}}
  body.querySelector('[data-demo="setReset"]').onclick=()=>{for(const r of rows)r.write(r.home);ai=li.gravity;show();Ll();Ye(DemoTab+' reset to the demo defaults')};
  body.querySelector('[data-demo="setCopy"]').onclick=()=>{const t=JSON.stringify(Object.fromEntries(hi.map(r=>[r.id,r.read()])),null,1);navigator.clipboard?.writeText(t).then(()=>Ye('Values copied'),()=>Ye('Copy blocked by the browser'))};
  body.querySelector('[data-demo="setPaste"]').onclick=()=>{const t=prompt('Paste a COPY of the settings values:');if(t)try{const n=ww(JSON.parse(t));ai=li.gravity;show();Ll();Ye(`${n} values applied`)}catch(e){Ye('That was not a values block')}};
}
function DemoPanel(open=true,tab){
  let box=document.getElementById('tune');if(!open){box?.remove();return}
  if(tab)DemoTab=tab;
  if(!box){box=document.createElement('section');box.id='tune';box.className='demo-settings';box.setAttribute('role','dialog');box.setAttribute('aria-label','Settings');
    box.innerHTML=`<header><b>Settings</b><span>T or &#96; to close</span><button class="demo-set-close" aria-label="Close settings">×</button></header><div class="demo-set-tabs" role="tablist">${DemoTabs.map(t=>`<button role="tab" data-tab="${t[0]}">${t[0]}</button>`).join('')}</div><div class="demo-set-body" role="tabpanel"></div>`;
    document.body.appendChild(box);
    box.querySelector('.demo-set-close').onclick=()=>DemoPanel(false);
    const tabs=[...box.querySelectorAll('[role=tab]')];
    for(const b of tabs){b.onclick=()=>{DemoTab=b.dataset.tab;DemoPanelBody(box)};
      b.onkeydown=e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();const i=(tabs.indexOf(b)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length;DemoTab=tabs[i].dataset.tab;DemoPanelBody(box);tabs[i].focus()}}}
  DemoPanelBody(box);
}
function DemoTune(open=true){DemoPanel(open,'Score')}
Sw=function(){DemoPanel(!document.getElementById('tune'))};
try{document.addEventListener('keydown',e=>{if(e.key==='`'){e.preventDefault();document.getElementById('tune')?DemoPanel(false):DemoPanel(true,'Score')}else if(e.key.toLowerCase()==='t'&&e.target?.closest?.('#tune')&&!/^(INPUT|TEXTAREA)$/.test(e.target.tagName||'')){DemoPanel(false)}})}catch(e){}
/* Diagnostic API also exercises exactly the same state transitions as normal play. */
globalThis.icarusDemo={version:'scoreboard-S3',catalog:DEMO,get state(){return S},newRun:(seed=1,starter='harpoon')=>DEMO.init(DemoHd(seed,starter,0),starter),step:(r,input,dt=1/120)=>sw(r,input,dt),command:DEMO.command,start:(starter='harpoon',seed=1)=>Zd(starter,seed),controls:{get Orf(){return Orf},Orgp:(...args)=>Orgp(...args)},render:()=>{as=Br(S);if(S.mode==='shop')Xl();else if(['dead','won'].includes(S.mode))jl();else of()}};

/* ---- 23 Oct (user: "do 1 and 2"): Brotato pressure and hit feel ---- */
// Every enemy v3 spawns (its own schedule, through Ospw) takes Brotato's growth for its kind (DEMO.broEnemy).
{const sp0=Ospw;Ospw=function(r,t,k,...a){if(r.demo&&r.enemies.length+(r.pursuers?.length||0)>=100)return;const n=r.enemies.length;sp0(r,t,k,...a);if(r.demo)DEMO.broEnemy(r,r.enemies[n],k)}}
// The banner (the phase notice): each bank, the quota being met, the clock running out. v3's own notices stay off.
Ovn=function(S2){if(!S2.demo)return;for(const n of S2.events){
  if(n.kind==='bank'){const met=S2.wscore>=S2.quota&&S2.wscore-n.value<S2.quota;
    ci=n.busted?`BUST · ${n.value?'SECOND WIND · BANKED '+n.value:'NOTHING BANKED'}`:n.value>0?`BANKED ${n.value} · ${n.K} × ${DEMO.fmt(Math.round(n.M*10)/10)}${met?' · QUOTA MET':` · ${S2.wscore} / ${S2.quota}`}`:'NO KILLS · NOTHING BANKED';kr=n.value>0?1.8:1.1}
  else if(n.kind==='armed'){ci='CLOCK OUT · LAND TO BANK';kr=2.2}}};
/* Hit feel, from Brotato (brotato-reference, reference only): a white flash on the enemy hit; crits in yellow, larger;
   the camera shakes min(damage / 3, 3) px for 0.1 s per hit dealt (damage in Brotato units: ÷ OwB.hp) and 5 px when you're
   hit, scaled from Brotato's 1920 px screen to ours. Shake is a shake, not a freeze: the game never stops. Off with the
   Shake and Flash sliders, and shake is off with reduced motion. Charms: each one that fires puts a ring and its effect
   at the dolphin, in turn, rising up a pentatonic scale and quickening (structure doc §9, charm feedback). */
const DemoFx={SHK:K/1920,CHARM:{'+chips':0x5ff2ff,'+mult':0xb98cff,'×mult':0xff5fa8,pearls:0xffd25a},
  gaps(j){let t=0;for(let i=0;i<j;i++)t+=Math.max(.05,.12-.015*i);return t},
  label(R,text,pos,fill,size,life){if(R.labels.length>60)return;const t=new mn({text,style:{fontFamily:"Menlo, monospace",fontSize:size,fill,fontWeight:"800",dropShadow:{color:"#000a14",blur:3,distance:0}}});
    t.anchor.set(.5);R.numbers.addChild(t);R.labels.push({text:t,pos:{...pos},age:0,life})}};
{const ev0=Ul.prototype.events;Ul.prototype.events=function(t){
  const keep=[],T=DEMO.tune;let j=0;
  try{for(const e of t){
    if(e.kind==='damage'){if(e.id!=null&&T.flash>0)(this.dmFlash||(this.dmFlash=new Map())).set(e.id,.1);
      this.shk=this.shk||{i:0,t:0};const i=Math.min((e.value||0)/OwB.hp/3,3)*DemoFx.SHK;if(i>this.shk.i)this.shk.i=i;this.shk.t=Math.max(this.shk.t,.1);
      if(e.crit){DemoFx.label(this,Math.round(e.value??0)+'!',e.pos,0xffd84d,18+Math.min(10,Math.log2((e.value??1)+1)),.75);continue}}
    else if(e.kind==='hit'){this.shk=this.shk||{i:0,t:0};this.shk.i=Math.max(this.shk.i,5*DemoFx.SHK);this.shk.t=Math.max(this.shk.t,.1)}
    else if(e.kind==='itemproc'){const now=S?.time||0;this.itemFxNext??={};if(now>=(this.itemFxNext[e.item]||0)&&this.rings.length<32){this.itemFxNext[e.item]=now+.2;this.rings.push({x:e.pos.x,y:e.pos.y,age:0,life:.35,radius:['I05','I07'].includes(e.item)?4:2,color:{I04:0x5ff2ff,I05:0xffd84d,I07:0x639bff,I08:0x8cf5cf,I10:0x8cf5cf}[e.item]||0xb98cff})}continue}
    else if(e.kind==='charm'){(this.cfx||(this.cfx=[])).push({e,j,delay:DemoFx.gaps(j++)});continue}
    else if(e.kind==='bust')continue;
    // Combat-item damage is tagged 'item-I0x', which has no weapon colour; the renderer would throw looking it up.
    keep.push(e.weapon&&!Q[e.weapon]?{...e,weapon:undefined}:e)}}catch(err){return ev0.call(this,t.filter(e=>!e.weapon||Q[e.weapon]))}
  return ev0.call(this,keep)}}
{const de0=Ul.prototype.drawEnemies;Ul.prototype.drawEnemies=function(t,e,i,Al,dt=.016){const out=de0.call(this,t,e,i,Al,dt);
  try{const F=this.dmFlash,O=this.flashSprites||(this.flashSprites=new Map()),A=DEMO.tune.flash;
    if(F)for(const [id,left] of F){const sp=this.sprites.get(id);if(!sp||left<=0||e){F.delete(id);continue}
      // two additive copies push the sprite most of the way to white (Brotato flashes a white silhouette; the
      // renderer has no colour-matrix filter to do that exactly)
      let pair=O.get(id);if(!pair){pair=[0,1].map(()=>{const ov=new Wt(sp.texture);ov.anchor.set(.5);ov.blendMode='add';this.entities.addChild(ov);return ov});O.set(id,pair)}
      for(const ov of pair){ov.texture=sp.texture;ov.position.set(sp.x,sp.y);ov.scale.set(sp.scale.x,sp.scale.y);ov.rotation=sp.rotation;ov.alpha=Math.min(1,left/.1)*A;ov.tint=0xffffff;ov.visible=true}
      F.set(id,left-dt)}
    for(const [id,pair] of O)if(!F||!F.has(id)||!this.sprites.get(id)){for(const ov of pair)ov.destroy();O.delete(id)}}catch(err){}
  return out}}
{const dr0=Ul.prototype.draw;Ul.prototype.draw=function(t,e,i,s,o=false){const out=dr0.call(this,t,e,i,s,o);
  try{const T=DEMO.tune,P=this.cfx;
    if(P&&P.length){const now=[];for(const q of P){q.delay-=s;if(q.delay>0){now.push(q);continue}
      const ev=q.e,c=DemoFx.CHARM[ev.effect]||0xb98cff,x=ev.effect==='×mult';
      this.rings.push({x:ev.pos.x,y:ev.pos.y,age:0,life:.6,radius:x?10:6,color:c});if(x||ev.rare)this.rings.push({x:ev.pos.x,y:ev.pos.y,age:0,life:.75,radius:x?16:10,color:c});
      DemoFx.label(this,DemoCharmText(ev.effect,ev.value),{x:ev.pos.x,y:ev.pos.y+2.5+(q.j||0)*1.9},c,x?22:16,.8)}
      this.cfx=now}
    const k=this.shk;if(k&&k.t>0&&!o&&T.shake>0&&!this.reduced){k.t-=s;const a=k.i*T.shake;this.root.position.set((Math.random()*2-1)*a,(Math.random()*2-1)*a);if(k.t<=0)k.i=0}
    else{if(this.root.x||this.root.y)this.root.position.set(0,0);if(k&&k.t<=0)k.i=0}}catch(err){}
  return out}}
// Sound: each charm a note up the pentatonic scale through the flight (A major pentatonic from A4), entry charms in
// quickening turn; ×mult and rare charms add the octave. A crit adds a short high tick (at most every 0.06 s).
{const PENT=[0,2,4,7,9,12,14,16,19,21,24],se0=Dl.prototype.events;Dl.prototype.events=function(t){se0.call(this,t);
  try{if(!this.ctx)return;const c=this.ctx;let j=0;
    const note=(f,at,dur,gain,type)=>{const o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,at);
      g.gain.setValueAtTime(0,at);g.gain.linearRampToValueAtTime(gain,at+.008);g.gain.exponentialRampToValueAtTime(.001,at+dur);
      o.connect(g);g.connect(this.master);o.start(at);o.stop(at+dur+.02);o.onended=()=>{o.disconnect();g.disconnect()}};
    for(const e of t){
      if(e.kind==='charm'){const at=c.currentTime+DemoFx.gaps(j++),f=440*Math.pow(2,PENT[Math.min(PENT.length-1,(e.seq||1)-1)]/12);
        note(f,at,.22,.07,'sine');if(e.effect==='×mult'||e.rare)note(f*2,at+.02,.3,.04,'triangle')}
      else if(e.kind==='damage'&&e.crit&&c.currentTime-(this.lastCrit||0)>.06){this.lastCrit=c.currentTime;note(1320,c.currentTime,.05,.025,'square')}}}catch(err){}}}


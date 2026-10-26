// Headless flow study: real built demo, bot launches, simple shop policy. Logs flights at 10 Hz.
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../..');
const {load}=require(path.join(root,'qa/load.cjs')),{flyer}=require(path.join(root,'qa/bot.cjs'));
const file=path.join(root,'ICARUS-demo.html'),out=process.argv[2];
const r2=x=>Math.round(x*100)/100;
function run(style,seed,maxWave){
  const H=load(file,new Map(),{bake:true,modern:true}),D=H.DEMO,r=H.Hd(seed,'harpoon'),fly=flyer(H,style,seed,{keep:8});
  const flights=[],waves=[];let cur=null,water=null,lastSample=-1,ticks=0;
  const pref=['Armour','Max HP','Regen','Damage %','Attack speed','Shot','Crit','Area','Lift','Hang','Air steering','Pickup','Luck','XP gain'];
  function shop(){const d=r.demo;for(let i=0;r.lvup&&i<50;i++){const b=d.levelChoices.map((c,i)=>({i,s:pref.indexOf(c.id)<0?-1:100-pref.indexOf(c.id)})).sort((a,b)=>b.s-a.s)[0];D.command(r,'level',b.i)}
    for(let t=0;t<2;t++){for(const o of d.offers){if(o.bought||o.price>r.xp)continue;if(o.row==='weapon'&&(r.slots.length<6||r.slots.some(g=>g.id===o.id&&g.lvl===o.level&&g.lvl<4)))D.command(r,'buy',o.uid);else if(o.row==='stat'&&['Armour','Max HP','Regen','Damage %','Shot'].includes(D.items[o.id].up))D.command(r,'buy',o.uid);else if(o.row==='routine'&&o.choice.kind==='draw')D.command(r,'buy',o.uid)}for(let i=0;i<r.slots.length;i++)D.command(r,'combine',i);if(r.xp>20)D.command(r,'reroll','shelf')}
    waves.push({wave:r.wave,score:r.wscore,quota:r.quota,hp:r.hp,maxHp:r.stats.maxHp,lvl:r.lvl,slots:r.slots.map(g=>g.id+g.lvl)});D.command(r,'next')}
  const enemySnap=()=>r.enemies.map(e=>[e.kind[0],r2(e.pos.x),r2(e.pos.y),Math.round(e.hp)]);
  while(['playing','shop'].includes(r.mode)&&r.wave<=maxWave&&ticks<120*60*40){
    if(r.mode==='shop'){if(r.wave>=maxWave)break;shop();continue}
    const intent=fly(r);if(r.medium.kind==='air'&&r.budget<=0)intent.y=-1;
    const was=r.medium.kind;H.sw(r,intent);ticks++;
    const m=r.medium,now=r.time;
    if(was==='water'&&m.kind==='air'){ // breach
      if(water){water.dur=now-water.t0;}
      const ang=Math.atan2(m.vy,Math.abs(m.vx))*180/Math.PI;
      cur={wave:r.wave,style,seed,t0:now,water:water?{dur:r2(water.dur),minDepth:r2(water.minDepth)}:null,tier:r.tier,launch:{angle:r2(ang),speed:r2(Math.hypot(m.vx,m.vy)),vx:r2(m.vx),vy:r2(m.vy)},origin0:{x:r2(m.origin.x),y:r2(m.origin.y)},samples:[],kills:[],hits:[],orbs:0,enemiesAtBreach:r.enemies.length,pursuersAtBreach:(r.pursuers||[]).length,apex:null};lastSample=-1;water=null}
    if(m.kind==='water'){if(!water)water={t0:now,minDepth:0};water.minDepth=Math.min(water.minDepth,m.pos.y)}
    if(cur){
      for(const e of r.events){if(e.kind==='kill')cur.kills.push({t:r2(now-cur.t0),x:r2(e.pos.x),y:r2(e.pos.y),enemy:e.enemy,weapon:e.weapon,phase:r.hand?D.phase(r):null});if(e.kind==='hit')cur.hits.push({t:r2(now-cur.t0),v:r2(e.value),phase:r.hand?D.phase(r):null});if(e.kind==='orb')cur.orbs++;if(e.kind==='apex')cur.apex={t:r2(now-cur.t0)}}
      if(m.kind==='air'&&now-lastSample>=.1){lastSample=now;const me=H.he(r);cur.samples.push({t:r2(now-cur.t0),ox:r2(m.origin.x),oy:r2(m.origin.y),lx:r2(m.local.x),ly:r2(m.local.y),wx:r2(me.x),wy:r2(me.y),hp:Math.round(r.hp),en:enemySnap(),pu:(r.pursuers||[]).map(p=>[r2(p.x),r2(p.y),p.wet?1:0]),shots:r.shots.filter(s=>s.weapon==='hostile').length,ph:r.hand?D.phase(r):null})}
      if(was==='air'&&m.kind==='water'){cur.dur=r2(now-cur.t0);cur.bank=r.demo.last?{chips:r.demo.last.chips,mult:r2(r.demo.last.mult),score:r.demo.last.score,bails:r.demo.last.bails.length,busted:r.demo.last.busted}:null;cur.pursuersAtEntry=(r.pursuers||[]).length;cur.wetPursuers=(r.pursuers||[]).filter(p=>p.wet).length;cur.peak=r2(Math.max(...cur.samples.map(s=>s.wy)));flights.push(cur);cur=null}
    }
  }
  return {style,seed,end:{mode:r.mode,reason:r.endReason,wave:r.wave},waves,flights};
}
const runs=[];for(const style of ['low-keep','mid-keep','high-keep','mid-turn'])runs.push(run(style,7,16));
fs.writeFileSync(out,JSON.stringify(runs));
for(const R of runs)console.log(R.style,R.end,'flights',R.flights.length);

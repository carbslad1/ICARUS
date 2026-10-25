// Real seeded runs, actual offered purchases; no HP, damage, money or outcome grants.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{load}=require('./load.cjs'),{flyer}=require('./bot.cjs');
const root=path.resolve(__dirname,'..'),round=process.argv.find(x=>x.startsWith('--round='))?.split('=')[1]||'baseline',file=process.argv.find(x=>x.startsWith('--file='))?.slice(7)||path.join(root,'ICARUS-demo.html');
const routes=[{id:'low-close',style:'low-keep',starter:'sonic',keep:4,charms:['S07','S04','S15','S03','S01'],items:['I04','I08','I10'],routine:'Repeat'},
{id:'middle-shot',style:'mid-keep',starter:'harpoon',keep:12,charms:['S08','S01','S02','S04','S17'],items:['I01','I02','I06'],routine:'Formation'},
{id:'high-blast',style:'high-keep',starter:'rocket',keep:12,charms:['S09','S12','S10','S02','S04'],items:['I05','I07','I06'],routine:'Variety'}];
function run(route,seed){const buildSha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');const H=load(file,new Map(),{bake:true,modern:true}),D=H.DEMO,r=H.Hd(seed,route.starter),fly=flyer(H,route.style,seed,{keep:route.keep}),waves=[],purchases=[],damageByWave={},hitsByWave={},incoming=[];let ticks=0;
 function buy(o){const before=r.xp;if(D.command(r,'buy',o.uid)){purchases.push({wave:r.wave,row:o.row,id:o.id,price:before-r.xp});return true}return false}
 function choosePack(){let guard=0;while(r.demo.pack&&guard++<5){const p=r.demo.pack;const rank=c=>c.used?-100:c.kind==='charm'?(route.charms.includes(c.id)?20-route.charms.indexOf(c.id):0):c.kind==='routine'?(c.id===route.routine?15:1):c.kind==='polish'?10:c.kind==='technique'?7:c.kind==='transfer'?(route.routine==='Repeat'&&c.recipient==='front'?8:-1):-5;const cc=p.choices.map((c,i)=>({c,i,rank:rank(c)})).sort((a,b)=>b.rank-a.rank);let ok=false;for(const q of cc){if(D.command(r,'packPick',q.i)){ok=true;break}}if(!ok)D.command(r,'packSkip')}}
 function shop(){if(process.argv.includes('--focused'))return focusedShop();const d=r.demo;for(let i=0;r.lvup&&i<100;i++){const pref=['Armour','Max HP','Regen','Damage %','Attack speed',D.weapons[route.starter].type,'Crit','Area','Lift','Hang','Air steering','Pickup','Luck'];let best=d.levelChoices.map((c,i)=>({i,score:pref.indexOf(c.id)<0?-1:100-pref.indexOf(c.id)-(c.id==='Armour'&&d.stats.Armour>15?50:0)})).sort((a,b)=>b.score-a.score)[0];D.command(r,'level',best.i)}
  for(let turn=0;turn<3;turn++){
   for(const o of d.offers)if(o.row==='weapon'&&!o.bought&&o.price<=r.xp&&(r.slots.length<6||r.slots.some(g=>g.id===o.id&&g.lvl===o.level&&g.lvl<4)))buy(o);
   for(let i=0;i<r.slots.length;i++)D.command(r,'combine',i);
   for(const o of d.offers)if(o.row==='item'&&route.items.includes(o.id)&&!o.bought&&o.price<=r.xp)buy(o);
   for(const o of d.offers)if(o.row==='charm'&&route.charms.includes(o.id)&&!o.bought&&o.price<=r.xp&&d.charms.length<D.charmSlots(r))buy(o);
   for(const o of d.offers)if(o.row==='pack'&&!o.bought&&o.price<=r.xp&&(o.id!=='charm'||d.charms.length<D.charmSlots(r))){if(buy(o))choosePack()}
   if(turn===0&&r.slots.length<6&&r.xp>=20)D.command(r,'reroll','shelf');else break;
  }
  d.charms.sort((a,b)=>(['S04','S08','S09','S05'].includes(a))-(['S04','S08','S09','S05'].includes(b)));
  D.command(r,'next');
 }
 function focusedShop(){
  const d=r.demo,family=D.weapons[route.starter].type;
  for(let i=0;r.lvup&&i<100;i++){const rating=c=>{if(c.id==='Armour')return d.stats.Armour<15?110:25;if(c.id==='Max HP')return 105;if(c.id==='Regen')return d.stats.Regen<12?108:90;if(c.id==='Damage %')return 85;if(c.id==='Attack speed')return 82;if(c.id===family)return 80;if(c.id==='Crit')return 75;if(c.id==='Area')return 65;return 30};const best=d.levelChoices.map((c,i)=>({i,n:rating(c)})).sort((a,b)=>b.n-a.n)[0];D.command(r,'level',best.i)}
  const worth=(id,l)=>{const w=D.weapons[id],crit=D.tier(w.crit,l),cx=D.tier(w.cx,l),single=D.weaponDamage(r,w,l,false)*(1+Math.max(0,crit+d.stats.Crit)*(cx-1))/(D.tier(w.cd,l)/60);return single*(w.type===family?1.25:.45)*(w.type==='Blast'?1.7:w.type==='Close'?1.5:1)};
  function combine(){for(let i=0;i<r.slots.length;i++)while(D.command(r,'combine',i)){} }
  for(let turn=0;turn<4;turn++){
   combine();
   for(const o of d.offers)if(o.row==='stat'&&!o.bought&&o.price<=r.xp&&['Armour','Max HP','Regen'].includes(D.items[o.id].up))buy(o);
   for(const o of d.offers)if(o.row==='item'&&!o.bought&&o.price<=r.xp&&((['I08','I10'].includes(o.id)&&(d.itemCounts[o.id]||0)<3)||(route.items.includes(o.id)&&!d.itemCounts[o.id])))buy(o);
   const offers=d.offers.filter(o=>o.row==='weapon'&&!o.bought).sort((a,b)=>worth(b.id,b.level)-worth(a.id,a.level));
   for(const o of offers){if(D.weapons[o.id].type!==family)continue;if(r.slots.length<6||r.slots.some(g=>g.id===o.id&&g.lvl===o.level&&g.lvl<4)){if(o.price<=r.xp)buy(o)}else{const weakest=r.slots.map((g,i)=>({i,value:worth(g.id,g.lvl),g})).sort((a,b)=>a.value-b.value)[0];const cost=o.price-Math.floor((weakest.g.paid||0)/2);if(worth(o.id,o.level)>weakest.value*1.2&&cost<=r.xp){D.command(r,'weaponChoice',o.uid);const before=r.xp;if(D.command(r,'replaceWeapon',weakest.i))purchases.push({wave:r.wave,row:'replacement',id:o.id,price:before-r.xp});else D.command(r,'weaponCancel');}}combine();}
   for(const o of d.offers)if(o.row==='charm'&&!o.bought&&o.price<=r.xp&&route.charms.includes(o.id)&&d.charms.length<D.charmSlots(r))buy(o);
   const needScore=(r.lastWave?.score||0)<1.6*(r.lastWave?.quota||1);
   for(const o of d.offers)if(o.row==='pack'&&!o.bought&&o.price<=r.xp&&(needScore||d.charms.length<2)&&(o.id!=='charm'||d.charms.length<D.charmSlots(r))){if(buy(o))choosePack()}
   if(turn<3&&r.xp>=15)D.command(r,'reroll','shelf');else break;
  }
  d.charms.sort((a,b)=>(['S04','S08','S09','S05'].includes(a))-(['S04','S08','S09','S05'].includes(b)));D.command(r,'next');
 }
 for(;ticks<120*2400&&['playing','shop'].includes(r.mode);ticks++){
  if(r.mode==='shop'){waves.push({wave:r.wave,score:r.wscore,quota:r.quota,hands:r.demo.history.length,hp:r.hp,pearls:r.xp,phaseChips:r.demo.history.reduce((a,h)=>{for(const k of ['ascent','apex','descent'])a[k]+=(h.phases?.[k]||0);return a},{ascent:0,apex:0,descent:0}),entryKills:r.demo.history.reduce((a,h)=>a+(h.entryKills||0),0),avgAir:r.demo.history.reduce((a,h)=>a+h.air,0)/Math.max(1,r.demo.history.length)});shop();continue}
  const intent=fly(r);if(r.medium.kind==='air'&&r.budget<=0)intent.y=-1;H.sw(r,intent);
  for(const e of r.events)if(e.kind==='hit'){damageByWave[r.wave]=(damageByWave[r.wave]||0)+e.value;hitsByWave[r.wave]=(hitsByWave[r.wave]||0)+1;incoming.push({wave:r.wave,air:r.demo.air,value:e.value,hp:r.hp,phase:r.hand&&D.phase(r),enemies:r.enemies.length,pursuers:r.pursuers.length});if(incoming.length>80)incoming.shift();}
 }
 return {flow:'live-overtime-until-water-entry',purchasePolicy:process.argv.includes('--focused')?'type-focused with real replacements and defence items':'legacy mixed offers',stats:{...r.demo.stats},diagnosis:D.diagnosis?D.diagnosis(r):null,damageByWave,hitsByWave,lastIncoming:incoming,buildSha256,route:route.id,seed,cash:r.xp,outcome:r.mode,reason:r.endReason,wave:r.wave,score:r.wscore,quota:r.quota,hp:r.hp,kills:r.kills,spent:purchases.reduce((a,p)=>a+p.price,0),weapons:r.slots.map(g=>g.id+':'+g.lvl),charms:r.demo.charms,items:r.demo.itemCounts,routines:r.demo.score.routines,weights:r.demo.score.weights,waves,purchases,ticks};
}
const results=[];for(const route of routes)for(const seed of [11,23]){const result=run(route,seed);results.push(result);console.log(JSON.stringify({...result,waves:undefined,purchases:undefined}))}
fs.mkdirSync(path.join(root,'reviews'),{recursive:true});fs.writeFileSync(path.join(root,'reviews',round+'-scoring-progression.json'),JSON.stringify({round,scope:'Real simulation with automated launch/position/shopping policies; no grants; six runs, not population win rates',results},null,2)+'\n');

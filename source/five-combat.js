/* ICARUS combat items. Pure state + explicit engine hooks; score charms never enter this module. */
var FiveCombat = (function () {
  'use strict';
  var hooks = {}, IDS = ['I01','I02','I03','I04','I05','I06','I07','I08','I09','I10'];
  var catalogue = [
    {id:'I01',name:'Overkill reservoir',price:18,rarity:2,text:'Bank 25% of wasted primary damage; release it on the next surviving target. +15% per copy, up to 75%.'},
    {id:'I02',name:'Slow wound',price:10,rarity:1,text:'First target of each attack takes 15% noncrit damage over 2 active-air seconds. +10% per copy.'},
    {id:'I03',name:'Wake collector',price:18,rarity:2,text:'Three safe projectile grazes load a 50% arc to a nearby second target. +25% per copy.'},
    {id:'I04',name:'Opening reserve',price:18,rarity:2,text:'After a ready breach, the first hit with another target sends a forward 35% cone from its impact, radius6m, to up to three other enemies. Holds its charge until useful. 4 active-air seconds recharge. +20% per copy.'},
    {id:'I05',name:'Apex lens',price:30,rarity:3,minWave:5,text:'Ascent attacks load four charges. From apex onward, your displayed strongest slot releases +15% per charge on its first surviving victim. Killing blows preserve the charge. 6 air seconds recharge. +10% per copy.'},
    {id:'I06',name:'Paired circuit',price:18,rarity:2,text:'Link two living nearby targets for 2 seconds; later attacks echo 20%. 6 air seconds recharge. +10% per copy, up to 50%.'},
    {id:'I07',name:'Water hammer',price:30,rarity:3,text:'After a kill, real water contact blasts nearby enemies for 75% of your strongest attack. 6 air seconds recharge. +35% per copy.'},
    {id:'I08',name:'Repulsor hull',price:10,rarity:1,text:'A ready accepted hit deals 25% less and pushes up to eight nearby enemies. 8 air seconds recharge. +10% per copy, up to 55%.'},
    {id:'I09',name:'Sinking mark',price:10,rarity:1,text:'First target of an attack moves 20% slower for 1.5 air seconds. One mark; half effect on bosses. +10% per copy, up to 40%.'},
    {id:'I10',name:'Entry membrane',price:18,rarity:2,text:'A kill-bearing entry stores a 10%-HP shield for the next flight. 8 air seconds recharge. +5% per copy, up to 25%.'}
  ];
  function configure(next) { hooks = Object.assign({}, hooks, next || {}); return api; }
  function create() { return {time:0,cooldowns:{I04:0,I05:0,I06:0,I07:0,I08:0,I10:0},reservoir:0,reservoirAttack:null,wounds:{},graze:{},grazeCharges:0,grazeNext:0,opening:false,apex:{slot:-1,id:null,amount:0,charges:0,released:false},pair:null,mark:null,shield:0,storedShield:0,attacks:{},attackOrder:[],triggers:{},entryDone:false}; }
  function state(r) { if (!r.demo) r.demo={}; if (!r.demo.itemCounts) r.demo.itemCounts={}; return r.demo.itemState || (r.demo.itemState=create()); }
  function count(r,id) { return Math.max(0,Math.floor(Number(r.demo && r.demo.itemCounts && r.demo.itemCounts[id])||0)); }
  function live(r) { return r.mode==='playing' && r.medium && r.medium.kind==='air' && !r.armed; }
  function alive(r,e) { return !!e && e.hp>0 && (r.enemies||[]).includes(e); }
  function position(r) { return hooks.position ? hooks.position(r) : r.medium && r.medium.local || {x:0,y:0}; }
  function world(r,p) { var o=r.medium && r.medium.origin || {x:0,y:0}; return {x:o.x+p.x,y:o.y+p.y}; }
  function strongest(r) { var g=hooks.strongest && hooks.strongest(r); return g && g.amount>0 ? g : {id:null,slot:-1,amount:0}; }
  function phase(r) { if(hooks.phase)return hooks.phase(r); var h=r.hand||{},t=h.activeAir==null?h.air||0:h.activeAir,p=h.pred||{},ap=p.apex==null?(p.air||0)/2:p.apex,w=(p.air||0)*.1; return t<ap-w?'ascent':t<=ap+w?'apex':'descent'; }
  function trigger(r,id,pos,extra) { var s=state(r);s.triggers[id]=(s.triggers[id]||0)+1;(r.events||(r.events=[])).push(Object.assign({kind:'itemproc',item:id,pos:world(r,pos||position(r))},extra||{})); }
  function secondary(r,e,amount,id,extra) { if(!live(r)||!alive(r,e)||!(amount>0))return 0;var before=e.hp;hooks.damage && hooks.damage(r,e,amount,Object.assign({primary:false,item:id,weapon:'item-'+id,crit:false,base:amount,amount:amount},extra||{}));return before>0&&e.hp<=0?1:0; }
  function nearest(r,p,rad,skip) { return (r.enemies||[]).filter(function(e){return alive(r,e)&&e!==skip&&Math.hypot(e.pos.x-p.x,e.pos.y-p.y)<=rad;}).sort(function(a,b){return Math.hypot(a.pos.x-p.x,a.pos.y-p.y)-Math.hypot(b.pos.x-p.x,b.pos.y-p.y);}); }
  function attack(s,ctx) { var id=String(ctx.attackId==null?'missing':ctx.attackId),a=s.attacks[id];if(!a){a=s.attacks[id]={};s.attackOrder.push(id);while(s.attackOrder.length>512)delete s.attacks[s.attackOrder.shift()];}return a; }
  function initWave(r) { r.demo.itemState=create(); return state(r); }
  function breach(r) { var s=state(r),g=strongest(r);s.entryDone=false;s.opening=count(r,'I04')>0&&s.cooldowns.I04<=0;s.apex={slot:g.slot,id:g.id,amount:g.amount,charges:0,released:false};s.shield=count(r,'I10')?s.storedShield:0;s.storedShield=0;s.graze={};s.wounds={};s.pair=null;s.mark=null;return s; }
  function segmentDistance(p,a,b) {var dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
  function observeGraze(r) { var s=state(r),p=position(r),seen={},shots=r.shots||[];
    if(!count(r,'I03')){s.graze={};return;}
    for(var sh of shots){if(sh.weapon!=='hostile'||sh.life<=0)continue;var key=String(sh.id),old=s.graze[key],d=Math.hypot(sh.pos.x-p.x,sh.pos.y-p.y),rec=old||{last:{x:sh.pos.x,y:sh.pos.y},player:{x:p.x,y:p.y},min:d,done:false,hit:false};seen[key]=1;
      var near=segmentDistance({x:0,y:0},{x:rec.last.x-rec.player.x,y:rec.last.y-rec.player.y},{x:sh.pos.x-p.x,y:sh.pos.y-p.y});rec.min=Math.min(rec.min,near);if(near<2)rec.hit=true;
      if(!rec.done&&!rec.hit&&rec.min<=4&&rec.min>=2&&d>rec.min+.15&&s.time>=s.grazeNext&&s.grazeCharges<3){s.grazeCharges++;s.grazeNext=s.time+.25;rec.done=true;trigger(r,'I03',p,{stage:'graze',charges:s.grazeCharges});}
      rec.last={x:sh.pos.x,y:sh.pos.y};rec.player={x:p.x,y:p.y};s.graze[key]=rec;
    }
    for(var id in s.graze)if(!seen[id])delete s.graze[id];
  }
  function tick(r,dt) { var s=state(r);if(!live(r)||!(dt>0))return;s.time+=dt;for(var id in s.cooldowns)s.cooldowns[id]=Math.max(0,s.cooldowns[id]-dt);
    observeGraze(r);
    for(var key of Object.keys(s.wounds)){var wound=s.wounds[key],e=(r.enemies||[]).find(function(e){return String(e.id)===key;});if(!alive(r,e)||wound.left<=0||wound.time<=0){delete s.wounds[key];continue;}var used=Math.min(dt,wound.time),n=wound.left*used/wound.time;wound.left-=n;wound.time-=used;secondary(r,e,n,'I02');if(!alive(r,e)||wound.time<=1e-9)delete s.wounds[key];}
    if(s.pair){s.pair.time-=dt;if(s.pair.time<=0||!alive(r,s.pair.a)||!alive(r,s.pair.b))s.pair=null;}
    if(s.mark){s.mark.time-=dt;if(s.mark.time<=0||!alive(r,s.mark.e))s.mark=null;}
  }
  function beforeDamage(r,e,amount) { return amount; }
  function afterDamage(r,e,ctx) {
    if(!live(r)||!ctx||ctx.primary!==true)return;var s=state(r),a=attack(s,ctx),base=Math.max(0,Number(ctx.base)||0),n,other,killed=ctx.killed===true||ctx.beforeHP>0&&e.hp<=0;
    if(count(r,'I01')){
      if(!a.reservoirRelease&&s.reservoir>0&&String(s.reservoirAttack)!==String(ctx.attackId)&&alive(r,e)){n=s.reservoir;s.reservoir=0;s.reservoirAttack=null;a.reservoirRelease=true;secondary(r,e,n,'I01');trigger(r,'I01',e.pos,{stage:'release',value:n});}
      if(killed&&!a.reservoirKill){a.reservoirKill=true;var over=Math.max(0,(Number(ctx.amount)||0)-(Number(ctx.beforeHP)||0));if(over>0){s.reservoir=Math.min(base,s.reservoir+over*Math.min(.75,.25+.15*(count(r,'I01')-1)));s.reservoirAttack=ctx.attackId;trigger(r,'I01',e.pos,{stage:'store',value:s.reservoir});}}
    }
    if(count(r,'I02')&&!a.wound){a.wound=true;if(alive(r,e)){n=base*(.15+.10*(count(r,'I02')-1));var w=s.wounds[e.id];s.wounds[e.id]={left:Math.max(n,w?w.left:0),time:2};trigger(r,'I02',e.pos);}}
    if(count(r,'I03')&&!a.wake&&s.grazeCharges>=3){other=nearest(r,e.pos,6,e)[0];if(other){a.wake=true;s.grazeCharges=0;secondary(r,other,base*(.5+.25*(count(r,'I03')-1)),'I03');trigger(r,'I03',e.pos,{stage:'arc'});}}
    if(count(r,'I04')&&!a.opening&&s.opening){var p=position(r),impact={x:e.pos.x,y:e.pos.y},angle=Math.atan2(impact.y-p.y,impact.x-p.x),targets=nearest(r,impact,6,e).filter(function(q){var d=Math.atan2(q.pos.y-impact.y,q.pos.x-impact.x)-angle;return Math.abs(Math.atan2(Math.sin(d),Math.cos(d)))<=Math.PI/3;}).slice(0,3);if(targets.length){a.opening=true;s.opening=false;s.cooldowns.I04=4;for(var q of targets)secondary(r,q,base*(.35+.20*(count(r,'I04')-1)),'I04');trigger(r,'I04',impact,{targets:targets.length,aim:angle,radius:6,cone:Math.PI*2/3});}}
    if(count(r,'I05')){var ph=phase(r);if(ph==='ascent'&&!a.apexLoad){a.apexLoad=true;s.apex.charges=Math.min(4,s.apex.charges+1);}if(ph!=='ascent'&&s.apex.charges>0&&!s.apex.released&&ctx.slot===s.apex.slot&&s.cooldowns.I05<=0&&alive(r,e)){n=base*s.apex.charges*(.15+.10*(count(r,'I05')-1));s.apex.released=true;s.cooldowns.I05=6;secondary(r,e,n,'I05');trigger(r,'I05',e.pos,{charges:s.apex.charges,slot:s.apex.slot,value:n});}}
    if(count(r,'I06')){if(s.pair&&(!alive(r,s.pair.a)||!alive(r,s.pair.b)))s.pair=null;
      if(s.pair&&String(s.pair.attackId)!==String(ctx.attackId)&&!a.pair&&(e===s.pair.a||e===s.pair.b)){other=e===s.pair.a?s.pair.b:s.pair.a;if(alive(r,other)){a.pair=true;secondary(r,other,base*Math.min(.5,.2+.1*(count(r,'I06')-1)),'I06');trigger(r,'I06',e.pos,{stage:'echo'});}}
      if(!s.pair&&s.cooldowns.I06<=0&&alive(r,e)){other=nearest(r,e.pos,5,e)[0];if(other){s.pair={a:e,b:other,time:2,attackId:ctx.attackId};s.cooldowns.I06=6;trigger(r,'I06',e.pos,{stage:'link',target:other.id});}}
    }
    if(count(r,'I09')&&!a.mark){a.mark=true;if(alive(r,e)){s.mark={e:e,time:1.5};trigger(r,'I09',e.pos);}}
  }
  function acceptedHit(r,amount,ctx) {var s=state(r);if(!live(r))return amount;amount=Math.max(0,Number(amount)||0);
    if(ctx&&ctx.shotId!=null&&s.graze[String(ctx.shotId)])s.graze[String(ctx.shotId)].hit=true;
    if(count(r,'I08')&&s.cooldowns.I08<=0){s.cooldowns.I08=8;amount*=1-Math.min(.55,.25+.1*(count(r,'I08')-1));var p=position(r),targets=nearest(r,p,6).slice(0,8);for(var e of targets){var dx=e.pos.x-p.x,dy=e.pos.y-p.y,d=Math.hypot(dx,dy)||1,kx=(e.kx||0)+dx/d*14,ky=(e.ky||0)+dy/d*14,mag=Math.hypot(kx,ky),scale=mag>30?30/mag:1;e.kx=kx*scale;e.ky=ky*scale;}trigger(r,'I08',p,{targets:targets.length});}
    var absorbed=Math.min(s.shield,amount);s.shield-=absorbed;amount-=absorbed;return amount;
  }
  function entry(r) {var s=state(r);if(s.entryDone)return {kills:0,shield:0};s.entryDone=true;s.shield=0;s.opening=false;s.apex.charges=0;s.pair=null;s.mark=null;s.wounds={};s.graze={};if(!live(r))return {kills:0,shield:0};var h=r.hand||{},hasKill=(h.K||0)>0||h.kills&&h.kills.length>0,kills=0;
    if(hasKill&&count(r,'I07')&&s.cooldowns.I07<=0&&Math.abs(world(r,position(r)).y)<=.05){var g=strongest(r),p=position(r),rad=8*(1+Math.max(0,r.demo.stats&&r.demo.stats.Area||0)),targets=nearest(r,p,rad);if(g.amount>0){s.cooldowns.I07=6;for(var e of targets)kills+=secondary(r,e,g.amount*(.75+.35*(count(r,'I07')-1)),'I07',{entry:true});trigger(r,'I07',p,{targets:targets.length,kills:kills});h.entryItemKills=(h.entryItemKills||0)+kills;}}
    if(hasKill&&count(r,'I10')&&s.cooldowns.I10<=0){s.storedShield=Math.max(0,r.stats&&r.stats.maxHp||100)*Math.min(.25,.10+.05*(count(r,'I10')-1));s.cooldowns.I10=8;trigger(r,'I10',position(r),{value:s.storedShield});}
    return {kills:kills,shield:s.storedShield};
  }
  function movementScale(r,e) {var s=state(r);if(!count(r,'I09')||!s.mark||s.mark.e!==e||s.mark.time<=0)return 1;var slow=Math.min(.4,.2+.1*(count(r,'I09')-1));return 1-slow*((e.role==='boss'||e.boss) ? .5 : 1);}
  function buy(r,id) {if(IDS.indexOf(id)<0)return false;state(r);r.demo.itemCounts[id]=count(r,id)+1;return true;}
  function sell(r,id) {var s=state(r),n=count(r,id);if(!n)return false;r.demo.itemCounts[id]=n-1;if(n===1){if(id==='I01')s.reservoir=0;if(id==='I02')s.wounds={};if(id==='I03'){s.graze={};s.grazeCharges=0;}if(id==='I04')s.opening=false;if(id==='I05')s.apex.charges=0;if(id==='I06')s.pair=null;if(id==='I09')s.mark=null;if(id==='I10')s.shield=s.storedShield=0;}return true;}
  function summary(r) {var s=state(r);return {cooldowns:Object.assign({},s.cooldowns),reservoir:s.reservoir,grazeCharges:s.grazeCharges,apex:Object.assign({},s.apex),shield:s.shield,storedShield:s.storedShield,linked:!!s.pair,marked:s.mark?s.mark.e.id:null,triggers:Object.assign({},s.triggers)};}
  var items=Object.fromEntries(catalogue.map(function(i){return [i.id,i];}));
  var api={items:items,configure:configure,create:create,initWave:initWave,breach:breach,tick:tick,beforeDamage:beforeDamage,afterDamage:afterDamage,acceptedHit:acceptedHit,entry:entry,movementScale:movementScale,buy:buy,sell:sell,summary:summary,catalogue:catalogue};return api;
})();
if(typeof module==='object'&&module.exports)module.exports=FiveCombat;

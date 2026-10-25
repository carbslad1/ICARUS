/* Actual built-runtime shop contracts. Fixtures mutate run state, never runtime code. */
'use strict';
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const {load}=require('./load.cjs');
const root=path.resolve(__dirname,'..'),file=process.argv.find(x=>x.startsWith('--file='))?.slice(7)||path.join(root,'ICARUS-demo.html');
const H=load(file,new Map(),{bake:true,modern:true}),D=H.DEMO,F=H.FiveScore;
const checks=[],observations={};
function test(name,fn){try{const detail=fn();checks.push({name,passed:true,detail});console.log('PASS '+name);}catch(e){checks.push({name,passed:false,error:e.message});console.log('FAIL '+name+': '+e.message);}}
function run(seed=1,wave=1){const r=H.Hd(seed,'harpoon');r.wave=wave;D.wave(r);r.mode='shop';r.xp=1000;r.lvup=0;return r;}
function fixture(r,row,id,price=20,extra={}){const o={uid:++r.demo.uid,row,id,price,...extra};r.demo.offers=[o];return o;}
const viable=(r,c)=>D.packChoiceValid(r,c);
const inRoutineRow=o=>o.row==='routine'||o.row==='pack';
test('Seeded shops: shelf of three, Routine row of two, at most six offers; run rules are rare shelf offers',()=>{
 const rows=[];let rules=0,shops=0;for(const wave of [1,5,10,15,19])for(let seed=1;seed<=100;seed++){
  const r=run(seed,wave);D.shop(r);shops++;assert(r.demo.offers.length<=6);
  assert.equal(r.demo.offers.filter(inRoutineRow).length,2);assert.equal(r.demo.offers.filter(o=>!inRoutineRow(o)).length,3);
  const v=r.demo.offers.filter(o=>o.row==='voucher').length;if(wave===1)assert.equal(v,0);rules+=v;
  if(seed===1)rows.push({wave,offers:r.demo.offers.map(o=>({row:o.row,id:o.id,price:o.price}))});
 }observations.exampleOffers=rows;observations.ruleOffersPerShop=rules/shops;assert(rules>0&&rules/shops<.2,`rule offers per shop ${rules/shops}`);return {shops,ruleOffersPerShop:rules/shops};
});
test('Locked prices and offers survive shop changes without exceeding six',()=>{
 for(const seed of [1,17,55]){
  const r=run(seed,4);r.demo.shelfBonus=1;D.shop(r);assert.equal(r.demo.offers.length,6);
  const original=r.demo.offers.map(o=>({uid:o.uid,price:o.price}));r.demo.offers.forEach(o=>D.command(r,'lock',o.uid));r.wave=5;D.shop(r);
  assert(r.demo.offers.length<=6);for(const o of original){const held=r.demo.offers.find(x=>x.uid===o.uid);if(held)assert.equal(held.price,o.price);}
 }return {shops:3};
});
test('Six locked offers all return at their original prices; nothing is displaced',()=>{
 const r=run(7,4);r.demo.shelfBonus=1;D.shop(r);r.demo.offers.filter(o=>o.row!=='voucher').forEach(o=>D.command(r,'lock',o.uid));
 const prior=r.demo.offers.filter(o=>o.locked).map(o=>({uid:o.uid,price:o.price}));r.wave=5;D.shop(r);
 for(const o of prior)assert(r.demo.offers.some(x=>x.uid===o.uid&&x.price===o.price));assert.equal((r.demo.deferredOffers||[]).length,0);assert(r.demo.offers.length<=6);
 return {held:prior.length};
});
test('Six weapon slots reject purchases without charging; combining preserves total paid cost',()=>{
 const r=run();for(let i=0;i<5;i++)r.slots.push(H.Owslot('harpoon',1,100+i));
 const o=fixture(r,'weapon','fin',20,{level:1}),before=r.xp;assert.equal(D.command(r,'buy',o.uid),false);assert.equal(r.xp,before);assert.equal(r.slots.length,6);
 r.slots[0].paid=20;r.slots[1].paid=24;assert.equal(D.command(r,'combine',0),true);assert.equal(r.slots.length,5);assert.equal(r.slots[0].paid,44);assert.equal(r.slots[0].lvl,2);
});
test('Pack opening charges once; a pick never charges again',()=>{
 const r=run();r.xp=100;const o=fixture(r,'pack','routine',15);assert.equal(D.command(r,'buy',o.uid),true);assert.equal(r.xp,85);
 assert.equal(D.command(r,'buy',o.uid),false);assert.equal(r.xp,85);
 const index=r.demo.pack.choices.findIndex(c=>viable(r,c));assert(index>=0);assert.equal(D.command(r,'packPick',index),true);assert.equal(r.xp,85);assert.equal(r.demo.pack,null);
 assert.equal(D.command(r,'packPick',index),false);assert.equal(r.xp,85);
});
test('Single Routine offers apply exactly once and charge once; capped upgrades refuse without charging',()=>{
 const r=run(),s=r.demo.score;
 const cases=[{kind:'polish',face:'front'},{kind:'routine',id:'Formation'},{kind:'transfer',donor:'spout',recipient:'front'},{kind:'technique',face:'star',id:'echo'},{kind:'draw'},{kind:'focus'}];
 for(const c of cases){const before=JSON.stringify(s),o=fixture(r,'routine',c.kind,9,{choice:c}),xp=r.xp;assert.equal(D.command(r,'buy',o.uid),true,c.kind);assert.equal(r.xp,xp-9);assert.notEqual(JSON.stringify(s),before,c.kind+' changed nothing');assert.equal(D.command(r,'buy',o.uid),false);}
 assert.equal(s.polish.front,1);assert.equal(s.routines.Formation,1);assert.equal(s.weights.front,.3);assert.equal(s.techniques.star,'echo');assert.equal(s.draws,4);assert.equal(s.focus,true);
 s.draws=6;const capped=fixture(r,'routine','draw',9,{choice:{kind:'draw'}}),xp=r.xp;assert.equal(D.command(r,'buy',capped.uid),false);assert.equal(r.xp,xp);assert.equal(s.draws,6);
});
test('Bought draws raise the next wave’s hand size; Loaded reels adds one more, up to seven',()=>{
 const r=run();assert.equal(D.cap(r),3);const o=fixture(r,'routine','draw',9,{choice:{kind:'draw'}});D.command(r,'buy',o.uid);assert.equal(D.cap(r),4);
 assert.equal(D.command(r,'next'),true);assert.equal(r.demo.heldHand,null);r.medium={kind:'air',origin:{x:0,y:20},local:{x:0,y:0},velocity:{x:0,y:0},vx:20,vy:30,elapsed:0,heading:1,waterScale:1,exitFlight:false};D.open(r);assert.equal(r.hand.drawn.length,4);
 r.demo.score.draws=6;r.demo.charms.push('N16');assert.equal(D.cap(r),7);
});
test('Gear purchases sell one copy and reverse their exact stat contributions',()=>{
 const r=run();for(const id of Object.keys(H.FiveCombat.items)){
  const before={...r.demo.itemCounts},o=fixture(r,'item',id,19),xp=r.xp;
  assert.equal(D.command(r,'buy',o.uid),true,id);assert.equal(r.demo.itemCounts[id],(before[id]||0)+1);
  assert.equal(D.command(r,'itemSell',id),true,id);assert.equal(r.demo.itemCounts[id]||0,before[id]||0);assert.equal(r.xp,xp-19+9);
 }
 for(let id=0;id<D.items.length;id++){
  const before=JSON.stringify(r.demo.stats),o=fixture(r,'stat',id,19),xp=r.xp;
  assert.equal(D.command(r,'buy',o.uid),true,D.items[id].name);assert.equal(D.command(r,'statSell',o.uid),true);
  assert.equal(JSON.stringify(r.demo.stats),before,D.items[id].name+' exact stat reversal');assert.equal(r.xp,xp-19+9);
 }
});
test('Levels gate the shop until each stat pick is chosen, and add no Max HP by themselves',()=>{
 const r=run();r.lvup=2;D.levelChoices(r);assert.equal(r.demo.levelChoices.length,3);r.demo.offers=[{uid:9001,row:'weapon',id:'harpoon',level:1,price:20}];const xp=r.xp;
 assert.equal(D.command(r,'buy',9001),false);assert.equal(r.xp,xp);assert.equal(D.command(r,'next'),false);
 assert.equal(D.command(r,'level',0),true);assert.equal(r.lvup,1);assert.equal(D.command(r,'level',0),true);assert.equal(r.lvup,0);assert.equal(D.command(r,'buy',9001),true);
 const p=H.Hd(1,'harpoon'),hp=p.hp;p.medium={kind:'air',origin:{x:0,y:20},local:{x:0,y:0},velocity:{x:0,y:0},vx:0,vy:0,elapsed:1,heading:0,waterScale:1};H.Oxepay(p,H.Oxeneed(0),{x:0,y:0});assert.equal(p.lvl,1);assert.equal(p.lvup,1);assert.equal(p.stats.maxHp,100);assert.equal(p.hp,hp);
 assert.ok(D.stats.Pickup&&D.stats['XP gain']);assert(!D.items.some(x=>x.rule));
});
test('Charm slot cap rejects shelf additions without payment and permits selling/replacing',()=>{
 const r=run();r.demo.charms=['S01','S02','S03','S04','S07'];
 const o=fixture(r,'charm','S08',20),xp=r.xp;assert.equal(D.command(r,'buy',o.uid),false);assert.equal(r.xp,xp);
 assert.equal(D.command(r,'charmSell',0),true);assert.equal(D.command(r,'buy',o.uid),true);assert.equal(r.demo.charms.length,5);
});
test('Charm loop run rule adds a slot; the extra shelf is capped at one',()=>{
 const r=run(),slots=D.charmSlots(r),o=fixture(r,'voucher','charm',30);assert.equal(D.command(r,'buy',o.uid),true);assert.equal(D.charmSlots(r),slots+1);
 const s1=fixture(r,'voucher','shelf',30);assert.equal(D.command(r,'buy',s1.uid),true);const s2=fixture(r,'voucher','shelf',30),xp=r.xp;assert.equal(D.command(r,'buy',s2.uid),false);assert.equal(r.xp,xp);
});
test('Full charm inventory cannot pay for a charm pack with no immediately selectable option',()=>{
 const r=run();r.demo.charms=['S01','S02','S03','S04','S07'];const o=fixture(r,'pack','charm',20),xp=r.xp;
 assert.equal(D.command(r,'buy',o.uid),false,'full-slot charm pack accepted payment although every choice is disabled');assert.equal(r.xp,xp);
});
test('Mega charm pack assigns its single price across picks before 50% resale',()=>{
 const r=run(2,10),o=fixture(r,'pack','charm',20,{mega:true}),xp=r.xp;assert.equal(D.command(r,'buy',o.uid),true);
 for(let pick=0;pick<2;pick++){const i=r.demo.pack.choices.findIndex(c=>c.kind==='charm'&&viable(r,c));assert(i>=0);assert.equal(D.command(r,'packPick',i),true);}
 assert.equal(r.demo.pack,null);const spent=xp-r.xp;let refund=0;while(r.demo.charms.length){const before=r.xp;assert.equal(D.command(r,'charmSell',0),true);refund+=r.xp-before;}
 assert(refund<=Math.floor(spent/2),`two picks from one ${spent}-pearl pack refunded ${refund}; price was assigned twice`);
 return {spent,refund};
});
test('Odd-price Mega pack allocation preserves its exact purchase cost across both charm picks',()=>{
 const r=run(2,10),o=fixture(r,'pack','charm',21,{mega:true});assert.equal(D.command(r,'buy',o.uid),true);
 for(let pick=0;pick<2;pick++){const i=r.demo.pack.choices.findIndex(c=>c.kind==='charm'&&viable(r,c));assert(i>=0);assert.equal(D.command(r,'packPick',i),true);}
 assert.equal(Object.values(r.demo.charmPaid).reduce((a,b)=>a+b,0),21);
});
test('Mega charm pack keeps its second pick as an explained Routine fallback after the last charm slot fills',()=>{
 const r=run(3,10);r.demo.charms=['S01','S02','S03','S04'];const o=fixture(r,'pack','charm',20,{mega:true});assert.equal(D.command(r,'buy',o.uid),true);
 const first=r.demo.pack.choices.findIndex(c=>c.kind==='charm'&&viable(r,c));assert(first>=0);assert.equal(D.command(r,'packPick',first),true);assert.equal(r.demo.charms.length,5);
 const fallback=r.demo.pack.choices.findIndex(c=>c.kind!=='charm'&&viable(r,c));assert(fallback>=0,'remaining paid pick has no selectable fallback');assert(r.demo.pack.fallback,'fallback explanation is missing');assert.equal(D.command(r,'packPick',fallback),true);assert.equal(r.demo.pack,null);
});
test('Full charm inventories never generate Charm packs',()=>{
 let packs=0;for(let seed=1;seed<=200;seed++){
  const r=run(seed,5);r.demo.charms=['S01','S02','S03','S04','S07'];D.shop(r);
  assert(!r.demo.offers.some(o=>o.row==='pack'&&o.id==='charm'));packs+=r.demo.offers.filter(o=>o.row==='pack').length;
 }return {packs};
});
test('Techniques start at wave four; Echo is offered',()=>{
 let early=0,echo=0;for(let seed=1;seed<=500;seed++){
  const a=run(seed,1),o=fixture(a,'pack','routine',7);D.command(a,'buy',o.uid);early+=a.demo.pack.choices.filter(c=>c.kind==='technique').length;
  const b=run(seed,8),p=fixture(b,'pack','routine',7,{mega:true});D.command(b,'buy',p.uid);echo+=b.demo.pack.choices.filter(c=>c.kind==='technique'&&c.id==='echo').length;
 }assert.equal(early,0,`${early} techniques appeared in 500 wave-1 packs`);assert(echo>0,'Echo never offered');return {packs:1000,echo};
});
test('Mega pack retains enough legal choices after the first pick in capped-build fixtures',()=>{
 for(let seed=1;seed<=1200;seed++){
  const r=run(seed,15),s=r.demo.score;s.weights={spout:.5,front:.3,back:.1,cork:.05,star:.05};s.draws=6;s.focus=true;
  for(const f of F.faces){s.polish[f]=4;s.techniques[f]='lucky';}
  const o=fixture(r,'pack','routine',20,{mega:true});assert.equal(D.command(r,'buy',o.uid),true);
  const index=r.demo.pack.choices.findIndex(c=>viable(r,c));assert(index>=0,'no first legal choice seed'+seed);
  const choices=JSON.parse(JSON.stringify(r.demo.pack.choices));assert.equal(D.command(r,'packPick',index),true);
  assert(r.demo.pack&&r.demo.pack.remaining===1);assert(r.demo.pack.choices.some(c=>viable(r,c)),`seed${seed}: all four remaining picks became invalid after ${JSON.stringify(choices[index])}; choices ${JSON.stringify(choices)}`);
 }return {packs:1200};
});
test('Seeded affordability, charm eligibility and rarity frequency across five progression points',()=>{
 const summary=[],rareShare=Object.values(F.charms).filter(c=>c.rarity===3).length/Object.keys(F.charms).length;for(const wave of [1,5,10,15,19]){
  const tally={wave,shops:300,clearIncome:24+wave*4,affordableShelf:0,affordableRoutine:0,charmOffers:0,rareCharms:0,unaffordableShops:0,counts:{}};
  for(let seed=1;seed<=300;seed++){
   const r=run(seed,wave);r.xp=tally.clearIncome;D.shop(r);
   let affordable=0;for(const o of r.demo.offers){
    assert(o.price>=1&&Number.isFinite(o.price));if(o.price<=r.xp){affordable++;if(inRoutineRow(o))tally.affordableRoutine++;else if(o.row!=='voucher')tally.affordableShelf++;}
    if(o.row==='charm'){tally.charmOffers++;tally.counts[o.id]=(tally.counts[o.id]||0)+1;if(F.charms[o.id].rarity===3)tally.rareCharms++;
     assert.notEqual(o.id,'S05');assert.notEqual(o.id,'S13');assert.notEqual(o.id,'N04');}
   }if(!affordable)tally.unaffordableShops++;
  }assert.equal(tally.unaffordableShops,0);summary.push(tally);
 }observations.progression=summary;assert(summary[0].rareCharms/summary[0].charmOffers<rareShare,'rare charms appear as often as common ones at wave 1');
 return summary.map(x=>({wave:x.wave,affordableShelf:x.affordableShelf/300,affordableRoutine:x.affordableRoutine/300,rareCharmFraction:x.charmOffers?x.rareCharms/x.charmOffers:0,rareShareOfPool:rareShare}));
});
const result={suite:'shop-runtime',builtFile:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length,checks,observations};
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);if(out)fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:result.passed,failed:result.failed,observations:{ruleOffersPerShop:observations.ruleOffersPerShop}},null,2));if(result.failed)process.exitCode=1;

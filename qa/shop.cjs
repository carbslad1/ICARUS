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
function viable(r,c){const s=structuredClone(r.demo.score);
 if(c.used)return false;if(c.kind==='charm')return r.demo.charms.length<D.charmSlots(r)&&!r.demo.charms.includes(c.id);
 if(c.kind==='routine')return F.routine(s,c.id);if(c.kind==='polish')return F.polish(s,c.face);
 if(c.kind==='transfer')return F.transfer(s,c.donor,c.recipient);if(c.kind==='technique')return F.technique(s,c.face,c.id);return false;
}
test('Seeded normal shops have at most six offers, two packs and milestone vouchers',()=>{
 const rows=[];for(const wave of [1,5,10,15,19])for(let seed=1;seed<=100;seed++){
  const r=run(seed,wave);D.shop(r);assert(r.demo.offers.length<=6);assert(r.demo.offers.filter(o=>o.row==='pack').length<=2);
  if([5,10,15].includes(wave))assert.equal(r.demo.offers.filter(o=>o.row==='voucher').length,1);
  if(seed===1)rows.push({wave,offers:r.demo.offers.map(o=>({row:o.row,id:o.id,price:o.price}))});
 }observations.exampleOffers=rows;return {shops:500};
});
test('Locked prices and offers survive shop changes without exceeding six',()=>{
 for(const seed of [1,17,55]){
  const r=run(seed,4);r.demo.shelfBonus=1;D.shop(r);assert.equal(r.demo.offers.length,6);
  const original=r.demo.offers.map(o=>({uid:o.uid,price:o.price}));r.demo.offers.forEach(o=>D.command(r,'lock',o.uid));r.wave=5;D.shop(r);
  assert(r.demo.offers.length<=6);for(const o of original){const held=r.demo.offers.find(x=>x.uid===o.uid);if(held)assert.equal(held.price,o.price);}
 }return {shops:3};
});
test('Mandatory milestone voucher remains obtainable when all six prior offers were locked',()=>{
 const r=run(1,4);r.demo.shelfBonus=1;D.shop(r);r.demo.offers.forEach(o=>D.command(r,'lock',o.uid));r.wave=5;D.shop(r);
 assert(r.demo.offers.some(o=>o.row==='voucher'),'all six locks silently remove the wave-5 voucher');
 assert(r.demo.offers.length<=6);return {offers:r.demo.offers.map(o=>o.row)};
});
test('A displaced locked offer returns next shop with its original identity and price',()=>{
 const r=run(7,4);r.demo.shelfBonus=1;D.shop(r);r.demo.offers.forEach(o=>D.command(r,'lock',o.uid));
 const prior=r.demo.offers.map(o=>({uid:o.uid,price:o.price}));r.wave=5;D.shop(r);
 assert(r.demo.offers.some(o=>o.row==='voucher'));const visible=new Set(r.demo.offers.map(o=>o.uid)),missing=prior.filter(o=>!visible.has(o.uid));assert.equal(missing.length,1);
 assert((r.demo.deferredOffers||[]).some(o=>o.uid===missing[0].uid&&o.price===missing[0].price));r.wave=6;D.shop(r);
 for(const o of prior)assert(r.demo.offers.some(x=>x.uid===o.uid&&x.price===o.price));assert.equal(r.demo.offers.length,6);
});
test('Six weapon slots reject purchases without charging; combining preserves total paid cost',()=>{
 const r=run();for(let i=0;i<5;i++)r.slots.push(H.Owslot('harpoon',1,100+i));
 const o=fixture(r,'weapon','fin',20,{level:1}),before=r.xp;assert.equal(D.command(r,'buy',o.uid),false);assert.equal(r.xp,before);assert.equal(r.slots.length,6);
 r.slots[0].paid=20;r.slots[1].paid=24;assert.equal(D.command(r,'combine',0),true);assert.equal(r.slots.length,5);assert.equal(r.slots[0].paid,44);assert.equal(r.slots[0].lvl,2);
});
test('Shelf purchases and pack opening charge once; a pick never charges again',()=>{
 const r=run();r.xp=100;const o=fixture(r,'pack','rehearsal',15);assert.equal(D.command(r,'buy',o.uid),true);assert.equal(r.xp,85);
 assert.equal(D.command(r,'buy',o.uid),false);assert.equal(r.xp,85);
 const index=r.demo.pack.choices.findIndex(c=>viable(r,c));assert(index>=0);assert.equal(D.command(r,'packPick',index),true);assert.equal(r.xp,85);assert.equal(r.demo.pack,null);
 assert.equal(D.command(r,'packPick',index),false);assert.equal(r.xp,85);
});
test('Combat item and stat purchases sell one copy and reverse their exact stat contributions',()=>{
 const r=run();for(const id of Object.keys(H.FiveCombat.items)){
  const before={...r.demo.itemCounts},o=fixture(r,'item',id,19),xp=r.xp;
  assert.equal(D.command(r,'buy',o.uid),true,id);assert.equal(r.demo.itemCounts[id],(before[id]||0)+1);
  assert.equal(D.command(r,'itemSell',id),true,id);assert.equal(r.demo.itemCounts[id]||0,before[id]||0);assert.equal(r.xp,xp-19+9);
 }
 for(let id=0;id<D.items.length-2;id++){
  const before=JSON.stringify(r.demo.stats),o=fixture(r,'stat',id,19),xp=r.xp;
  assert.equal(D.command(r,'buy',o.uid),true,D.items[id].name);assert.equal(D.command(r,'statSell',o.uid),true);
  assert.equal(JSON.stringify(r.demo.stats),before,D.items[id].name+' exact stat reversal');assert.equal(r.xp,xp-19+9);
 }
});
test('Charm slot cap rejects shelf additions without payment and permits selling/replacing',()=>{
 const r=run();r.demo.charms=['S01','S02','S03','S04','S07'];
 const o=fixture(r,'charm','S08',20),xp=r.xp;assert.equal(D.command(r,'buy',o.uid),false);assert.equal(r.xp,xp);
 assert.equal(D.command(r,'charmSell',0),true);assert.equal(D.command(r,'buy',o.uid),true);assert.equal(r.demo.charms.length,5);
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
test('Mega charm pack can preserve its second pick as explicit Rehearsal fallback after last charm slot fills',()=>{
 const r=run(3,10);r.demo.charms=['S01','S02','S03','S04'];const o=fixture(r,'pack','charm',20,{mega:true});assert.equal(D.command(r,'buy',o.uid),true);
 const first=r.demo.pack.choices.findIndex(c=>c.kind==='charm'&&viable(r,c));assert(first>=0);assert.equal(D.command(r,'packPick',first),true);assert.equal(r.demo.charms.length,5);
 const fallback=r.demo.pack.choices.findIndex(c=>c.kind!=='charm'&&viable(r,c));assert(fallback>=0,'remaining paid pick has no selectable fallback');assert(r.demo.pack.fallback,'fallback explanation is missing');assert.equal(D.command(r,'packPick',fallback),true);assert.equal(r.demo.pack,null);
});
test('Generated full-inventory Charm packs are visibly converted before payment',()=>{
 let converted=0;for(let seed=1;seed<=200;seed++){
  const r=run(seed,5);r.demo.charms=['S01','S02','S03','S04','S07'];D.shop(r);
  assert(!r.demo.offers.some(o=>o.row==='pack'&&o.id==='charm'));
  converted+=r.demo.offers.filter(o=>o.row==='pack'&&o.id==='rehearsal'&&o.fallback).length;
 }assert(converted>0);return {converted};
});
test('Gold/Lucky techniques are gated until wave five; Echo never enters ordinary packs',()=>{
 let early=0,echo=0;for(let seed=1;seed<=500;seed++){
  const r=run(seed,1),o=fixture(r,'pack','rehearsal',7);D.command(r,'buy',o.uid);
  early+=r.demo.pack.choices.filter(c=>c.kind==='technique').length;echo+=r.demo.pack.choices.filter(c=>c.id==='echo').length;
 }assert.equal(early,0,`${early} techniques appeared in 500 wave-1 packs`);assert.equal(echo,0);return {packs:500};
});
test('Mega pack retains enough legal choices after the first pick in capped-build fixtures',()=>{
 for(let seed=1;seed<=1200;seed++){
  const r=run(seed,15),s=r.demo.score;s.weights={spout:.5,front:.3,back:.1,cork:.05,star:.05};
  for(const f of F.faces){s.polish[f]=4;s.techniques[f]='lucky';}
  const o=fixture(r,'pack','rehearsal',20,{mega:true});assert.equal(D.command(r,'buy',o.uid),true);
  const index=r.demo.pack.choices.findIndex(c=>viable(r,c));assert(index>=0,'no first legal choice seed'+seed);
  const choices=JSON.parse(JSON.stringify(r.demo.pack.choices));assert.equal(D.command(r,'packPick',index),true);
  assert(r.demo.pack&&r.demo.pack.remaining===1);assert(r.demo.pack.choices.some(c=>viable(r,c)),`seed${seed}: all four remaining picks became invalid after ${JSON.stringify(choices[index])}; choices ${JSON.stringify(choices)}`);
 }return {packs:1200};
});
test('Seeded milestone affordability and eligibility are observable across five progression points',()=>{
 const summary=[];for(const wave of [1,5,10,15,19]){
  const tally={wave,shops:200,clearIncome:24+wave*4,affordableShelf:0,affordablePacks:0,charmOffers:0,rareCharms:0,unaffordableShops:0,counts:{}};
  for(let seed=1;seed<=200;seed++){
   const r=run(seed,wave);r.xp=tally.clearIncome;if(wave>=10)r.slots.push(H.Owslot('sonic',1,99));D.shop(r);
   let affordable=0;for(const o of r.demo.offers){
    assert(o.price>=1&&Number.isFinite(o.price));if(o.price<=r.xp){affordable++;if(o.row==='pack')tally.affordablePacks++;else if(o.row!=='voucher')tally.affordableShelf++;}
    if(o.row==='charm'){tally.charmOffers++;tally.counts[o.id]=(tally.counts[o.id]||0)+1;if(F.charms[o.id].rarity===3)tally.rareCharms++;
     assert(!(o.id==='S05'&&wave<10));assert(!(o.id==='S06'&&wave<5));assert(!(o.id==='S16'&&(wave<10||wave>=17)));assert.notEqual(o.id,'S13');}
   }if(!affordable)tally.unaffordableShops++;
  }assert.equal(tally.unaffordableShops,0);summary.push(tally);
 }observations.progression=summary;return summary.map(x=>({wave:x.wave,affordableShelf:x.affordableShelf/200,affordablePacks:x.affordablePacks/200,rareCharmFraction:x.charmOffers?x.rareCharms/x.charmOffers:0}));
});
const result={suite:'shop-runtime',builtFile:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),passed:checks.filter(x=>x.passed).length,failed:checks.filter(x=>!x.passed).length,checks,observations};
const out=process.argv.find(x=>x.startsWith('--out='))?.slice(6);if(out)fs.writeFileSync(path.resolve(out),JSON.stringify(result,null,2));
console.log(JSON.stringify({passed:result.passed,failed:result.failed,observations},null,2));if(result.failed)process.exitCode=1;

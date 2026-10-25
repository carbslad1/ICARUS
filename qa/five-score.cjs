'use strict';
const assert=require('assert/strict');
const S=require('../source/five-score.js');
const results=[];
let assertions=0;
function eq(a,b,message){assertions++;assert.deepEqual(a,b,message);}
function close(a,b,message){assertions++;assert(Math.abs(a-b)<1e-8,`${message||''}: ${a} != ${b}`);}
function check(name,fn){const t=Date.now();fn();results.push({name,passed:true,ms:Date.now()-t});}
const clone=x=>JSON.parse(JSON.stringify(x));
const facts={K:6,hits:0,phases:{ascent:3,apex:2,descent:1},openingK:3,lateK:2,belowK:4,entryKills:1,air:10,predAir:10,primaryTypes:['Close','Shot'],maxMulti:3,wave:1};
const evaluate=(h,ch=[],ledger=facts,state=S.create(),rng=()=>1)=>S.evaluate(state,h,ledger,ch,rng);
check('Five identities; independent replacement; draws 3→6 at waves 5/10/15',()=>{
  eq(S.faces,['spout','front','back','cork','star']);
  eq([1,4,5,9,10,14,15,20].map(S.draws),[3,3,4,4,5,5,6,6]);
  eq(S.draw(S.create(),6,()=>0),Array(6).fill('spout'));
  let i=0;eq(S.draw(S.create(),5,()=>[.01,.21,.41,.61,.81][i++]),S.faces);
  let j=0;eq(S.draw(S.create(),3,()=>[.8,.8,.8][j++]),['star','star','star']);
});
check('Reference odds and once-per-type overlap verified across 15,625 ordered hands',()=>{
  const matches=Object.fromEntries(S.combos.map(c=>[c.id,0]));
  for(let ordinal=0;ordinal<15625;ordinal++){
    let k=ordinal,h=[];for(let n=0;n<6;n++){h.push(S.faces[k%5]);k=Math.floor(k/5);}
    const c=S.faces.map(f=>h.filter(x=>x===f).length).sort((a,b)=>b-a);
    const expected={pair:c[0]>=2,twoPair:c[1]>=2,triple:c[0]>=3,house:c[0]>=3&&c[1]>=2,show:c[4]>=1,four:c[0]>=4,threePair:c[2]>=2,doubleTriple:c[1]>=3,five:c[0]>=5,six:c[0]>=6};
    const r=evaluate(h,[],{K:0});
    eq(r.combos.map(x=>x.id).sort(),Object.keys(expected).filter(id=>expected[id]).sort());
    for(const id of r.combos.map(c=>c.id))matches[id]++;
  }
  for(const c of S.combos){close(matches[c.id]/15625,c.p,c.id+' reference');eq(c.bonus,Math.max(1,Math.ceil(2*Math.log2(1/c.p)-1e-10)));}
  eq(evaluate(Array(6).fill('front'),[],{K:0}).mult,56);
  eq(evaluate(['front','front','front','back','back','back'],[],{K:0}).mult,29);
  eq(evaluate(['spout','spout','front','front','back','back'],[],{K:0}).mult,18);
  eq(evaluate(S.faces,[],{K:0}).mult,12);
});
check('Weight conservation, bounds, Polish caps and Routine caps',()=>{
  const s=S.create();for(let i=0;i<3;i++)eq(S.transfer(s,'spout','front'),true);
  eq(S.transfer(s,'spout','front'),false);close(s.weights.spout,.05);close(s.weights.front,.35);
  for(let i=0;i<3;i++)eq(S.transfer(s,'back','front'),true);
  close(s.weights.front,.5);eq(S.transfer(s,'cork','front'),false);close(Object.values(s.weights).reduce((a,b)=>a+b),1);
  for(let i=0;i<4;i++)eq(S.polish(s,'front'),true);eq(S.polish(s,'front'),false);close(S.value(s,'front'),3);
  for(const g of Object.keys(S.groups)){for(let i=0;i<4;i++)eq(S.routine(s,g),true);eq(S.routine(s,g),false);}
  eq(S.technique(s,'front','nonsense'),false);eq(S.technique(s,'bad','gold'),false);
});
check('Routine directions tuned at N5 and differentiated by profiles at N6',()=>{
  const fact=n=>n<2?1:n*fact(n-1);
  function vectors(n,k=5,p=[]){if(k===1)return [[...p,n]];return Array.from({length:n+1},(_,i)=>vectors(n-i,k-1,[...p,i])).flat();}
  function gain(n,weights,group){return vectors(n).reduce((total,c)=>{
    const probability=fact(n)/c.reduce((a,b)=>a*fact(b),1)*c.reduce((a,v,i)=>a*weights[i]**v,1);
    const h=c.flatMap((count,i)=>Array(count).fill(S.faces[i])), s=S.create(),before=evaluate(h,[],{K:0},s).mult;S.routine(s,group);
    return total+probability*(evaluate(h,[],{K:0},s).mult-before);
  },0);}
  const early=Object.fromEntries(Object.keys(S.groups).map(g=>[g,gain(5,[.2,.2,.2,.2,.2],g)]));
  close(early.Repeat,.63648);close(early.Formation,.6336);close(early.Variety,.672);
  assertions++;assert(gain(6,[.5,.15,.15,.1,.1],'Repeat')>gain(6,[.5,.15,.15,.1,.1],'Formation'));
  assertions++;assert(gain(6,[.35,.35,.1,.1,.1],'Formation')>gain(6,[.35,.35,.1,.1,.1],'Repeat'));
  assertions++;assert(gain(6,[.3,.3,.3,.05,.05],'Formation')>gain(6,[.3,.3,.3,.05,.05],'Repeat'));
});
check('All 17 score charms read combat facts and respect left-to-right order',()=>{
  const h=['spout','front','front','back','cork','star'],base=evaluate(h).mult;
  const delta=(id,extra={},hand=h,ch={id})=>evaluate(hand,[ch],{...facts,...extra}).mult-evaluate(hand,[],{...facts,...extra}).mult;
  close(delta('S01',{},h,{id:'S01',face:'front'}),3);
  close(delta('S02'),5);close(delta('S03'),3);close(delta('S04'),base*.25);
  close(delta('S05'),(base+2)*2.5-base);close(delta('S06'),2);close(delta('S07'),4);
  close(delta('S08',{phases:{ascent:4,apex:1,descent:1}}),base*.3);
  close(delta('S09',{phases:{ascent:1,apex:1,descent:4}}),base*.3);
  close(delta('S10'),7);close(delta('S11'),4);close(delta('S12'),5);close(delta('S13'),10);
  const relay=S.create();relay.relay=3;close(evaluate(h,['S14'],facts,relay).mult-base,3);
  close(delta('S15'),0);close(delta('S15',{},['front','front','back']),2);
  close(delta('S16'),1);close(evaluate(h,['S17'],facts,S.create(),()=>0).mult-base,2);
  const addThenMultiply=evaluate(h,[{id:'S01',face:'front'},'S04']).mult;
  const multiplyThenAdd=evaluate(h,['S04',{id:'S01',face:'front'}]).mult;
  close(addThenMultiply,(base+3)*1.25);close(multiplyThenAdd,base*1.25+3);assertions++;assert(addThenMultiply>multiplyThenAdd);
  eq(evaluate(h,['S04'],{...facts,hits:1}).charmLog[0].active,false);
  eq(evaluate(h,['S05'],{...facts,primaryTypes:['Shot']}).charmLog[0].active,false);
  eq(evaluate(h,['S12'],{...facts,air:8.49}).charmLog[0].active,false);
  eq(evaluate(h,['S11'],{...facts,belowK:2}).charmLog[0].active,false);
  eq(evaluate(h,['S03'],{...facts,maxMulti:1}).charmLog[0].active,false);
});
check('House lights has an immediate two-type fallback and multiplies it only on Full Show',()=>{
  const h=['front','front','back'],base=evaluate(h).mult;
  close(evaluate(h,['S05'],facts).mult,base+2);
  close(evaluate(h,['S05'],{...facts,primaryTypes:['Shot']}).mult,base);
  const full=S.faces,showBase=evaluate(full).mult;close(showBase,12);
  close(evaluate(full,['S05'],facts).mult,(showBase+2)*2.5);
  close(evaluate(full,['S05'],{...facts,primaryTypes:['Shot']}).mult,showBase);
  close(evaluate(full,['S02','S05'],facts).mult,(showBase+5+2)*2.5);
  close(evaluate(full,['S05','S02'],facts).mult,(showBase+2)*2.5+5);
});
check('Attack IDs aggregate primary multi-kills and exclude secondary victims',()=>{
  const h=['front','front','back','back'];
  const r=evaluate(h,['S03'],{K:4,kills:[{attackId:1,primary:true,phase:'ascent'},{attackId:1,primary:true,phase:'ascent'},{attackId:2,primary:false,phase:'ascent'},{attackId:2,primary:false,phase:'ascent'}]});
  eq(r.charmLog[0].add,4);
});
check('Empty flights and previews never roll, grow, spend or cache a bank',()=>{
  const s=S.create();S.technique(s,'cork','lucky');S.technique(s,'star','gold');s.relay=3;
  const snapshot=clone(s),h=['front','back','star','cork','cork'];let rolls=0;
  evaluate(h,['S14','S16','S17'],{...facts,K:0,bankId:99},s,()=>{rolls++;return 0;});eq(s,snapshot);eq(rolls,0);
  evaluate(h,['S14','S16','S17'],{...facts,preview:true},s,()=>{rolls++;return 0;});eq(s,snapshot);eq(rolls,0);
});
check('Gold grows only future hands, once each wave; replacement preserves purchased Polish',()=>{
  const s=S.create();S.polish(s,'star');S.technique(s,'star','gold');const h=['star','front','back'];
  close(evaluate(h,[],{...facts,wave:1},s).mult,3.5);eq(s.gold.star.marks,1);
  evaluate(h,[],{...facts,wave:1},s);eq(s.gold.star.marks,1);
  close(evaluate(h,[],{...facts,wave:2},s).mult,3.5);close(S.value(s,'star'),1.75);
  close(evaluate(h,[],{...facts,wave:3},s).mult,3.75);
  for(let wave=4;wave<=15;wave++)evaluate(h,[],{...facts,wave},s);
  close(S.value(s,'star'),2.5);eq(s.gold.star.marks,8);
  S.technique(s,'star','lucky');close(S.value(s,'star'),1.5);eq(s.gold.star,undefined);
});
check('Relay spends old token before loading one new token; wave and sale reset',()=>{
  const s=S.create(),h=['front','back','star'],base=evaluate(h).mult;
  close(evaluate(h,['S14'],facts,s).mult,base);eq(s.relay,3);
  close(evaluate(h,['S14'],facts,s).mult,base+3);eq(s.relay,3);
  close(evaluate(['front','front','star'],['S14'],facts,s).mult,evaluate(['front','front','star']).mult+3);eq(s.relay,0);
  s.relay=3;S.resetWave(s,2);eq(s.relay,0);s.relay=3;S.sellCharm(s,'S14');eq(s.relay,0);
});
check('Recorder future-bank growth cap, sale reset and unique-bank idempotence',()=>{
  const s=S.create(),h=S.faces;let rolls=0;
  const first=evaluate(h,['S16','S17'],{...facts,bankId:1},s,()=>{rolls++;return 0;});
  close(first.mult,12+1+1);close(s.recorder.value,1.5);
  const repeated=evaluate(h,['S16','S17'],{...facts,bankId:1},s,()=>{rolls++;return 0;});eq(repeated,first);eq(rolls,1);close(s.recorder.value,1.5);
  close(evaluate(h,['S16'],facts,s).mult,13.5);close(s.recorder.value,1.5);
  for(let wave=2;wave<=15;wave++)evaluate(h,['S16'],{...facts,wave},s);
  close(s.recorder.value,4);S.sellCharm(s,'S16');close(s.recorder.value,1);
});
check('Lucky and Chorus chance roll once each; Luck improves chance without repricing combos',()=>{
  const s=S.create();S.technique(s,'cork','lucky');const h=['cork','cork','star'];
  close(S.chance(0),.25);close(S.chance(100),.4375);close(S.chance(-100),.25);
  let rolls=0;const r=evaluate(h,['S17'],facts,s,()=>{rolls++;return 0;});eq(rolls,2);close(r.mult,8);
  eq(r.combos[0].value,1);eq(r.techniqueLog.length,1);
  const bad=evaluate(h,['S17'],facts,s,()=>.3);close(bad.mult,4);
  s.luck=100;const lucky=evaluate(h,['S17'],facts,s,()=>.3);close(lucky.mult,8);
});
check('Experimental multi-Echo chooses best final result with one shared roll and one state commit',()=>{
  const s=S.create();S.technique(s,'cork','echo');S.technique(s,'spout','echo');S.technique(s,'star','gold');
  const h=['cork','cork','front','front','spout','star'];let rolls=0;
  const r=evaluate(h,['S16','S17'],facts,s,()=>{rolls++;return 0;});eq(rolls,1);eq(s.gold.star.marks,1);
  const options=[null,'cork','spout'].map(face=>{const one=clone(s);one.techniques.cork=face==='cork'?'echo':undefined;one.techniques.spout=face==='spout'?'echo':undefined;one.recorder={value:1,lastWave:-1};return evaluate(h,['S16','S17'],facts,one,()=>0).mult;});
  close(r.mult,Math.max(...options));
  const six=S.create();S.technique(six,'front','echo');eq(evaluate(Array(6).fill('front'),[],facts,six).combos.filter(x=>x.id==='six').length,1);
});
check('Extra draws never reduce current mult, including charm and experimental Echo combinations',()=>{
  function vectors(n,k=5,p=[]){if(k===1)return [[...p,n]];return Array.from({length:n+1},(_,i)=>vectors(n-i,k-1,[...p,i])).flat();}
  const all=Object.keys(S.charms).map(id=>({id,face:'front'}));
  for(const echo of [false,true])for(let n=3;n<6;n++)for(const c of vectors(n)){
    const h=c.flatMap((count,i)=>Array(count).fill(S.faces[i])),s=S.create();
    if(echo){S.technique(s,'spout','echo');S.technique(s,'cork','echo');}
    const before=evaluate(h,all,{...facts,preview:true},s).mult;
    for(const f of S.faces){const after=evaluate([...h,f],all,{...facts,preview:true},s).mult;assertions++;assert(after+1e-8>=before,JSON.stringify({h,f,before,after,echo}));}
  }
});
console.log(JSON.stringify({suite:'five-score',passed:results.length,assertions,results},null,2));

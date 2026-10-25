'use strict';
const assert=require('assert/strict');
const S=require('../source/five-score.js');
const results=[];
let assertions=0;
function eq(a,b,message){assertions++;assert.deepEqual(a,b,message);}
function close(a,b,message){assertions++;assert(Math.abs(a-b)<1e-8,`${message||''}: ${a} != ${b}`);}
function check(name,fn){const t=Date.now();fn();results.push({name,passed:true,ms:Date.now()-t});}
const clone=x=>JSON.parse(JSON.stringify(x));
// Five kills: two from one primary attack (a multi-kill), one apex kill, two late descent kills (one a Water Hammer kill).
const kills=[{phase:'ascent',opening:true,attackId:1,primary:true,crit:true,above:true},{phase:'ascent',attackId:1,primary:true},{phase:'apex',attackId:2,primary:true,above:true},{phase:'descent',late:true,attackId:3,primary:true},{phase:'descent',late:true,attackId:4,primary:false,entry:true}];
const facts={K:24,kills,hits:0,air:4.5,hpFrac:.9,banked:2,closeWeapons:1,wave:1};
const evaluate=(h,ch=[],ledger=facts,state=S.create(),rng=()=>1)=>S.evaluate(state,h,ledger,ch,rng);
check('Five identities; independent replacement; bought draws 3→6, Loaded reels to 7',()=>{
  eq(S.faces,['spout','front','back','cork','star']);
  const s=S.create();eq(S.draws(s),3);eq(S.addDraw(s),true);eq(S.addDraw(s),true);eq(S.addDraw(s),true);eq(S.draws(s),6);eq(S.addDraw(s),false);
  eq(S.draws(s,['N16']),7);eq(S.draws(S.create(),[{id:'N16'}]),4);
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
check('Weight conservation, 10% steps, 60% cap, Polish +1 to 4 and Routine caps',()=>{
  const s=S.create();eq(S.transfer(s,'spout','front'),true);eq(S.transfer(s,'spout','front'),true);
  eq(S.transfer(s,'spout','front'),false);close(s.weights.spout,0);close(s.weights.front,.4);
  eq(S.transfer(s,'back','front'),true);eq(S.transfer(s,'back','front'),true);close(s.weights.front,.6);eq(S.transfer(s,'cork','front'),false);
  close(Object.values(s.weights).reduce((a,b)=>a+b),1);eq(S.draw(s,40,()=>.05).includes('spout'),false);
  for(let i=0;i<4;i++)eq(S.polish(s,'front'),true);eq(S.polish(s,'front'),false);close(S.value(s,'front'),5);
  for(const g of Object.keys(S.groups)){for(let i=0;i<4;i++)eq(S.routine(s,g),true);eq(S.routine(s,g),false);}
  eq(S.technique(s,'front','nonsense'),false);eq(S.technique(s,'bad','gold'),false);eq(S.technique(s,'front','echo'),true);
});
check('Each combo level adds its group gain × base bonus; directions differ by draw profile',()=>{
  const fact=n=>n<2?1:n*fact(n-1);
  function vectors(n,k=5,p=[]){if(k===1)return [[...p,n]];return Array.from({length:n+1},(_,i)=>vectors(n-i,k-1,[...p,i])).flat();}
  function gain(n,weights,group){return vectors(n).reduce((total,c)=>{
    const probability=fact(n)/c.reduce((a,b)=>a*fact(b),1)*c.reduce((a,v,i)=>a*weights[i]**v,1);
    const h=c.flatMap((count,i)=>Array(count).fill(S.faces[i])), s=S.create(),before=evaluate(h,[],{K:0},s).mult;S.routine(s,group);
    return total+probability*(evaluate(h,[],{K:0},s).mult-before);
  },0);}
  // Independent check: P(combo) at five uniform draws from 3,125 ordered hands, times base bonus, times the group gain.
  const p5=Object.fromEntries(S.combos.map(c=>[c.id,0]));
  for(let o=0;o<3125;o++){let k=o;const n=[0,0,0,0,0];for(let i=0;i<5;i++){n[k%5]++;k=Math.floor(k/5);}const c=n.sort((a,b)=>b-a);
    const m={pair:c[0]>=2,twoPair:c[1]>=2,triple:c[0]>=3,house:c[0]>=3&&c[1]>=2,show:c[4]>=1,four:c[0]>=4,threePair:c[2]>=2,doubleTriple:c[1]>=3,five:c[0]>=5,six:false};for(const id in m)if(m[id])p5[id]+=1/3125;}
  for(const g of Object.keys(S.groups))close(gain(5,[.2,.2,.2,.2,.2],g),S.groups[g].gain*S.combos.filter(c=>c.group===g).reduce((a,c)=>a+c.bonus*p5[c.id],0),g);
  assertions++;assert(gain(6,[.5,.15,.15,.1,.1],'Repeat')>gain(6,[.5,.15,.15,.1,.1],'Formation'));
  assertions++;assert(gain(6,[.35,.35,.1,.1,.1],'Formation')>gain(6,[.35,.35,.1,.1,.1],'Repeat'));
  assertions++;assert(gain(6,[.3,.3,.3,.05,.05],'Formation')>gain(6,[.3,.3,.3,.05,.05],'Repeat'));
  assertions++;assert(gain(6,[.2,.2,.2,.2,.2],'Variety')>gain(6,[.2,.2,.2,.2,.2],'Formation'));
});
check('Bailed tricks pay nothing and do not count towards combos; landed tricks keep their value',()=>{
  const h=['front','front','back'];
  eq(evaluate(h,[],{K:5}).mult,4);eq(evaluate(h,[],{K:5}).score,20);
  const one=evaluate(h,[],{K:5,bails:[1]});eq(one.mult,2);eq(one.combos.length,0);eq(one.landed,2);eq(one.bails,[1]);eq(one.score,10);
  eq(evaluate(h,[],{K:5,bails:[0,1,2]}).mult,0);eq(evaluate(h,[],{K:5,bails:[1,1,9,-1]}).bails,[1]);
});
check('Every charm reads its one condition, adds its effect type and respects left-to-right order',()=>{
  const h=['spout','front','front','back','cork','star'],base=evaluate(h).mult;close(base,14);
  const run=(ch,extra={},hand=h,state=S.create())=>evaluate(hand,[ch],{...facts,...extra},state);
  const delta=(ch,extra={},hand=h)=>run(ch,extra,hand).mult-evaluate(hand,[],{...facts,...extra}).mult;
  const chips=(ch,extra={})=>run(ch,extra).chips-facts.K;
  close(delta({id:'S01',face:'front'}),6);close(delta('S02'),10);close(delta('S03'),2);close(delta('S04'),7);close(delta('S05'),21);close(delta('S06'),3);
  close(chips('S07'),2);close(delta('S07'),0);
  eq(run('S08').charmLog[0].active,false);close(delta('S08',{kills:[...kills,{phase:'ascent'},{phase:'ascent'}]}),evaluate(h).mult*.5);
  eq(run('S09').charmLog[0].active,false);close(delta('S09',{kills:[...kills,{phase:'descent'},{phase:'descent'}]}),evaluate(h).mult*.5);
  close(delta('S10'),7);close(chips('S11'),4);close(chips('S12'),6);close(delta('S13'),4);
  const relay=S.create();relay.relay=true;close(run('S14',{},h,relay).mult-base,4);close(delta('S14'),0);
  close(delta('S15'),0);close(delta('S15',{},['front','back','star']),5);close(delta('S15',{},['front','front','back']),4);
  close(delta('S16'),2);close(evaluate(h,['S17'],facts,S.create(),()=>0).mult-base,1);
  close(chips('N01'),3);close(chips('N02'),0);close(chips('N02',{bails:[0]}),3);close(chips('N03'),2);close(chips('N04'),5);
  close(delta('N05'),4);close(delta('N06'),0);close(delta('N06',{angle:50}),0);close(delta('N06',{angle:20}),6);close(delta('N07'),7);close(delta('N07',{K:19}),0);
  close(delta('N08'),7);close(delta('N08',{hpFrac:.75}),0);close(delta('N09'),0);close(delta('N09',{},['front','front','front']),evaluate(['front','front','front']).mult);
  close(delta({id:'N10',face:'star'}),0);eq(run({id:'N10',face:'star'}).charmLog[0].active,true);close(delta({id:'N10',face:'star'},{},['front','star','back']),1);
  close(delta('N11'),1);close(delta('N11',{bails:[0]}),0);close(delta('N12'),1);close(delta('N13'),0);close(delta('N13',{},['front','front','back','back']),2);
  eq(run('N15',{netUsed:true}).charmLog[0].active,true);eq(run('N16').charmLog[0].active,true);
  eq(run('N17').pearls,1);eq(run('N17',{K:14}).pearls,0);eq(run('N18',{},['front','front','front','front']).pearls,3);eq(run('N19',{bails:[0,2]}).pearls,2);
  const addThenMultiply=evaluate(h,[{id:'S01',face:'front'},'S04']).mult,multiplyThenAdd=evaluate(h,['S04',{id:'S01',face:'front'}]).mult;
  close(addThenMultiply,(base+6)*1.5);close(multiplyThenAdd,base*1.5+6);assertions++;assert(addThenMultiply>multiplyThenAdd);
  // High roller reads the chips added by earlier charms in the row.
  close(evaluate(h,['S11','N07'],{...facts,K:17}).mult,base*1.5);close(evaluate(h,['N07','S11'],{...facts,K:17}).mult,base);
  eq(run('S04',{hits:1}).charmLog[0].active,false);eq(run('S03',{kills:kills.slice(2)}).charmLog[0].active,false);
  for(const id of Object.keys(S.charms)){const c=S.charms[id];assertions++;assert(S.charmText(id,'front').length<=60,id+' text fits two lines');assertions++;assert(['+chips','+mult','×mult','pearls','rule'].includes(c.kind));}
});
check('Payline rules double their own group only',()=>{
  const s=S.create();S.routine(s,'Repeat');const h=['front','front','back','back'];
  const plain=evaluate(h,[],{K:3},s),rep=evaluate(h,['N12'],{K:3},s),form=evaluate(h,['N13'],{K:3},s);
  close(rep.mult-plain.mult,plain.combos.filter(c=>c.group==='Repeat').reduce((a,c)=>a+c.value,0));
  close(form.mult-plain.mult,plain.combos.filter(c=>c.group==='Formation').reduce((a,c)=>a+c.value,0));
});
check('Busts bank nothing unless Second wind; they never roll, grow Gold or pay pearls',()=>{
  const s=S.create();S.technique(s,'front','gold');S.technique(s,'cork','lucky');const h=['front','front','cork'];let rolls=0;
  const bust=evaluate(h,['N17','S17'],{...facts,busted:true,bankId:1},s,()=>{rolls++;return 0;});
  eq(bust.score,0);eq(bust.busted,true);eq(bust.pearls,0);eq(rolls,0);eq(s.gold.front.marks,0);eq(s.relay,false);
  const half=evaluate(h,['N14'],{...facts,busted:true},S.create());close(half.score,Math.round(half.chips*half.mult/2));
});
check('Empty flights and previews never roll, grow, spend or cache a bank',()=>{
  const s=S.create();S.technique(s,'cork','lucky');S.technique(s,'star','gold');s.relay=true;
  const snapshot=clone(s),h=['front','back','star','cork','cork'];let rolls=0;
  evaluate(h,['S14','S16','S17'],{...facts,K:0,bankId:99},s,()=>{rolls++;return 0;});eq(s,snapshot);eq(rolls,0);
  evaluate(h,['S14','S16','S17'],{...facts,preview:true},s,()=>{rolls++;return 0;});eq(s,snapshot);eq(rolls,0);
});
check('Gold grows only future hands, once each wave, +0.5 per two waves to +2; replacement preserves Polish',()=>{
  const s=S.create();S.polish(s,'star');S.technique(s,'star','gold');const h=['star','front','back'];
  close(evaluate(h,[],{...facts,wave:1},s).mult,4);eq(s.gold.star.marks,1);
  evaluate(h,[],{...facts,wave:1},s);eq(s.gold.star.marks,1);
  close(evaluate(h,[],{...facts,wave:2},s).mult,4);close(S.value(s,'star'),2.5);
  close(evaluate(h,[],{...facts,wave:3},s).mult,4.5);
  for(let wave=4;wave<=15;wave++)evaluate(h,[],{...facts,wave},s);
  close(S.value(s,'star'),4);eq(s.gold.star.marks,8);
  S.technique(s,'star','lucky');close(S.value(s,'star'),2);eq(s.gold.star,undefined);
});
check('Relay baton pays after a clean banked jump; a Bail, bust or sale clears it',()=>{
  const s=S.create(),h=['front','back','star'],base=evaluate(h).mult;
  close(evaluate(h,['S14'],facts,s).mult,base);eq(s.relay,true);
  close(evaluate(h,['S14'],facts,s).mult,base+4);eq(s.relay,true);
  evaluate(h,['S14'],{...facts,bails:[2]},s);eq(s.relay,false);close(evaluate(h,['S14'],facts,s).mult,base);
  evaluate(h,['S14'],{...facts,busted:true},s);eq(s.relay,false);
  s.relay=true;S.resetWave(s,2);eq(s.relay,false);s.relay=true;S.sellCharm(s,'S14');eq(s.relay,false);
});
check('A bank is computed once per bank id',()=>{
  const s=S.create();let rolls=0;
  const first=evaluate(S.faces,['S17'],{...facts,bankId:1},s,()=>{rolls++;return 0;});
  const repeated=evaluate(S.faces,['S17'],{...facts,bankId:1},s,()=>{rolls++;return 0;});eq(repeated,first);eq(rolls,1);
});
check('Lucky and Chorus chance roll once each; Luck and Lucky charm improve chance without repricing combos',()=>{
  const s=S.create();S.technique(s,'cork','lucky');const h=['cork','cork','star'];
  close(S.chance(0),.25);close(S.chance(100),.4375);close(S.chance(-100),.25);close(S.chance(0,.15),.4);close(S.chance(1e6,.5),.95);
  let rolls=0;const r=evaluate(h,['S17'],facts,s,()=>{rolls++;return 0;});eq(rolls,2);close(r.mult,7);
  eq(r.combos[0].value,1);eq(r.techniqueLog.length,1);
  const bad=evaluate(h,['S17'],facts,s,()=>.3);close(bad.mult,4);
  s.luck=100;close(evaluate(h,['S17'],facts,s,()=>.3).mult,7);
  s.luck=0;close(evaluate(h,['S17','N20'],facts,s,()=>.3).mult,7);
});
check('Multi-Echo chooses the best final result with one shared roll and one state commit',()=>{
  const s=S.create();S.technique(s,'cork','echo');S.technique(s,'spout','echo');S.technique(s,'star','gold');
  const h=['cork','cork','front','front','spout','star'];let rolls=0;
  const r=evaluate(h,['S16','S17'],facts,s,()=>{rolls++;return 0;});eq(rolls,1);eq(s.gold.star.marks,1);
  const options=[null,'cork','spout'].map(face=>{const one=clone(s);one.techniques.cork=face==='cork'?'echo':undefined;one.techniques.spout=face==='spout'?'echo':undefined;return evaluate(h,['S16','S17'],{...facts,bankId:undefined},one,()=>0).mult;});
  close(r.mult,Math.max(...options));
  const six=S.create();S.technique(six,'front','echo');eq(evaluate(Array(6).fill('front'),[],facts,six).combos.filter(x=>x.id==='six').length,1);
});
check('Extra draws never reduce current mult, with every charm and with Echo',()=>{
  function vectors(n,k=5,p=[]){if(k===1)return [[...p,n]];return Array.from({length:n+1},(_,i)=>vectors(n-i,k-1,[...p,i])).flat();}
  const all=Object.keys(S.charms).filter(id=>id!=='N10').map(id=>({id,face:'front'}));
  for(const echo of [false,true])for(let n=3;n<6;n++)for(const c of vectors(n)){
    const h=c.flatMap((count,i)=>Array(count).fill(S.faces[i])),s=S.create();
    if(echo){S.technique(s,'spout','echo');S.technique(s,'cork','echo');}
    const before=evaluate(h,all,{...facts,preview:true},s).mult;
    for(const f of S.faces){const after=evaluate([...h,f],all,{...facts,preview:true},s).mult;assertions++;assert(after+1e-8>=before,JSON.stringify({h,f,before,after,echo}));}
  }
  // Wildcard alone is also monotonic.
  for(let n=2;n<5;n++)for(const c of vectors(n)){const h=c.flatMap((count,i)=>Array(count).fill(S.faces[i])),before=evaluate(h,[{id:'N10',face:'star'}],{...facts,preview:true}).mult;
    for(const f of S.faces){assertions++;assert(evaluate([...h,f],[{id:'N10',face:'star'}],{...facts,preview:true}).mult+1e-8>=before);}}
});
check('Expected mult covers every hand size and matches the reference',()=>{
  const s=S.create();for(const n of [3,4,5,6]){const e=S.expect(s,n,0);assertions++;assert(e.meanMult>0);close(Object.values(e.comboOdds).length,10);}
  eq(S.expect(s,3,0).meanMult.toFixed(2),'3.64');eq(S.expect(s,6,0).meanMult.toFixed(2),'13.11');
});
console.log(JSON.stringify({suite:'five-score',passed:results.length,assertions,results},null,2));

/* Five trick scoring. Combat passes immutable flight facts; no effect here alters combat. */
var FiveScore = (function () {
  'use strict';
  var faces = ['spout', 'front', 'back', 'cork', 'star'];
  var names = {spout:'Spout', front:'Front flip', back:'Backflip', cork:'Corkscrew', star:'Star pose'};
  var groups = {
    Repeat:{gain:0.30, ids:['pair','triple','four','five','six']},
    Formation:{gain:0.66, ids:['twoPair','house','threePair','doubleTriple']},
    Variety:{gain:2.50, ids:['show']}
  };
  var combos = [
    {id:'pair',name:'Pair',p:1,bonus:1,group:'Repeat'},
    {id:'twoPair',name:'Two Pair',p:0.6656,bonus:2,group:'Formation'},
    {id:'triple',name:'Triple',p:0.4816,bonus:3,group:'Repeat'},
    {id:'house',name:'Full House',p:0.2624,bonus:4,group:'Formation'},
    {id:'show',name:'Full Show',p:0.1152,bonus:7,group:'Variety'},
    {id:'four',name:'Four of a Kind',p:0.0848,bonus:8,group:'Repeat'},
    {id:'threePair',name:'Three Pairs',p:0.0576,bonus:9,group:'Formation'},
    {id:'doubleTriple',name:'Double Triple',p:0.0128,bonus:13,group:'Formation'},
    {id:'five',name:'Five of a Kind',p:0.008,bonus:14,group:'Repeat'},
    {id:'six',name:'Six of a Kind',p:0.00032,bonus:24,group:'Repeat'}
  ];
  var charms = {
    S01:{name:'Signature act',text:'Bound trick drawn: +its value per kill phase (up to 3).',rarity:'Common',price:12},
    S02:{name:'Shared billing',text:'Kills in 2 phases: +1 per distinct trick.',rarity:'Common',price:12},
    S03:{name:'Crowd chorus',text:'Primary multi-kill: +1 per victim, up to 3. Two Pair doubles it.',rarity:'Common',price:12},
    S04:{name:'Clean take',text:'A kill-bearing flight without an accepted hit: ×1.25.',rarity:'Uncommon',price:18},
    S05:{name:'House lights',text:'Primary damage from 2 weapon types: +2 mult. Full Show then gives ×2.5.',rarity:'Rare',price:30},
    S06:{name:'Counterpoint',text:'Primary multi-kill: +2 per repeated identity (up to 6).',rarity:'Uncommon',price:18},
    S07:{name:'Opening contract',text:'Spout and 40% of chips in opening: +4. Need 3 chips.',rarity:'Common',price:12},
    S08:{name:'Rising signature',text:'Front flip and 60% ascent chips: ×1.3. Need 3 chips.',rarity:'Uncommon',price:18},
    S09:{name:'Falling signature',text:'Backflip and 60% descent chips: ×1.3. Need 3 chips.',rarity:'Uncommon',price:18},
    S10:{name:'Apex refrain',text:'Star and 2 apex chips: repeat largest combo bonus (up to 14).',rarity:'Rare',price:30},
    S11:{name:'Understudy',text:'Corkscrew and 50% chips from 4m below targets: +4. Need 3 chips.',rarity:'Common',price:12},
    S12:{name:'Late reservation',text:'Star, 30% late chips and 85% predicted flight: +1 per identity.',rarity:'Common',price:12},
    S13:{name:'Splash choir',text:'Water hammer kill: +2 per distinct trick (up to 10).',rarity:'Uncommon',price:18},
    S14:{name:'Relay baton',text:'Spend old +3 token. Both flips and 2 kill phases load next-bank token.',rarity:'Uncommon',price:18},
    S15:{name:'Floor act',text:'3 chips: raise largest combo bonus to 3, or add 3 without a combo.',rarity:'Common',price:12},
    S16:{name:'Flight recorder',text:'+1. First strong combo each wave grows future banks by +0.5 (cap +4).',rarity:'Rare',price:30},
    S17:{name:'Chorus chance',text:'Corkscrew: 25% chance to repeat highest identity value (up to 6). Luck helps.',rarity:'Uncommon',price:18}
  };
  Object.keys(charms).forEach(function(id){charms[id].rarityName=charms[id].rarity;charms[id].rarity={Common:1,Uncommon:2,Rare:3}[charms[id].rarity];});
  function filled(v) { var x={}; faces.forEach(function(f){x[f]=v;}); return x; }
  function create() {
    return {weights:filled(0.2),polish:filled(0),techniques:{},gold:{},routines:{Repeat:0,Formation:0,Variety:0},relay:0,recorder:{value:1,lastWave:-1},luck:0,_banks:{}};
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function num(x,d) { return Number.isFinite(Number(x)) ? Number(x) : (d||0); }
  function draws(wave) { return Math.min(6,3+Math.floor(Math.max(0,num(wave,1))/5)); }
  function draw(state,n,rng) {
    rng=rng||Math.random; var out=[], weights=state.weights||filled(.2);
    var total=faces.reduce(function(s,f){return s+Math.max(0,num(weights[f]));},0);
    if (!(total>0)) throw Error('Trick weights must have positive mass');
    for(var i=0;i<n;i++){ var q=Math.max(0,Math.min(1-Number.EPSILON,rng()))*total, picked=faces[4];
      for(var j=0;j<faces.length;j++){q-=Math.max(0,num(weights[faces[j]]));if(q<0){picked=faces[j];break;}}
      out.push(picked);
    } return out;
  }
  function value(state,face) {
    var gold=(state.techniques||{})[face]==='gold' ? num((state.gold||{})[face]&&state.gold[face].bonus) : 0;
    return 1+0.5*num((state.polish||{})[face])+gold;
  }
  function counts(hand) { var c=filled(0); (hand||[]).forEach(function(f){if(faces.indexOf(f)>=0)c[f]++;});return c; }
  function match(id,c) {
    var s=Object.keys(c).map(function(k){return c[k];}).sort(function(a,b){return b-a;});
    return id==='pair'?s[0]>=2:id==='twoPair'?s[1]>=2:id==='triple'?s[0]>=3:id==='house'?s[0]>=3&&s[1]>=2:id==='show'?s[4]>=1:id==='four'?s[0]>=4:id==='threePair'?s[2]>=2:id==='doubleTriple'?s[1]>=3:id==='five'?s[0]>=5:id==='six'?s[0]>=6:false;
  }
  function chance(luck) { return 1-Math.pow(.75,1+Math.max(0,num(luck))/100); }
  function transfer(state,donor,recipient) {
    if(faces.indexOf(donor)<0||faces.indexOf(recipient)<0||donor===recipient)return false;
    if(state.weights[donor]<.1-1e-8||state.weights[recipient]>.45+1e-8)return false;
    state.weights[donor]=Math.round((state.weights[donor]-.05)*100)/100;
    state.weights[recipient]=Math.round((state.weights[recipient]+.05)*100)/100;return true;
  }
  function polish(state,face) {
    if(faces.indexOf(face)<0||num(state.polish[face])>=4)return false;
    state.polish[face]=num(state.polish[face])+1;return true;
  }
  function routine(state,group) {
    if(!groups[group]||num(state.routines[group])>=4)return false;
    state.routines[group]=num(state.routines[group])+1;return true;
  }
  function technique(state,face,kind) {
    if(faces.indexOf(face)<0||['lucky','gold','echo',null].indexOf(kind)<0)return false;
    var old=state.techniques[face];
    if(old===kind)return false;
    if(old==='gold')delete state.gold[face];
    if(kind===null)delete state.techniques[face];else state.techniques[face]=kind;
    if(kind==='gold')state.gold[face]={marks:0,bonus:0,lastWave:-1};return true;
  }
  function resetWave(state,wave) {state.relay=0;state._banks={};if(wave!==undefined)state.wave=wave;}
  function sellCharm(state,id) {if(id==='S14')state.relay=0;if(id==='S16')state.recorder={value:1,lastWave:-1};}
  function ledgerFacts(ledger) {
    ledger=ledger||{};var K=Math.max(0,num(ledger.K)),ph={ascent:0,apex:0,descent:0},types={},attacks={},derivedOpening=0,derivedLate=0,derivedBelow=0,derivedEntry=0;
    (ledger.kills||[]).forEach(function(k){var kv=Math.max(0,num(k.kv,1));if(ph[k.phase]!==undefined)ph[k.phase]+=kv;
      if(k.primary!==false&&k.attackId!==undefined){attacks[k.attackId]=num(attacks[k.attackId])+1;}
      if(k.opening)derivedOpening+=kv;if(k.late)derivedLate+=kv;if(k.below===true||num(k.below)>=4)derivedBelow+=kv;if(k.entry)derivedEntry++;
    });
    if(ledger.phases){['ascent','apex','descent'].forEach(function(p,i){ph[p]=num(Array.isArray(ledger.phases)?ledger.phases[i]:ledger.phases[p]);});}
    if(Array.isArray(ledger.primaryTypes))ledger.primaryTypes.forEach(function(t){types[t]=true;});
    else Object.keys(ledger.primaryTypes||{}).forEach(function(t){if(ledger.primaryTypes[t])types[t]=true;});
    var multi=Object.keys(attacks).reduce(function(m,id){return Math.max(m,attacks[id]);},num(ledger.maxMulti));
    return {K:K,ph:ph,phaseCount:Object.keys(ph).filter(function(p){return ph[p]>0;}).length,hits:Math.max(0,num(ledger.hits)),opening:num(ledger.openingK,derivedOpening),late:num(ledger.lateK,derivedLate),below:num(ledger.belowK,derivedBelow),entry:num(ledger.entryKills,derivedEntry),air:Math.max(0,num(ledger.air)),predAir:Math.max(0,num(ledger.predAir)),types:Object.keys(types).length,multi:multi,wave:num(ledger.wave,1)};
  }
  function evaluate(state,hand,ledger,equipped,rng) {
    ledger=ledger||{};equipped=equipped||[];rng=rng||Math.random;
    var bankKey=ledger.bankId!==undefined?String(ledger.wave||1)+':'+String(ledger.bankId):null;
    if(!ledger.preview&&bankKey&&state._banks&&state._banks[bankKey])return clone(state._banks[bankKey]);
    var factual=ledgerFacts(ledger),actual=counts(hand),distinct=faces.filter(function(f){return actual[f]>0;}).length;
    var owned=equipped.map(function(x){return typeof x==='string'?{id:x}:x;}).filter(function(x){return x&&charms[x.id];});
    var values={},base=0;faces.forEach(function(f){values[f]=value(state,f);base+=actual[f]*values[f];});
    var canCommit=factual.K>0&&!ledger.preview,rolls={},rollChance=chance(ledger.luck===undefined?state.luck:ledger.luck);
    // Empty flights never consume random rolls. Previews never consume the supplied RNG.
    if(factual.K>0&&!ledger.preview){faces.forEach(function(f){if(actual[f]&&(state.techniques||{})[f]==='lucky')rolls[f]=rng()<rollChance;});
      if(actual.cork&&owned.some(function(x){return x.id==='S17';}))rolls.chorus=rng()<rollChance;
    }
    function scoreWith(virtualFace){
      var c=Object.assign({},actual);if(virtualFace)c[virtualFace]++;
      var paid=combos.filter(function(x){return match(x.id,c);}).map(function(x){return {id:x.id,name:x.name,value:x.bonus*(1+groups[x.group].gain*num((state.routines||{})[x.group])),base:x.bonus,p:x.p,group:x.group};});
      var mult=base+paid.reduce(function(s,x){return s+x.value;},0),techniqueLog=[],charmLog=[];
      faces.forEach(function(f){if(rolls[f]){var add=actual[f]*values[f];mult+=add;techniqueLog.push({face:f,kind:'lucky',value:add});}});
      var largest=paid.reduce(function(m,x){return Math.max(m,x.value);},0),has=function(id){return paid.some(function(x){return x.id===id;});};
      function explainCharm(ch){
        var checks=[],notes=[];
        function number(x){return Math.round(x*100)/100;}
        function add(label,met,current,target,text){checks.push({label:label,met:!!met,current:current,target:target,text:text});}
        function drawn(face){add(names[face]+' drawn',actual[face]>0,actual[face],1,names[face]+' drawn: '+(actual[face]>0?'yes':'no'));}
        function atLeast(label,current,target,unit){add(label,current>=target,current,target,label+': '+number(current)+'/'+number(target)+(unit?' '+unit:''));}
        function ratio(label,current,fraction){add(label,current>=fraction*factual.K,current,fraction*factual.K,label+': '+number(current)+'/'+number(factual.K)+' chips (need '+number(fraction*100)+'%)');}
        var repeats=faces.filter(function(f){return actual[f]>=2;}).length;
        switch(ch.id){
          case 'S01':drawn(ch.face||'front');add('Kill phases',factual.phaseCount>=1,factual.phaseCount,1,'Kill phases: '+factual.phaseCount+'/3 (need at least 1)');notes.push('Pays bound trick value '+number(values[ch.face||'front'])+' per kill phase');break;
          case 'S02':atLeast('Kill phases',factual.phaseCount,2);notes.push(distinct+' distinct tricks');break;
          case 'S03':atLeast('Largest primary multi-kill',factual.multi,2,'victims');notes.push(has('twoPair')?'Two Pair doubles this addition':'Two Pair would double this addition');break;
          case 'S04':add('Accepted hits',factual.hits===0,factual.hits,0,'Accepted hits: '+factual.hits+' (need 0)');break;
          case 'S05':atLeast('Primary weapon damage types',factual.types,2);atLeast('Full Show identities',distinct,5);notes.push('Two damage types add +2; Full Show then multiplies by 2.5');break;
          case 'S06':atLeast('Largest primary multi-kill',factual.multi,2,'victims');atLeast('Repeated identities',repeats,1);break;
          case 'S07':drawn('spout');atLeast('Kill chips',factual.K,3);ratio('Opening',factual.opening,.4);break;
          case 'S08':drawn('front');atLeast('Kill chips',factual.K,3);ratio('Ascent',factual.ph.ascent,.6);break;
          case 'S09':drawn('back');atLeast('Kill chips',factual.K,3);ratio('Descent',factual.ph.descent,.6);break;
          case 'S10':drawn('star');atLeast('Apex chips',factual.ph.apex,2);add('Combo to repeat',largest>0,largest,0,'Largest combo: +'+number(largest)+' (repeat capped at 14)');break;
          case 'S11':drawn('cork');atLeast('Kill chips',factual.K,3);ratio('Kills from 4m below',factual.below,.5);break;
          case 'S12':drawn('star');atLeast('Kill chips',factual.K,3);ratio('Late',factual.late,.3);add('Flight duration',factual.predAir>0&&factual.air>=.85*factual.predAir,factual.air,.85*factual.predAir,'Active flight: '+number(factual.air)+'/'+number(factual.predAir)+'s (need 85%)');break;
          case 'S13':atLeast('Water hammer kills',factual.entry,1);notes.push(distinct+' distinct tricks');break;
          case 'S14':atLeast('Prior-bank token',num(state.relay),1);notes.push('Next token: '+(actual.front&&actual.back&&factual.phaseCount>=2?'loaded by both flips and two kill phases':'needs both flips and two kill phases'));break;
          case 'S15':atLeast('Kill chips',factual.K,3);add('Floor needed',largest<3,largest,3,'Largest combo: +'+number(largest)+(largest>=3?' (floor already met)':' (floor raises it to 3)'));break;
          case 'S16':atLeast('Kill chips',factual.K,1);notes.push('Current recorder: +'+number(Math.max(1,Math.min(4,num(state.recorder&&state.recorder.value,1)))));
            notes.push(state.recorder&&state.recorder.value>=4?'Growth cap reached (+4)':state.recorder&&state.recorder.lastWave===factual.wave?'Growth already used this wave':paid.some(function(x){return ['four','show','threePair','doubleTriple'].indexOf(x.id)>=0;})?'Strong combo grows future banks (cap +4)':'Future growth needs Four, Full Show, Three Pairs or Double Triple');break;
          case 'S17':drawn('cork');add('Chance roll',rolls.chorus===true,rolls.chorus===true?1:0,1,'Chance: '+number(rollChance*100)+'% ('+(!actual.cork?'not rolled; Corkscrew absent':ledger.preview?'pending at bank':rolls.chorus?'paid':'missed')+')');break;
        }
        return {reason:checks.map(function(c){return c.text;}).concat(notes).join('; '),conditions:{met:checks.filter(function(c){return c.met;}).length,total:checks.length},checks:checks};
      }
      if(factual.K>0)owned.forEach(function(ch){
        var before=mult,add=0,factor=1;
        switch(ch.id){
          case 'S01':if(actual[ch.face||'front'])add=values[ch.face||'front']*Math.min(3,factual.phaseCount);break;
          case 'S02':if(factual.phaseCount>=2)add=Math.min(5,distinct);break;
          case 'S03':if(factual.multi>=2)add=Math.min(3,factual.multi)*(has('twoPair')?2:1);break;
          case 'S04':if(factual.hits===0)factor=1.25;break;
          case 'S05':if(factual.types>=2){add=2;if(distinct===5)factor=2.5;}break;
          case 'S06':if(factual.multi>=2)add=Math.min(6,faces.filter(function(f){return actual[f]>=2;}).length*2);break;
          case 'S07':if(actual.spout&&factual.K>=3&&factual.opening>=.4*factual.K)add=4;break;
          case 'S08':if(actual.front&&factual.K>=3&&factual.ph.ascent>=.6*factual.K)factor=1.3;break;
          case 'S09':if(actual.back&&factual.K>=3&&factual.ph.descent>=.6*factual.K)factor=1.3;break;
          case 'S10':if(actual.star&&factual.ph.apex>=2)add=Math.min(14,largest);break;
          case 'S11':if(actual.cork&&factual.K>=3&&factual.below>=.5*factual.K)add=4;break;
          case 'S12':if(actual.star&&factual.K>=3&&factual.late>=.3*factual.K&&factual.predAir>0&&factual.air>=.85*factual.predAir)add=Math.min(5,distinct);break;
          case 'S13':if(factual.entry>=1)add=Math.min(10,2*distinct);break;
          case 'S14':add=Math.min(3,Math.max(0,num(state.relay)));break;
          case 'S15':if(factual.K>=3)add=Math.max(0,3-largest);break;
          case 'S16':add=Math.max(1,Math.min(4,num(state.recorder&&state.recorder.value,1)));break;
          case 'S17':if(actual.cork&&rolls.chorus)add=Math.min(6,faces.reduce(function(m,f){return Math.max(m,actual[f]*values[f]);},0));break;
        }
        mult=(mult+add)*factor;charmLog.push(Object.assign({id:ch.id,name:charms[ch.id].name,before:before,after:mult,add:add,factor:factor,active:mult!==before},explainCharm(ch)));
      });
      return {mult:mult,base:base,combos:paid,charmLog:charmLog,techniqueLog:techniqueLog,echo:virtualFace||null,counts:actual,values:values,score:Math.round(factual.K*mult),chips:factual.K,preview:!!ledger.preview};
    }
    var result=scoreWith(null);
    faces.forEach(function(f){if(actual[f]&&(state.techniques||{})[f]==='echo'){var next=scoreWith(f);if(next.mult>result.mult+1e-10)result=next;}});
    if(canCommit){
      faces.forEach(function(f){if(actual[f]&&(state.techniques||{})[f]==='gold'){
        var g=state.gold[f]||(state.gold[f]={marks:0,bonus:0,lastWave:-1});
        if(g.lastWave!==factual.wave){g.lastWave=factual.wave;g.marks=Math.min(8,num(g.marks)+1);g.bonus=Math.min(1,Math.floor(g.marks/2)*.25);}
      }});
      if(owned.some(function(x){return x.id==='S14';}))state.relay=actual.front&&actual.back&&factual.phaseCount>=2?3:0;
      else state.relay=0;
      if(owned.some(function(x){return x.id==='S16';})){
        var r=state.recorder||(state.recorder={value:1,lastWave:-1});
        if(r.lastWave!==factual.wave&&result.combos.some(function(x){return ['four','show','threePair','doubleTriple'].indexOf(x.id)>=0;})){r.value=Math.min(4,num(r.value,1)+.5);r.lastWave=factual.wave;}
      } else state.recorder={value:1,lastWave:-1};
      if(bankKey){state._banks=state._banks||{};state._banks[bankKey]=clone(result);var keys=Object.keys(state._banks);if(keys.length>150)delete state._banks[keys[0]];}
    }
    return result;
  }
  return {faces:faces,names:names,combos:combos,charms:charms,groups:groups,create:create,draws:draws,draw:draw,evaluate:evaluate,transfer:transfer,polish:polish,routine:routine,technique:technique,resetWave:resetWave,sellCharm:sellCharm,value:value,chance:chance,counts:counts,reference:{draws:6,probability:.2},version:'five-trick-demo-1'};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FiveScore;

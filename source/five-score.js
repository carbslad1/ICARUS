/* Five trick scoring. Combat passes immutable flight facts; no effect here alters combat. */
var FiveScore = (function () {
  'use strict';
  var faces = ['spout', 'front', 'back', 'cork', 'star'];
  var names = {spout:'Spout', front:'Front flip', back:'Backflip', cork:'Corkscrew', star:'Star pose'};
  // Each combo-group level adds `gain` × the combo's base bonus. Tuning values (design doc §4.9): Repeat suits one-trick
  // builds, Formation two- and three-trick builds, Variety an even spread with many draws.
  var groups = {
    Repeat:{gain:0.50, ids:['pair','triple','four','five','six']},
    Formation:{gain:1.00, ids:['twoPair','house','threePair','doubleTriple']},
    Variety:{gain:4.00, ids:['show']}
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
  // Tuning values (design doc §4.4, §4.9).
  var tune = {baseDraws:3, maxBought:6, maxDraws:7, polishStep:1, polishCap:4, routineCap:4, transfer:0.10, weightCap:0.60, goldStep:0.5, goldCap:2};
  // Chips paid on top of kill value for how a kill happened (design doc §4.2). Score only; never weapon damage.
  var chipBonus = {multi:1, apex:2, crit:1};
  var prices = {Common:12, Uncommon:18, Rare:30};
  // Every charm reads in two lines and has at most one condition (design doc §4.8). {trick} is the bound trick.
  var charms = {
    S01:{name:'Signature act',kind:'+mult',rarity:'Uncommon',bound:true,text:'Each landed {trick}: +3 mult.'},
    S02:{name:'Shared billing',kind:'+mult',rarity:'Common',text:'+2 mult for each different trick that lands.'},
    S03:{name:'Crowd chorus',kind:'+mult',rarity:'Common',text:'+1 mult per victim of your biggest multi-kill (max +6).'},
    S04:{name:'Clean take',kind:'×mult',rarity:'Uncommon',text:'×1.5 mult if you weren’t hit this jump.'},
    S05:{name:'House lights',kind:'×mult',rarity:'Rare',text:'×2.5 mult if all five tricks land (Full Show).'},
    S06:{name:'Counterpoint',kind:'+mult',rarity:'Common',text:'+3 mult for each trick that lands twice or more.'},
    S07:{name:'Opening contract',kind:'+chips',rarity:'Common',text:'+2 chips per kill in your first second of flight.'},
    S08:{name:'Rising signature',kind:'×mult',rarity:'Uncommon',text:'×1.5 mult if most of your kills came while climbing.'},
    S09:{name:'Falling signature',kind:'×mult',rarity:'Uncommon',text:'×1.5 mult if most of your kills came while falling.'},
    S10:{name:'Apex refrain',kind:'+mult',rarity:'Rare',text:'A kill at the apex repeats your largest combo bonus.'},
    S11:{name:'Understudy',kind:'+chips',rarity:'Common',text:'+2 chips per kill on an enemy above you.'},
    S12:{name:'Late reservation',kind:'+chips',rarity:'Common',text:'+3 chips per kill in your last second before splashdown.'},
    S13:{name:'Splash choir',kind:'+mult',rarity:'Uncommon',requires:'I07',text:'+4 mult per Water Hammer kill.'},
    S14:{name:'Relay baton',kind:'+mult',rarity:'Uncommon',text:'+4 mult if your previous jump had no Bails.'},
    S15:{name:'Floor act',kind:'+mult',rarity:'Common',text:'Your largest combo pays at least +5.'},
    S16:{name:'Flight recorder',kind:'+mult',rarity:'Common',text:'+1 mult per jump already banked this wave.'},
    S17:{name:'Chorus chance',kind:'+mult',rarity:'Uncommon',text:'1 in 4 chance your best trick pays again. Luck helps.'},
    N01:{name:'Apex hunter',kind:'+chips',rarity:'Common',text:'+3 chips per kill at the apex.'},
    N02:{name:'Bail money',kind:'+chips',rarity:'Common',text:'+3 chips for every Bail this jump.'},
    N03:{name:'Sharpshooter',kind:'+chips',rarity:'Common',text:'+2 chips per critical-hit kill.'},
    N04:{name:'Close quarters',kind:'+chips',rarity:'Common',text:'+1 chip per kill for each Close weapon you own.'},
    N05:{name:'Long haul',kind:'+mult',rarity:'Common',text:'+1 mult per full second of flight this jump.'},
    N06:{name:'Short hop',kind:'+mult',rarity:'Common',text:'+6 mult on a low launch (below 35\u00b0).'},
    N07:{name:'High roller',kind:'×mult',rarity:'Uncommon',text:'×1.5 mult if this jump has 20 or more chips.'},
    N08:{name:'Healthy glow',kind:'×mult',rarity:'Uncommon',text:'×1.5 mult while you are above 75% HP.'},
    N09:{name:'Triple threat',kind:'×mult',rarity:'Rare',text:'×2 mult if a Triple or better lands.'},
    N10:{name:'Wildcard',kind:'rule',rarity:'Rare',bound:true,text:'Your {trick} counts as any trick for combos.'},
    N11:{name:'Opening number',kind:'+mult',rarity:'Uncommon',text:'Your first trick pays its value again if it lands.'},
    N12:{name:'Repeat rehearsal',kind:'rule',rarity:'Uncommon',text:'Repeat combos (Pair, Triple, Four…) pay double.'},
    N13:{name:'Formation dance',kind:'rule',rarity:'Uncommon',text:'Formation combos (Two Pair, Full House…) pay double.'},
    N14:{name:'Second wind',kind:'rule',rarity:'Rare',text:'A bust banks half its score instead of nothing.'},
    N15:{name:'Safety net',kind:'rule',rarity:'Uncommon',text:'Your first hit each jump doesn’t cause a Bail.'},
    N16:{name:'Loaded reels',kind:'rule',rarity:'Rare',text:'+1 trick drawn every jump (up to 7).'},
    N17:{name:'Tip jar',kind:'pearls',rarity:'Common',text:'+1 pearl for each jump that banks 15+ chips.'},
    N18:{name:'Golden handshake',kind:'pearls',rarity:'Uncommon',text:'+3 pearls when Four of a Kind or better lands.'},
    N19:{name:'Bail bond',kind:'pearls',rarity:'Common',text:'+1 pearl for every Bail.'},
    N20:{name:'Lucky charm',kind:'rule',rarity:'Uncommon',text:'+15% chance on every Lucky trick and Chorus roll.'}
  };
  Object.keys(charms).forEach(function(id){var c=charms[id];c.rarityName=c.rarity;c.price=prices[c.rarity];c.rarity={Common:1,Uncommon:2,Rare:3}[c.rarity];});
  function charmText(id,face){var c=charms[id];return c?c.text.replace('{trick}',face?names[face]:'bound trick'):'';}
  function filled(v) { var x={}; faces.forEach(function(f){x[f]=v;}); return x; }
  function create() {
    return {weights:filled(0.2),polish:filled(0),techniques:{},gold:{},routines:{Repeat:0,Formation:0,Variety:0},draws:tune.baseDraws,focus:false,relay:false,luck:0,_banks:{}};
  }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function num(x,d) { return Number.isFinite(Number(x)) ? Number(x) : (d||0); }
  function ownedList(equipped) { return (equipped||[]).map(function(x){return typeof x==='string'?{id:x}:x;}).filter(function(x){return x&&charms[x.id];}); }
  // Draws per jump: bought draws, plus Loaded reels.
  function draws(state,equipped) {
    var n=Math.max(1,Math.min(tune.maxBought,Math.floor(num(state&&state.draws,tune.baseDraws))));
    if(ownedList(equipped).some(function(x){return x.id==='N16';}))n++;
    return Math.min(tune.maxDraws,n);
  }
  function addDraw(state) { if(num(state.draws,tune.baseDraws)>=tune.maxBought)return false; state.draws=num(state.draws,tune.baseDraws)+1; return true; }
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
    return 1+tune.polishStep*num((state.polish||{})[face])+gold;
  }
  function counts(hand) { var c=filled(0); (hand||[]).forEach(function(f){if(faces.indexOf(f)>=0)c[f]++;});return c; }
  function match(id,c) {
    var s=Object.keys(c).map(function(k){return c[k];}).sort(function(a,b){return b-a;});
    return id==='pair'?s[0]>=2:id==='twoPair'?s[1]>=2:id==='triple'?s[0]>=3:id==='house'?s[0]>=3&&s[1]>=2:id==='show'?s[4]>=1:id==='four'?s[0]>=4:id==='threePair'?s[2]>=2:id==='doubleTriple'?s[1]>=3:id==='five'?s[0]>=5:id==='six'?s[0]>=6:false;
  }
  function chance(luck,extra) { return Math.min(.95,1-Math.pow(.75,1+Math.max(0,num(luck))/100)+Math.max(0,num(extra))); }
  function transfer(state,donor,recipient) {
    if(faces.indexOf(donor)<0||faces.indexOf(recipient)<0||donor===recipient)return false;
    if(state.weights[donor]<tune.transfer-1e-8||state.weights[recipient]+tune.transfer>tune.weightCap+1e-8)return false;
    state.weights[donor]=Math.round((state.weights[donor]-tune.transfer)*100)/100;
    state.weights[recipient]=Math.round((state.weights[recipient]+tune.transfer)*100)/100;return true;
  }
  function polish(state,face) {
    if(faces.indexOf(face)<0||num(state.polish[face])>=tune.polishCap)return false;
    state.polish[face]=num(state.polish[face])+1;return true;
  }
  function routine(state,group) {
    if(!groups[group]||num(state.routines[group])>=tune.routineCap)return false;
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
  function resetWave(state,wave) {state.relay=false;state._banks={};if(wave!==undefined)state.wave=wave;}
  function sellCharm(state,id) {if(id==='S14')state.relay=false;}
  function ledgerFacts(ledger) {
    ledger=ledger||{};var kills=ledger.kills||[],attacks={},f={K:Math.max(0,num(ledger.K)),kills:kills.length,ascent:0,apex:0,descent:0,opening:0,late:0,above:0,crit:0,entry:0};
    kills.forEach(function(k){if(f[k.phase]!==undefined&&['ascent','apex','descent'].indexOf(k.phase)>=0)f[k.phase]++;
      if(k.opening)f.opening++;if(k.late)f.late++;if(k.above)f.above++;if(k.crit)f.crit++;if(k.entry)f.entry++;
      if(k.primary!==false&&k.attackId!==undefined)attacks[k.attackId]=num(attacks[k.attackId])+1;});
    f.multi=Object.keys(attacks).reduce(function(m,id){return Math.max(m,attacks[id]);},num(ledger.maxMulti));
    f.hits=Math.max(0,num(ledger.hits));f.air=Math.max(0,num(ledger.air));f.hpFrac=ledger.hpFrac===undefined?1:num(ledger.hpFrac);
    f.banked=Math.max(0,num(ledger.banked));f.closeWeapons=Math.max(0,num(ledger.closeWeapons));f.wave=num(ledger.wave,1);
    f.busted=!!ledger.busted;f.netUsed=!!ledger.netUsed;f.angle=ledger.angle===undefined?null:num(ledger.angle);return f;
  }
  function bailList(ledger,n) {var seen={};return (ledger&&ledger.bails||[]).map(Number).filter(function(i){if(!(i>=0&&i<n)||seen[i])return false;seen[i]=1;return true;}).sort(function(a,b){return a-b;});}
  function evaluate(state,hand,ledger,equipped,rng) {
    ledger=ledger||{};rng=rng||Math.random;hand=hand||[];
    var bankKey=ledger.bankId!==undefined?String(ledger.wave||1)+':'+String(ledger.bankId):null;
    if(!ledger.preview&&bankKey&&state._banks&&state._banks[bankKey])return clone(state._banks[bankKey]);
    var f=ledgerFacts(ledger),owned=ownedList(equipped),has=function(id){return owned.some(function(x){return x.id===id;});};
    var bails=bailList(ledger,hand.length),landed=hand.filter(function(x,i){return bails.indexOf(i)<0;});
    var actual=counts(landed),distinct=faces.filter(function(x){return actual[x]>0;}).length;
    var values={},base=0;faces.forEach(function(x){values[x]=value(state,x);base+=actual[x]*values[x];});
    var commit=f.K>0&&!ledger.preview&&!f.busted,extra=has('N20')?.15:0,rollChance=chance(ledger.luck===undefined?state.luck:ledger.luck,extra),rolls={};
    var firstLanded=hand.length>0&&bails.indexOf(0)<0?hand[0]:null;
    var best=landed.reduce(function(m,x){return Math.max(m,values[x]);},0);
    // Only committed, kill-bearing banks consume random rolls. Previews and busts never do.
    if(commit){faces.forEach(function(x){if(actual[x]&&(state.techniques||{})[x]==='lucky')rolls[x]=rng()<rollChance;});
      if(landed.length&&has('S17'))rolls.chorus=rng()<rollChance;}
    var payline={Repeat:has('N12')?2:1,Formation:has('N13')?2:1,Variety:1};
    var wild=owned.filter(function(x){return x.id==='N10';}).map(function(x){return x.face||'star';})[0];
    function paidFor(c){return combos.filter(function(x){return match(x.id,c);}).map(function(x){return {id:x.id,name:x.name,value:x.bonus*(1+groups[x.group].gain*num((state.routines||{})[x.group]))*payline[x.group],base:x.bonus,p:x.p,group:x.group};});}
    function total(p){return p.reduce(function(s,x){return s+x.value;},0);}
    // Wildcard: up to four landed copies of the bound trick may stand in for any identity.
    function bestPaid(c){
      var paid=paidFor(c);if(!wild||!c[wild])return paid;
      var k=Math.min(4,c[wild]),n=Math.pow(5,k);
      for(var code=0;code<n;code++){var t=Object.assign({},c),q=code;t[wild]-=k;for(var j=0;j<k;j++){t[faces[q%5]]++;q=Math.floor(q/5);}var p=paidFor(t);if(total(p)>total(paid)+1e-10)paid=p;}
      return paid;
    }
    function scoreWith(virtualFace){
      var c=Object.assign({},actual);if(virtualFace)c[virtualFace]++;
      var paid=bestPaid(c),mult=base+total(paid),techniqueLog=[],charmLog=[],chips=f.K,pearls=0;
      faces.forEach(function(x){if(rolls[x]){var add=actual[x]*values[x];mult+=add;techniqueLog.push({face:x,kind:'lucky',value:add});}});
      var largest=paid.reduce(function(m,x){return Math.max(m,x.value);},0),hasCombo=function(ids){return paid.some(function(x){return ids.indexOf(x.id)>=0;});};
      owned.forEach(function(ch){
        var before=mult,add=0,factor=1,gain=0,cash=0,met=false,reason='',num2=function(x){return Math.round(x*100)/100;};
        switch(ch.id){
          case 'S01':{var b=ch.face||'front';add=3*actual[b];met=add>0;reason=names[b]+' landed ×'+actual[b];break;}
          case 'S02':add=2*distinct;met=add>0;reason=distinct+' different tricks landed';break;
          case 'S03':add=f.multi>=2?Math.min(6,f.multi):0;met=add>0;reason='Biggest multi-kill: '+f.multi;break;
          case 'S04':met=f.hits===0;factor=met?1.5:1;reason=f.hits+' hits taken';break;
          case 'S05':met=distinct===5;factor=met?2.5:1;reason=distinct+'/5 different tricks landed';break;
          case 'S06':{var reps=faces.filter(function(x){return actual[x]>=2;}).length;add=3*reps;met=add>0;reason=reps+' tricks landed twice or more';break;}
          case 'S07':gain=2*f.opening;met=gain>0;reason=f.opening+' kills in the first second';break;
          case 'S08':met=f.kills>0&&f.ascent>f.kills/2;factor=met?1.5:1;reason=f.ascent+'/'+f.kills+' kills while climbing';break;
          case 'S09':met=f.kills>0&&f.descent>f.kills/2;factor=met?1.5:1;reason=f.descent+'/'+f.kills+' kills while falling';break;
          case 'S10':met=f.apex>0&&largest>0;add=met?largest:0;reason=f.apex+' apex kills · largest combo +'+num2(largest);break;
          case 'S11':gain=2*f.above;met=gain>0;reason=f.above+' kills on enemies above you';break;
          case 'S12':gain=3*f.late;met=gain>0;reason=f.late+' kills in the last second';break;
          case 'S13':add=4*f.entry;met=add>0;reason=f.entry+' Water Hammer kills';break;
          case 'S14':met=!!state.relay;add=met?4:0;reason=met?'Previous jump was clean':'Previous jump had a Bail or no bank';break;
          case 'S15':add=Math.max(0,5-largest);met=add>0;reason='Largest combo +'+num2(largest)+(met?' raised to +5':' (already +5 or more)');break;
          case 'S16':add=f.banked;met=add>0;reason=f.banked+' jumps banked this wave';break;
          case 'S17':met=rolls.chorus===true;add=met?best:0;reason='Chance '+num2(rollChance*100)+'% · '+(ledger.preview?'rolls at the bank':met?'paid':'missed');break;
          case 'N01':gain=3*f.apex;met=gain>0;reason=f.apex+' apex kills';break;
          case 'N02':gain=3*bails.length;met=gain>0;reason=bails.length+' Bails';break;
          case 'N03':gain=2*f.crit;met=gain>0;reason=f.crit+' critical-hit kills';break;
          case 'N04':gain=f.kills*f.closeWeapons;met=gain>0;reason=f.kills+' kills × '+f.closeWeapons+' Close weapons';break;
          case 'N05':add=Math.floor(f.air);met=add>0;reason=num2(f.air)+'s of flight';break;
          case 'N06':met=f.angle!==null&&f.angle<35;add=met?6:0;reason=(f.angle===null?'No launch':'Launched at '+Math.round(f.angle)+'\u00b0')+' (need below 35\u00b0)';break;
          case 'N07':met=chips>=20;factor=met?1.5:1;reason=chips+' chips (need 20)';break;
          case 'N08':met=f.hpFrac>.75;factor=met?1.5:1;reason=Math.round(f.hpFrac*100)+'% HP (need above 75%)';break;
          case 'N09':met=hasCombo(['triple','house','four','doubleTriple','five','six']);factor=met?2:1;reason=met?'Triple or better landed':'No Triple or better';break;
          case 'N10':met=!!(wild&&actual[wild]);reason=met?names[wild]+' played wild':names[wild||'star']+' did not land';break;
          case 'N11':met=!!firstLanded;add=met?values[firstLanded]:0;reason=met?names[firstLanded]+' pays again':'First trick bailed';break;
          case 'N12':met=paid.some(function(x){return x.group==='Repeat';});reason=met?'Repeat combos doubled':'No Repeat combo';break;
          case 'N13':met=paid.some(function(x){return x.group==='Formation';});reason=met?'Formation combos doubled':'No Formation combo';break;
          case 'N14':met=f.busted;reason=met?'Bust banks half':'No bust';break;
          case 'N15':met=f.netUsed;reason=met?'Caught your first hit':'Not needed';break;
          case 'N16':met=true;reason='Drawing '+hand.length+' tricks';break;
          case 'N17':met=f.K>=15;cash=met?1:0;reason=f.K+' chips (need 15)';break;
          case 'N18':met=hasCombo(['four','five','six']);cash=met?3:0;reason=met?'Four of a Kind or better':'No Four of a Kind';break;
          case 'N19':cash=bails.length;met=cash>0;reason=bails.length+' Bails';break;
          case 'N20':met=true;reason='Lucky and Chorus chance '+num2(rollChance*100)+'%';break;
        }
        mult=(mult+add)*factor;chips+=gain;pearls+=cash;
        charmLog.push({id:ch.id,name:charms[ch.id].name,kind:charms[ch.id].kind,before:before,after:mult,add:add,factor:factor,chips:gain,pearls:cash,active:met,reason:reason});
      });
      return {mult:mult,base:base,combos:paid,charmLog:charmLog,techniqueLog:techniqueLog,echo:virtualFace||null,counts:actual,values:values,chips:chips,kills:f.K,pearls:pearls,bails:bails,landed:landed.length,preview:!!ledger.preview};
    }
    var result=scoreWith(null);
    faces.forEach(function(x){if(actual[x]&&(state.techniques||{})[x]==='echo'){var next=scoreWith(x);if(next.mult>result.mult+1e-10)result=next;}});
    result.busted=f.busted;
    result.score=f.busted?(has('N14')?Math.round(result.chips*result.mult/2):0):Math.round(result.chips*result.mult);
    if(f.busted)result.pearls=0;
    if(!ledger.preview&&(f.K>0||f.busted)){
      if(commit)faces.forEach(function(x){if(actual[x]&&(state.techniques||{})[x]==='gold'){
        var g=state.gold[x]||(state.gold[x]={marks:0,bonus:0,lastWave:-1});
        if(g.lastWave!==f.wave){g.lastWave=f.wave;g.marks=Math.min(8,num(g.marks)+1);g.bonus=Math.min(tune.goldCap,Math.floor(g.marks/2)*tune.goldStep);}
      }});
      state.relay=!f.busted&&bails.length===0;
      if(bankKey){state._banks=state._banks||{};state._banks[bankKey]=clone(result);var keys=Object.keys(state._banks);if(keys.length>150)delete state._banks[keys[0]];}
    }
    return result;
  }
  // Average mult of a jump before charms, over every possible draw; Lucky is counted at its expected value.
  var expectCache={};
  function factorial(n){var x=1;for(var i=2;i<=n;i++)x*=i;return x;}
  function expect(state,n,luck){
    n=Math.min(tune.maxDraws,Math.max(1,n));luck=luck===undefined?state.luck||0:luck;
    var key=JSON.stringify([n,state.weights,state.polish,state.techniques,state.gold,state.routines,luck]);if(expectCache[key])return expectCache[key];
    var odds={},w=faces.map(function(x){return Math.max(0,num(state.weights[x]));}),sum=w.reduce(function(a,b){return a+b;},0),mean=0,mass=0,strong=0;
    combos.forEach(function(c){odds[c.id]=0;});
    (function visit(i,left,c){
      if(i<4){for(var k=0;k<=left;k++)visit(i+1,left-k,c.concat([k]));return;}
      c=c.concat([left]);var p=factorial(n),hand=[];
      for(var j=0;j<5;j++){p*=Math.pow(w[j]/sum,c[j])/factorial(c[j]);for(var m=0;m<c[j];m++)hand.push(faces[j]);}
      if(!p)return;var v=evaluate(state,hand,{K:0,preview:true},[],function(){return 1;}),val=v.mult;
      for(var q=0;q<5;q++)if(state.techniques[faces[q]]==='lucky')val+=c[q]*value(state,faces[q])*chance(luck);
      mean+=p*val;mass+=p;v.combos.forEach(function(x){odds[x.id]+=p;});
      if(v.combos.some(function(x){return ['four','show','threePair','doubleTriple','five','six'].indexOf(x.id)>=0;}))strong+=p;
    })(0,n,[]);
    var out={draws:n,meanMult:mean/mass,comboOdds:odds,strongChance:strong/mass};
    var keys=Object.keys(expectCache);if(keys.length>128)delete expectCache[keys[0]];
    return expectCache[key]=out;
  }
  // The pre-launch heat cue: this hand's mult before charms against the average hand of the same size.
  var heatBands=[{id:'cold',below:.9},{id:'warm',below:1.3},{id:'hot',below:1.9},{id:'jackpot',below:Infinity}];
  function heat(state,hand,luck){
    if(!hand||!hand.length)return {band:'cold',ratio:0,mult:0,mean:0};
    var v=evaluate(state,hand,{K:0,preview:true},[],function(){return 1;}).mult,c=counts(hand);
    faces.forEach(function(x){if(state.techniques[x]==='lucky')v+=c[x]*value(state,x)*chance(luck);});
    var mean=expect(state,hand.length,luck).meanMult,ratio=mean>0?v/mean:1;
    return {band:heatBands.filter(function(b){return ratio<b.below;})[0].id,ratio:ratio,mult:v,mean:mean};
  }
  return {faces:faces,names:names,combos:combos,charms:charms,charmText:charmText,groups:groups,tune:tune,chipBonus:chipBonus,prices:prices,create:create,draws:draws,addDraw:addDraw,draw:draw,evaluate:evaluate,expect:expect,heat:heat,heatBands:heatBands,transfer:transfer,polish:polish,routine:routine,technique:technique,resetWave:resetWave,sellCharm:sellCharm,value:value,chance:chance,counts:counts,match:match,version:'five-trick-slot-1'};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=FiveScore;

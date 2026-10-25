/* Presentation cues only: authoritative scoring and the game RNG remain in FiveScore/DEMO.bank. */
var ScoreCues = (function () {
  const F = typeof FiveScore !== 'undefined' ? FiveScore : require('./five-score.js');
  const clone = x => JSON.parse(JSON.stringify(x));
  function emit(r, type, extra) {
    const h=r.hand;
    r.events.push({kind:'scorecue',type,key:r.wave+':'+h.n,wave:r.wave,hand:h.n,...extra});
  }
  function begin(r) {
    const h=r.hand;
    h.scoreShow={count:0,mult:0,base:0,combos:[],snapshot:clone(r.demo.score),finished:false};
    emit(r,'start',{chips:0,mult:0,draws:h.drawn.length,quota:r.quota,waveScore:r.wscore});
  }
  function chips(r,amount,pos,bonus) {
    emit(r,'chips',{amount,chips:r.hand.K,pos:pos?{...pos}:null,bonus:bonus||null});
  }
  // A hit bailed trick `index` before it was revealed; it will reveal as a Bail and pay nothing.
  function bail(r,index) {const h=r.hand;emit(r,'bail',{face:h.drawn[index],name:F.names[h.drawn[index]],index});}
  function saved(r,index) {const h=r.hand;emit(r,'saved',{face:h.drawn[index],name:F.names[h.drawn[index]],index});}
  function bust(r) {const p=r.hand?.scoreShow;if(p)p.busted=true;emit(r,'bust',{chips:r.hand.K});}
  function advance(r,count) {
    const h=r.hand,p=h?.scoreShow;if(!p||p.finished)return;
    const target=Math.min(h.drawn.length,Math.max(p.count,count));
    while(p.count<target) {
      const index=p.count++,face=h.drawn[index];
      if((h.bails||[]).includes(index)){emit(r,'trick',{face,name:F.names[face],amount:0,mult:p.mult,count:p.count,draws:h.drawn.length,bailed:true});continue;}
      const next=F.evaluate(p.snapshot,h.drawn.slice(0,p.count),{K:0,wave:r.wave,preview:true,bails:(h.bails||[]).filter(i=>i<p.count)},[],()=>1);
      const value=F.value(p.snapshot,face),before=p.mult;
      p.mult+=value;p.base+=value;
      emit(r,'trick',{face,name:F.names[face],amount:value,mult:p.mult,count:p.count,draws:h.drawn.length});
      const old=new Map(p.combos.map(c=>[c.id,c.value]));
      for(const combo of next.combos) {
        const add=combo.value-(old.get(combo.id)||0);
        if(add){p.mult+=add;emit(r,'combo',{name:combo.name,id:combo.id,amount:add,mult:p.mult,count:p.count});}
      }
      // Echo can choose a different virtual identity. Reconcile display without altering the actual payout.
      const remaining=next.mult-p.mult;
      if(Math.abs(remaining)>1e-8){p.mult=next.mult;emit(r,'combo',{name:'Echo',amount:remaining,mult:p.mult,count:p.count});}
      p.combos=next.combos;
      if(p.mult<before-1e-7)throw Error('Presentation multiplier decreased');
    }
  }
  function tick(r) {
    const h=r.hand;if(!h?.open||h.busted)return;
    advance(r,Math.floor(h.air/Math.max(.1,h.pred.air)*h.drawn.length));
  }
  function finish(r,result) {
    const h=r.hand,p=h?.scoreShow;if(!p||p.finished)return;
    if(!h.busted)advance(r,h.drawn.length);
    if(!h.busted){
      for(const t of result.techniqueLog||[])if(t.value){p.mult+=t.value;emit(r,'lucky',{name:F.names[t.face],amount:t.value,mult:p.mult});}
      for(const c of result.charmLog||[])if(c.active&&(c.after!==c.before||c.chips)){
        if(Math.abs(c.before-p.mult)>1e-7){p.mult=c.before;emit(r,'combo',{name:'Routine',mult:p.mult,amount:0});}
        p.mult=c.after;emit(r,'charm',{name:c.name,amount:c.add,factor:c.factor,chipsAdded:c.chips||0,mult:p.mult});
      }
      if(Math.abs(result.mult-p.mult)>1e-7){const add=result.mult-p.mult;p.mult=result.mult;emit(r,'combo',{name:'Routine',amount:add,mult:p.mult});}
    }
    p.finished=true;
    emit(r,'bank',{chips:result.chips,mult:result.mult,score:result.score,busted:!!h.busted,waveScore:r.wscore,quota:r.quota,met:r.wscore>=r.quota});
  }
  return {begin,chips,bail,saved,bust,advance,tick,finish};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=ScoreCues;

/* A persistent, bounded HUD animation layer. It never changes score, combat or the game RNG. */
var ScoreHUD = (() => {
  let root=null,particleLayer=null,run=null,queue=[],next=0,last=0,hold=0,popSeq=0,lastChipSound=0;
  const glyph={spout:'≋',front:'↻',back:'↺',cork:'⤨',star:'✦'};
  const reduced=()=>globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let model={chips:0,mult:0,score:0,waveScore:0,quota:1,draws:3,faces:[],banked:false,notice:'KILLS FEED CHIPS · TRICKS FEED MULT'};
  let shown={chips:0,mult:0,score:0,waveScore:0};
  const number=n=>Math.round(n).toLocaleString('en-US');
  const multiplier=n=>Number(n.toFixed(2)).toLocaleString('en-US',{maximumFractionDigits:2});
  function ensure(){
    if(root?.isConnected)return root;
    root=document.createElement('section');root.id='score-hero';root.hidden=true;
    root.setAttribute('aria-label','Flight scoreboard');
    root.innerHTML=`<div class="ss-shell"><div class="ss-top"><span id="ss-flight">FLIGHT SCORE</span><span id="ss-status">LAND TO BANK</span></div><div class="ss-equation"><div class="ss-cell ss-chips"><span class="ss-label">CHIPS</span><strong id="ss-chips">0</strong><span class="ss-add" id="ss-chip-add"></span></div><span class="ss-times">×</span><div class="ss-cell ss-mult"><span class="ss-label">MULT</span><strong id="ss-mult">0</strong><span class="ss-add" id="ss-mult-add"></span></div><span class="ss-equals">=</span><div class="ss-cell ss-total"><span class="ss-label" id="ss-total-label">FLIGHT SCORE</span><strong id="ss-score">0</strong><span class="ss-add" id="ss-bank-add"></span></div></div><div class="ss-cause" id="ss-cause">KILLS FEED CHIPS · TRICKS FEED MULT</div><div class="ss-bottom"><div id="ss-tricks" class="ss-tricks" aria-label="Revealed tricks"></div><span class="ss-goal"><b id="ss-wave-total">0</b> / <span id="ss-quota">0</span><small> WAVE TARGET</small></span></div><div class="ss-progress"><i id="ss-progress"></i></div></div>`;
    document.body.appendChild(root);return root;
  }
  function el(id){return root?.querySelector('#ss-'+id)}
  function set(id,value){const e=el(id),text=String(value);if(e&&e.textContent!==text)e.textContent=text}
  function addition(id,text){const e=el(id);if(!e)return;set(id,text);e._scoreUntil=performance.now()+800;e.style.opacity='1';}
  function digits(id,text){const e=el(id);if(!e)return;set(id,text);const length=String(text).replace(/[,\.]/g,'').length;e.style.fontSize=length>5?`clamp(20px,${(id==='score'?3.6:4.2)*5/length}vw,${(id==='score'?54:62)*5/length}px)`:'';}
  function pulse(id,strength=1){
    const target=el(id);if(!target||reduced()||!target.animate)return;
    target._scorePulse?.cancel();
    const shake=Math.max(0,DEMO.tune.shake||0),amp=2.1*shake*strength,scale=1+.16*strength;
    target._scorePulse=target.animate([
      {transform:'scale(1) translate(0,0)'},
      {transform:`scale(${scale}) translate(${-amp}px,-1px) rotate(-1deg)`,offset:.18},
      {transform:`scale(${1+.04*strength}) translate(${amp}px,0) rotate(1deg)`,offset:.36},
      {transform:`scale(.98) translate(${-amp*.4}px,0)`,offset:.58},
      {transform:'scale(1) translate(0,0)'}
    ],{duration:360+strength*55,easing:'cubic-bezier(.16,1,.3,1)'});
  }
  function sound(kind){
    if(reduced()||!ui?.ctx||!ui.enabled)return;
    const now=performance.now();if(kind==='chips'&&now-lastChipSound<65)return;
    if(kind==='chips')lastChipSound=now;
    const notes=[440,554.37,659.25,739.99,880],f=kind==='chips'?390:kind==='bank'?880:notes[model.faces.length%notes.length];
    ui.tone(f,kind==='bank'?.22:.065,'sine',kind==='bank'?.055:.023,f*(kind==='chips'?1.14:1.025));
    if(kind==='bank'||kind==='combo')ui.tone(f*1.5,.14,'triangle',.016,f*1.5);
  }
  function popup(id,text,tone,from){
    const target=el(id);if(!target)return;
    ensure();if(!particleLayer?.isConnected){particleLayer=document.createElement('div');particleLayer.id='score-particles';particleLayer.setAttribute('aria-hidden','true');document.body.appendChild(particleLayer);}
    const layer=particleLayer;if(layer.querySelectorAll('.ss-particle').length>=16)return;
    const particle=document.createElement('span');particle.className='ss-particle '+tone;particle.textContent=text;
    const box=target.getBoundingClientRect(),end={x:box.x+box.width/2,y:box.y+box.height*.45};
    const start=from&&!reduced()?from:{x:end.x+(popSeq++%2?30:-30),y:end.y+30};
    particle.style.left=start.x+'px';particle.style.top=start.y+'px';layer.appendChild(particle);
    if(!particle.animate||reduced()){particle.remove();return;}
    particle.animate([
      {transform:'translate(-50%,-50%) scale(.75)',opacity:0},
      {transform:'translate(-50%,-65%) scale(1.14)',opacity:1,offset:.12},
      {transform:`translate(calc(-50% + ${(end.x-start.x)*.55}px),calc(-50% + ${(end.y-start.y)*.55-24}px)) scale(1)`,opacity:1,offset:.58},
      {transform:`translate(calc(-50% + ${end.x-start.x}px),calc(-50% + ${end.y-start.y}px)) scale(.6)`,opacity:0}
    ],{duration:from?520:440,easing:'cubic-bezier(.2,.75,.3,1)'}).finished.catch(()=>{}).then(()=>particle.remove());
  }
  function notice(text,tone=''){
    model.notice=text;const e=el('cause');if(e){e.className='ss-cause '+tone;set('cause',text);pulse('cause',.35)}
  }
  function fresh(r){
    run=r;queue=[];next=0;hold=0;
    model={chips:0,mult:0,score:0,waveScore:r.wscore||0,quota:r.quota||1,draws:DEMO.cap(r),faces:[],banked:false,notice:'KILLS FEED CHIPS · TRICKS FEED MULT'};
    shown={chips:0,mult:0,score:0,waveScore:r.wscore||0};
    if(root){root.classList.remove('is-banked','is-combo');set('flight',`NEXT FLIGHT · WAVE ${r.wave}`);set('status','LAND TO BANK');set('total-label','FLIGHT SCORE');set('cause',model.notice);const cause=el('cause');if(cause)cause.className='ss-cause';const progress=el('progress');if(progress){progress.style.transition='none';progress.style.width='0%';requestAnimationFrame(()=>{progress.style.transition=''})}for(const id of ['chip-add','mult-add','bank-add']){set(id,'');const e=el(id);if(e)e._scoreUntil=0;}}
    particleLayer?.querySelectorAll('.ss-particle').forEach(e=>e.remove());
  }
  function receive(r,events,renderer){
    if(!r?.demo)return;if(run!==r)fresh(r);
    for(const original of events){if(original.kind!=='scorecue')continue;
      const e={...original};
      if(e.type==='chips'&&e.pos&&renderer?.sx){
        const canvas=renderer.app?.canvas||document.querySelector('canvas'),rect=canvas?.getBoundingClientRect();
        if(rect){const width=renderer.app?.screen?.width||K,height=renderer.app?.screen?.height||Q;e.from={x:rect.x+renderer.sx(e.pos.x)*rect.width/width,y:rect.y+renderer.sy(e.pos.y)*rect.height/height};}
      }
      const tail=queue.at(-1);
      if(e.type==='chips'&&tail?.type==='chips'&&tail.key===e.key){tail.amount+=e.amount;tail.chips=e.chips;tail.from=e.from||tail.from;}
      else queue.push(e);
      // Fast-forward an exceptional backlog, retaining exact absolute totals. Ordinary play is far below this cap.
      if(queue.length>256){const latest=queue.at(-1);queue=queue.slice(-96);if(latest.type==='bank')queue=[latest];}
    }
  }
  function apply(e,now){
    ensure();root.dataset.event=e.type;root.dataset.key=e.key;
    if(e.type==='start'){
      model={...model,chips:0,mult:0,score:0,waveScore:e.waveScore,quota:e.quota,draws:e.draws,faces:[],banked:false};
      shown.chips=shown.mult=shown.score=0;root.classList.remove('is-banked','is-combo');
      set('flight',`FLIGHT ${String(e.hand).padStart(2,'0')} · WAVE ${e.wave}`);set('status','LAND TO BANK');set('total-label','FLIGHT SCORE');notice('KILLS FEED CHIPS · TRICKS FEED MULT');return 0;
    }
    if(e.type==='chips'){
      model.chips=e.chips;addition('chip-add','+'+number(e.amount));pulse('chips',Math.min(1.5,.7+e.amount*.08));popup('chips','+'+number(e.amount),'chip',e.from);sound('chips');return 0;
    }
    if(['trick','combo','lucky','charm'].includes(e.type)){
      model.mult=e.mult;
      if(e.type==='trick'){model.faces[e.count-1]=e.face;addition('mult-add','+'+multiplier(e.amount));notice(`${e.name.toUpperCase()}  +${multiplier(e.amount)} MULT`,'mult');}
      else if(e.type==='charm'){const text=e.factor>1?`×${multiplier(e.factor)}`:`+${multiplier(e.amount||0)}`;addition('mult-add',text);notice(`${e.name.toUpperCase()}  ${text} MULT`,'charm');}
      else{addition('mult-add','+'+multiplier(e.amount||0));notice(`${e.type==='lucky'?'LUCKY '+e.name:e.name.toUpperCase()}  +${multiplier(e.amount||0)} MULT`,'combo');}
      root.classList.toggle('is-combo',e.type!=='trick');pulse('mult',e.type==='trick'?1:1.4);popup('mult',e.factor>1?'×'+multiplier(e.factor):'+'+multiplier(e.amount||0),'mult');sound(e.type==='trick'?'trick':'combo');
      return reduced()?0:e.type==='trick'?125:165;
    }
    if(e.type==='bank'){
      set('flight',`FLIGHT ${String(e.hand).padStart(2,'0')} · WAVE ${e.wave}`);
      model.chips=e.chips;model.mult=e.mult;model.score=e.score;model.waveScore=e.waveScore;model.quota=e.quota;model.banked=true;
      root.classList.add('is-banked');root.classList.remove('is-combo');set('total-label','BANKED');set('status',e.met?'WAVE TARGET MET':'BANKED');addition('bank-add','+'+number(e.score));
      notice(e.score>0?(e.met?'WAVE TARGET MET':'SPLASH! SCORE BANKED'):'NO KILLS · ROUTINE RETAINED','bank');pulse('score',1.6);pulse('chips',.6);pulse('mult',.8);sound('bank');
      if(e.score>0){popup('score','+'+number(e.score),'bank');if(!reduced()&&root.animate){root._bankAnim?.cancel();root._bankAnim=root.animate([{transform:'translateX(-50%) scale(1)'},{transform:'translateX(-50%) scale(1.035)',offset:.18},{transform:'translateX(-50%) scale(.99)',offset:.5},{transform:'translateX(-50%) scale(1)'}],{duration:530,easing:'cubic-bezier(.16,1,.3,1)'});}}
      hold=now+1000;return reduced()?0:720;
    }
    return 0;
  }
  function paint(dt){
    const lerp=reduced()?1:1-Math.exp(-dt/58);
    model.score=model.banked?model.score:Math.round(model.chips*model.mult);
    for(const name of ['chips','mult','score','waveScore']){shown[name]+=(model[name]-shown[name])*lerp;if(Math.abs(model[name]-shown[name])<.025)shown[name]=model[name];}
    digits('chips',number(shown.chips));digits('mult',multiplier(shown.mult));digits('score',number(shown.score));set('wave-total',number(shown.waveScore));set('quota',number(model.quota));
    for(const id of ['chip-add','mult-add','bank-add']){const e=el(id);if(e)e.style.opacity=performance.now()<(e._scoreUntil||0)?'1':'0';}
    const tricks=el('tricks');if(tricks){const html=Array.from({length:model.draws},(_,i)=>`<span class="${model.faces[i]?'revealed':''}" title="${model.faces[i]?FiveScore.names[model.faces[i]]:'Trick to come'}">${glyph[model.faces[i]]||'◇'}</span>`).join('');if(tricks.innerHTML!==html)tricks.innerHTML=html;}
    const progress=el('progress');if(progress)progress.style.width=Math.min(100,100*shown.waveScore/Math.max(1,model.quota))+'%';
    root.dataset.chips=String(model.chips);root.dataset.mult=String(model.mult);root.dataset.score=String(model.score);root.dataset.queued=String(queue.length);
  }
  function frame(now){
    const dt=Math.min(60,Math.max(0,now-(last||now)));last=now;
    if(S?.demo&&run!==S)fresh(S);
    const playing=ft==='game'&&S?.mode==='playing',paused=ft==='pause';
    if(!paused&&root&&ft!=='title'){
      let count=0;while(queue.length&&now>=next&&count++<20){const e=queue.shift();const wait=apply(e,now);next=now+wait;if(wait)break;}
      paint(dt);
    }
    if(root)root.hidden=!(playing||(!paused&&ft!=='title'&&(queue.length||now<hold)));
    if(particleLayer)particleLayer.hidden=!!root?.hidden;
    requestAnimationFrame(frame);
  }
  function update(r){if(run!==r)fresh(r);ensure();root.hidden=false;}
  requestAnimationFrame(frame);
  return {receive,update,get state(){return {...model,shown:{...shown},queued:queue.length}},get element(){return root}};
})();

// Observe the real per-tick event stream; keep score animation independent of the world camera shake.
{const prior=Ul.prototype.events;Ul.prototype.events=function(events){ScoreHUD.receive(S,events,this);return prior.call(this,events.filter(e=>e.kind!=='bank'&&e.kind!=='charm'&&e.kind!=='scorecue'))}}
{const prior=Dl.prototype.events;Dl.prototype.events=function(events){return prior.call(this,events.filter(e=>!['bank','charm','scorecue'].includes(e.kind)))}}
of=function(){if(!S?.demo||!document.getElementById('wave-number'))return;DemoOf();ScoreHUD.update(S);
  DemoSet('phase-label',S.armed?'CLOCK OUT · LAND TO BANK':S.medium.kind==='air'?'AIRBORNE':'SAFE WATER');
  DemoSet('budget-label','AIR REMAINING');DemoSet('budget-value',Math.max(0,S.budget).toFixed(1)+'s');DemoSet('budget-caption','SURVIVE · LAND TO BANK');
  DemoSet('control-hint',S.medium.kind==='air'?'W A S D / arrows: steer':'Hold W / up to carve · release to launch · space to boost');
  const fill=document.getElementById('budget-fill');if(fill)fill.style.width=`${Math.max(0,S.budget)/DEMO.clock(S.wave)*100}%`;
};
Ovn=function(r){if(r.events.some(e=>e.kind==='armed')){ci='CLOCK OUT · LAND TO BANK';kr=1.6}};
globalThis.icarusDemo.scoreboard=ScoreHUD;

/* Nonblocking first-run guidance. Conditions come from actual play; no granted kills or score. */
var RunGuide=(()=>{
  let el=null,run=null,dismissed=false,last='',bankAt=0,bankSeen=null;
  const touch=()=>navigator.maxTouchPoints>0||globalThis.matchMedia?.('(pointer: coarse)').matches;
  function ensure(){if(el?.isConnected)return;el=document.createElement('aside');el.id='run-guide';el.setAttribute('aria-label','Flight guide');el.innerHTML='<div id="run-guide-text"></div><button aria-label="Dismiss flight guide" title="Dismiss tips">×</button>';el.querySelector('button').onclick=()=>{dismissed=true;el.hidden=true;try{localStorage.setItem('icarus.scoreshow.guideHidden','1')}catch(e){}};document.body.appendChild(el)}
  function update(r){
    if(run!==r){run=r;last='';bankAt=0;bankSeen=null;try{dismissed=localStorage.getItem('icarus.scoreshow.guideHidden')==='1'}catch(e){dismissed=false}}
    ensure();const active=ft==='game'&&r.mode==='playing';el.hidden=!active||dismissed||r.wave>1;if(el.hidden)return;
    let html='';
    const landings=r.metrics.landings||0;
    if(r.demo.last&&r.demo.last!==bankSeen){bankSeen=r.demo.last;if(r.demo.last.chips>0)bankAt=r.time;}
    if(r.demo.overtime){html='<b>OVERTIME</b><span>Enemies keep coming and kills still count. Land in water to bank and end the wave.</span>'}
    else if(r.demo.last?.chips>0&&r.medium.kind==='water'&&r.time-bankAt<5){const h=r.demo.last;html=`<b>LAND & BANK</b><span><em class="guide-chips">${h.chips} chips</em> × <em class="guide-mult">${DEMO.fmt(h.mult)} mult</em> banked <em class="guide-score">${h.score} points</em>. Your wave target is ${r.quota}.</span>`}
    else if(r.medium.kind==='water'&&landings<2){html=`<b>CARVE & RELEASE</b><span>${touch()?'Hold the left control upward, then release to launch. The right button boosts.':'Hold W / ↑ to carve upward, then release to launch. Space boosts.'}</span>`}
    else if(r.medium.kind==='air'&&!r.kills){html='<b>FIGHT</b><span>Weapons fire automatically. Get enemies in range to earn <em class="guide-chips">chips</em>.</span>'}
    else if(r.medium.kind==='air'&&landings<3){html='<b>BUILD THE PAYOUT</b><span>Kills feed <em class="guide-chips">chips</em>. Tricks feed <em class="guide-mult">mult</em>. A hit bails the trick in progress. Land to bank.</span>'}
    else if(landings<4){html=`<b>WAVE TARGET</b><span>${r.wscore} / ${r.quota} banked. ${r.budget.toFixed(0)} seconds of air remain.</span>`}
    if(!html){el.hidden=true;return}if(html!==last){el.querySelector('#run-guide-text').innerHTML=html;last=html}
  }
  function shopHint(r){return r.wave<=2?'Weapons and gear earn chips and keep you alive. Charms and Routine upgrades build mult. Getting hit bails the trick in progress.':''}
  const original=of;of=function(){original();if(S?.demo)update(S)};
  return {update,shopHint,get element(){return el}};
})();
globalThis.icarusDemo.guide=RunGuide;

// Give a concrete failure explanation using the recorded run, not a generic difficulty suggestion.
{const original=jl;jl=function(){original();const r=S,d=r?.demo?.lastFailure;if(!d)return;const panel=document.querySelector('.summary-panel');if(!panel)return;const note=document.createElement('p');note.className='run-failure-note';
 const busts=r.demo.history.filter(h=>h.busted).length,bails=r.demo.history.reduce((a,h)=>a+(h.bails?.length||0),0);
 note.textContent=`${Math.max(0,d.quota-d.score)} more points were needed. ${d.bankedFlights} jumps banked; ${busts} busted and ${bails} tricks bailed from ${d.acceptedHits} hits.`;
 panel.querySelector('.demo-summary-hands')?.before(note);
}}

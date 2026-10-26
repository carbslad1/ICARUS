const {chromium}=require('playwright');const fs=require('fs'),path=require('path');
const dir=process.argv[2],file=path.resolve('study.html'),bot=fs.readFileSync('bot-browser.js','utf8');
const plans=[{wave:1,style:'mid-keep',seed:7},{wave:5,style:'low-keep',seed:7},{wave:5,style:'high-keep',seed:7},{wave:9,style:'low-keep',seed:7}];
(async()=>{const browser=await chromium.launch({args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']});const page=await browser.newPage({viewport:{width:1280,height:720}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file://'+file);await page.waitForSelector('[data-demo="begin"]');await page.addScriptTag({content:bot});
 await page.evaluate(()=>{try{localStorage.setItem('icarus.scoreshow.guideHidden','1')}catch(e){}});
 const log=[];
 for(const p of plans){
  // Start a run and fast-forward through earlier waves with the bot and a simple shop policy (pure simulation, no rendering).
  const ok=await page.evaluate(({wave,style,seed})=>{const a=window.icarusDemo,D=a.catalog;a.start('harpoon',seed);const r=a.state,fly=window.__bot.flyer(a.controls,style,seed,{keep:8});
   const shop=()=>{for(let i=0;r.lvup&&i<50;i++)a.command(r,'level',0);for(const o of r.demo.offers){if(o.bought||o.price>r.xp)continue;if(o.row==='weapon'&&(r.slots.length<6||r.slots.some(g=>g.id===o.id&&g.lvl===o.level&&g.lvl<4)))a.command(r,'buy',o.uid);else if(o.row==='stat'&&['Armour','Max HP','Regen','Damage %','Shot'].includes(D.items[o.id].up))a.command(r,'buy',o.uid)}for(let i=0;i<r.slots.length;i++)a.command(r,'combine',i);a.command(r,'next')};
   let guard=0;while(r.wave<wave&&guard++<120*60*30){if(r.mode==='shop'){shop();continue}if(r.mode!=='playing')return false;const it=fly(r);if(r.medium.kind==='air'&&r.budget<=0)it.y=-1;a.step(r,it,1/120)}
   // let the real loop drive the same bot through the renderer
   window.__fly=fly;window.__study.setInput(s=>{const it=window.__fly(s);if(s.medium.kind==='air'&&s.budget<=0)it.y=-1;return it});a.render();return r.mode==='playing'&&r.wave===wave},p);
  if(!ok){log.push({plan:p,skipped:true});continue}
  // Rebuild the HUD for play
  await page.evaluate(()=>{const a=window.icarusDemo;a.render()});
  const shots=[['dive',"s.medium.kind==='water'&&s.time>0.3"],['breach',"s.medium.kind==='air'&&s.medium.elapsed<0.25"],['climb',"s.medium.kind==='air'&&s.hand&&s.hand.activeAir>0.3*s.hand.pred.air&&s.medium.vy>0"],['apex',"s.medium.kind==='air'&&Math.abs(s.medium.vy)<4"],['fall',"s.medium.kind==='air'&&s.hand&&s.hand.activeAir>0.7*s.hand.pred.air"],['entry',"s.medium.kind==='air'&&s.medium.vy<0&&s.medium.origin.y<4"],['splash',"s.medium.kind==='water'&&s.demo.history.length>0"]];
  // skip to the start of a fresh dive: wait until in water after at least one landing in this wave, or now
  for(let flight=0;flight<2;flight++){
   for(const [name,cond] of shots){
    try{await page.waitForFunction(new Function('return (function(){const s=window.icarusDemo.state;return '+cond+'})()'),null,{timeout:60000,polling:'raf'})}catch(e){log.push({plan:p,flight,shot:name,timeout:true});continue}
    const f=`w${p.wave}-${p.style}-f${flight}-${name}.png`;await page.screenshot({path:path.join(dir,f)});
    const st=await page.evaluate(()=>{const s=window.icarusDemo.state,m=s.medium;return {t:s.time,wave:s.wave,tier:s.tier,kind:m.kind,origin:m.origin,local:m.local,vy:m.vy,pos:m.pos,enemies:(s.enemies||[]).map(e=>({k:e.kind,x:Math.round(e.pos.x),y:Math.round(e.pos.y)})),pursuers:(s.pursuers||[]).map(p=>({x:Math.round(p.x),y:Math.round(p.y),wet:p.wet})),hp:s.hp,kills:s.kills,budget:s.budget}});
    log.push({plan:p,flight,shot:name,file:f,state:st});
    if(name==='splash')await page.waitForFunction(()=>window.icarusDemo.state.medium.kind==='water',null,{timeout:5000}).catch(()=>{});
   }
   // wait for this landing to pass before the next flight's dive shot
   await page.waitForTimeout(300);
  }
 }
 fs.writeFileSync(path.join(dir,'shots.json'),JSON.stringify({errors,log},null,1));console.log('errors',errors.length,'shots',log.filter(x=>x.file).length,'timeouts',log.filter(x=>x.timeout).length,'skipped',log.filter(x=>x.skipped).length);await browser.close();})();

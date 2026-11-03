// Waiting enemies while you swim one way (designer, 2026-11-01: swimming right at low speed left them "behind bunched up
// in the air and hitting the edge of the screen"). After one flight the dolphin swims level to the right for 6 s, 8 m
// down, at waves 2 and 10 (4 seeds); where do the waiting enemies sit across the view? Passes when at most 10% are in
// the outer tenth of the view on either side (hover with homes fixed in the world: 63-94%).
//   node qa/waterspread.cjs ['{"hover":0}']
let fail = 0;
const {load}=require('./load.cjs'),{swimmer}=require('./bot.cjs');
const H=load(require('path').join(__dirname, '..', 'ICARUS-demo.html'),new Map([['icarus.scoreshow.tune',process.argv[2]||'{}'],['icarus.scoreshow.settings.v2',JSON.stringify({'ro.on':0})]]),{bake:true,modern:true});
const D=H.DEMO;
for(const wave of [2,10]){let n=0,edge=0,spread=0,samples=0;
for(let seed=1;seed<=4;seed++){H.Camera.reset();const r=H.Hd(seed,'harpoon');r.wave=wave;D.wave(r);const bot=swimmer(H,'mid-keep',seed);
 for(let t=0,prev=r.medium.kind;t<120*30;t++){r.hp=r.stats.maxHp;r.hurt=99;H.sw(r,bot(r));const k=r.medium.kind;if(prev==='air'&&k==='water')break;prev=k}
 // swim level to the right for 6 s, about 8 m down
 for(let i=0;i<120*6;i++){const m=r.medium;if(m.kind!=='water')break;const want=m.pos.y<-8?.15:-.15,d=Math.atan2(Math.sin(want-m.heading),Math.cos(want-m.heading)),turn=Math.abs(d)>.03?Math.sign(d):0;
  r.hp=r.stats.maxHp;r.hurt=99;H.sw(r,{turn,x:-turn,y:0,boost:false});
  if(i>120&&i%30===0){const V=H.Ovv(r),held=(r.pursuers||[]).filter(p=>!p.wet&&p.y>0);if(held.length<3)continue;
   const xs=held.map(p=>(p.x-V.x)/V.w);samples++;n+=held.length;edge+=xs.filter(x=>Math.abs(x)>.8).length;
   const mean=xs.reduce((a,b)=>a+b,0)/xs.length;spread+=Math.sqrt(xs.reduce((a,b)=>a+(b-mean)**2,0)/xs.length)}}}
const share=edge/Math.max(1,n);if(share>.1)fail++;console.log(share<=.1?'PASS':'FAIL','wave',wave,'| waiting enemies at the screen edge (outer 10% each side)',(edge/Math.max(1,n)*100).toFixed(0)+'%','| spread across the view (sd, 0.58 = even)',(spread/Math.max(1,samples)).toFixed(2))}
process.exit(fail ? 1 : 0);

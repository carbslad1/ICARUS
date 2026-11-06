const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const originalInput = fs.readFileSync(path.join(__dirname, 'carve-reference.html'),'utf8');
let input = fs.readFileSync(path.join(__dirname, 'carve-reference.html'), 'utf8');
// Enemy movement is source/enemies.js (docs/ENEMY_RULES.md): v3's steering block in the air step (ME) becomes one call,
// and v3's pursuer step (Orpq0) is replaced whole. The rest of ME (moving, the seabed, contact, culling) is kept.
const movementStart=input.lastIndexOf('function ME('),movementEnd=input.indexOf('function Pz(',movementStart);
if(movementStart<0||movementEnd<0)throw Error('Missing final enemy movement block');
let movement=input.slice(movementStart,movementEnd);
{const a=movement.indexOf('if(Sw0)s.velocity.y+='),b=movement.indexOf('if(!Qz.on&&Sw0)');
 if(a<0||b<a||movement.split('if(Sw0)s.velocity.y+=').length!==2)throw Error('Enemy steering anchor drift');
 movement=movement.slice(0,a)+'Enemies.air(r,t,s,o,i);'+movement.slice(b)}
input=input.slice(0,movementStart)+movement+input.slice(movementEnd);
{const a=input.lastIndexOf('function Orpq0('),b=input.indexOf('function Pq(',a);
 if(a<0||b<a)throw Error('Pursuer step anchor drift');
 input=input.slice(0,a)+'function Orpq0(r,e){Enemies.pursuers(r,e)}\n'+input.slice(b)}
// The flight guides draw the arc with the gravity setting (ai, Settings › Swimming › Gravity (hang time)), not a fixed 16.
for(const [old,now] of [['Math.hypot(vx,vy-16*w));let ax=bx+vx*w,ay=vy*w-8*w*w;','Math.hypot(vx,vy+ai*w));let ax=bx+vx*w,ay=vy*w+ai/2*w*w;'],
  ['Bv=d.vy+16*d.elapsed,Bt=Math.max(.01,Bv/8)','Bv=d.vy-ai*d.elapsed,Bt=Math.max(.01,Bv/(-ai/2))'],['Ba=Bv/16','Ba=Bv/(-ai)'],
  ['Math.hypot(d.vx,Bv-16*w))','Math.hypot(d.vx,Bv+ai*w))'],['A=this.sy(Bv*w-8*w*w)','A=this.sy(Bv*w+ai/2*w*w)'],['w=this.sy(Bv*Ba-8*Ba*Ba)','w=this.sy(Bv*Ba+ai/2*Ba*Ba)']]) {
  if(input.split(old).length!==2)throw Error('Guide gravity anchor drift: '+old);
  input=input.replace(old,now);
}
const anchor = '})();\n/*! Bundled license information:';
if (input.split(anchor).length !== 2) throw Error('Expected exactly one game-scope insertion point');
let html = input.replace(anchor, ['five-score.js','five-combat.js','score-cues.js','demo.js','enemies.js','space.js','danger.js','controls.js','camera.js','verbs.js','statuses.js','routine.js','tricks.js','flightlog.js','scoreboard.js','onboarding.js','shop.js','loadout.js','lab.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n') + '\n' + anchor);
html = html.replace(/icarus\.(?!scoreshow\.)/g, 'icarus.scoreshow.');
html = html.replace('<title>ICARUS v3 Carve</title>', '<title>ICARUS — Chips × Mult</title>');
html = html.replace('</head>', '<style>' + fs.readFileSync(path.join(__dirname, 'demo.css'), 'utf8') + '\n' + fs.readFileSync(path.join(__dirname,'scoreboard.css'),'utf8') + '\n' + fs.readFileSync(path.join(__dirname,'onboarding.css'),'utf8') + '\n' + fs.readFileSync(path.join(__dirname,'shop.css'),'utf8') + '</style></head>');
fs.writeFileSync(path.join(root, 'ICARUS-demo.html'), html);
fs.writeFileSync(path.join(root, 'build.json'), JSON.stringify({
  built: new Date().toISOString(), referenceSha256: crypto.createHash('sha256').update(originalInput).digest('hex'),
  outputSha256: crypto.createHash('sha256').update(html).digest('hex'),
  reference: 'source/carve-reference.html', output: 'ICARUS-demo.html'
}, null, 2));
console.log('Built ICARUS-demo.html');

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const originalInput = fs.readFileSync(path.join(__dirname, 'carve-reference.html'),'utf8');
let input = fs.readFileSync(path.join(__dirname, 'carve-reference.html'), 'utf8');
// Slow only desired enemy self-propulsion, preserving arena motion and shock impulses.
const slow = '*FiveCombat.movementScale(r,s)';
const movementStart=input.lastIndexOf('function ME('),movementEnd=input.indexOf('function Pz(',movementStart);
if(movementStart<0||movementEnd<0)throw Error('Missing final enemy movement block');
let movement=input.slice(movementStart,movementEnd);
for(const old of ['(s.kind==="swarmer"?25*Osp.small:19+r.wave*.13)*Osp.spd','Math.cos(s.age*1.2+s.seed)*1.5*Osp.spd','s.aim.x*48*Osp.spd','s.aim.y*48*Osp.spd','o.x/n*10*Osp.spd','o.y/n*10*Osp.spd']) {
  if(movement.split(old).length!==2)throw Error('Enemy speed anchor drift: '+old);
  movement=movement.replace(old,old+slow);
}
input=input.slice(0,movementStart)+movement+input.slice(movementEnd);
// Safe water contact preserves a pursuer instead of removing it as a touch kill.
const pursuerStart=input.lastIndexOf('function Orpq0('),pursuerEnd=input.indexOf('function Pq(',pursuerStart);
let pursuer=input.slice(pursuerStart,pursuerEnd);
const waterKill='if(U){touchKill(r,p);continue}';
if(pursuerStart<0||pursuer.split(waterKill).length!==2)throw Error('Pursuer contact anchor drift');
pursuer=pursuer.replace(waterKill,'if(U){K2.push(p);continue}');
input=input.slice(0,pursuerStart)+pursuer+input.slice(pursuerEnd);
// The flight guides draw the arc with the gravity setting (ai, Settings › Swimming › Gravity (hang time)), not a fixed 16.
for(const [old,now] of [['Math.hypot(vx,vy-16*w));let ax=bx+vx*w,ay=vy*w-8*w*w;','Math.hypot(vx,vy+ai*w));let ax=bx+vx*w,ay=vy*w+ai/2*w*w;'],
  ['Bv=d.vy+16*d.elapsed,Bt=Math.max(.01,Bv/8)','Bv=d.vy-ai*d.elapsed,Bt=Math.max(.01,Bv/(-ai/2))'],['Ba=Bv/16','Ba=Bv/(-ai)'],
  ['Math.hypot(d.vx,Bv-16*w))','Math.hypot(d.vx,Bv+ai*w))'],['A=this.sy(Bv*w-8*w*w)','A=this.sy(Bv*w+ai/2*w*w)'],['w=this.sy(Bv*Ba-8*Ba*Ba)','w=this.sy(Bv*Ba+ai/2*Ba*Ba)']]) {
  if(input.split(old).length!==2)throw Error('Guide gravity anchor drift: '+old);
  input=input.replace(old,now);
}
const anchor = '})();\n/*! Bundled license information:';
if (input.split(anchor).length !== 2) throw Error('Expected exactly one game-scope insertion point');
let html = input.replace(anchor, ['five-score.js','five-combat.js','score-cues.js','demo.js','space.js','danger.js','controls.js','camera.js','verbs.js','movement.js','statuses.js','routine.js','tricks.js','flightlog.js','scoreboard.js','onboarding.js','shop.js','loadout.js','lab.js'].map(f=>fs.readFileSync(path.join(__dirname,f),'utf8')).join('\n') + '\n' + anchor);
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

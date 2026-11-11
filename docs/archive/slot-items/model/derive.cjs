// Derived per-wave numbers from model.json: the air clock, flights and breaches per wave, wall time, regimes.
const j=require('./model.json'),R=j.res,get=(w,a,s)=>R.find(r=>r.wave===w&&r.angle===a&&r.style===s);
const clock=w=>w===20?90:Math.min(60,20+5*(w-1)), g=15;
const A=[2,5,10,20,30,45,60,75,89];
console.log('clock',[1,3,5,7,9,10,15,19,20].map(w=>w+':'+clock(w)).join(' '));
console.log('\nflights per wave (hold) = clock / air');console.log('w\\a\t'+A.join('\t'));
for(const w of [1,3,5,10,15,20])console.log(w+'\t'+A.map(a=>Math.ceil(clock(w)/get(w,a,"hold").air)).join('\t'));
console.log('\nwall seconds per wave (hold) = clock + flights x water time');
for(const w of [1,3,5,10,15,20])console.log(w+'\t'+A.map(a=>{const o=get(w,a,'hold');return (clock(w)+Math.ceil(clock(w)/o.air)*o.waterTime).toFixed(0)}).join('\t'));
console.log('\nair seconds per wave below 20 m (hold) = clock x share below 20');
for(const w of [1,3,5,10,15,20])console.log(w+'\t'+A.map(a=>(clock(w)*get(w,a,'hold').below[20]).toFixed(0)).join('\t'));
console.log('\nhop regime: largest angle whose flight a held S cuts under 1 s, per wave');
for(const w of [1,3,5,7,10,13,16,20]){const ok=A.concat([15,25,35,40,50,55]).sort((a,b)=>a-b).filter(a=>{const o=get(w,a,'down');return o&&o.air<1});const hold=get(w,Math.max(...ok),'hold');console.log(w,'v',j.launchSpeed[w-1],'max angle',Math.max(...ok),'peak there',hold&&hold.peak,'analytic sin^-1(sqrt(2g*25)/v)',(Math.asin(Math.min(1,Math.sqrt(2*g*25)/j.launchSpeed[w-1]))*180/Math.PI).toFixed(0))}
let worst=0;for(const o of R.filter(r=>r.style==='hold')){const v=j.launchSpeed[o.wave-1],vy=v*Math.sin(o.angle*Math.PI/180),air=2*vy/g,pk=vy*vy/2/g;worst=Math.max(worst,Math.abs(air-o.air)/Math.max(.2,air),Math.abs(pk-o.peak)/Math.max(1,pk))}
console.log('\nmax relative error of air=2vy/g, peak=vy^2/2g against the engine (hold):',worst.toFixed(3));
console.log('\nflights per wave holding UP the whole flight (ceil)');console.log('w\\a\t'+A.join('\t'));
for(const w of [1,5,10,20])console.log(w+'\t'+A.map(a=>Math.ceil(clock(w)/get(w,a,'up').air)).join('\t'));
console.log('\nwater time (this swim strategy) by wave, 5/30/60/89 deg');for(const w of [1,5,10,20])console.log(w+'\t'+[5,30,60,89].map(a=>get(w,a,'hold').waterTime).join('\t'));

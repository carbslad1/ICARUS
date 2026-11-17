// Pearl income per wave on the real game, beside Brotato's gold per wave.
//   node qa/income.cjs [--seed=81855343] [--waves=6] [--style=mid-keep] [--nochase] [--tune='{"feed":1}']
// The test bot (qa/bot.cjs) flies and cannot die; in each shop it buys every weapon it can afford and combines pairs.
// --nochase stops it steering for pearls, so only pearls it happens to pass are collected.
// Brotato: medians of 24 winning Run Tracker runs, "Gold that wave"
// (~/Projects/Dolphin game/brotato-reference/map/tracker-runs-2026-11-10.md, section 1).
'use strict';
const path = require('path');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const NOCHASE = process.argv.includes('--nochase');
const { load } = require('./load.cjs');
const bot = require('./bot.cjs');
const BROTATO_GOLD = [28, 46, 70, 99, 130, 170, 222, 233, 426, 400];
const G = load(path.join(__dirname, '..', 'ICARUS-demo.html'), new Map([['icarus.scoreshow.tune', arg('tune', '{}')]]), { bake: true, modern: true }), D = G.DEMO;
const r = G.Hd(+arg('seed', 81855343)), WAVES = +arg('waves', 6);
// --nochase: the bot reads pearls from the state it is handed; give it a view with none
const fly0 = bot.flyer(G, arg('style', 'mid-keep'), 5, { keep: 8 }), fly = NOCHASE ? s => fly0(new Proxy(s, { get: (o, k) => k === 'eorbs' ? [] : o[k] })) : fly0;
let t = 0, earned0 = r.earned || 0, kills0 = 0; const rows = [];
while (t < 120 * 60 * 20 && r.wave <= WAVES && ['playing', 'shop'].includes(r.mode)) {
  if (r.mode === 'shop') {
    rows.push({ wave: r.wave, kills: r.kills - kills0, earned: (r.earned || 0) - earned0, brotato: BROTATO_GOLD[r.wave - 1], held: r.xp, bag: r.bag || 0, guns: r.slots.length });
    earned0 = r.earned || 0; kills0 = r.kills;
    for (let i = 0; r.lvup && i < 30; i++) D.command(r, 'level', 0);
    for (const o of r.demo.offers) if (o.row === 'weapon' && !o.bought && o.price <= r.xp) D.command(r, 'buy', o.uid);
    for (let i = 0; i < r.slots.length; i++) D.command(r, 'combine', i);
    D.command(r, 'next'); continue;
  }
  r.hp = 1e9; const it = fly(r); if (r.medium.kind === 'air' && r.budget <= 0) it.y = -1; G.sw(r, it); t++;
}
console.log(`pearl income per wave (${NOCHASE ? 'bot does not chase pearls' : 'bot chases pearls'}, tune ${arg('tune', '{}')})`);
console.log('wave  kills  earned  Brotato gold  held at shop  bag  guns');
for (const x of rows) console.log(`${String(x.wave).padStart(4)} ${String(x.kills).padStart(6)} ${String(x.earned).padStart(7)} ${String(x.brotato).padStart(13)} ${String(x.held).padStart(13)} ${String(x.bag).padStart(4)} ${String(x.guns).padStart(5)}`);

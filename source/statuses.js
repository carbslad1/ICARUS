// Steps 7 and 8 of the build-and-playtest plan (ICARUS_DESIGN.md §4.5, §4.16 E, §4.20). Designer's answers, 2026-10-30.
// Step 7, statuses (each changes where enemies go or what they become):
// - Soaked (from Spout): 6 s; the enemy sinks toward the surface and may now be driven into the water.
// - Shock (from Arc): jumps through the cluster, enemy to enemy within 5 m (up to 6 jumps), 30% of the hit each.
// - Chill (from Depth charge): three stacks within 3 s freeze the enemy solid for 2 s. A frozen enemy stops, deals no
//   contact damage and is a block other enemies bounce off.
// - Reactions: Conduct (Shock on a soaked enemy runs through every soaked enemy, 50% each); Flash-freeze (chill on a
//   soaked enemy freezes it at once); Shatter (any gun hit, or a water trick, on a frozen enemy breaks it in a 4 m
//   blast, the frozen one taking double).
// Step 8, sides and hard surfaces:
// - From wave 3 some enemies have an armoured body (DEMO.tune.sides): a Shielder is exposed only from behind, a Turtle
//   only from below, a Spiker only from above (and touching a Spiker other than from above hurts double). Hits from an
//   armoured side do 20%. Area effects (shock, mines, splashes, blasts, drowning) ignore sides.
// - Drowning: a soaked or knocked enemy driven down into the water takes a drowning hit (4× the water base: heavy).
// - No impacts: pushed enemies do not damage each other (designer, 2026-10-30: in the air only the guns do damage).
// - Kills carry the side they came from and the surface involved (h.kills[].side, .surface); reactions are counted per
//   flight (h.reactions). Only with the step 4 rules on, like the routine.
var Status = (() => {
  const P = Object.freeze({
    soakT: 6, sink: 15,                    // s; m/s² downward (8 was mostly undone by the chase steering)
    shockR: 5, shockJumps: 6, shockShare: .3, conductShare: .5,
    chillN: 3, chillT: 3, frozenT: 2,      // stacks to freeze; s a stack lasts; s frozen
    shatterR: 4, shatterShare: .6,         // m; share of a payoff dealt to the others
    armour: .2,                            // damage share through an armoured side
    drown: 4,                              // × the water base
    sideFrom: 3, sideOdds: { shielder: .1, turtle: .08, spiker: .07 }
  });
  const AREA = new Set(['shock', 'conduct', 'shatter', 'drown', 'spout', 'undertow']);
  const shatters = w => w in DEMO.weapons || ['shock', 'conduct', 'stomp', 'ram'].includes(w) || (typeof Routine !== 'undefined' && Routine.TRICKS[w]?.kind === 'water');
  const on = r => !!(DEMO.tune.rules && r?.demo);
  const st = e => e.st || (e.st = { soaked: 0, shock: 0, chill: 0, chillT: 0, frozen: 0 });
  const payoff = r => typeof Routine !== 'undefined' ? Routine.P.base * (r.stats.damage || 1) * (1 + Routine.P.perWave * (r.wave - 1)) : 30;
  const react = (r, k) => { const h = r.hand; if (h) (h.reactions || (h.reactions = {}))[k] = (h.reactions[k] || 0) + 1 };
  const hurt = (r, e, amount, weapon) => DEMO.damage(r, e, amount, weapon, 0, 0, 0, false, { primary: false, weapon, base: amount });

  function soak(e) { st(e).soaked = P.soakT; e.floor = Math.min(e.floor ?? 0, 0) }
  function freeze(e) { const s = st(e); s.frozen = P.frozenT; s.chill = 0; e.velocity = { x: 0, y: 0 }; e.frozenAt = { ...e.pos } }

  // which side the dolphin is on, seen from the enemy, and whether that side is exposed
  function side(r, e) {
    const me = r.medium.local, dx = me.x - e.pos.x, dy = me.y - e.pos.y;
    if (e.armour === 'turtle') return dy < -1 ? 'below' : 'armoured';
    if (e.armour === 'spiker') return dy > 1 ? 'above' : 'armoured';
    if (e.armour === 'shielder') { const v = e.velocity, n = Math.hypot(v.x, v.y); if (n < 1) return 'armoured'; return (dx * v.x + dy * v.y) / (n * (Math.hypot(dx, dy) || 1)) < -.2 ? 'behind' : 'armoured' }
    return Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? 'above' : 'below') : 'level';
  }

  // FiveCombat.beforeDamage: armour and frozen
  function before(r, e, amount, ctx) {
    if (!on(r) || r.medium?.kind !== 'air') return amount;
    const w = ctx?.weapon;
    if (e.armour && DEMO.tune.sides && !AREA.has(w) && side(r, e) === 'armoured') amount *= P.armour;
    return amount;
  }
  // FiveCombat.afterDamage: statuses, reactions, shatter, the kill's side and surface, Bounty
  function after(r, e, ctx) {
    if (!on(r) || r.medium?.kind !== 'air') return;
    const w = ctx?.weapon, s = st(e);
    if (ctx?.killed) {
      const k = r.hand?.kills?.at(-1);
      if (k && !k.side) { k.side = AREA.has(w) ? 'area' : side(r, e); k.surface = w === 'drown' ? 'water' : null; k.armour = e.armour || null; k.weapon = w; k.placed = !!(e.affected && e.affected.n === r.hand?.n) }
      if (typeof Routine !== 'undefined') Routine.killed(r, e, w);
    }
    if (s.frozen > 0 && shatters(w) && !e.shattered) shatter(r, e);
    if (ctx?.killed || e.hp <= 0) return;
    if (w === 'arc') shock(r, e, ctx.amount || 0);
    if (w === 'depth') chill(r, e);
  }
  // a chill stack (Depth charge, Frost wake): three freeze; on a soaked enemy one freezes at once (Flash-freeze)
  function chill(r, e) { const s = st(e); if (s.frozen > 0) return; if (s.soaked > 0) { freeze(e); react(r, 'flashFreeze') } else { s.chill++; s.chillT = P.chillT; if (s.chill >= P.chillN) freeze(e) } }
  // Shock: through the cluster; Conduct: through every soaked enemy
  function shock(r, e, amount) {
    const s = st(e), seen = new Set([e.id]); s.shock = 1;
    if (s.soaked > 0) {
      react(r, 'conduct');
      for (const o of r.enemies.filter(o => o.id !== e.id && o.hp > 0 && st(o).soaked > 0)) { seen.add(o.id); st(o).shock = 1; hurt(r, o, amount * P.conductShare, 'conduct') }
    }
    let from = e;
    for (let j = 0; j < P.shockJumps; j++) {
      const next = r.enemies.filter(o => o.hp > 0 && !seen.has(o.id) && Math.hypot(o.pos.x - from.pos.x, o.pos.y - from.pos.y) < P.shockR + (o.radius || 1)).sort((a, b) => Math.hypot(a.pos.x - from.pos.x, a.pos.y - from.pos.y) - Math.hypot(b.pos.x - from.pos.x, b.pos.y - from.pos.y))[0];
      if (!next) break; seen.add(next.id); st(next).shock = 1; hurt(r, next, amount * P.shockShare, 'shock'); from = next;
    }
  }
  function shatter(r, e) {
    e.shattered = true; st(e).frozen = 0; react(r, 'shatter');
    const dmg = payoff(r);
    for (const o of r.enemies.filter(o => o.id !== e.id && o.hp > 0 && Math.hypot(o.pos.x - e.pos.x, o.pos.y - e.pos.y) < P.shatterR + (o.radius || 1))) hurt(r, o, dmg * P.shatterShare, 'shatter');
    if (e.hp > 0) hurt(r, e, dmg * 2, 'shatter');
    const o = r.medium.origin; (r.trickFx || (r.trickFx = [])).push({ kind: 'burst', x: o.x + e.pos.x, y: o.y + e.pos.y, R: P.shatterR, t: .35, life: .35 });
  }

  // around v3's enemy step: frozen blocks sit it out; then sinking, timers and drowning
  function beforeStep(r, m) {
    r.frozenOut = r.enemies.filter(e => e.st?.frozen > 0); if (r.frozenOut.length) r.enemies = r.enemies.filter(e => !(e.st?.frozen > 0));
    // touching a Spiker other than from above hurts double (DEMO.hit reads r.spikeMul during this step)
    const me = m.local; r.spikeMul = DEMO.tune.sides && r.enemies.some(e => e.armour === 'spiker' && Math.hypot(e.pos.x - me.x, e.pos.y - me.y) < e.radius + 1 && me.y < e.pos.y + e.radius * .5) ? 2 : 1;
  }
  function afterStep(r, m, dt) {
    if (r.frozenOut?.length) { r.enemies = r.enemies.concat(r.frozenOut.filter(e => !r.enemies.includes(e))); r.frozenOut = null }
    r.spikeMul = 1;
    const dead = new Set();
    for (const e of r.enemies) {
      const s = e.st; if (e.knockT > 0) e.knockT -= dt;
      if (!s) continue;
      if (s.soaked > 0) { s.soaked -= dt; e.velocity.y -= P.sink * dt }
      if (s.shock > 0) s.shock -= dt;
      if (s.chillT > 0 && (s.chillT -= dt) <= 0) s.chill = 0;
      if (s.frozen > 0) { s.frozen -= dt; e.velocity = { x: 0, y: 0 }; if (e.frozenAt) e.pos = ye(e.frozenAt.x, e.frozenAt.y) }
    }
    const D = payoff(r);
    for (const e of [...r.enemies]) {
      if (dead.has(e) || e.hp <= 0) continue;
      // drowning: a soaked or knocked enemy driven down into the water
      const y = m.origin.y + e.pos.y;
      if ((e.st?.soaked > 0 || e.knockT > 0) && y < e.radius + .4 && e.velocity.y + m.vy < -3 && !(e.st?.frozen > 0)) { react(r, 'drown'); hurt(r, e, D * P.drown, 'drown'); if (e.hp <= 0) dead.add(e); continue }
    }
  }

  // armour at spawn: from wave 3, a share of ordinary enemies get a body
  function arm(r, e) {
    if (!DEMO.tune.sides || r.wave < P.sideFrom || e.role || e.boss || e.armour !== undefined) return;
    let q = ce(r); e.armour = null;
    for (const [k, p] of Object.entries(P.sideOdds)) { if (q < p) { e.armour = k; break } q -= p }
  }

  // markers: statuses as rings, armour as the side it covers
  function draw(R, r, m) {
    const G = R.telegraphs, o = m.origin;
    for (const e of r.enemies) {
      const s = e.st; if (!s && !e.armour) continue;
      const X = R.sx(o.x + e.pos.x), Y = R.sy(o.y + e.pos.y), ppm = Math.abs(R.sx(o.x + e.pos.x + 1) - X), rr = (e.radius + .5) * ppm;
      if (s?.soaked > 0) G.circle(X, Y, rr).stroke({ color: 0x4aa8ff, width: 2, alpha: .8 });
      if (s?.shock > 0) G.circle(X, Y, rr + 3).stroke({ color: yt.amber, width: 2, alpha: .9 });
      if (s?.frozen > 0) G.rect(X - rr, Y - rr, rr * 2, rr * 2).fill({ color: 0xdff6ff, alpha: .35 }).stroke({ color: yt.white, width: 2.5, alpha: .95 });
      else if (s?.chill > 0) G.circle(X, Y, rr + 1.5).stroke({ color: yt.white, width: 1 + s.chill, alpha: .6 });
      if (e.armour === 'turtle') G.moveTo(X - rr, Y - rr * .2).lineTo(X + rr, Y - rr * .2).stroke({ color: yt.white, width: 4, alpha: .8 });
      if (e.armour === 'spiker') for (const dx of [-.6, 0, .6]) G.moveTo(X + dx * rr - 4, Y + rr * .6).lineTo(X + dx * rr, Y + rr * 1.3).lineTo(X + dx * rr + 4, Y + rr * .6).stroke({ color: yt.hostile, width: 2, alpha: .9 });
      if (e.armour === 'shielder') { const v = e.velocity, n = Math.hypot(v.x, v.y) || 1, a = Math.atan2(-v.y / n, v.x / n); G.arc(X, Y, rr + 4, a - .9, a + .9).stroke({ color: yt.white, width: 4, alpha: .85 }) }
    }
  }
  return { P, on, st, soak, freeze, chill, side, before, after, shock, shatter, beforeStep, afterStep, arm, draw };
})();
{const b0=FiveCombat.beforeDamage;FiveCombat.beforeDamage=function(r,e,a,ctx){return Status.before(r,e,b0.call(FiveCombat,r,e,a,ctx),ctx)}}
{const a0=FiveCombat.afterDamage;FiveCombat.afterDamage=function(r,e,ctx){a0.call(FiveCombat,r,e,ctx);Status.after(r,e,ctx)}}
{const me0=ME;ME=function(r,t,e,i){const on=Status.on(r)&&t?.kind==='air'&&i>0;if(on)Status.beforeStep(r,t);try{me0(r,t,e,i)}finally{if(on)Status.afterStep(r,t,i)}}}
{const hit0=DEMO.hit;DEMO.hit=function(r,a){return hit0(r,a*(r.spikeMul||1))}}
{const sp0=Ospw;Ospw=function(r,t,...a){const n=r.enemies.length;sp0(r,t,...a);if(Status.on(r))for(const e of r.enemies.slice(n))Status.arm(r,e)}}
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&m?.kind==='air'&&Status.on(r))Status.draw(R,r,m)}}

// The four tricks (ICARUS_DESIGN.md §4.3-4.4; step 2 of §4.17). Designer, 2026-10-30, with numbers 2026-10-31.
// - Performed, as in the crane-game build with forward-only swimming off (designer, 2026-10-31): the keys you hold as you
//   breach are the flight's trick. The turn key toward the way you are travelling (a forward rotation) is a Front flip,
//   the one away from it (a backward rotation) a Backflip, W a Corkscrew, S a Belly flop. Hold nothing for no trick.
//   Singles only in this step (no combos): of the keys held, the one pressed last. Keys in the air only move you.
// - Like the crane build, a flip turns the body over and over for the whole flight and a corkscrew keeps rolling.
// - A trick never deals damage. It boosts its weapon type's damage for the flight (+30%; a weapon with two tags gets
//   the boost if either tag matches) and does one thing at its moment:
//   D Front flip (melee, breach): Charge, invulnerable for 1 s from the breach, shoving aside enemies you touch.
//     No launch speed change: the launch speed is a locked rule (designer, 2026-10-31).
//   A Backflip (ranged, breach): Repulse, enemies within 12 m are pushed away.
//   W Corkscrew (elemental, apex): Time slow, enemies and their shots move at half speed for 1.5 s. Enemies only:
//     the world, the dolphin and the guns keep their speed (no slow-motion, designer rule).
//   S Belly flop (economy, water entry): Shockwave, enemies within 10 m of the landing are knocked back; this flight's
//     XP orbs are worth ×1.5 and its splashdown pearls ×1.5.
// - Behind DEMO.tune.tricks, with the step 4 rules; it replaces the routine (source/routine.js) in normal play.
// P is live: the Trick Lab's sliders change these numbers while you play; DEFAULTS keeps the originals.
var Tricks = (() => {
  const P = {
    boost: .3,                                   // damage added to the trick's weapon type for the flight
    chargeT: 1, chargeR: 2.5, chargePush: 30,    // s invulnerable from the breach; m around you it shoves; m/s
    repulseR: 12, repulseV: 40, repulseT: .3,    // m; m/s outward; s it pushes for (catches enemies recalled at the breach)
    slowT: 1.5, slow: .5,                        // s from the apex; enemies and their shots move at this share of speed
    shockR: 10, shockV: 30,                      // m around the landing point; m/s outward
    flopX: 1.5,                                  // Belly flop flight: XP orbs and splashdown pearls ×
    flopFlat: 12                                 // m above the water over which the belly flop flattens the body
  };
  const DEFAULTS = Object.freeze({ ...P });
  const TRICKS = Object.freeze({
    front: { name: 'Front flip', key: 'toward', type: 'melee', moment: 'breach', ability: 'Charge', glyph: '↻', text: 'Invulnerable for 1 s from the breach, shoving aside enemies you touch.' },
    back: { name: 'Backflip', key: 'away', type: 'ranged', moment: 'breach', ability: 'Repulse', glyph: '↺', text: 'At the breach, enemies within 12 m are pushed away.' },
    cork: { name: 'Corkscrew', key: 'w', type: 'elemental', moment: 'apex', ability: 'Time slow', glyph: '⟳', text: 'At the apex, enemies and their shots move at half speed for 1.5 s.' },
    flop: { name: 'Belly flop', key: 's', type: 'economy', moment: 'entry', ability: 'Shockwave', glyph: '⤓', text: 'At water entry, enemies within 10 m are knocked back. XP orbs and pearls ×1.5 this flight.' }
  });
  const IDS = Object.keys(TRICKS);
  // weapon type tags (design doc §4.6); melee and ranged never share a weapon
  const TAGS = Object.freeze({ fin: ['melee'], sonic: ['melee'], minigun: ['ranged'], laser: ['ranged'], rocket: ['ranged'], arc: ['melee', 'elemental'], flak: ['ranged', 'elemental'], harpoon: ['ranged', 'economy'], depth: ['elemental', 'economy'] });
  const on = r => !!(DEMO.tune.tricks && DEMO.tune.rules && r?.demo);
  const unit = (x, y) => { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n } };

  // the keys held under water, in the order they were pressed (called each water step with the step's input)
  function input(r, t) {
    const K = { right: t.x > .5, left: t.x < -.5, up: t.y > .5, down: t.y < -.5 }, q = r.tkKeys || (r.tkKeys = { order: [], prev: {} });
    for (const k in K) { if (K[k] && !q.prev[k]) q.order = q.order.filter(x => x !== k).concat(k); if (!K[k]) q.order = q.order.filter(x => x !== k) }
    q.prev = K;
  }
  // the trick the held keys make, for travel in direction dir (+1 right, -1 left): the last key pressed that is held
  function held(r, dir) {
    const k = r.tkKeys?.order.at(-1); if (!k) return null;
    return k === 'up' ? 'cork' : k === 'down' ? 'flop' : (k === 'right') === (dir >= 0) ? 'front' : 'back';
  }
  const travel = r => { const m = r.medium; return Math.sign(m.kind === 'air' ? m.vx : m.velocity?.x) || 1 };
  // the harness and tests can fix a flight's trick (r.demo.trickForce: an id, or null for none)
  const chosen = r => r.demo?.trickForce !== undefined ? r.demo.trickForce : held(r, travel(r));
  const flying = r => r.hand?.tk?.id || null;           // this flight's trick, fixed at the breach
  function boostFor(r, weapon) {
    const id = flying(r); if (!id || r.lab?.off) return 1;
    return (TAGS[weapon] || []).includes(TRICKS[id].type) ? 1 + P.boost : 1;
  }

  // the breach: the flight takes the chosen trick
  function open(r) {
    const id = r.lab?.off ? null : chosen(r);
    r.hand.tk = { id, touched: 0, boosted: 0 };
    if (id === 'front') r.chargeT = P.chargeT;
    if (id === 'back') { r.repulseT = P.repulseT; fx(r, 'ring', P.repulseR, .4) }
    if (id === 'flop') r.hand.pearlX = P.flopX;
    r.slowT = 0;
  }
  const touch = (r, e) => { if (!e.tkn || e.tkn !== r.hand.n) { e.tkn = r.hand.n; r.hand.tk.touched++ } };
  function fx(r, kind, R, life) { const me = r.medium.local; (r.trickFx || (r.trickFx = [])).push({ kind, lx: me.x, ly: me.y, R, t: life, life }) }

  // each air step, after the enemy step: Charge's shove, Repulse's push, the apex starting Time slow
  function step(r, m, dt) {
    const h = r.hand; if (!h?.tk) return;
    const me = m.local;
    if (r.chargeT > 0) {
      r.chargeT -= dt;
      for (const e of r.enemies) { if (e.hp <= 0) continue; const dx = e.pos.x - me.x, dy = e.pos.y - me.y; if (Math.hypot(dx, dy) > P.chargeR + (e.radius || 1)) continue; const u = unit(dx, dy); e.velocity = { x: u.x * P.chargePush, y: u.y * P.chargePush }; e.knockT = .2; touch(r, e) }
    }
    if (r.repulseT > 0) {
      r.repulseT -= dt;
      for (const e of r.enemies) { if (e.hp <= 0) continue; const dx = e.pos.x - me.x, dy = e.pos.y - me.y; if (Math.hypot(dx, dy) > P.repulseR + (e.radius || 1)) continue; const u = unit(dx, dy); e.velocity = { x: u.x * P.repulseV, y: u.y * P.repulseV }; e.knockT = .25; touch(r, e) }
    }
    if (h.tk.id === 'cork' && h.apex && !h.tk.slowed) { h.tk.slowed = true; r.slowT = P.slowT; fx(r, 'ring', 30, .5); for (const e of r.enemies) if (e.hp > 0) touch(r, e) }
  }
  // water entry, before the enemies become pursuers: Belly flop marks the enemies its shockwave will throw
  function entry(r) {
    const h = r.hand, m = r.medium; if (h?.tk?.id !== 'flop' || m?.kind !== 'air') return;
    const me = m.local, ids = new Set();
    for (const e of r.enemies) if (e.hp > 0 && Math.hypot(e.pos.x - me.x, e.pos.y - me.y) <= P.shockR + (e.radius || 1)) { ids.add(e.id); touch(r, e) }
    r.shock = { x: m.origin.x + me.x, y: m.origin.y + me.y, ids };
    (r.trickFx || (r.trickFx = [])).push({ kind: 'splash', x: r.shock.x, y: m.origin.y + me.y, R: P.shockR, t: .5, life: .5 });
  }
  // the first water step: the marked pursuers head away from the landing point at the shockwave's speed
  function shockwave(r) {
    const S = r.shock; r.shock = null; if (!S) return;
    for (const p of r.pursuers || []) if (S.ids.has(p.id)) { p.h = Math.atan2(p.y - S.y, p.x - S.x); p.v = P.shockV }
  }

  // the arena origin the renderer draws this frame: between the last two steps, as the engine draws the arena
  // (draw(S, as, ke/Ar)); drawing at the latest step's origin makes things jitter against everything else
  function seen(m) {
    if (typeof as === 'undefined' || !as?.origin || typeof ke === 'undefined') return m.origin;
    const k = Math.max(0, Math.min(1, ke / Ar)); return { x: as.origin.x + (m.origin.x - as.origin.x) * k, y: as.origin.y + (m.origin.y - as.origin.y) * k };
  }
  // the dolphin's tricks, through v3's own animation as the crane-game build played them (its Otdraw): a flip turns
  // the body over and over for the whole flight (R.rollOffset, one turn every Otk.flip s); a corkscrew keeps rolling
  // through the sprite's roll frames (R.odC, one roll every Otk.cork s); the belly flop flattens the body over the
  // last P.flopFlat m above the water, so it slaps down flat
  const smooth = p => p * p * (3 - 2 * p);
  function animate(R, r) {
    const m = r.medium, h = r.hand, id = h?.tk?.id; if (m?.kind !== 'air' || !id) return;
    const dir = (m.vx || 0) < 0 ? -1 : 1;
    if (id === 'front' || id === 'back') R.rollOffset = (id === 'back' ? 1 : -1) * dir * m.elapsed / Otk.flip * Math.PI * 2;
    if (id === 'cork') R.odC = Math.max(R.odC || 0, 30);
    if (id === 'flop' && m.vy < 0) {
      const alt = m.origin.y + m.local.y, k = smooth(Math.max(0, Math.min(1, 1 - alt / P.flopFlat))), d = (dir > 0 ? 0 : Math.PI) - R.pathAngle;
      R.rollOffset = Math.atan2(Math.sin(d), Math.cos(d)) * k;
    }
  }

  // drawing on the telegraph layer: Charge's shell round the dolphin and Time slow's rings on the slowed enemies
  function draw(R, r) {
    const m = r.medium; if (m?.kind !== 'air') return;
    const G = R.telegraphs, o = seen(m), X = v => R.sx(o.x + v), Y = v => R.sy(o.y + v), ppm = Math.abs(R.sx(o.x + 1) - R.sx(o.x));
    if (r.chargeT > 0) G.circle(X(m.local.x), Y(m.local.y), P.chargeR * ppm).stroke({ color: yt.amber, width: 3, alpha: .5 + .4 * Math.min(1, r.chargeT * 2) });
    if (r.slowT > 0) for (const e of r.enemies) if (e.hp > 0) G.circle(X(e.pos.x), Y(e.pos.y), (e.radius + .6) * ppm).stroke({ color: 0xb48cff, width: 2, alpha: .75 });
  }

  // the HUD: under water, the four tricks with their keys for the way you are going now, the one you would breach
  // with lit; in the air, the flight's trick
  function hud(r, title) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('trick-pick');
    const show = !title && on(r) && r.mode === 'playing' && (typeof ft === 'undefined' || ft === 'game');
    if (!show) { if (el) el.hidden = true; return }
    if (!el) { el = document.createElement('div'); el.id = 'trick-pick'; document.body.appendChild(el) }
    const air = r.medium?.kind === 'air', pick = air ? flying(r) : r.lab?.off ? null : chosen(r), dir = travel(r), sig = (air ? 'a' : 'w') + (pick || '-') + dir + (r.lab?.off ? 'x' : '');
    const key = id => id === 'cork' ? 'W' : id === 'flop' ? 'S' : (id === 'front') === (dir > 0) ? 'D' : 'A';
    el.hidden = false; if (el.dataset.sig === sig) return; el.dataset.sig = sig; el.classList.toggle('in-air', air);
    if (air) { el.innerHTML = pick ? `<span class="tp-key on"><b>${TRICKS[pick].glyph} ${TRICKS[pick].name}</b><small>+${Math.round(P.boost * 100)}% ${TRICKS[pick].type}</small></span>` : ''; el.hidden = !pick; return }
    el.innerHTML = `<small class="tp-hint">Hold as you breach</small>` + ['cork', dir > 0 ? 'back' : 'front', 'flop', dir > 0 ? 'front' : 'back'].map(id => { const T = TRICKS[id]; return `<span class="tp-key${id === pick ? ' on' : ''}"><kbd>${key(id)}</kbd><b>${T.name}</b><small>${T.type} · ${T.ability}</small></span>` }).join('');
  }

  return { P, DEFAULTS, TRICKS, IDS, TAGS, on, input, held, chosen, flying, boostFor, open, step, entry, shockwave, animate, draw, hud };
})();
// the breach: DEMO.open opens the flight's hand
{const open0=DEMO.open;DEMO.open=function(r){open0(r);if(Tricks.on(r))Tricks.open(r)}}
// the boost: the trick's weapon type deals more damage this flight
{const b0=FiveCombat.beforeDamage;FiveCombat.beforeDamage=function(r,e,a,ctx){a=b0.call(FiveCombat,r,e,a,ctx);if(!Tricks.on(r))return a;const k=Tricks.boostFor(r,ctx?.weapon);if(k!==1&&r.hand?.tk)r.hand.tk.boosted+=a*(k-1);return a*k}}
// Charge: no damage while it lasts
{const hit0=DEMO.hit;DEMO.hit=function(r,a){if(Tricks.on(r)&&r.chargeT>0&&r.medium?.kind==='air')return;return hit0(r,a)}}
// the enemy step: Time slow runs it at a share of the time (enemies, their shots and their timers), while the spawn
// schedule keeps the full time; then Charge, Repulse and the apex
{const me0=ME;ME=function(r,t,e,i){
  if(!(Tricks.on(r)&&t?.kind==='air'&&i>0))return me0(r,t,e,i);
  if(r.slowT>0){const k=Tricks.P.slow;r.slowT-=i;Obs(r,t,i*(1-k));me0(r,t,e,i*k)}else me0(r,t,e,i);
  if(r.mode==='playing')Tricks.step(r,t,i)}}
// water entry: Belly flop marks its shockwave before the splashdown banks; its pearls are paid by style() (h.pearlX)
{const bank0=DEMO.bank;DEMO.bank=function(r){if(Tricks.on(r))Tricks.entry(r);return bank0(r)}}
{const pq0=Pq;Pq=function(r,e){if(r?.shock&&r.medium?.kind==='water')Tricks.shockwave(r);return pq0(r,e)}}
// Belly flop: this flight's XP orbs are worth more
{const drop0=Oxedrop;Oxedrop=function(r,t,e){const L=r.eorbs||(r.eorbs=[]),n=L.length;drop0(r,t,e);if(Tricks.on(r)&&r.hand?.tk?.id==='flop'&&L.length>n)L.at(-1).m*=Tricks.P.flopX}}
// the keys held under water, read from each water step's input (so bots and replays perform tricks the same way)
{const il0=Il;Il=function(r,t,e,i){if(t&&Tricks.on(r)&&r.medium?.kind==='water')Tricks.input(r,t);return il0(r,t,e,i)}}
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&Tricks.on(r)){Tricks.animate(R,r);Tricks.draw(R,r)}Tricks.hud(r,title)}}
// the pause stops the drawing, so the HUD hides itself there (the next frame after resuming shows it again)
{const ls0=ls;ls=function(){ls0();const el=typeof document!=='undefined'&&document.getElementById('trick-pick');if(el)el.hidden=true}}
{if(typeof document!=='undefined'&&document.head){const st=document.createElement('style');st.textContent=`
#trick-pick{position:fixed;left:50%;bottom:132px;transform:translateX(-50%);z-index:30;display:flex;gap:8px;align-items:flex-end;pointer-events:none;font:12px/1.3 var(--mono,monospace);color:#cfe7e8}
#trick-pick[hidden]{display:none!important}
#trick-pick .tp-hint{position:absolute;left:50%;bottom:calc(100% + 4px);transform:translateX(-50%);white-space:nowrap;color:#89ffe0aa;letter-spacing:.08em;text-transform:uppercase;font-size:10px}
#trick-pick .tp-key{display:grid;justify-items:center;gap:2px;min-width:92px;padding:6px 8px;background:#04131bcc;border:1px solid #89ffe033;opacity:.55}
#trick-pick .tp-key.on{opacity:1;border-color:#ffd166;box-shadow:0 0 14px #ffd16655;color:#fff}
#trick-pick kbd{font:700 14px var(--mono,monospace);color:#ffd166}
#trick-pick small{font-size:10px;color:#9fb8bb;text-transform:uppercase;letter-spacing:.06em}
@media (max-width:600px){#trick-pick .tp-key{min-width:0;padding:4px 5px}#trick-pick small{display:none}}`;document.head.appendChild(st)}}

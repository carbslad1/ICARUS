// Step 5 of the build-and-playtest plan (ICARUS_DESIGN.md §4.2-4.6, §4.20): the first routine. Designer's answers,
// 2026-10-27: mult = 1 + the levels of the tricks that connect + 1 per linked payoff; payoffs hit like a weapon, setups
// deal nothing; the run starts with one trick picked from three; the shop always has one trick place, from 25 pearls.
// - Three slots fire this step: Breach (the first air step), Apex (the top of the arc) and Entry (water contact, before
//   the splashdown banks). Ascent and Descent come with step 10. Any trick goes in any slot; one copy each; a bought
//   copy of an owned trick levels it.
// - Setups move enemies and mark them with the flight (e.setupBy). A payoff connects if it hits at least one enemy, and
//   is linked if any enemy it hits was moved by a setup this flight. A setup connects if it moves at least one enemy;
//   Gravity anchor holds for 1.5 s and a hit while it holds cancels it (it adds nothing).
// - Gravity anchor is a gravity well (designer, 2026-10-30): enemies within 20 m keep chasing the dolphin but are
//   accelerated toward the well, so they bend in rather than stop. The well sits in the arena's frame, which rides
//   with the camera, not at a fixed point in the world; trick effects are drawn in that frame too.
// - Only with the step 4 rules (DEMO.tune.rules); S4's reels stay as they were with them off.
var Routine = (() => {
  const P = Object.freeze({
    corkR: 8, corkPush: 26,                 // m, m/s outward
    anchorR: 20, anchorT: 1.5,             // m, s; the pull's strength is DEMO.tune.well (m/s², 60)
    starR: 7,                               // m (+1 per extra level)
    spoutR0: 4, spoutPerM: .2, spoutMax: 12, // m at the landing point, + 0.2 per metre of the flight's peak height
    mineAt: [.35, .7, 1.05], mineTouch: 1.6, mineBlast: 4.5, // s ahead on the predicted arc; m to set one off; m blast
    base: 30, perLevel: .5, perWave: .1     // payoff damage: base × (1 + .5 per extra level) × Damage % × (1 + .1 per wave)
  });
  const TRICKS = Object.freeze({
    cork:   { name: 'Corkscrew',      kind: 'setup',  slot: 'breach', glyph: '⤨', text: 'Pushes enemies within 8 m of you away.' },
    anchor: { name: 'Gravity anchor', kind: 'setup',  slot: 'apex',   glyph: '◎', text: 'Pulls enemies within 20 m to where it fires, for 1.5 s.' },
    star:   { name: 'Star pose',      kind: 'payoff', slot: 'apex',   glyph: '✦', text: 'Bursts enemies within 7 m of you.' },
    spout:  { name: 'Spout',          kind: 'payoff', slot: 'entry',  glyph: '≋', text: 'Splashes enemies around your landing point and soaks them. Higher falls splash wider.' },
    mines:  { name: 'Minefield',      kind: 'payoff', slot: 'breach', glyph: '⁂', text: 'Leaves 3 mines on your arc ahead. They stay in the world and sweep through whatever chases you.' }
  });
  const IDS = Object.keys(TRICKS), SLOTS = ['breach', 'apex', 'entry'], SLOT_NAMES = { breach: 'Breach', apex: 'Apex', entry: 'Entry' };
  const on = r => !!(DEMO.tune.rules && r?.demo);
  const state = r => r.demo.routine || (r.demo.routine = { slots: { breach: null, apex: null, entry: null }, levels: {} });
  const level = (r, id) => state(r).levels[id] || 0;
  const unit = (x, y) => { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n } };

  // owning and placing
  function add(r, id) {
    const S = state(r); S.levels[id] = (S.levels[id] || 0) + 1;
    if (SLOTS.some(s => S.slots[s] === id)) return;
    const s = !S.slots[TRICKS[id].slot] ? TRICKS[id].slot : SLOTS.find(x => !S.slots[x]);
    if (s) S.slots[s] = id;
  }
  // put an owned trick in a slot; whatever was there takes its old place (or the bench)
  function move(r, id, slot) {
    const S = state(r);
    if (!S.levels[id] || !SLOTS.includes(slot)) return false;
    const from = SLOTS.find(s => S.slots[s] === id) || null, there = S.slots[slot];
    S.slots[slot] = id; if (from) S.slots[from] = there && there !== id ? there : null;
    return true;
  }
  const bench = r => IDS.filter(id => level(r, id) && !SLOTS.some(s => state(r).slots[s] === id));
  // three different tricks, drawn by the run's generator
  function draw3(r) { const a = [...IDS]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(ce(r) * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a.slice(0, 3) }
  // the run's first trick: the one picked on the title screen (DemoStartTrick), or the first of three drawn
  function start(r) {
    const offers = draw3(r), pick = typeof DemoStartTrick !== 'undefined' && TRICKS[DemoStartTrick] ? DemoStartTrick : offers[0];
    r.demo.trickOffers = offers; add(r, pick);
  }
  const damage = (r, id) => P.base * (1 + P.perLevel * (level(r, id) - 1)) * (r.stats.damage || 1) * (1 + P.perWave * (r.wave - 1));

  // firing a slot
  function near(r, x, y, R) { return r.enemies.filter(e => e.hp > 0 && Math.hypot(e.pos.x - x, e.pos.y - y) < R + (e.radius || 1)) }
  function fire(r, m, slot) {
    const h = r.hand, id = state(r).slots[slot];
    (h.fired || (h.fired = {}))[slot] = true;
    if (!id) return;
    const T = TRICKS[id], lv = level(r, id), me = m.local, rec = { slot, id, name: T.name, level: lv, hits: 0, linked: false, connected: false };
    (h.tricks || (h.tricks = [])).push(rec);
    // effects in the air ride the arena (local); Spout's splash stays on the water where you landed (world)
    const fx = (kind, R, life) => (r.trickFx || (r.trickFx = [])).push(kind === 'splash' ? { kind, x: m.origin.x + me.x, y: m.origin.y + me.y, R, t: life, life } : { kind, lx: me.x, ly: me.y, R, t: life, life });
    if (id === 'cork') {
      for (const e of near(r, me.x, me.y, P.corkR)) { const u = unit(e.pos.x - me.x, e.pos.y - me.y); e.velocity.x += u.x * P.corkPush; e.velocity.y += u.y * P.corkPush; e.setupBy = h.n; rec.hits++ }
      fx('ring', P.corkR, .35); return settle(r, rec);
    }
    if (id === 'anchor') {
      for (const e of near(r, me.x, me.y, P.anchorR)) { e.setupBy = h.n; rec.hits++ }
      r.anchor = { x: me.x, y: me.y, t: P.anchorT, rec, n: h.n };
      rec.pending = true; fx('anchor', P.anchorR, P.anchorT); return;
    }
    // Minefield (step 6, the world layer, ICARUS_DESIGN.md §4.16 A): three mines fixed in the world on the predicted
    // arc. The arena rides past them, so they sweep back through it, behind the dolphin, into whatever follows.
    if (id === 'mines') {
      r.pmines = P.mineAt.map(t => { const w = Danger.predict(r, m, t); return { wx: w.x, wy: w.y, n: h.n, t } });
      rec.pending = true; r.pminesRec = rec; return;
    }
    // payoffs: linked if anything they hit was moved by this flight's setups (checked before the damage kills it)
    const R = id === 'star' ? P.starR + (lv - 1) : Math.min(P.spoutMax, P.spoutR0 + P.spoutPerM * Math.max(0, r.flightBest || 0));
    const hit = near(r, me.x, me.y, R), amount = damage(r, id);
    rec.linked = hit.some(e => e.setupBy === h.n);
    for (const e of hit) { if (id === 'spout') e.soaked = true; DEMO.damage(r, e, amount, id); rec.hits++ }
    fx(id === 'star' ? 'burst' : 'splash', R, .45);
    settle(r, rec);
  }
  // a trick has finished: it connects if it hit something; the scoreboard shows what it adds
  function settle(r, rec) {
    rec.pending = false; rec.connected = rec.hits > 0 && !rec.cancelled;
    const add = rec.connected ? rec.level + (rec.linked ? 1 : 0) : 0;
    ScoreCues.trick(r, { name: rec.name, amount: add, linked: rec.connected && rec.linked, missed: !rec.connected, cancelled: !!rec.cancelled });
  }

  // each air step after v3's enemy step: the Breach and Apex slots, and Gravity anchor's pull
  function step(r, m, dt) {
    const h = r.hand; if (!h?.open || h.busted) return;
    if (!h.fired?.breach) fire(r, m, 'breach');
    if (h.apex && !h.fired?.apex) fire(r, m, 'apex');
    if (r.pmines?.length) mines(r, m);
    const A = r.anchor;
    if (A && A.n === h.n && A.rec.pending) {
      const g = +DEMO.tune.well || 0;
      for (const e of near(r, A.x, A.y, P.anchorR)) {
        const u = unit(A.x - e.pos.x, A.y - e.pos.y);
        e.velocity.x += u.x * g * dt; e.velocity.y += u.y * g * dt; e.setupBy = h.n;
      }
      A.t -= dt; if (A.t <= 0) { settle(r, A.rec); r.anchor = null }
    }
  }
  // Minefield's mines: an enemy within reach sets one off; the blast hits like a payoff, once per mine
  function mines(r, m) {
    const rec = r.pminesRec, o = m.origin, keep = [];
    for (const k of r.pmines) {
      const lx = k.wx - o.x, ly = k.wy - o.y;
      if (!r.enemies.some(e => e.hp > 0 && Math.hypot(e.pos.x - lx, e.pos.y - ly) < P.mineTouch + (e.radius || 1))) { keep.push(k); continue }
      const hit = near(r, lx, ly, P.mineBlast), amount = damage(r, 'mines');
      if (hit.some(e => e.setupBy === k.n)) rec.linked = true;
      for (const e of hit) { DEMO.damage(r, e, amount, 'mines'); rec.hits++ }
      (r.trickFx || (r.trickFx = [])).push({ kind: 'burst', x: k.wx, y: k.wy, R: P.mineBlast, t: .4, life: .4 });
    }
    r.pmines = keep;
  }
  // a hit cancels a trick in progress (only Gravity anchor lasts; Minefield's mines are already placed, so they stay)
  function onHit(r) { const A = r.anchor; if (A?.rec.pending && A.n === r.hand?.n) { A.rec.cancelled = true; settle(r, A.rec); r.anchor = null } }
  // water contact, before the splashdown banks: the Entry slot, any anchor still holding completes, and the mult is set
  function entry(r) {
    const h = r.hand, m = r.medium; if (!h?.open || h.busted || m?.kind !== 'air') return;
    if (!h.fired?.breach) fire(r, m, 'breach');
    if (!h.fired?.apex && h.apex) fire(r, m, 'apex');
    if (r.anchor?.rec.pending && r.anchor.n === h.n) { settle(r, r.anchor.rec); r.anchor = null }
    if (r.pminesRec?.pending) settle(r, r.pminesRec); r.pmines = []; r.pminesRec = null;
    if (!h.fired?.entry) fire(r, m, 'entry');
    h.mult = 1 + (h.tricks || []).reduce((a, t) => a + (t.connected ? t.level + (t.linked ? 1 : 0) : 0), 0);
  }

  // trick visuals on the telegraph layer: a push ring, the anchor's pull, a burst, a splash
  function draw(R, r) {
    const G = R.telegraphs, keep = [];
    for (const k of r.pmines || []) {
      const X = R.sx(k.wx), Y = R.sy(k.wy), ppm = Math.abs(R.sx(k.wx + 1) - X), s = 1.1 * ppm;
      G.circle(X, Y, s).fill({ color: yt.cyan, alpha: .5 }).stroke({ color: yt.white, width: 2, alpha: .9 });
      for (let j = 0; j < 4; j++) { const a = j * Math.PI / 2 + Math.PI / 4; G.moveTo(X + Math.cos(a) * s, Y + Math.sin(a) * s).lineTo(X + Math.cos(a) * s * 1.6, Y + Math.sin(a) * s * 1.6).stroke({ color: yt.white, width: 2, alpha: .8 }) }
    }
    for (const f of r.trickFx || []) {
      f.t -= 1 / 60; if (f.t <= 0) continue; keep.push(f);
      const o = r.medium?.kind === 'air' ? r.medium.origin : null; if (f.lx != null && !o) continue;
      const wx = f.lx != null ? o.x + f.lx : f.x, wy = f.lx != null ? o.y + f.ly : f.y;
      const X = R.sx(wx), Y = R.sy(wy), ppm = Math.abs(R.sx(wx + 1) - X), k = 1 - f.t / f.life;
      if (f.kind === 'ring') G.circle(X, Y, f.R * ppm * (.3 + .7 * k)).stroke({ color: yt.cyan, width: 3, alpha: .8 * (1 - k) });
      else if (f.kind === 'burst') { G.circle(X, Y, f.R * ppm * (.4 + .6 * k)).fill({ color: yt.amber, alpha: .25 * (1 - k) }).stroke({ color: yt.amber, width: 3, alpha: .9 * (1 - k) }) }
      else if (f.kind === 'splash') G.ellipse(X, Y, f.R * ppm * (.4 + .6 * k), f.R * ppm * .35).stroke({ color: yt.cyan, width: 3, alpha: .9 * (1 - k) });
      else if (f.kind === 'anchor') { G.circle(X, Y, 6 + 4 * Math.sin(k * 30)).fill({ color: yt.white, alpha: .7 }); G.circle(X, Y, f.R * ppm * (1 - k)).stroke({ color: yt.white, width: 1.5, alpha: .35 }) }
    }
    r.trickFx = keep;
  }

  return { P, TRICKS, IDS, SLOTS, SLOT_NAMES, on, state, level, add, move, bench, draw3, start, damage, fire, step, onHit, entry, draw };
})();
var DemoStartTrick, DemoTrickTitle;  // the title screen's pick, and the three it shows
{const hd0=Hd;Hd=function(...a){const r=hd0(...a);if(Routine.on(r))Routine.start(r);return r}}
{const me0=ME;ME=function(r,t,e,i){me0(r,t,e,i);if(Routine.on(r)&&t?.kind==='air'&&i>0)Routine.step(r,t,i)}}
{const hit0=DEMO.hit;DEMO.hit=function(r,a){const hp=r.hp;hit0(r,a);if(r.hp<hp&&Routine.on(r))Routine.onHit(r)}}
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&(r?.trickFx?.length||r?.pmines?.length))Routine.draw(R,r)}}

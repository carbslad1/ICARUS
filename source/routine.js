// Steps 5, 6, 9 and 10 of the build-and-playtest plan (ICARUS_DESIGN.md §4.2-4.6, §4.16, §4.20): the routine.
// Designer's answers, 2026-10-27 to 10-30: mult = 1 + the levels of the tricks that connect + 1 per linked payoff;
// payoffs hit like a weapon, setups deal nothing; the run starts with one trick picked from three; the shop always has
// one trick place, from 25 pearls.
// - Five slots: Breach (the first air step), Ascent (pulses while climbing), Apex (the top of the arc), Descent (pulses
//   while falling) and Entry (water contact, before the splashdown banks). Ascent and Descent re-fire their trick every
//   0.6 s at a third of its power (step 10, designer 2026-10-30); a stretch trick connects once, if any pulse hit.
//   Any trick goes in any slot; one copy each; a bought copy of an owned trick levels it.
// - Setups move enemies and mark them with the flight (e.setupBy). A payoff connects if it hits at least one enemy, and
//   is linked if any enemy it hits was moved by a setup this flight. A setup connects if it moves at least one enemy.
//   A hit cancels a trick still in progress (Gravity anchor, Closing net); stretch pulses already fired stand.
// - Gravity anchor is a gravity well (designer, 2026-10-30): enemies within 20 m keep chasing the dolphin but are
//   accelerated toward the well, which sits in the arena's frame and rides with the camera.
// - Minefield (step 6, the world layer): three mines fixed in the world on the predicted arc sweep back through the
//   arena into whatever follows.
// - Step 9's clutch moments are tricks, not scripted events (designer, 2026-10-30): Closing net (a ring closes in and
//   drags enemies toward you), Bounty (marks the toughest enemy near you; killing it this flight pays pearls) and
//   Standoff (a landing shockwave that hits harder the more enemies wait there).
// - Only with the step 4 rules (DEMO.tune.rules); S4's reels stay as they were with them off.
var Routine = (() => {
  const P = Object.freeze({
    corkR: 8, corkPush: 26,                 // m, m/s outward
    anchorR: 20, anchorT: 1.5,             // m, s; the pull's strength is DEMO.tune.well (m/s², 60)
    starR: 7,                               // m (+1 per extra level)
    spoutR0: 4, spoutPerM: .2, spoutMax: 12, // m at the landing point, + 0.2 per metre of the flight's peak height
    mineAt: [.35, .7, 1.05], mineTouch: 1.6, mineBlast: 4.5, // s ahead on the predicted arc; m to set one off; m blast
    netR0: 14, netR1: 3, netT: .8, netReach: 16, // m the ring starts and ends at, s it takes, m it catches from
    bountyR: 25, bountyPearls: 10,          // m it looks; pearls per level when the marked enemy dies this flight
    standoffR: 16, standoffPer: .15,        // m around the landing point; +15% damage per enemy caught
    pulse: .6, pulsePower: 1 / 3,           // s between stretch pulses; their power
    base: 30, perLevel: .5, perWave: .1     // payoff damage: base × (1 + .5 per extra level) × Damage % × (1 + .1 per wave)
  });
  const TRICKS = Object.freeze({
    cork:     { name: 'Corkscrew',      kind: 'setup',  slot: 'breach',  glyph: '⤨', text: 'Pushes enemies within 8 m of you away.' },
    anchor:   { name: 'Gravity anchor', kind: 'setup',  slot: 'apex',    glyph: '◎', text: 'A gravity well for 1.5 s: enemies within 20 m keep chasing you but bend toward it.' },
    net:      { name: 'Closing net',    kind: 'setup',  slot: 'ascent',  glyph: '◌', text: 'A ring 14 m around you closes in over 0.8 s, dragging enemies toward you.' },
    star:     { name: 'Star pose',      kind: 'payoff', slot: 'apex',    glyph: '✦', text: 'Bursts enemies within 7 m of you.' },
    spout:    { name: 'Spout',          kind: 'payoff', slot: 'entry',   glyph: '≋', text: 'Splashes enemies around your landing point and soaks them. Higher falls splash wider.' },
    mines:    { name: 'Minefield',      kind: 'payoff', slot: 'breach',  glyph: '⁂', text: 'Leaves 3 mines on your arc ahead. They stay in the world and sweep through whatever chases you.' },
    bounty:   { name: 'Bounty',         kind: 'payoff', slot: 'apex',    glyph: '¤', text: 'Marks the toughest enemy within 25 m. Kill it before you land for 10 pearls a level.' },
    standoff: { name: 'Standoff',       kind: 'payoff', slot: 'entry',   glyph: '⊗', text: 'A shockwave around your landing point, 15% stronger for each enemy waiting there.' }
  });
  const IDS = Object.keys(TRICKS), SLOTS = ['breach', 'ascent', 'apex', 'descent', 'entry'];
  const SLOT_NAMES = { breach: 'Breach', ascent: 'Ascent', apex: 'Apex', descent: 'Descent', entry: 'Entry' };
  const STRETCH = new Set(['ascent', 'descent']);
  const on = r => !!(DEMO.tune.rules && r?.demo);
  function state(r) {
    const S = r.demo.routine || (r.demo.routine = { slots: {}, levels: {} });
    for (const s of SLOTS) if (!(s in S.slots)) S.slots[s] = null;
    return S;
  }
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
  function near(r, x, y, R) { return r.enemies.filter(e => e.hp > 0 && Math.hypot(e.pos.x - x, e.pos.y - y) < R + (e.radius || 1)) }
  const knock = e => { e.knockT = .6; e.floor = Math.min(e.floor ?? 0, 0) };   // pushed: can be driven into the water (step 8)

  // one firing of a slot's trick at this power (1, or a stretch pulse's third). A stretch slot keeps one record across
  // its pulses and settles when its stretch ends.
  function fire(r, m, slot, power = 1) {
    const h = r.hand, id = state(r).slots[slot];
    if (!STRETCH.has(slot)) (h.fired || (h.fired = {}))[slot] = true;
    if (!id) return;
    const T = TRICKS[id], lv = level(r, id), me = m.local, stretch = STRETCH.has(slot);
    h.tricks || (h.tricks = []);
    let rec = stretch ? h.tricks.find(t => t.slot === slot) : null;
    if (!rec) { rec = { slot, id, name: T.name, level: lv, hits: 0, linked: false, connected: false, stretch, pulses: 0 }; h.tricks.push(rec) }
    rec.pulses++;
    // effects in the air ride the arena (local); a splash at the landing stays on the water (world)
    const fx = (kind, R, life, world) => (r.trickFx || (r.trickFx = [])).push(world ? { kind, x: m.origin.x + me.x, y: m.origin.y + me.y, R, t: life, life } : { kind, lx: me.x, ly: me.y, R, t: life, life });
    const done = () => { if (!stretch) settle(r, rec) };
    if (id === 'cork') {
      for (const e of near(r, me.x, me.y, P.corkR)) { const u = unit(e.pos.x - me.x, e.pos.y - me.y); e.velocity.x += u.x * P.corkPush * power; e.velocity.y += u.y * P.corkPush * power; e.setupBy = h.n; knock(e); rec.hits++ }
      fx('ring', P.corkR, .35); return done();
    }
    if (id === 'anchor') {
      for (const e of near(r, me.x, me.y, P.anchorR)) { e.setupBy = h.n; rec.hits++ }
      r.anchor = { x: me.x, y: me.y, t: stretch ? P.pulse : P.anchorT, power, rec, n: h.n };
      if (!stretch) rec.pending = true; fx('anchor', P.anchorR, r.anchor.t); return;
    }
    if (id === 'net') {
      r.net = { x: me.x, y: me.y, t: 0, power, rec, n: h.n };
      if (!stretch) rec.pending = true; fx('net', P.netR0, P.netT); return;
    }
    if (id === 'mines') {
      const at = stretch ? [.5] : P.mineAt;
      r.pmines = (r.pmines || []).concat(at.map(t => { const w = Danger.predict(r, m, t); return { wx: w.x, wy: w.y, n: h.n, t, power, rec } }));
      if (!stretch) rec.pending = true; return;
    }
    if (id === 'bounty') {
      if (r.bounty?.n === h.n) return;
      const t = near(r, me.x, me.y, P.bountyR).sort((a, b) => b.hp - a.hp)[0];
      if (!t) return done();
      t.bounty = h.n; r.bounty = { id: t.id, n: h.n, rec }; rec.pending = true; return;
    }
    // area payoffs: linked if anything they hit was moved by this flight's setups (checked before the damage kills it)
    const R = id === 'star' ? P.starR + (lv - 1) : id === 'standoff' ? P.standoffR : Math.min(P.spoutMax, P.spoutR0 + P.spoutPerM * Math.max(0, r.flightBest || 0));
    const hit = near(r, me.x, me.y, R), amount = damage(r, id) * power * (id === 'standoff' ? 1 + P.standoffPer * hit.length : 1);
    if (hit.some(e => e.setupBy === h.n)) rec.linked = true;
    for (const e of hit) { if (id === 'spout') Status.soak(e); DEMO.damage(r, e, amount, id); rec.hits++ }
    fx(id === 'star' ? 'burst' : id === 'standoff' ? 'ring' : 'splash', R, .45, id !== 'star' && slot === 'entry');
    done();
  }
  // a trick has finished: it connects if it hit something; the scoreboard shows what it adds
  function settle(r, rec) {
    if (rec.settled) return;
    rec.settled = true; rec.pending = false; rec.connected = rec.hits > 0 && !rec.cancelled;
    const add = rec.connected ? rec.level + (rec.linked ? 1 : 0) : 0;
    ScoreCues.trick(r, { name: rec.name, amount: add, linked: rec.connected && rec.linked, missed: !rec.connected, cancelled: !!rec.cancelled });
  }

  // each air step after v3's enemy step: the moment slots, the stretch pulses, and the tricks that last
  function step(r, m, dt) {
    const h = r.hand; if (!h?.open || h.busted) return;
    if (!h.fired?.breach) fire(r, m, 'breach');
    const P2 = h.pulses || (h.pulses = { ascent: P.pulse / 2, descent: P.pulse / 2 });
    if (h.fired.breach && !h.apex && m.vy > 0 && (P2.ascent -= dt) <= 0) { P2.ascent += P.pulse; fire(r, m, 'ascent', P.pulsePower) }
    if (h.apex && !h.fired?.apex) { endStretch(r, 'ascent'); fire(r, m, 'apex') }
    if (h.apex && m.vy < 0 && (P2.descent -= dt) <= 0) { P2.descent += P.pulse; fire(r, m, 'descent', P.pulsePower) }
    if (r.pmines?.length) mines(r, m);
    const A = r.anchor;
    if (A && A.n === h.n) {
      const g = (+DEMO.tune.well || 0) * A.power;
      for (const e of near(r, A.x, A.y, P.anchorR)) { const u = unit(A.x - e.pos.x, A.y - e.pos.y); e.velocity.x += u.x * g * dt; e.velocity.y += u.y * g * dt; e.setupBy = h.n }
      A.t -= dt; if (A.t <= 0) { if (!A.rec.stretch) settle(r, A.rec); r.anchor = null }
    }
    const N = r.net;
    if (N && N.n === h.n) {
      N.t += dt; const k = Math.min(1, N.t / P.netT), ring = P.netR0 + (P.netR1 - P.netR0) * k * N.power;
      for (const e of near(r, N.x, N.y, P.netReach)) {
        const d = Math.hypot(e.pos.x - N.x, e.pos.y - N.y); if (d <= ring) continue;
        const u = unit(e.pos.x - N.x, e.pos.y - N.y); e.pos = ye(N.x + u.x * ring, N.y + u.y * ring);
        e.velocity.x -= u.x * 6; e.velocity.y -= u.y * 6; if (e.setupBy !== h.n) N.rec.hits++; e.setupBy = h.n; knock(e);
      }
      if (k >= 1) { if (!N.rec.stretch) settle(r, N.rec); r.net = null }
    }
  }
  // a stretch slot's pulses are over: it settles (connected if any pulse hit)
  function endStretch(r, slot) { const rec = r.hand?.tricks?.find(t => t.slot === slot); if (rec && !rec.settled) settle(r, rec) }
  // Minefield's mines: an enemy within reach sets one off; the blast hits like a payoff, once per mine
  function mines(r, m) {
    const o = m.origin, keep = [];
    for (const k of r.pmines) {
      const lx = k.wx - o.x, ly = k.wy - o.y;
      if (!r.enemies.some(e => e.hp > 0 && Math.hypot(e.pos.x - lx, e.pos.y - ly) < P.mineTouch + (e.radius || 1))) { keep.push(k); continue }
      const hit = near(r, lx, ly, P.mineBlast), amount = damage(r, 'mines') * (k.power || 1);
      if (hit.some(e => e.setupBy === k.n)) k.rec.linked = true;
      for (const e of hit) { DEMO.damage(r, e, amount, 'mines'); k.rec.hits++ }
      (r.trickFx || (r.trickFx = [])).push({ kind: 'burst', x: k.wx, y: k.wy, R: P.mineBlast, t: .4, life: .4 });
    }
    r.pmines = keep;
  }
  // Bounty: its marked enemy died this flight (called by Status after a kill)
  function bountyKill(r, e) { const B = r.bounty; if (!B || e.bounty !== B.n || r.hand?.n !== B.n) return; B.rec.hits = 1; B.paid = true; settle(r, B.rec) }
  // a hit cancels the tricks still in progress
  function onHit(r) {
    const n = r.hand?.n;
    for (const k of ['anchor', 'net']) { const A = r[k]; if (A && A.n === n) { if (!A.rec.settled) { A.rec.cancelled = true; settle(r, A.rec) } r[k] = null } }
  }
  // water contact, before the splashdown banks: the Entry slot, the tricks still running settle, the mult is set
  function entry(r) {
    const h = r.hand, m = r.medium; if (!h?.open || h.busted || m?.kind !== 'air') return;
    if (!h.fired?.breach) fire(r, m, 'breach');
    if (!h.fired?.apex && h.apex) fire(r, m, 'apex');
    for (const k of ['anchor', 'net']) { const A = r[k]; if (A && A.n === h.n) { settle(r, A.rec); r[k] = null } }
    for (const k of r.pmines || []) settle(r, k.rec); r.pmines = [];
    if (r.bounty?.n === h.n) { const B = r.bounty; if (B.paid) { const p = P.bountyPearls * B.rec.level; r.xp += p; r.earned += p; h.bountyPearls = p } else settle(r, B.rec); r.bounty = null }
    endStretch(r, 'ascent'); endStretch(r, 'descent');
    if (!h.fired?.entry) fire(r, m, 'entry');
    for (const t of h.tricks || []) if (!t.settled) settle(r, t);
    h.mult = 1 + (h.tricks || []).reduce((a, t) => a + (t.connected ? t.level + (t.linked ? 1 : 0) : 0), 0);
  }

  // trick visuals on the telegraph layer: mines, a push ring, the well, the net, a burst, a splash, the bounty mark
  function draw(R, r) {
    const G = R.telegraphs, keep = [], o = r.medium?.kind === 'air' ? r.medium.origin : null;
    for (const k of r.pmines || []) {
      const X = R.sx(k.wx), Y = R.sy(k.wy), ppm = Math.abs(R.sx(k.wx + 1) - X), s = 1.1 * ppm;
      G.circle(X, Y, s).fill({ color: yt.cyan, alpha: .5 }).stroke({ color: yt.white, width: 2, alpha: .9 });
      for (let j = 0; j < 4; j++) { const a = j * Math.PI / 2 + Math.PI / 4; G.moveTo(X + Math.cos(a) * s, Y + Math.sin(a) * s).lineTo(X + Math.cos(a) * s * 1.6, Y + Math.sin(a) * s * 1.6).stroke({ color: yt.white, width: 2, alpha: .8 }) }
    }
    if (o && r.bounty) { const e = r.enemies.find(x => x.id === r.bounty.id); if (e) { const X = R.sx(o.x + e.pos.x), Y = R.sy(o.y + e.pos.y), ppm = Math.abs(R.sx(o.x + e.pos.x + 1) - X); G.circle(X, Y, (e.radius + 1.2) * ppm).stroke({ color: yt.amber, width: 3, alpha: .9 }) } }
    if (o && r.net) { const N = r.net, X = R.sx(o.x + N.x), Y = R.sy(o.y + N.y), ppm = Math.abs(R.sx(o.x + N.x + 1) - X), k = Math.min(1, N.t / P.netT); G.circle(X, Y, (P.netR0 + (P.netR1 - P.netR0) * k * N.power) * ppm).stroke({ color: yt.cyan, width: 2.5, alpha: .8 }) }
    for (const f of r.trickFx || []) {
      f.t -= 1 / 60; if (f.t <= 0) continue; keep.push(f);
      if (f.lx != null && !o) continue;
      const wx = f.lx != null ? o.x + f.lx : f.x, wy = f.lx != null ? o.y + f.ly : f.y;
      const X = R.sx(wx), Y = R.sy(wy), ppm = Math.abs(R.sx(wx + 1) - X), k = 1 - f.t / f.life;
      if (f.kind === 'ring') G.circle(X, Y, f.R * ppm * (.3 + .7 * k)).stroke({ color: yt.cyan, width: 3, alpha: .8 * (1 - k) });
      else if (f.kind === 'burst') { G.circle(X, Y, f.R * ppm * (.4 + .6 * k)).fill({ color: yt.amber, alpha: .25 * (1 - k) }).stroke({ color: yt.amber, width: 3, alpha: .9 * (1 - k) }) }
      else if (f.kind === 'splash') G.ellipse(X, Y, f.R * ppm * (.4 + .6 * k), f.R * ppm * .35).stroke({ color: yt.cyan, width: 3, alpha: .9 * (1 - k) });
      else if (f.kind === 'anchor') { G.circle(X, Y, 6 + 4 * Math.sin(k * 30)).fill({ color: yt.white, alpha: .7 }); G.circle(X, Y, f.R * ppm * (1 - k)).stroke({ color: yt.white, width: 1.5, alpha: .35 }) }
    }
    r.trickFx = keep;
  }

  return { P, TRICKS, IDS, SLOTS, SLOT_NAMES, STRETCH, on, state, level, add, move, bench, draw3, start, damage, fire, settle, step, onHit, entry, bountyKill, draw };
})();
var DemoStartTrick, DemoTrickTitle;  // the title screen's pick, and the three it shows
{const hd0=Hd;Hd=function(...a){const r=hd0(...a);if(Routine.on(r))Routine.start(r);return r}}
{const me0=ME;ME=function(r,t,e,i){me0(r,t,e,i);if(Routine.on(r)&&t?.kind==='air'&&i>0)Routine.step(r,t,i)}}
{const hit0=DEMO.hit;DEMO.hit=function(r,a){const hp=r.hp;hit0(r,a);if(r.hp<hp&&Routine.on(r))Routine.onHit(r)}}
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&(r?.trickFx?.length||r?.pmines?.length||r?.net||r?.bounty))Routine.draw(R,r)}}

// The routine (ICARUS_DESIGN.md §4.2-4.6, §4.16, §4.20, steps 5, 6, 9 and 10). Redesigned 2026-10-30 with the
// designer: in the air the guns do the damage, and tricks are effects that place enemies for them. The only tricks that
// damage are the water tricks, which drown or splash enemies at the surface.
// - Five slots: Breach (the first air step), Ascent (pulses while climbing), Apex (the top of the arc), Descent (pulses
//   while falling) and Entry (water contact, before the splashdown banks). Ascent and Descent re-fire their trick every
//   0.6 s at a third of its power; a stretch trick connects once, if any pulse affected an enemy.
// - Everything in the air rides the arena, so "where you are going" is a direction from the dolphin (ahead along the
//   arc, behind, above, below). Effects place enemies there, away from the dolphin, never onto it. Only world objects
//   (Snare buoys) and the water use the predicted arc.
// - Scoring: mult = 1 + the levels of the tricks that affected at least one enemy + 1 for each trick that linked. An air
//   trick links when a gun (or a water trick) kills an enemy it affected this flight; a water trick links when it kills
//   an enemy an air trick affected.
// - Only with the step 4 rules (DEMO.tune.rules); S4's reels stay as they were with them off.
var Routine = (() => {
  const P = Object.freeze({
    anchorAhead: 10, anchorR: 20, anchorT: 1.5, // m ahead of you, m it reaches, s; pull strength DEMO.tune.well (m/s²)
    chumFrom: 6, chumTo: 18, chumR: 22, chumT: 1.5, chumPull: 45, // a bait line 6-18 m ahead along the arc
    slipBack: 4, slipLen: 16, slipR: 20, slipT: 2, slipPull: 40,  // a file 4-20 m behind you
    bubbleR: 9, bubbleT: 1,                 // m, s held still
    eddyR: 14, eddyRing: 4.5, eddyT: 1.5, eddySpin: 10, // m it reaches, m ring (inside Close reach, outside contact), s, m/s round
    bowR: 14, bowCone: .55, bowPush: 28,    // m, half-angle (rad), m/s sideways
    breachR: 18, breachLow: 8, breachLift: 22, // m across, enemies below 8 m altitude, m/s up
    frostT: 2, frostR: 2.5, frostEvery: .3, // s the wake lasts, m from your path, s between chill stacks
    buoyAt: [.35, .7, 1.05], buoyTouch: 1.8, // s ahead on the predicted arc; m reach
    spoutR0: 4, spoutPerM: .2, spoutMax: 12, // m at the landing point, + 0.2 per metre of the flight's peak height
    ripR: 20, ripLow: 10, ripPull: 140, ripT: 1.2, // m from you, enemies below 10 m altitude, m/s² down (beats a chaser's ~80 m/s² steering), s
    flopR: 6, flopDepth: 14, flopDrive: 36, flopT: .8, // m sideways, m below you, m/s down held for flopT s
    undertowR: 12, undertowLow: 6,          // m around the landing point, enemies below 6 m altitude
    pulse: .6, pulsePower: 1 / 3,           // s between stretch pulses; their power
    base: 30, perLevel: .5, perWave: .1     // water damage: base × (1 + .5 per extra level) × Damage % × (1 + .1 per wave)
  });
  const TRICKS = Object.freeze({
    anchor:   { name: 'Gravity anchor', kind: 'effect', slot: 'apex',    glyph: '◎', helps: 'Blast guns',    text: 'A gravity well 10 m ahead of you for 1.5 s: enemies within 20 m bend into a cluster there.' },
    chum:     { name: 'Chum line',      kind: 'effect', slot: 'ascent',  glyph: '⋯', helps: 'piercing guns', text: 'Bait 6-18 m ahead on your arc for 1.5 s: enemies within 22 m line up along your path.' },
    slip:     { name: 'Slipstream',     kind: 'effect', slot: 'descent', glyph: '≫', helps: 'piercing guns', text: 'For 2 s, chasers behind you fall into single file 4-20 m back.' },
    bubble:   { name: 'Bubble net',     kind: 'effect', slot: 'apex',    glyph: '◌', helps: 'every gun',     text: 'Holds enemies within 9 m of you still for 1 s.' },
    eddy:     { name: 'Eddy',           kind: 'effect', slot: 'apex',    glyph: '↻', helps: 'Close guns',    text: 'For 1.5 s, enemies within 14 m are drawn onto a ring 4.5 m around you and circle it, inside Close reach.' },
    bow:      { name: 'Bow wave',       kind: 'effect', slot: 'breach',  glyph: '⋀', helps: 'your streak',   text: 'Pushes enemies ahead of you aside, opening a lane.' },
    breach:   { name: 'Breach wave',    kind: 'effect', slot: 'breach',  glyph: '⌇', helps: 'Arc (Conduct)', text: 'Lifts enemies near the surface up into your climb and soaks them.' },
    frost:    { name: 'Frost wake',     kind: 'effect', slot: 'descent', glyph: '❄', helps: 'shatter',       text: 'For 2 s your path chills whatever follows it; three chills freeze an enemy.' },
    buoys:    { name: 'Snare buoys',    kind: 'effect', slot: 'breach',  glyph: '⁂', helps: 'every gun',     text: 'Three buoys fixed in the world ahead on your arc freeze whatever touches them as they sweep past.' },
    spout:    { name: 'Spout',          kind: 'water',  slot: 'entry',   glyph: '≋', helps: 'water damage',  text: 'Splashes enemies around your landing point and soaks them. Higher falls splash wider.' },
    riptide:  { name: 'Riptide',        kind: 'water',  slot: 'descent', glyph: '⥥', helps: 'drowning',      text: 'For 1.2 s, drags enemies within 20 m and below 10 m altitude down into the water, where they drown.' },
    flop:     { name: 'Belly flop',     kind: 'water',  slot: 'descent', glyph: '⤓', helps: 'drowning',      text: 'Drives enemies below you straight down into the water to drown.' },
    undertow: { name: 'Undertow',       kind: 'water',  slot: 'entry',   glyph: '∪', helps: 'drowning',      text: 'As you land, pulls enemies within 12 m of the landing point under with you: they drown.' }
  });
  // the guns each placement trick feeds (option 1, designer 2026-10-30): a cluster for Blast guns, a line through the
  // dolphin for piercing guns, a ring inside 6 m for Close guns, soaked enemies for Arc. The shop leans on these.
  const GUNS = Object.freeze({ anchor: ['flak', 'rocket', 'depth'], chum: ['laser', 'harpoon'], slip: ['laser', 'harpoon'], eddy: ['fin', 'sonic', 'arc'], bubble: ['fin', 'sonic', 'arc'], breach: ['arc'] });
  const IDS = Object.keys(TRICKS), SLOTS = ['breach', 'ascent', 'apex', 'descent', 'entry'];
  const SLOT_NAMES = { breach: 'Breach', ascent: 'Ascent', apex: 'Apex', descent: 'Descent', entry: 'Entry' };
  const STRETCH = new Set(['ascent', 'descent']);
  const on = r => !!(DEMO.tune.rules && r?.demo);
  function state(r) {
    const S = r.demo.routine || (r.demo.routine = { slots: {}, levels: {} });
    for (const s of SLOTS) if (!(s in S.slots) || (S.slots[s] && !TRICKS[S.slots[s]])) S.slots[s] = null;
    return S;
  }
  const level = (r, id) => state(r).levels[id] || 0;
  const unit = (x, y) => { const n = Math.hypot(x, y) || 1; return { x: x / n, y: y / n } };
  const dir = m => unit(m.vx, m.vy);                     // the way the arc goes now (ahead)

  // owning and placing
  function add(r, id) {
    if (!TRICKS[id]) return;
    const S = state(r); S.levels[id] = (S.levels[id] || 0) + 1;
    if (SLOTS.some(s => S.slots[s] === id)) return;
    const s = !S.slots[TRICKS[id].slot] ? TRICKS[id].slot : SLOTS.find(x => !S.slots[x]);
    if (s) S.slots[s] = id;
  }
  function move(r, id, slot) {
    const S = state(r);
    if (!S.levels[id] || !SLOTS.includes(slot)) return false;
    const from = SLOTS.find(s => S.slots[s] === id) || null, there = S.slots[slot];
    S.slots[slot] = id; if (from) S.slots[from] = there && there !== id ? there : null;
    return true;
  }
  const bench = r => IDS.filter(id => level(r, id) && !SLOTS.some(s => state(r).slots[s] === id));
  function draw3(r) { const a = [...IDS]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(ce(r) * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a.slice(0, 3) }
  function start(r) {
    const offers = draw3(r), pick = typeof DemoStartTrick !== 'undefined' && TRICKS[DemoStartTrick] ? DemoStartTrick : offers[0];
    r.demo.trickOffers = offers; add(r, pick);
  }
  // the shop's trick place: tricks that feed the guns you hold come up more often (1 + 2 per matching gun held)
  function offerId(r) {
    const held = r.slots.map(g => g.id), w = IDS.map(id => 1 + 2 * held.filter(g => (GUNS[id] || []).includes(g)).length);
    let q = ce(r) * w.reduce((a, b) => a + b, 0); for (let i = 0; i < IDS.length; i++) { q -= w[i]; if (q < 0) return IDS[i] } return IDS.at(-1);
  }
  // guns the routine you own feeds (for the shop's weapon offers)
  const gunsFor = r => [...new Set(Object.keys(state(r).levels).flatMap(id => GUNS[id] || []))];
  const damage = (r, id) => P.base * (1 + P.perLevel * (level(r, id) - 1)) * (r.stats.damage || 1) * (1 + P.perWave * (r.wave - 1));
  function near(r, x, y, R) { return r.enemies.filter(e => e.hp > 0 && Math.hypot(e.pos.x - x, e.pos.y - y) < R + (e.radius || 1)) }
  const alt = (m, e) => m.origin.y + e.pos.y;           // an enemy's height above the water

  // an effect touched this enemy this flight: it counts toward connecting, and a later kill of it links the trick
  function affect(r, e, rec) {
    const h = r.hand, a = e.affected && e.affected.n === h.n ? e.affected : (e.affected = { n: h.n, recs: [] });
    if (!a.recs.includes(rec)) { a.recs.push(rec); rec.hits++ }
  }
  // a kill: link every air trick that affected the enemy this flight (called by Status after a kill)
  function killed(r, e, weapon) {
    const h = r.hand, a = e.affected; if (!h || !a || a.n !== h.n) return;
    const wet = TRICKS[weapon]?.kind === 'water' || weapon === 'drown';
    if (!(weapon in DEMO.weapons) && !['shock', 'conduct', 'shatter'].includes(weapon) && !wet) return;
    const air = a.recs.filter(x => TRICKS[x.id].kind !== 'water'), water = a.recs.filter(x => TRICKS[x.id].kind === 'water');
    for (const rec of air) rec.linked = true;
    // a water kill (a drowning, a splash) links the water tricks that took part, if an air trick placed the enemy first
    if (wet && air.length) for (const rec of water) rec.linked = true;
  }

  // one firing of a slot's trick at this power (1, or a stretch pulse's third)
  function fire(r, m, slot, power = 1) {
    const h = r.hand, id = state(r).slots[slot];
    if (!STRETCH.has(slot)) (h.fired || (h.fired = {}))[slot] = true;
    if (!id) return;
    const T = TRICKS[id], lv = level(r, id), me = m.local, stretch = STRETCH.has(slot), d = dir(m);
    h.tricks || (h.tricks = []);
    let rec = stretch ? h.tricks.find(t => t.slot === slot) : null;
    if (!rec) { rec = { slot, id, name: T.name, level: lv, hits: 0, linked: false, connected: false, stretch, pulses: 0 }; h.tricks.push(rec) }
    rec.pulses++;
    const fx = (kind, R, life, at, world) => (r.trickFx || (r.trickFx = [])).push(world ? { kind, x: m.origin.x + at.x, y: m.origin.y + at.y, R, t: life, life } : { kind, lx: at.x, ly: at.y, R, t: life, life });
    const hold = (kind, extra, t) => { (r.effects || (r.effects = [])).push({ kind, rec, n: h.n, t: (stretch ? P.pulse : t), power, ...extra }) };
    switch (id) {
      case 'anchor': { const at = { x: me.x + d.x * P.anchorAhead, y: me.y + d.y * P.anchorAhead }; hold('well', { x: at.x, y: at.y, R: P.anchorR }, P.anchorT); fx('anchor', P.anchorR, P.anchorT, at); break }
      case 'chum': hold('chum', { d }, P.chumT); fx('line', P.chumTo, P.chumT, me); break;
      case 'slip': hold('slip', {}, P.slipT); break;
      case 'eddy': hold('eddy', {}, P.eddyT); fx('ring', P.eddyRing, P.eddyT, me); break;
      case 'bubble': for (const e of near(r, me.x, me.y, P.bubbleR)) { e.heldT = Math.max(e.heldT || 0, P.bubbleT * (stretch ? 1 : 1)); e.heldAt = { ...e.pos }; affect(r, e, rec) } fx('ring', P.bubbleR, .4, me); break;
      case 'bow': for (const e of near(r, me.x, me.y, P.bowR)) {
        const rx = e.pos.x - me.x, ry = e.pos.y - me.y, along = rx * d.x + ry * d.y; if (along <= 0 || Math.acos(Math.min(1, along / (Math.hypot(rx, ry) || 1))) > P.bowCone) continue;
        const side = rx * -d.y + ry * d.x >= 0 ? 1 : -1; e.velocity.x += -d.y * side * P.bowPush * power; e.velocity.y += d.x * side * P.bowPush * power; affect(r, e, rec) } fx('cone', P.bowR, .35, me); break;
      case 'breach': for (const e of r.enemies) { if (e.hp <= 0 || alt(m, e) > P.breachLow || Math.abs(e.pos.x - me.x) > P.breachR) continue; e.velocity.y += P.breachLift * power; Status.soak(e); affect(r, e, rec) } fx('ring', P.breachR, .4, me); break;
      case 'frost': hold('frost', { trail: [] , tick: 0 }, P.frostT); break;
      case 'buoys': { const at = stretch ? [.5] : P.buoyAt; r.buoys = (r.buoys || []).concat(at.map(t => { const w = Danger.predict(r, m, t); return { wx: w.x, wy: w.y, n: h.n, rec } })); break }
      case 'riptide': hold('rip', {}, P.ripT); fx('down', P.ripR, .45, me); break;
      case 'flop': for (const e of r.enemies) { if (e.hp <= 0 || Math.abs(e.pos.x - me.x) > P.flopR || e.pos.y > me.y || e.pos.y < me.y - P.flopDepth) continue; e.driveT = P.flopT; e.knockT = P.flopT; e.floor = Math.min(e.floor ?? 0, 0); affect(r, e, rec) } fx('down', P.flopR, .35, me); break;
      case 'spout': case 'undertow': {
        const R = id === 'spout' ? Math.min(P.spoutMax, P.spoutR0 + P.spoutPerM * Math.max(0, r.flightBest || 0)) : P.undertowR, amount = damage(r, id) * power * (id === 'undertow' ? 3 : 1);
        for (const e of near(r, me.x, me.y, R)) { if (id === 'undertow' && alt(m, e) > P.undertowLow) continue; if (id === 'spout') Status.soak(e); affect(r, e, rec); DEMO.damage(r, e, amount, id, 0, 0, 0, false, { primary: false, weapon: id, base: amount }) }
        fx('splash', R, .45, me, slot === 'entry'); break;
      }
    }
    if (!stretch && !['anchor', 'chum', 'slip', 'eddy', 'frost', 'buoys', 'riptide'].includes(id)) settle(r, rec);
  }
  // a trick has finished: it connects if it affected an enemy; links are added when the bank sets the mult
  function settle(r, rec) {
    if (rec.settled) return;
    rec.settled = true; rec.connected = rec.hits > 0 && !rec.cancelled;
    ScoreCues.trick(r, { name: rec.name, amount: rec.connected ? rec.level : 0, linked: false, missed: !rec.connected, cancelled: !!rec.cancelled });
  }

  // each air step after v3's enemy step: the slots, the pulses and the lasting effects
  function step(r, m, dt) {
    const h = r.hand; if (!h?.open || h.busted) return;
    if (!h.fired?.breach) fire(r, m, 'breach');
    const P2 = h.pulses || (h.pulses = { ascent: P.pulse / 2, descent: P.pulse / 2 });
    if (h.fired.breach && !h.apex && m.vy > 0 && (P2.ascent -= dt) <= 0) { P2.ascent += P.pulse; fire(r, m, 'ascent', P.pulsePower) }
    if (h.apex && !h.fired?.apex) { endStretch(r, 'ascent'); fire(r, m, 'apex') }
    if (h.apex && m.vy < 0 && (P2.descent -= dt) <= 0) { P2.descent += P.pulse; fire(r, m, 'descent', P.pulsePower) }
    const me = m.local, d = dir(m), keep = [];
    for (const E of r.effects || []) {
      if (E.n !== h.n) continue;
      if (E.kind === 'well') { const g = (+DEMO.tune.well || 0) * E.power; for (const e of near(r, E.x, E.y, E.R)) { const u = unit(E.x - e.pos.x, E.y - e.pos.y); e.velocity.x += u.x * g * dt; e.velocity.y += u.y * g * dt; affect(r, e, E.rec) } }
      if (E.kind === 'chum') {   // toward the nearest point of a bait line ahead of the dolphin
        for (const e of near(r, me.x, me.y, P.chumR)) { const rx = e.pos.x - me.x, ry = e.pos.y - me.y, s = Math.max(P.chumFrom, Math.min(P.chumTo, rx * d.x + ry * d.y)), u = unit(me.x + d.x * s - e.pos.x, me.y + d.y * s - e.pos.y); e.velocity.x += u.x * P.chumPull * E.power * dt; e.velocity.y += u.y * P.chumPull * E.power * dt; affect(r, e, E.rec) }
      }
      if (E.kind === 'slip') {   // chasers behind fall onto the line straight back from the dolphin
        for (const e of near(r, me.x, me.y, P.slipR)) { const rx = e.pos.x - me.x, ry = e.pos.y - me.y, s = rx * d.x + ry * d.y; if (s > -2) continue; const back = Math.max(P.slipBack, Math.min(P.slipBack + P.slipLen, -s)), u = unit(me.x - d.x * back - e.pos.x, me.y - d.y * back - e.pos.y); e.velocity.x += u.x * P.slipPull * E.power * dt; e.velocity.y += u.y * P.slipPull * E.power * dt; affect(r, e, E.rec) }
      }
      if (E.kind === 'eddy') {   // onto a ring around the dolphin, circling it
        for (const e of near(r, me.x, me.y, P.eddyR)) {
          const rx = e.pos.x - me.x, ry = e.pos.y - me.y, d = Math.hypot(rx, ry) || 1, u = { x: rx / d, y: ry / d }, k = Math.min(1, 10 * dt);
          const want = { x: u.x * (P.eddyRing - d) * 6 - u.y * P.eddySpin * E.power, y: u.y * (P.eddyRing - d) * 6 + u.x * P.eddySpin * E.power };
          e.velocity.x += (want.x - e.velocity.x) * k; e.velocity.y += (want.y - e.velocity.y) * k; affect(r, e, E.rec);
        }
      }
      if (E.kind === 'rip') {    // a drag down toward the water for enemies low over it
        for (const e of near(r, me.x, me.y, P.ripR)) { if (alt(m, e) > P.ripLow) continue; e.velocity.y -= P.ripPull * Math.max(E.power, .6) * dt; e.knockT = .3; e.floor = Math.min(e.floor ?? 0, 0); if (!(e.st?.soaked > 0)) Status.soak(e); affect(r, e, E.rec) }
      }
      if (E.kind === 'frost') {  // the trail you leave chills what crosses it
        E.trail.push({ ...me }); if (E.trail.length > 120) E.trail.shift(); E.tick -= dt;
        if (E.tick <= 0) { E.tick = P.frostEvery; for (const e of r.enemies) { if (e.hp <= 0 || !E.trail.some(p => Math.hypot(p.x - e.pos.x, p.y - e.pos.y) < P.frostR + (e.radius || 1))) continue; Status.chill(r, e); affect(r, e, E.rec) } }
      }
      E.t -= dt; if (E.t > 0) keep.push(E); else if (!E.rec.stretch) settle(r, E.rec);
    }
    r.effects = keep;
    for (const e of r.enemies) if (e.heldT > 0) { e.heldT -= dt; e.velocity = { x: 0, y: 0 }; if (e.heldAt) e.pos = ye(e.heldAt.x, e.heldAt.y) }
    // Belly flop: the enemy is driven straight down, overriding its chase, until it hits the water or the drive ends
    for (const e of r.enemies) if (e.driveT > 0) { e.driveT -= dt; e.velocity.y = Math.min(e.velocity.y, -P.flopDrive) }
    if (r.buoys?.length) buoys(r, m);
  }
  function endStretch(r, slot) { const rec = r.hand?.tricks?.find(t => t.slot === slot); if (rec && !rec.settled) settle(r, rec) }
  // Snare buoys: fixed in the world; whatever touches one as the arena sweeps past freezes
  function buoys(r, m) {
    const o = m.origin;
    for (const k of r.buoys) { const lx = k.wx - o.x, ly = k.wy - o.y; for (const e of r.enemies) { if (e.hp <= 0 || e.st?.frozen > 0 || Math.hypot(e.pos.x - lx, e.pos.y - ly) > P.buoyTouch + (e.radius || 1)) continue; Status.freeze(e); affect(r, e, k.rec) } }
  }
  // a hit cancels the effects still running this flight
  function onHit(r) {
    const n = r.hand?.n;
    for (const E of r.effects || []) if (E.n === n && !E.rec.settled && !E.rec.stretch) { E.rec.cancelled = true; settle(r, E.rec) }
    r.effects = (r.effects || []).filter(E => E.n !== n || E.rec.stretch);
  }
  // water contact, before the splashdown banks: the Entry slot fires, everything settles, links count, the mult is set
  function entry(r) {
    const h = r.hand, m = r.medium; if (!h?.open || h.busted || m?.kind !== 'air') return;
    if (!h.fired?.breach) fire(r, m, 'breach');
    if (!h.fired?.apex && h.apex) fire(r, m, 'apex');
    for (const E of r.effects || []) if (E.n === h.n) settle(r, E.rec); r.effects = [];
    for (const k of r.buoys || []) settle(r, k.rec); r.buoys = [];
    endStretch(r, 'ascent'); endStretch(r, 'descent');
    if (!h.fired?.entry) fire(r, m, 'entry');
    for (const t of h.tricks || []) if (!t.settled) settle(r, t);
    for (const t of h.tricks || []) if (t.connected && t.linked) ScoreCues.trick(r, { name: t.name + ' linked', amount: 1, linked: true });
    h.mult = 1 + (h.tricks || []).reduce((a, t) => a + (t.connected ? t.level + (t.linked ? 1 : 0) : 0), 0);
  }

  // visuals on the telegraph layer: buoys, the well, the bait line, held enemies, rings and splashes
  function draw(R, r) {
    const G = R.telegraphs, keep = [], o = r.medium?.kind === 'air' ? r.medium.origin : null;
    for (const k of r.buoys || []) {
      const X = R.sx(k.wx), Y = R.sy(k.wy), ppm = Math.abs(R.sx(k.wx + 1) - X), s = 1.1 * ppm;
      G.circle(X, Y, s).fill({ color: 0xdff6ff, alpha: .55 }).stroke({ color: yt.cyan, width: 2.5, alpha: .95 });
    }
    if (o) for (const E of r.effects || []) {
      const m = r.medium, d = dir(m), me = m.local, X = v => R.sx(o.x + v), Y = v => R.sy(o.y + v);
      if (E.kind === 'chum') G.moveTo(X(me.x + d.x * P.chumFrom), Y(me.y + d.y * P.chumFrom)).lineTo(X(me.x + d.x * P.chumTo), Y(me.y + d.y * P.chumTo)).stroke({ color: yt.amber, width: 3, alpha: .7 });
      if (E.kind === 'slip') G.moveTo(X(me.x - d.x * P.slipBack), Y(me.y - d.y * P.slipBack)).lineTo(X(me.x - d.x * (P.slipBack + P.slipLen)), Y(me.y - d.y * (P.slipBack + P.slipLen))).stroke({ color: yt.cyan, width: 2, alpha: .5 });
      if (E.kind === 'frost') for (let i = 0; i < E.trail.length; i += 6) G.circle(X(E.trail[i].x), Y(E.trail[i].y), 3).fill({ color: yt.white, alpha: .5 });
    }
    if (o) for (const e of r.enemies) if (e.heldT > 0) { const ppm = Math.abs(R.sx(o.x + e.pos.x + 1) - R.sx(o.x + e.pos.x)); G.circle(R.sx(o.x + e.pos.x), R.sy(o.y + e.pos.y), (e.radius + .8) * ppm).stroke({ color: yt.cyan, width: 2, alpha: .8 }) }
    for (const f of r.trickFx || []) {
      f.t -= 1 / 60; if (f.t <= 0) continue; keep.push(f);
      if (f.lx != null && !o) continue;
      const wx = f.lx != null ? o.x + f.lx : f.x, wy = f.lx != null ? o.y + f.ly : f.y;
      const X = R.sx(wx), Y = R.sy(wy), ppm = Math.abs(R.sx(wx + 1) - X), k = 1 - f.t / f.life;
      if (f.kind === 'ring' || f.kind === 'cone') G.circle(X, Y, f.R * ppm * (.3 + .7 * k)).stroke({ color: yt.cyan, width: 3, alpha: .8 * (1 - k) });
      else if (f.kind === 'down') G.moveTo(X, Y).lineTo(X, Y + f.R * ppm * (.4 + .6 * k)).stroke({ color: 0x4aa8ff, width: 4, alpha: .8 * (1 - k) });
      else if (f.kind === 'splash') G.ellipse(X, Y, f.R * ppm * (.4 + .6 * k), f.R * ppm * .35).stroke({ color: 0x4aa8ff, width: 3, alpha: .9 * (1 - k) });
      else if (f.kind === 'anchor') { G.circle(X, Y, 6 + 4 * Math.sin(k * 30)).fill({ color: yt.white, alpha: .7 }); G.circle(X, Y, f.R * ppm * (1 - k)).stroke({ color: yt.white, width: 1.5, alpha: .35 }) }
    }
    r.trickFx = keep;
  }

  return { P, TRICKS, GUNS, offerId, gunsFor, IDS, SLOTS, SLOT_NAMES, STRETCH, on, state, level, add, move, bench, draw3, start, damage, affect, killed, fire, settle, step, onHit, entry, draw };
})();
var DemoStartTrick, DemoTrickTitle;  // the title screen's pick, and the three it shows
{const hd0=Hd;Hd=function(...a){const r=hd0(...a);if(Routine.on(r))Routine.start(r);return r}}
{const me0=ME;ME=function(r,t,e,i){me0(r,t,e,i);if(Routine.on(r)&&t?.kind==='air'&&i>0)Routine.step(r,t,i)}}
{const hit0=DEMO.hit;DEMO.hit=function(r,a){const hp=r.hp;hit0(r,a);if(r.hp<hp&&Routine.on(r))Routine.onHit(r)}}
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&(r?.trickFx?.length||r?.buoys?.length||r?.effects?.length||r?.enemies?.some(e=>e.heldT>0)))Routine.draw(R,r)}}

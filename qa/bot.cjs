// The test bot. Under water it carves (the carve build's controls): it dives to its style's depth, holds W until the
// nose reaches its launch angle, and lets go. A turn-round style holds W on past straight up, to the mirrored angle, so
// it comes out going the other way. In the air it plays like an average player: a decision about every 0.27 s, keys
// on or off, it keeps about 8 m from the nearest enemy, dodges enemies and the shots it notices, and picks up orbs
// when nothing is close. No tricks: it never presses A, D or S under water.

const deg = d => d * Math.PI / 180;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// launch angle x what it does with direction
const HEIGHTS = { high: { angle: 76, depth: 26 }, mid: { angle: 50, depth: 10 }, low: { angle: 26, depth: 4 } };
const STYLES = {};
for (const [h, H] of Object.entries(HEIGHTS)) for (const dir of ['keep', 'turn'])
  STYLES[h + '-' + dir] = { ...H, height: h, reverse: dir === 'turn' };

function rng(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

const KEEP = 8, DODGE = 7, SHOT = 6, DECIDE = .27, WATCH = 4, NOTICE = .75;

function flyer(G, styleName, seed, opts = {}) {
  const keep = opts.keep ?? KEEP;   // how far it holds from the nearest enemy (a Close build fights nearer)
  const st = STYLES[styleName];
  if (!st) throw Error('no style ' + styleName);
  const R = rng(seed * 2654435761), mem = { phase: 'dive', next: 0, keys: { x: 0, y: 0 }, seen: new Map() };
  return function (S) {
    const m = S.medium;
    if (m.kind === 'water') {
      if (mem.phase === 'air') mem.phase = 'dive';
      if (mem.phase === 'dive' && m.pos.y < -st.depth) { mem.phase = 'rise'; mem.r0 = S.time; }
      let w = false;
      if (mem.phase === 'rise') {
        // the game's own guide: the exit angle if it let go now (the ride-out keeps bending up after letting go).
        // In the frame of the side it faces, 0..pi; past pi/2 means it would come out going the other way.
        // It holds W until that reaches the style's angle (or the mirrored one, to turn round).
        if (S.time >= (mem.pt || 0)) {
          mem.pt = S.time + .1;
          const f = G.Orf.f < 0 ? -1 : 1, g = G.Orgp(S, m.pos, 1, 1), q = g && g.q != null && g.y === 0 ? g.q : null;
          mem.pred = q == null ? -9 : (f > 0 ? wrap(q) : wrap(Math.PI - q));
        }
        const want = deg(st.reverse ? 180 - st.angle : st.angle);
        // always press for a moment: a stay with no press at all sinks
        if (S.time - mem.r0 < .08 || mem.pred < want) w = true; else mem.phase = 'ride';
      }
      return { turn: 0, x: 0, y: 0, boost: mem.phase === 'rise', w };
    }
    mem.phase = 'air';
    if (S.time >= mem.next) {
      mem.next = S.time + DECIDE * (.5 + R());
      const me = m.local;
      const E = S.enemies.map(e => ({ e, d: Math.hypot(e.pos.x - me.x, e.pos.y - me.y) - (e.radius || 0) })).sort((a, b) => a.d - b.d).slice(0, WATCH);
      let vx = 0, vy = 0;
      if (E.length) { // hold about KEEP m from the nearest
        const t = E[0], dx = t.e.pos.x - me.x, dy = t.e.pos.y - me.y, n = Math.hypot(dx, dy) || 1, k = Math.max(-1, Math.min(1, (t.d - keep) / 4));
        vx += dx / n * k; vy += dy / n * k;
      }
      for (const { e, d } of E) if (d < Math.min(DODGE, keep)) { const dx = me.x - e.pos.x, dy = me.y - e.pos.y, c = Math.hypot(dx, dy) || 1, f = 2 * (DODGE - Math.max(0, d)) / DODGE; vx += dx / c * f; vy += dy / c * f; }
      for (const sh of S.shots) if (sh.weapon === 'hostile') {
        if (!mem.seen.has(sh.id)) mem.seen.set(sh.id, R() < NOTICE);
        if (!mem.seen.get(sh.id)) continue;
        const dx = me.x - sh.pos.x, dy = me.y - sh.pos.y, d = Math.hypot(dx, dy);
        if (d < SHOT && d > .01) { const f = 3 * (SHOT - d) / SHOT; vx += dx / d * f; vy += dy / d * f; }
      }
      if (!E.length || E[0].d > DODGE * 1.4) { // sweep up orbs when it's safe
        let best = null, bd = 16; for (const o of S.eorbs || []) { const d = Math.hypot(o.x - me.x, o.y - me.y); if (d < bd) { bd = d; best = o; } }
        if (best && bd > .5) { vx += (best.x - me.x) / bd; vy += (best.y - me.y) / bd; }
      }
      mem.keys = { x: Math.abs(vx) > .35 ? Math.sign(vx) : 0, y: Math.abs(vy) > .35 ? Math.sign(vy) : 0 };
      if (mem.seen.size > 3000) mem.seen.clear();
    }
    return { turn: 0, x: mem.keys.x, y: mem.keys.y, boost: false, w: false };
  };
}

module.exports = { STYLES, flyer };

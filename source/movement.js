// Brotato-style enemy movement (designer, 2026-10-30; base game only, not the DLC). In Brotato most enemies chase, but
// some keep their distance, some fly to random points around the player and some hold their own offset from the player.
// Without these every enemy crowds the dolphin, so the guns always have a crowd and the placement tricks add little
// (qa/placement.cjs). ICARUS's existing kinds take the base-game roles, at Brotato's distances scaled by player speed
// (Brotato's player moves 450 px/s, the dolphin 34.2 m/s in the air: 1 px ≈ 0.076 m):
// - turret → keep range like a Spitter: 300 ± 100 px ≈ 23 ± 8 m away, backing off when you close in (it still shoots);
// - drifter → random points around you like a Fly: 150 ± 50 px ≈ 11 ± 4 m, picking a new point on arrival;
// - splitter → its own fixed offset like a Slasher: up to 300 px ≈ 23 m around you, kept as you move;
// - elites (not chargers, which keep their dash) → random points around you like a Gargoyle: 23 ± 8 m.
// Chasers, swarmers and chargers chase as before. The movement replaces v3's steering for these enemies only, at their
// own speed, behind DEMO.tune.moves. All randomness comes from the run's seeded generator (ce).
var Movement = (() => {
  const PX = 34.2 / 450;                                  // metres per Brotato pixel
  const ROLES = Object.freeze({
    keep:   { range: 300 * PX, spread: 100 * PX },       // Spitter
    around: { range: 150 * PX, spread: 50 * PX },        // Fly
    offset: { range: 300 * PX },                          // Slasher
    elite:  { range: 300 * PX, spread: 100 * PX }        // Gargoyle
  });
  const on = r => !!(DEMO.tune.moves && r?.demo);
  // which role an enemy plays, fixed when first seen
  function role(r, e) {
    if (e.mv !== undefined) return e.mv?.role || null;
    let k = null;
    if (e.boss === 'elite') k = e.kind === 'charger' ? null : 'elite';
    else if (e.role || e.boss) k = null;
    else k = e.kind === 'turret' ? 'keep' : e.kind === 'drifter' ? 'around' : e.kind === 'splitter' ? 'offset' : null;
    if (!k) { e.mv = null; return null }
    const R = ROLES[k];
    e.mv = { role: k, range: R.range + (R.spread ? (ce(r) * 2 - 1) * R.spread : 0) };
    if (k === 'offset') e.mv.off = { x: (ce(r) * 2 - 1) * R.range, y: (ce(r) * 2 - 1) * R.range };
    return k;
  }
  const speed = (r, e) => (e.kind === 'swarmer' ? 25 * Osp.small : 19 + r.wave * .13) * Osp.spd * (typeof FiveCombat !== 'undefined' ? FiveCombat.movementScale(r, e) : 1);
  function pick(r, e, me) { const a = ce(r) * Math.PI * 2, d = e.mv.role === 'around' || e.mv.role === 'elite' ? ROLES[e.mv.role].range + (ce(r) * 2 - 1) * ROLES[e.mv.role].spread : e.mv.range; e.mv.pt = { x: me.x + Math.cos(a) * d, y: me.y + Math.sin(a) * d } }
  // where this enemy wants to be now, in the arena
  function target(r, e, me) {
    const k = e.mv.role;
    if (k === 'keep') { const dx = e.pos.x - me.x, dy = e.pos.y - me.y, n = Math.hypot(dx, dy) || 1; return { x: me.x + dx / n * e.mv.range, y: me.y + dy / n * e.mv.range } }
    if (k === 'offset') return { x: me.x + e.mv.off.x, y: me.y + e.mv.off.y };
    if (!e.mv.pt || Math.hypot(e.mv.pt.x - e.pos.x, e.mv.pt.y - e.pos.y) < 1.5) pick(r, e, me);
    return e.mv.pt;
  }
  // around v3's enemy step: note each role enemy's velocity before it, then steer it to its own target instead
  function before(r) { for (const e of r.enemies) if (e.hp > 0 && role(r, e)) e.mv.v0 = { x: e.velocity.x, y: e.velocity.y } }
  function after(r, m, dt) {
    const me = m.local, k = Xe(dt, .3);
    for (const e of r.enemies) {
      if (!e.mv?.v0 || e.hp <= 0) continue;
      if (e.heldT > 0 || e.st?.frozen > 0 || e.driveT > 0 || e.knockT > 0) { e.mv.v0 = null; continue }   // tricks and statuses win
      const T = target(r, e, me), dx = T.x - e.pos.x, dy = T.y - e.pos.y, d = Math.hypot(dx, dy), s = speed(r, e) * Math.min(1, d / 3);
      const want = d > .05 ? { x: dx / d * s, y: dy / d * s } : { x: 0, y: 0 };
      const v = { x: e.mv.v0.x + (want.x - e.mv.v0.x) * k, y: e.mv.v0.y + (want.y - e.mv.v0.y) * k };
      // v3 already moved it this step with its own velocity: correct the position to the role's velocity
      e.pos = ye(e.pos.x + (v.x - e.velocity.x) * dt, e.pos.y + (v.y - e.velocity.y) * dt); e.velocity = v; e.mv.v0 = null;
    }
  }
  return { PX, ROLES, on, role, before, after };
})();
{const me0=ME;ME=function(r,t,e,i){const on=Movement.on(r)&&t?.kind==='air'&&i>0;if(on)Movement.before(r);me0(r,t,e,i);if(on)Movement.after(r,t,i)}}

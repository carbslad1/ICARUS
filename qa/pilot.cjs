// A human-like pilot for the camera rules (docs/CAMERA_RULES.md). It decides from what it saw REACT s ago (a player's
// reaction time), steers under water by holding a turn key until the nose is near its target heading (D turns
// clockwise, A anticlockwise, as the keys do), and can hold a key through the breach as a player choosing a trick does.
//   plan: { depth, angle, flip, hold, loop }
//     depth  dive to this depth (m) before turning up; angle  launch angle above the horizontal (degrees)
//     flip   reverse direction under water every swim; hold  'down' (S) or 'right' (D): held from 0.3 s before the
//     breach to 1 s into the flight; loop  hold D under water and never breach
const REACT = .18;
const deg = d => d * Math.PI / 180, wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

function pilot(H, plan, seed = 1) {
  let s = seed * 2654435761 % 2147483647 || 7;
  const rnd = () => (s = s * 16807 % 2147483647) / 2147483647;
  const seen = [], mem = { phase: 'dive', dir: 1, hold: 0, air: 0, swims: 0, react: REACT * (.85 + .3 * rnd()) };
  return function (r) {
    const m = r.medium, now = r.time;
    seen.push({ t: now, kind: m.kind, y: m.kind === 'water' ? m.pos.y : 1, vy: m.kind === 'water' ? m.velocity.y : 0, vx: m.kind === 'water' ? m.velocity.x : m.vx, heading: m.heading });
    while (seen.length > 2 && seen[1].t <= now - mem.react) seen.shift();
    const v = seen[0];                                             // what the pilot reacts to
    const keys = { turn: 0, x: 0, y: 0, boost: false, w: false };
    if (m.kind !== 'water') {
      if (mem.phase !== 'air') { mem.phase = 'air'; mem.air = 0 }
      mem.air += 1 / 120;
      if (plan.hold && mem.air < 1) { if (plan.hold === 'down') keys.y = -1; else keys.x = 1 }
      return keys;
    }
    if (mem.phase === 'air') { mem.phase = 'dive'; mem.swims++; mem.dir = Math.sign(m.velocity.x) || mem.dir; if (plan.flip) mem.dir = -mem.dir }
    if (plan.loop) return { turn: -1, x: 1, y: 0, boost: false, w: false };
    if (mem.phase === 'dive' && v.kind === 'water' && v.y < -plan.depth) mem.phase = 'rise';
    const a = mem.phase === 'dive' ? -deg(55) : deg(plan.angle), want = mem.dir > 0 ? a : Math.PI - a, d = wrap(want - m.heading);
    // a human holds the key until the nose is near, with a little slop
    if (Math.abs(d) > deg(3 + 3 * rnd())) mem.hold = Math.sign(d); else if (Math.abs(d) < deg(1.5)) mem.hold = 0;
    keys.turn = mem.hold; keys.x = -mem.hold;
    if (plan.hold && mem.phase === 'rise' && m.velocity.y > 0 && -m.pos.y / m.velocity.y < .3) { if (plan.hold === 'down') keys.y = -1; else keys.x = 1 }
    return keys;
  };
}
module.exports = { pilot, REACT };

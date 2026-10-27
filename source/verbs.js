// Step 3 of the build-and-playtest plan (ICARUS_DESIGN.md §4.18, §4.20): flight verbs. Designer's answers, 2026-10-27.
// - Stomp-bounce: coming down onto an enemy from above (moving down in the frame, relative to it) kills it and costs
//   no HP, and lifts the whole flight: DEMO.tune.hop m/s (6) is added to the arc's upward speed, so a chain of stomps
//   extends air time and moves the landing spot. Elites and bosses take 3x contact damage instead of dying. A stomp
//   gives back one dash charge.
// - Dive: holding S on the way down multiplies the flight's fall gravity by DEMO.tune.dive (2), so you choose where you
//   land. S still moves you down in the frame as before; on the way up it does nothing extra.
// - Dash (Space, in the air only): 3.5 m in 0.12 s the way you steer (or the way you move or face), untouchable
//   throughout, ramming every enemy it passes through for 3x contact damage (9 + wave/5). DEMO.tune.dashes charges
//   (2), all back at each water entry. A press in the last carve.arm s before the water only arms the carve (Space
//   held into the splash carves), so it never dashes you into the water by accident.
// Contact damage is v3's (9 + wave/5); the kills go through DEMO.damage like any weapon's, with weapon 'stomp' or 'ram'.
var Verbs = (() => {
  const PROFILE = Object.freeze({
    dashDist: 3.5,          // m
    dashTime: .12,          // s
    ramScale: 3,            // x contact damage
    stompMargin: .3,        // m added to the contact distance for a stomp
    stompAbove: .25,        // m the dolphin must be above the enemy's centre
    stompClose: 1,          // m/s the dolphin must be closing downward on the enemy, in the frame
    stompGuard: .15         // s untouchable after a stomp
  });
  const on = r => !!(DEMO.tune.verbs && r?.demo);
  const count = r => r.verbCount || (r.verbCount = { stomps: 0, dashes: 0, rams: 0, dives: 0 });
  const contact = r => 9 + Math.floor(r.wave / 5);
  const charges = r => (r.dashes ??= Math.round(DEMO.tune.dashes));
  const big = e => e.role === 'boss' || e.boss === 'boss' || e.boss === 'elite';

  // before v3's enemy step (so a stomp beats the contact damage it would otherwise deal)
  function stomp(r, m) {
    const P = PROFILE, me = m.local, v = m.velocity || { x: 0, y: 0 };
    for (const e of [...r.enemies]) {
      if (e.hp <= 0 || !r.enemies.includes(e)) continue;
      const d = Math.hypot(e.pos.x - me.x, e.pos.y - me.y);
      if (d > e.radius + 1 + P.stompMargin || me.y < e.pos.y + P.stompAbove || v.y - (e.velocity?.y || 0) > -P.stompClose) continue;
      DEMO.damage(r, e, big(e) ? contact(r) * P.ramScale : e.hp, 'stomp');
      m.vy += +DEMO.tune.hop || 0;
      m.velocity = { x: v.x, y: Math.max(0, v.y) };
      r.hurt = Math.max(r.hurt || 0, P.stompGuard);
      r.dashes = Math.min(Math.round(DEMO.tune.dashes), charges(r) + 1);
      count(r).stomps++;
      r.events.push({ kind: 'stomp', pos: he(r) });
      return;
    }
  }

  // before the air step: the dive's extra gravity and a dash's start
  function before(r, m, input, dt) {
    if (input.y < -.5 && m.vy < 0 && DEMO.tune.dive > 1) { m.vy += ai * (DEMO.tune.dive - 1) * dt; count(r).dives += dt }
    const press = !!input.dash && !r.dashHeld;
    r.dashHeld = !!input.dash;
    if (!press || r.dashT > 0 || charges(r) <= 0) return;
    const yd = m.origin.y + m.local.y, vd = m.vy + m.velocity.y;
    if (Ocv.arm > 0 && vd < 0 && yd < -vd * Ocv.arm) return;
    let dx = input.x || 0, dy = input.y || 0;
    if (Math.hypot(dx, dy) < .3) { dx = m.velocity.x; dy = m.velocity.y }
    if (Math.hypot(dx, dy) < 1) { dx = Math.sign(m.vx) || 1; dy = 0 }
    const n = Math.hypot(dx, dy);
    r.dashDir = { x: dx / n, y: dy / n }; r.dashT = PROFILE.dashTime; r.dashHit = [];
    r.dashes--; count(r).dashes++;
    r.events.push({ kind: 'dash', pos: he(r) });
  }

  // after the air step: the dash moves you, keeps you untouchable and rams what it passes
  function after(r, m, dt) {
    if (!(r.dashT > 0)) return;
    const P = PROFILE, step = Math.min(dt, r.dashT), sp = P.dashDist / P.dashTime, a = m.local;
    const hw = Jt.width / 2 - 1.6, hh = Jt.height / 2 - 1.6;
    const b = ye(Math.max(-hw, Math.min(hw, a.x + r.dashDir.x * sp * step)), Math.max(-hh, Math.min(hh, a.y + r.dashDir.y * sp * step)));
    for (const e of [...r.enemies]) {
      if (r.dashHit.includes(e.id) || e.hp <= 0) continue;
      if (ew(e.pos, a, b) < e.radius + 1) { r.dashHit.push(e.id); count(r).rams++; DEMO.damage(r, e, contact(r) * P.ramScale, 'ram') }
    }
    m.local = b;
    r.dashT -= step;
    r.hurt = Math.max(r.hurt || 0, r.dashT + .02);
  }

  // at each water entry the charges come back and any dash ends
  function land(r) { r.dashes = Math.round(DEMO.tune.dashes); r.dashT = 0 }

  // dash charges as pips under the dolphin
  function draw(R, r, m) {
    const G = R.telegraphs, n = Math.round(DEMO.tune.dashes), have = charges(r);
    if (n <= 0) return;
    const X = R.sx(m.origin.x + m.local.x), Y = R.sy(m.origin.y + m.local.y) + 34;
    for (let k = 0; k < n; k++) {
      const x = X + (k - (n - 1) / 2) * 12;
      k < have ? G.circle(x, Y, 3.5).fill({ color: yt.cyan, alpha: .85 }) : G.circle(x, Y, 3.5).stroke({ color: yt.cyan, width: 1.5, alpha: .4 });
    }
  }

  return { PROFILE, on, count, stomp, before, after, land, draw };
})();
// input: Space is the dash key in the air (bots pass dash themselves)
{const nf0=nf;nf=function(){const o=nf0();return{...o,dash:It.has(' ')}}}
{const me0=ME;ME=function(r,t,e,i){if(Verbs.on(r)&&t?.kind==='air'&&i>0)Verbs.stomp(r,t);return me0(r,t,e,i)}}
{const se0=SE;SE=function(r,t,e,i,s){if(!Verbs.on(r)||!(i>0))return se0(r,t,e,i,s);Verbs.before(r,t,e,i);const out=se0(r,t,e,i,s);if(r.medium===t&&t.kind==='air')Verbs.after(r,t,i);return out}}
{const draw0=Otdraw;Otdraw=function(R,r,m,title){draw0(R,r,m,title);if(!title&&m?.kind==='air'&&Verbs.on(r))Verbs.draw(R,r,m)}}

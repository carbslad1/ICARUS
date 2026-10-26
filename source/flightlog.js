// Flight log: records what happens in each flight (positions, enemies, input, kills, hits) and the shop actions
// taken, so a real run can be exported as JSON and studied. Observation only: it reads state and never changes it.
var FlightLog = (() => {
  const VERSION = 1, AIR_EVERY = 12, WATER_EVERY = 6, MAX_SAMPLES = 40000, NEAR = 60;
  const r1 = v => Math.round(v * 10) / 10, deg = a => r1(a * 180 / Math.PI);
  let log = null, run = null, flight = null, dive = [], tick = 0, samples = 0, prev = null;
  function reset(r) {
    run = r; flight = null; dive = []; tick = 0; samples = 0;
    prev = { kind: r.medium.kind, kills: r.kills, hp: r.hp, hits: 0, wave: r.wave, history: 0 };
    log = { format: 'icarus-flightlog', version: VERSION, build: globalThis.icarusDemo?.version || 'demo', exported: null,
      starter: r.starter ?? null, seed: r.seed ?? null, units: 'metres, seconds, degrees. x,y: dolphin world position; o: arena origin; l: dolphin arena-local position; en: [kind, local x, local y, hp]; pu: pursuers [world x, world y, wet]; in: [x, y, boost, w, turn]; kills and hits record the dolphin position',
      waves: [], flights: [], shop: [], end: null };
  }
  function input(i) { return i ? [r1(i.x || 0), r1(i.y || 0), i.boost ? 1 : 0, i.w ? 1 : 0, r1(i.turn || 0)] : null }
  function sample(r, i) {
    const m = r.medium, p = he(r), s = { t: r1(r.time), k: m.kind === 'air' ? 'a' : 'w', x: r1(p.x), y: r1(p.y), hp: Math.round(r.hp), in: input(i) };
    if (m.kind === 'air') {
      s.o = [r1(m.origin.x), r1(m.origin.y)]; s.l = [r1(m.local.x), r1(m.local.y)];
      s.ph = r.hand ? DEMO.phase(r) : null;
      if (samples < MAX_SAMPLES) s.en = r.enemies.filter(e => Math.hypot(e.pos.x - m.local.x, e.pos.y - m.local.y) <= NEAR).map(e => [e.kind, r1(e.pos.x), r1(e.pos.y), Math.round(e.hp)]);
    } else s.v = [r1(m.velocity.x), r1(m.velocity.y)];
    if (samples < MAX_SAMPLES) s.pu = (r.pursuers || []).map(q => [r1(q.x), r1(q.y), q.wet ? 1 : 0]);
    samples++; return s;
  }
  function openFlight(r) {
    const m = r.medium, a = Math.atan2(m.vy, Math.abs(m.vx));
    flight = { wave: r.wave, t0: r1(r.time), launch: { angle: deg(a), speed: r1(Math.hypot(m.vx, m.vy)) }, tier: r.tier ?? null,
      water: prev.waterStart != null ? r1(r.time - prev.waterStart) : null, dive, kills: [], hits: [], samples: [] };
    dive = [];
  }
  function closeFlight(r) {
    if (!flight) return;
    const d = r.demo, last = d.history.length > prev.history ? d.history.at(-1) : null;
    flight.dur = r1(r.time - flight.t0); flight.peak = r1(r.flightBest ?? 0);
    flight.bank = last ? { chips: last.chips, mult: last.mult, score: last.score, busted: !!last.busted, bails: (last.bails || []).length, tricks: last.cards } : null;
    flight.pursuersAtEntry = (r.pursuers || []).length;
    log.flights.push(flight); flight = null;
  }
  function step(r, i) {
    if (!r?.demo) return;
    if (r !== run) reset(r);
    const m = r.medium, d = r.demo, hits = d.waveTelemetry?.hits || 0;
    if (r.wave !== prev.wave) { prev.wave = r.wave; prev.hits = 0; prev.history = 0 }
    if (prev.kind === 'air' && m.kind === 'water') { closeFlight(r); prev.waterStart = r.time }
    if (prev.kind === 'water' && m.kind === 'air') openFlight(r);
    if (prev.waterStart == null && m.kind === 'water') prev.waterStart = r.time;
    if (flight) {
      const p = he(r);
      for (let k = prev.kills; k < r.kills; k++) flight.kills.push({ t: r1(r.time - flight.t0), x: r1(p.x), y: r1(p.y), ph: r.hand ? DEMO.phase(r) : null });
      if (hits > prev.hits) flight.hits.push({ t: r1(r.time - flight.t0), hp: Math.round(r.hp), lost: Math.round(prev.hp - r.hp), ph: r.hand ? DEMO.phase(r) : null });
    }
    prev.kills = r.kills; prev.hits = hits; prev.hp = r.hp; prev.history = d.history.length; prev.kind = m.kind;
    tick++;
    if (r.mode === 'playing' && tick % (m.kind === 'air' ? AIR_EVERY : WATER_EVERY) === 0) {
      const s = sample(r, i);
      (flight ? flight.samples : dive).push(s);
    }
    if (r.mode !== 'playing' && !log.end && ['dead', 'won'].includes(r.mode)) { closeFlight(r); log.end = { mode: r.mode, wave: r.wave, reason: r.endReason || null, kills: r.kills } }
  }
  function waveEnd(r) {
    if (!log || r !== run) return;
    closeFlight(r);
    log.waves.push({ wave: r.wave, score: r.wscore, quota: r.quota, hp: Math.round(r.hp), maxHp: Math.round(r.stats.maxHp), kills: r.kills, slots: r.slots.map(g => g.id + g.lvl) });
  }
  function command(r, a, i, ok) {
    if (!log || r !== run) return;
    const o = a === 'buy' ? r.demo.offers.find(x => String(x.uid) === String(i)) : null;
    log.shop.push({ wave: r.wave, action: a, index: i ?? null, ok: !!ok, item: o ? { id: o.id, row: o.row, price: o.price } : null, pearls: r.xp });
  }
  function exportJSON() { if (!log) return null; log.exported = new Date().toISOString(); return JSON.stringify(log) }
  function download() {
    const text = exportJSON(); if (!text) { Ye('No flight log yet: play a flight first'); return }
    const a = document.createElement('a'), url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.href = url; a.download = `icarus-flightlog-wave${run?.wave ?? 0}.json`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); Ye(`Flight log saved: ${log.flights.length} flights`);
  }
  return { step, waveEnd, command, exportJSON, download, get log() { return log } };
})();
{const sw1=sw;sw=function(r,input,dt){const mode=r.mode,wave=r.wave;sw1(r,input,dt);if(r.demo&&mode==='playing'&&(r.mode!=='playing'||r.wave!==wave))FlightLog.waveEnd(r);FlightLog.step(r,input)}}
{const cmd0=DEMO.command;DEMO.command=function(r,a,i){const ok=cmd0(r,a,i);FlightLog.command(r,a,i,ok);return ok}}
{const button=()=>DemoButton('flightlog','','SAVE FLIGHT LOG'),bind=()=>{for(const b of hr.querySelectorAll('[data-demo="flightlog"]'))b.onclick=()=>FlightLog.download()};
 const ls0=ls;ls=function(){ls0();hr.querySelector('.pause-modal .modal-actions')?.insertAdjacentHTML('beforeend',button());bind()};
 const jl0=jl;jl=function(){jl0();hr.querySelector('.summary-panel')?.insertAdjacentHTML('beforeend',button());bind()}}
globalThis.icarusDemo.flightLog=()=>FlightLog.exportJSON();

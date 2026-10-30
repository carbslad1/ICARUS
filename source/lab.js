// Trick Lab (docs/TRICK_LAB.md; designer, 2026-10-30): play one trick at a time and tune how it feels.
// A title-screen button opens it: pick the trick, its slot and level, two guns and a wave; options to not die, to hold
// the air clock (an endless wave) and for the Brotato enemy movement; live sliders for the trick's numbers (Routine.P).
// In a lab run, B switches the trick off and on so the two can be felt back to back, and a readout after each flight
// shows the launch angle and style, air time, the enemies the trick touched, and kills (and how many it had placed).
// Saved in this browser (icarus.lab). Only a run started from the lab uses it.
var Lab = (() => {
  const KEY = 'icarus.lab';
  // the live numbers each trick exposes: [key in Routine.P (or tune:key in DEMO.tune), label, min, max, step]
  const PARAMS = {
    eddy: [['eddyR', 'Reach (m)', 6, 30, .5], ['eddyRing', 'Ring radius (m)', 2.5, 6, .1], ['eddyT', 'Lasts (s)', .5, 4, .1], ['eddySpin', 'Spin (m/s)', 0, 25, .5]],
    anchor: [['anchorR', 'Reach around the target (m)', 8, 40, 1], ['anchorT', 'Lasts (s)', .5, 4, .1], ['anchorKeep', 'Leaves alone within (m)', 0, 8, .5], ['tune:well', 'Pull (m/s²)', 0, 150, 5]],
    riptide: [['ripR', 'Reach (m)', 8, 35, 1], ['ripLow', 'Only enemies below (m altitude)', 3, 25, 1], ['ripPull', 'Drag down (m/s²)', 20, 250, 5], ['ripT', 'Lasts (s)', .3, 3, .1]],
    buoys: [['buoyTouch', 'Reach (m)', .5, 5, .1]],
    bubble: [['bubbleR', 'Reach (m)', 3, 20, .5], ['bubbleT', 'Holds (s)', .2, 3, .1]],
    chum: [['chumR', 'Reach (m)', 8, 35, 1], ['chumPull', 'Pull (m/s²)', 10, 200, 5], ['chumT', 'Lasts (s)', .5, 4, .1]],
    slip: [['slipR', 'Reach (m)', 8, 35, 1], ['slipPull', 'Pull (m/s²)', 10, 200, 5], ['slipT', 'Lasts (s)', .5, 4, .1]],
    bow: [['bowR', 'Reach (m)', 5, 30, .5], ['bowPush', 'Push (m/s)', 5, 60, 1]],
    breach: [['breachR', 'Reach (m)', 5, 35, 1], ['breachLift', 'Lift (m/s)', 5, 50, 1]],
    frost: [['frostT', 'Lasts (s)', .5, 5, .1], ['frostR', 'Trail width (m)', .5, 6, .1]],
    flop: [['flopR', 'Reach sideways (m)', 2, 15, .5], ['flopDrive', 'Drive down (m/s)', 10, 80, 1], ['flopT', 'Drives for (s)', .2, 2, .1]],
    spout: [['spoutR0', 'Splash radius (m)', 1, 12, .5], ['spoutMax', 'Largest splash (m)', 4, 25, .5]],
    undertow: [['undertowR', 'Reach (m)', 4, 30, 1], ['undertowLow', 'Only enemies below (m altitude)', 1, 15, .5]]
  };
  const blank = () => ({ trick: 'eddy', slot: null, level: 1, guns: ['fin', 'sonic'], tier: 1, wave: 5, immortal: 1, endless: 1, moves: 1, params: {} });
  let cfg = blank(), active = false, off = false;
  try { cfg = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)) } catch (e) {} };
  const get = k => k.startsWith('tune:') ? DEMO.tune[k.slice(5)] : Routine.P[k];
  function setParam(k, v) { cfg.params[k] = v; if (k.startsWith('tune:')) DEMO.tune[k.slice(5)] = v; else Routine.P[k] = v }
  // the slider values apply in the lab (panel and lab runs) only; the title puts the defaults back (reset)
  const wellDefault = DEMO.tune.well;
  function applyParams() { Object.assign(Routine.P, Routine.DEFAULTS); DEMO.tune.well = wellDefault; for (const [k, v] of Object.entries(cfg.params)) setParam(k, v) }
  function reset() { Object.assign(Routine.P, Routine.DEFAULTS); DEMO.tune.well = wellDefault }
  const slotOf = () => cfg.slot || Routine.TRICKS[cfg.trick]?.slot || 'apex';

  // a lab run: the guns, the one trick, the wave
  function apply(r) {
    if (!active || !r?.demo) return r;
    const d = r.demo;
    r.slots = cfg.guns.filter(id => DEMO.weapons[id]).map(id => { const g = Owslot(id, cfg.tier, ++d.uid); g.paid = 0; g.cd = 0; return g });
    d.routine = { slots: { [slotOf()]: cfg.trick }, levels: { [cfg.trick]: cfg.level } };
    if (cfg.wave !== r.wave) { r.wave = cfg.wave; DEMO.wave(r) }
    DEMO.sync(r); r.hp = r.stats.maxHp; r.lab = { flights: [], off: false };
    return r;
  }
  // B: the trick off and on in a lab run
  function toggle(r) { if (!r?.lab) return; off = !off; r.lab.off = off; const S = r.demo.routine; S.slots = off ? {} : { [slotOf()]: cfg.trick }; readout(r, off ? `${Routine.TRICKS[cfg.trick].name} OFF (B to switch back on)` : `${Routine.TRICKS[cfg.trick].name} ON`) }

  // the readout after each flight, and a running average per jump style, split by trick on and off
  const style = deg => deg < 40 ? 'low' : deg < 67 ? 'mid' : 'high';
  function flight(r) {
    const h = r.hand; if (!r.lab || !h) return;
    const deg = Math.round(Math.abs(Math.atan2(Math.sin(h.launch.angle), Math.abs(Math.cos(h.launch.angle)))) * 180 / Math.PI), t = (h.tricks || []).find(x => x.id === cfg.trick);
    const f = { deg, style: style(deg), air: +(h.activeAir || h.air || 0).toFixed(1), touched: t?.hits || 0, kills: h.kills.length, placed: h.kills.filter(k => k.placed).length, drowned: h.kills.filter(k => k.surface === 'water').length, hits: h.hits, on: !r.lab.off };
    r.lab.flights.push(f);
    const rows = ['low', 'mid', 'high'].map(s => { const on = r.lab.flights.filter(x => x.style === s && x.on), offs = r.lab.flights.filter(x => x.style === s && !x.on); const k = L => L.length ? (L.reduce((a, x) => a + x.kills, 0) / L.reduce((a, x) => a + x.air, 0)).toFixed(1) : '–'; return `${s}: ${k(on)} kills/air-s on (${on.length})${offs.length ? ` · ${k(offs)} off (${offs.length})` : ''}` });
    readout(r, `${f.on ? Routine.TRICKS[cfg.trick].name : 'NO TRICK'} · launch ${deg}° (${f.style}) · ${f.air} s in the air\nmoved ${f.touched} · kills ${f.kills} (${f.placed} it placed${f.drowned ? `, ${f.drowned} drowned` : ''}) · hits ${f.hits}\n${rows.join('\n')}`);
  }
  function readout(r, text) {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('lab-readout');
    if (!el) { el = document.createElement('div'); el.id = 'lab-readout'; document.body.appendChild(el) }
    el.textContent = 'TRICK LAB · B: trick off/on\n' + text; el.hidden = false;
  }

  // the panel
  const E = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const opt = (v, label, sel) => `<option value="${E(v)}" ${sel ? 'selected' : ''}>${E(label)}</option>`;
  function html() {
    const T = Routine.TRICKS, order = [...Routine.FOCUS, ...Routine.IDS.filter(id => !Routine.FOCUS.includes(id))], X = T[cfg.trick];
    const sliders = (PARAMS[cfg.trick] || []).map(([k, label, lo, hi, st]) => { const v = +get(k); return `<label class="lab-slider">${E(label)} <input type="range" min="${lo}" max="${hi}" step="${st}" value="${v}" data-param="${k}"><b>${v}</b></label>` }).join('');
    const gunSel = i => `<select data-lab="gun${i}">${opt('', '— none —', !cfg.guns[i])}${Object.keys(DEMO.weapons).map(id => opt(id, `${Owc[id]?.name || id} · ${DEMO.weapons[id].type}`, cfg.guns[i] === id)).join('')}</select>`;
    return `<div class="lo-panel lab-panel" role="dialog" aria-label="Trick lab"><header><b>TRICK LAB</b><button data-lab-close>✕</button></header>
      <small class="lo-desc">One trick at a time. Tune it until it feels right, then check it with <code>node qa/jumpstyle.cjs ${E(cfg.trick)}</code>. In the run, B switches the trick off and on.</small>
      <section><h4>Trick</h4><label>Trick <select data-lab="trick">${order.map(id => opt(id, T[id].name + (Routine.FOCUS.includes(id) ? '' : ' (parked)'), id === cfg.trick)).join('')}</select></label>
        <label>Slot <select data-lab="slot">${opt('', 'natural (' + Routine.SLOT_NAMES[X.slot] + ')', !cfg.slot)}${Routine.SLOTS.map(s => opt(s, Routine.SLOT_NAMES[s], cfg.slot === s)).join('')}</select></label>
        <label>Level <select data-lab="level">${[1, 2, 3, 4].map(l => opt(l, 'L' + l, cfg.level === l)).join('')}</select></label>
        <small class="lo-desc lo-wide">${E(X.kind === 'water' ? 'Water' : 'Effect')} · helps ${E(X.helps)}: ${E(X.text)}</small></section>
      <section><h4>Its numbers (live)</h4>${sliders || '<small class="lo-desc">No sliders for this trick yet.</small>'}<button data-lab-defaults class="lo-wide">DEFAULT NUMBERS</button></section>
      <section><h4>Guns and wave</h4><label>Gun 1 ${gunSel(0)}</label><label>Gun 2 ${gunSel(1)}</label><label>Tier <select data-lab="tier">${[1, 2, 3, 4].map(l => opt(l, 'T' + l, cfg.tier === l)).join('')}</select></label><label>Wave <input type="number" min="1" max="20" data-lab="wave" value="${cfg.wave}"></label></section>
      <section><h4>Options</h4><label class="lo-check"><input type="checkbox" data-lab="immortal" ${cfg.immortal ? 'checked' : ''}> Can't die (hits still count)</label><label class="lo-check"><input type="checkbox" data-lab="endless" ${cfg.endless ? 'checked' : ''}> Endless wave (air clock held)</label><label class="lo-check"><input type="checkbox" data-lab="moves" ${cfg.moves ? 'checked' : ''}> Brotato enemy movement</label></section>
      <footer><button data-lab-close>CLOSE</button><button data-lab-start class="lo-done">START LAB RUN ↗</button></footer></div>`;
  }
  function read(panel) {
    const v = n => panel.querySelector(`[data-lab="${n}"]`);
    const trick = v('trick').value; if (trick !== cfg.trick) { cfg.trick = trick; cfg.slot = null; const g = Routine.GUNS[trick]; if (g) cfg.guns = g.slice(0, 2) } else cfg.slot = v('slot').value || null;
    cfg.level = +v('level').value; cfg.guns = [v('gun0')?.value, v('gun1')?.value].filter(Boolean); cfg.tier = +v('tier').value; cfg.wave = Math.max(1, Math.min(20, +v('wave').value || 1));
    for (const k of ['immortal', 'endless', 'moves']) cfg[k] = v(k).checked ? 1 : 0;
    save();
  }
  function open() {
    close(); applyParams(); const wrap = document.createElement('div'); wrap.id = 'trick-lab'; wrap.className = 'lo-scrim'; wrap.innerHTML = html(); document.body.appendChild(wrap);
    const panel = wrap.querySelector('.lab-panel');
    panel.addEventListener('change', e => { if (e.target.dataset.param) return; read(panel); open() });
    for (const s of panel.querySelectorAll('[data-param]')) s.oninput = () => { setParam(s.dataset.param, +s.value); s.nextElementSibling.textContent = s.value; save() };
    panel.querySelector('[data-lab-defaults]').onclick = () => { cfg.params = {}; applyParams(); save(); open() };
    for (const b of wrap.querySelectorAll('[data-lab-close]')) b.onclick = () => close();
    panel.querySelector('[data-lab-start]').onclick = () => { read(panel); close(); start() };
  }
  function close() { document.getElementById('trick-lab')?.remove() }
  function start() { active = true; off = false; DEMO.tune.moves = cfg.moves; applyParams(); if (typeof Zd === 'function') Zd(typeof En !== 'undefined' ? En : 'harpoon') }
  const button = () => `<button class="lo-open lab-open" data-lab-open>⚗ TRICK LAB</button>`;
  return { PARAMS, reset, apply, toggle, flight, open, close, start, button, get config() { return cfg }, get active() { return active }, set active(v) { active = v } };
})();
{const hd0=Hd;Hd=function(...a){return Lab.apply(hd0(...a))}}
// can't die and endless wave in a lab run; B toggles the trick
{const hit0=DEMO.hit;DEMO.hit=function(r,a){hit0(r,a);if(r?.lab&&Lab.config.immortal&&r.hp<=0){r.hp=1;if(r.mode==='dead'){r.mode='playing';r.endReason=null}}}}
{const me0=ME;ME=function(r,t,e,i){if(r?.lab&&Lab.config.endless)r.budget=Math.max(r.budget,5);return me0(r,t,e,i)}}
{const bank0=DEMO.bank;DEMO.bank=function(r){const h=r.hand;bank0(r);if(r?.lab&&h)Lab.flight(r)}}
{if(typeof window!=='undefined')window.addEventListener('keydown',e=>{if(e.key==='b'||e.key==='B'){if(typeof S!=='undefined'&&S?.lab){Lab.toggle(S);e.preventDefault()}}})}
// the title: a button next to the loadout's; leaving to the title ends the lab
{const ql0=ql;ql=function(){Lab.active=false;Lab.reset();document.getElementById('lab-readout')?.remove();ql0();const t=hr.querySelector('.demo-title .launch-row');if(t){t.insertAdjacentHTML('beforeend',Lab.button());t.querySelector('[data-lab-open]').onclick=()=>Lab.open()}}}
{if(typeof document!=='undefined'&&document.head){const st=document.createElement('style');st.textContent=`
.lab-panel .lab-slider{grid-column:1/-1;display:grid;grid-template-columns:1fr 160px 44px;gap:8px;align-items:center}.lab-panel .lab-slider b{text-align:right;color:#baffed}
.lab-panel code{color:#baffed}
#lab-readout{position:fixed;left:12px;top:64px;z-index:40;max-width:420px;padding:8px 10px;background:#04131bdd;border:1px solid #89ffe044;color:#cfe7e8;font:12px/1.45 var(--mono,monospace);white-space:pre-line;pointer-events:none}`;document.head.appendChild(st)}}
try{if(typeof document!=='undefined'&&ft==='title')ql()}catch(e){}

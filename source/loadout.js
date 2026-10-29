// Playtest loadout (designer request, 2026-10-30): a title-screen menu to start a run with chosen weapons, tricks,
// wave and pearls, and to switch the parked abilities on. Saved in this browser (icarus.loadout); applied when a run
// begins only while "Use this loadout" is ticked. Tests and bots never see it (they have no saved loadout).
var Loadout = (() => {
  const KEY = 'icarus.loadout';
  const blank = () => ({ on: 0, weapons: [['harpoon', 1]], tricks: { breach: null, apex: null, entry: null }, levels: { breach: 1, apex: 1, entry: 1 }, wave: 1, pearls: 0 });
  let cfg = blank();
  try { cfg = { ...blank(), ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch (e) {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cfg)) } catch (e) {} };

  // the run as the loadout says: weapons and tiers, tricks and levels, starting wave and pearls
  function apply(r) {
    if (!cfg.on || !r?.demo) return r;
    const d = r.demo, W = cfg.weapons.filter(w => w && DEMO.weapons[w[0]]).slice(0, 6);
    if (W.length) r.slots = W.map(([id, l]) => { const g = Owslot(id, Math.max(1, Math.min(4, +l || 1)), ++d.uid); g.paid = 0; g.cd = 0; return g });
    if (DEMO.tune.rules && typeof Routine !== 'undefined') {
      const S = { slots: { breach: null, apex: null, entry: null }, levels: {} };
      for (const s of Routine.SLOTS) { const id = cfg.tricks[s]; if (id && Routine.TRICKS[id] && !S.levels[id]) { S.slots[s] = id; S.levels[id] = Math.max(1, Math.min(4, +cfg.levels[s] || 1)) } }
      d.routine = S;
    }
    const w = Math.max(1, Math.min(20, +cfg.wave || 1)); if (w !== r.wave) { r.wave = w; DEMO.wave(r) }
    r.xp = Math.max(0, +cfg.pearls || 0); DEMO.sync(r); r.hp = r.stats.maxHp;
    return r;
  }

  const E = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const opt = (v, label, sel) => `<option value="${E(v)}" ${sel ? 'selected' : ''}>${E(label)}</option>`;
  const tierSel = (name, v) => `<select data-lo="${name}">${[1, 2, 3, 4].map(t => opt(t, 'T' + t, +v === t)).join('')}</select>`;
  function html() {
    const ids = Object.keys(DEMO.weapons), T = DEMO.tune;
    const weaponRows = Array.from({ length: 6 }, (_, i) => { const w = cfg.weapons[i] || [null, 1]; return `<label>Slot ${i + 1} <select data-lo="w${i}">${opt('', '— empty —', !w[0])}${ids.map(id => opt(id, Owc[id]?.name || id, w[0] === id)).join('')}</select>${tierSel('t' + i, w[1])}</label>` }).join('');
    const trickRows = typeof Routine === 'undefined' ? '' : Routine.SLOTS.map(s => `<label>${Routine.SLOT_NAMES[s]} <select data-lo="k-${s}">${opt('', '— none —', !cfg.tricks[s])}${Routine.IDS.map(id => opt(id, Routine.TRICKS[id].name, cfg.tricks[s] === id)).join('')}</select>${tierSel('l-' + s, cfg.levels[s]).replace(/>T(\d)</g, '>L$1<')}</label>`).join('');
    const chk = (k, label) => `<label class="lo-check"><input type="checkbox" data-tune="${k}" ${T[k] ? 'checked' : ''}> ${E(label)}</label>`;
    return `<div class="lo-panel" role="dialog" aria-label="Playtest loadout"><header><b>PLAYTEST LOADOUT</b><button data-lo-close>✕</button></header>
      <label class="lo-check lo-main"><input type="checkbox" data-lo="on" ${cfg.on ? 'checked' : ''}> Use this loadout when a run begins</label>
      <section><h4>Weapons</h4>${weaponRows}</section>
      <section><h4>Tricks${T.rules ? '' : ' (needs Style score rules on)'}</h4>${trickRows}</section>
      <section><h4>Start</h4><label>Wave <input type="number" min="1" max="20" data-lo="wave" value="${+cfg.wave || 1}"></label><label>Pearls <input type="number" min="0" max="9999" data-lo="pearls" value="${+cfg.pearls || 0}"></label></section>
      <section><h4>Abilities and rules</h4>${chk('verbs', 'Stomp, dive (S) and dash (Space) — experimental')}${chk('danger', 'Leading shots')}${chk('rules', 'Style score rules (off = S4)')}${chk('carve', 'Space carves')}<label>Mines per flight <input type="number" min="0" max="4" data-tune-n="mines" value="${+T.mines || 0}"></label></section>
      <footer><button data-lo-reset>RESET LOADOUT</button><button data-lo-close class="lo-done">DONE</button></footer></div>`;
  }
  function read(panel) {
    const v = n => panel.querySelector(`[data-lo="${n}"]`);
    cfg.on = v('on').checked ? 1 : 0;
    cfg.weapons = Array.from({ length: 6 }, (_, i) => v('w' + i).value ? [v('w' + i).value, +v('t' + i).value] : null).filter(Boolean);
    if (typeof Routine !== 'undefined') for (const s of Routine.SLOTS) { const k = v('k-' + s); if (k) { cfg.tricks[s] = k.value || null; cfg.levels[s] = +v('l-' + s).value } }
    cfg.wave = +v('wave').value || 1; cfg.pearls = +v('pearls').value || 0; save();
    for (const c of panel.querySelectorAll('[data-tune]')) DEMO.tune[c.dataset.tune] = c.checked ? 1 : 0;
    for (const c of panel.querySelectorAll('[data-tune-n]')) DEMO.tune[c.dataset.tuneN] = +c.value || 0;
    DEMO.saveTune();
  }
  function open() {
    close(); const wrap = document.createElement('div'); wrap.id = 'loadout'; wrap.className = 'lo-scrim'; wrap.innerHTML = html(); document.body.appendChild(wrap);
    const panel = wrap.querySelector('.lo-panel');
    panel.addEventListener('change', () => read(panel));
    for (const b of wrap.querySelectorAll('[data-lo-close]')) b.onclick = () => { read(panel); close(); if (typeof ql === 'function' && ft === 'title') ql() };
    wrap.querySelector('[data-lo-reset]').onclick = () => { cfg = blank(); save(); open() };
    wrap.onclick = e => { if (e.target === wrap) { read(panel); close() } };
  }
  function close() { document.getElementById('loadout')?.remove() }
  const button = () => `<button class="lo-open ${cfg.on ? 'on' : ''}" data-lo-open>⚙ PLAYTEST LOADOUT${cfg.on ? ' · ON' : ''}</button>`;
  return { apply, open, close, button, get config() { return cfg } };
})();
{const hd0=Hd;Hd=function(...a){return Loadout.apply(hd0(...a))}}
{const ql0=ql;ql=function(){ql0();const t=hr.querySelector('.demo-title .launch-row');if(t){t.insertAdjacentHTML('beforeend',Loadout.button());t.querySelector('[data-lo-open]').onclick=()=>Loadout.open()}}}
{if(typeof document!=='undefined'&&document.head){const st=document.createElement('style');st.textContent=`
.lo-open{font:600 11px var(--mono,monospace);letter-spacing:.08em;padding:10px 14px;background:#04131bcc;color:#a1bdbf;border:1px dashed #89ffe066;cursor:pointer}.lo-open.on{color:#baffed;border-style:solid}
.lo-scrim{position:fixed;inset:0;z-index:50;background:#020a10cc;display:flex;align-items:center;justify-content:center;padding:16px}
.lo-panel{width:min(560px,100%);max-height:90vh;overflow:auto;background:#06161f;border:1px solid #89ffe044;color:#cfe7e8;font:13px var(--mono,monospace);padding:16px 18px}
.lo-panel header,.lo-panel footer{display:flex;justify-content:space-between;align-items:center;gap:8px}.lo-panel header b{letter-spacing:.12em}
.lo-panel button{font:600 11px var(--mono,monospace);background:#0b2531;color:#cfe7e8;border:1px solid #89ffe044;padding:8px 12px;cursor:pointer}.lo-panel .lo-done{background:#89ffe0;color:#04131b}
.lo-panel section{margin:12px 0;display:grid;grid-template-columns:1fr 1fr;gap:6px 12px}.lo-panel h4{grid-column:1/-1;margin:4px 0 0;font-size:11px;letter-spacing:.12em;color:#89ffe0}
.lo-panel label{display:flex;align-items:center;gap:6px;justify-content:space-between}.lo-panel select,.lo-panel input[type=number]{background:#0b2531;color:#cfe7e8;border:1px solid #89ffe033;padding:4px;font:12px var(--mono,monospace);max-width:150px}
.lo-panel .lo-check{grid-column:1/-1;justify-content:flex-start}.lo-panel .lo-main{margin-top:10px;color:#baffed}
@media(max-width:480px){.lo-panel section{grid-template-columns:1fr}}`;document.head.appendChild(st)}}
try{if(typeof document!=='undefined'&&ft==='title')ql()}catch(e){}  // the title may have drawn before this file ran

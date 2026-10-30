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
    // each row carries a one-line reminder of what the chosen thing does
    const desc = t => `<small class="lo-desc">${E(t)}</small>`;
    const weaponRows = Array.from({ length: 6 }, (_, i) => { const w = cfg.weapons[i] || [null, 1], W = DEMO.weapons[w[0]]; return `<div class="lo-row"><label>Slot ${i + 1} <select data-lo="w${i}">${opt('', '— empty —', !w[0])}${ids.map(id => opt(id, `${Owc[id]?.name || id} · ${DEMO.weapons[id].type}`, w[0] === id)).join('')}</select>${tierSel('t' + i, w[1])}</label>${desc(W ? W.description : 'Empty slot.')}</div>` }).join('');
    const trickRows = typeof Routine === 'undefined' ? '' : Routine.SLOTS.map(s => { const id = cfg.tricks[s], X = Routine.TRICKS[id]; return `<div class="lo-row"><label>${Routine.SLOT_NAMES[s]} <select data-lo="k-${s}">${opt('', '— none —', !id)}${Routine.IDS.map(k => opt(k, Routine.TRICKS[k].name, id === k)).join('')}</select>${tierSel('l-' + s, cfg.levels[s]).replace(/>T(\d)</g, '>L$1<')}</label>${desc(X ? `${X.kind === 'water' ? 'Water' : 'Effect'} · helps ${X.helps}: ${X.text}` : `Nothing fires at ${Routine.SLOT_NAMES[s]}.`)}</div>` }).join('');
    const chk = (k, label, help) => `<div class="lo-row lo-wide"><label class="lo-check"><input type="checkbox" data-tune="${k}" ${T[k] ? 'checked' : ''}> ${E(label)}</label>${desc(help)}</div>`;
    return `<div class="lo-panel" role="dialog" aria-label="Playtest loadout"><header><b>PLAYTEST LOADOUT</b><button data-lo-close>✕</button></header>
      <label class="lo-check lo-main"><input type="checkbox" data-lo="on" ${cfg.on ? 'checked' : ''}> Use this loadout when a run begins</label>
      ${desc('Starts the next run with everything below. Untick to play a normal run.')}
      <section><h4>Weapons</h4>${desc('Up to six. They fire on their own in the air. T1–T4 is the tier; two equal copies merge into the next tier.')}${weaponRows}</section>
      <section><h4>Tricks${T.rules ? '' : ' (needs Style score rules on)'}</h4>${desc('Breach fires as you leave the water, Ascent and Descent pulse while you climb and fall, Apex at the top, Entry as you land. Air tricks place enemies for your guns (a gun kill on them links: +1 mult); water tricks drown or splash. L1–L4 is the level.')}${trickRows}</section>
      <section><h4>Start</h4>${desc('The wave to begin on (its air clock and enemies) and the pearls in hand for the first shop.')}<label>Wave <input type="number" min="1" max="20" data-lo="wave" value="${+cfg.wave || 1}"></label><label>Pearls <input type="number" min="0" max="9999" data-lo="pearls" value="${+cfg.pearls || 0}"></label></section>
      <section><h4>Abilities and rules</h4>${chk('verbs', 'Stomp, dive (S) and dash (Space) — experimental', 'Land on enemies to kill them and lift the arc; hold S to fall faster; Space dashes 3.5 m (2 charges). Parked: meant to become tricks.')}${chk('danger', 'Leading shots', 'Turret and elite shots aim where you are heading, so flying straight gets punished.')}${chk('rules', 'Style score rules (off = S4)', 'On: no quota, 0 HP ends the run, kills × tricks × clean streak pay pearls. Off: the old reels, charms and quota.')}${chk('sides', 'Armoured enemies', 'From wave 3 Shielders (hit from behind), Turtles (from below) and Spikers (from above) take 20% from their armoured side.')}${chk('carve', 'Space carves', 'Hold Space under water to carve, release to launch (no boost). Off: W carves and Space boosts.')}<div class="lo-row lo-wide"><label>Mines per flight <input type="number" min="0" max="4" data-tune-n="mines" value="${+T.mines || 0}"></label>${desc('Hostile mines placed on your path ahead, behind a marker. One hit each.')}</div></section>
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
    // re-draw on every change so each row's reminder matches what is chosen
    panel.addEventListener('change', () => { read(panel); const y = panel.scrollTop; open(); const q = document.querySelector('#loadout .lo-panel'); if (q) q.scrollTop = y });
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
.lo-panel .lo-check{grid-column:1/-1;justify-content:flex-start}.lo-panel .lo-row{display:flex;flex-direction:column;gap:2px}.lo-panel .lo-wide{grid-column:1/-1}.lo-panel .lo-desc{display:block;grid-column:1/-1;color:#7fa3a6;font-size:11px;line-height:1.35}.lo-panel .lo-main{margin-top:10px;color:#baffed}
@media(max-width:480px){.lo-panel section{grid-template-columns:1fr}}`;document.head.appendChild(st)}}
try{if(typeof document!=='undefined'&&ft==='title')ql()}catch(e){}  // the title may have drawn before this file ran

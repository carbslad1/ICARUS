import { DEFAULT_TUNING, isDefaultTuning, parseMovementTuning, TUNING_FIELDS, type MovementTuning, type TuningKey } from '../sim/tuning';

export const TUNING_STORAGE_KEY = 'icarus.movement.v1';

export function tuningJson(tuning: MovementTuning): string {
  return JSON.stringify({ game: 'ICARUS', version: 1, movement: parseMovementTuning(tuning) }, null, 2);
}

export function loadTuning(): MovementTuning {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(TUNING_STORAGE_KEY) ?? 'null');
    if (typeof saved !== 'object' || saved === null || !('version' in saved) || saved.version !== 1 ||
      !('game' in saved) || saved.game !== 'ICARUS' || !('movement' in saved)) return DEFAULT_TUNING;
    return parseMovementTuning(saved.movement);
  } catch { return DEFAULT_TUNING; }
}

interface Field { key: TuningKey; label: string; unit: string; scale?: number }
const groups: readonly { name: string; fields: readonly Field[] }[] = [
  { name: 'Water', fields: [
    { key: 'thrust', label: 'Thrust', unit: 'm/s2' },
    { key: 'thrustSpeed', label: 'Thrust speed limit', unit: 'm/s' },
    { key: 'waterGravity', label: 'Water gravity', unit: 'm/s2' },
    { key: 'waterDrag', label: 'Water resistance', unit: '1/m' },
  ] },
  { name: 'Steering', fields: [
    { key: 'turnRate', label: 'Body turn speed', unit: 'rad/s' },
    { key: 'redirectRate', label: 'Flow response', unit: '1/s' },
    { key: 'steerLead', label: 'Steering angle', unit: 'rad' },
    { key: 'turnCost', label: 'Turn resistance', unit: '1/rad' },
  ] },
  { name: 'Air', fields: [
    { key: 'airGravity', label: 'Air gravity', unit: 'm/s2' },
    { key: 'airTurnRate', label: 'Air rotation speed', unit: 'rad/s' },
  ] },
  { name: 'Entries', fields: [
    { key: 'perfectBonus', label: 'Perfect entry boost', unit: 'm/s' },
    { key: 'streakBonus', label: 'Boost per streak', unit: 'm/s' },
    { key: 'bonusCap', label: 'Perfect boost limit', unit: 'm/s' },
    { key: 'cleanBonus', label: 'Clean entry boost', unit: 'm/s' },
    { key: 'cleanRetention', label: 'Clean speed kept', unit: '%', scale: 100 },
    { key: 'sloppyRetention', label: 'Sloppy speed kept', unit: '%', scale: 100 },
    { key: 'flopRetention', label: 'Flop speed kept', unit: '%', scale: 100 },
    { key: 'flopLockout', label: 'Flop recovery time', unit: 's' },
  ] },
];

function element<T extends HTMLElement>(selector: string, type: { new(): T }): T {
  const found = document.querySelector(selector);
  if (!(found instanceof type)) throw new Error(`Missing tuning control: ${selector}`);
  return found;
}

export function createTuningPanel(initial: MovementTuning, apply: (tuning: MovementTuning) => void, clearControls: () => void) {
  const app = element('#app', HTMLElement);
  const panel = element('#tuning-panel', HTMLElement);
  const toggle = element('#tuning-toggle', HTMLButtonElement);
  const close = element('#tuning-close', HTMLButtonElement);
  const tabsHost = element('#tuning-tabs', HTMLElement);
  const fieldsHost = element('#tuning-fields', HTMLElement);
  const reset = element('#tuning-reset', HTMLButtonElement);
  const copy = element('#tuning-copy', HTMLButtonElement);
  const status = element('#tuning-status', HTMLOutputElement);
  const exported = element('#tuning-export', HTMLTextAreaElement);
  const events = new AbortController();
  const options = { signal: events.signal };
  let tuning = initial;
  let revision = 0;
  let activeGroup = 0;
  const rows: { field: Field; slider: HTMLInputElement; number: HTMLInputElement; row: HTMLElement }[] = [];
  const tabs: HTMLButtonElement[] = [];
  const panels: HTMLElement[] = [];

  function refresh() {
    for (const { field, slider, number, row } of rows) {
      const value = Number((tuning[field.key] * (field.scale ?? 1)).toFixed(6));
      slider.value = String(value);
      number.value = String(value);
      slider.setAttribute('aria-valuetext', `${value} ${field.unit}`);
      row.dataset.changed = String(tuning[field.key] !== DEFAULT_TUNING[field.key]);
    }
    reset.disabled = isDefaultTuning(tuning);
  }

  function commit(next: MovementTuning) {
    tuning = next;
    revision += 1;
    apply(tuning);
    exported.hidden = true;
    exported.value = '';
    try {
      localStorage.setItem(TUNING_STORAGE_KEY, tuningJson(tuning));
      status.value = isDefaultTuning(tuning) ? 'Default settings' : 'Saved on this device';
    } catch { status.value = 'Applied / device storage unavailable'; }
    refresh();
  }

  function open(value: boolean) {
    clearControls();
    panel.hidden = !value;
    app.classList.toggle('tuning-open', value);
    toggle.setAttribute('aria-expanded', String(value));
    if (value) tabs[activeGroup]?.focus();
    else toggle.focus();
  }

  function select(index: number) {
    activeGroup = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
    panels.forEach((panel, i) => { panel.hidden = i !== index; });
    fieldsHost.scrollTop = 0;
  }

  groups.forEach((group, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `tuning-tab-${index}`;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `tuning-group-${index}`);
    tab.textContent = group.name;
    tab.addEventListener('click', () => select(index), options);
    tab.addEventListener('keydown', (event) => {
      const next = event.key === 'ArrowRight' ? (index + 1) % groups.length :
        event.key === 'ArrowLeft' ? (index + groups.length - 1) % groups.length :
          event.key === 'Home' ? 0 : event.key === 'End' ? groups.length - 1 : undefined;
      if (next === undefined) return;
      event.preventDefault();
      select(next);
      tabs[next]?.focus();
    }, options);
    tabs.push(tab);
    tabsHost.append(tab);
    const groupPanel = document.createElement('section');
    groupPanel.id = `tuning-group-${index}`;
    groupPanel.setAttribute('role', 'tabpanel');
    groupPanel.setAttribute('aria-labelledby', tab.id);
    panels.push(groupPanel);
    fieldsHost.append(groupPanel);

    for (const field of group.fields) {
      const spec = TUNING_FIELDS[field.key];
      const scale = field.scale ?? 1;
      const row = document.createElement('div');
      row.className = 'tuning-row';
      const label = document.createElement('label');
      label.htmlFor = `tune-${field.key}`;
      label.textContent = field.label;
      const slider = document.createElement('input');
      slider.id = label.htmlFor;
      slider.type = 'range';
      const number = document.createElement('input');
      number.type = 'number';
      number.setAttribute('aria-label', `${field.label} value`);
      for (const input of [slider, number]) {
        input.min = String(spec.min * scale);
        input.max = String(spec.max * scale);
        input.step = String(spec.step * scale);
      }
      const unit = document.createElement('span');
      unit.className = 'tuning-unit';
      unit.textContent = field.unit;
      const valueHost = document.createElement('div');
      valueHost.className = 'tuning-value';
      valueHost.append(number, unit);
      row.append(label, valueHost, slider);
      groupPanel.append(row);
      rows.push({ field, slider, number, row });
      function update(input: HTMLInputElement) {
        if (!Number.isFinite(input.valueAsNumber)) { refresh(); return; }
        const bounded = Math.max(spec.min, Math.min(spec.max, input.valueAsNumber / scale));
        const snapped = spec.min + Math.round((bounded - spec.min) / spec.step) * spec.step;
        const value = Number(Math.max(spec.min, Math.min(spec.max, snapped)).toFixed(6));
        commit(parseMovementTuning({ ...tuning, [field.key]: value }));
      }
      slider.addEventListener('input', () => update(slider), options);
      slider.addEventListener('pointerup', () => slider.blur(), options);
      number.addEventListener('change', () => update(number), options);
      number.addEventListener('blur', refresh, options);
      number.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { update(number); number.blur(); }
      }, options);
    }
  });

  toggle.addEventListener('click', () => open(panel.hidden), options);
  close.addEventListener('click', () => open(false), options);
  reset.addEventListener('click', () => commit(DEFAULT_TUNING), options);
  panel.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { event.preventDefault(); open(false); }
  }, options);
  panel.addEventListener('focusin', clearControls, options);
  copy.addEventListener('click', () => {
    const json = tuningJson(tuning);
    const copiedRevision = revision;
    // Keep an exact, selectable export available even if clipboard permission is denied.
    exported.value = json;
    exported.hidden = false;
    const fallback = () => {
      if (revision !== copiedRevision) return;
      status.value = 'Clipboard unavailable / settings selected';
      exported.focus();
      exported.select();
    };
    if (!navigator.clipboard?.writeText) { fallback(); return; }
    void navigator.clipboard.writeText(json).then(() => {
      if (revision === copiedRevision) status.value = 'Settings copied';
    }, fallback);
  }, options);
  select(0);
  refresh();
  status.value = isDefaultTuning(tuning) ? 'Default settings' : 'Saved on this device';

  return {
    destroy() { events.abort(); tabsHost.replaceChildren(); fieldsHost.replaceChildren(); },
  };
}

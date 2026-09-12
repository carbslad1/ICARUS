import { idleIntent, type PlayerIntent } from '../sim/intent';

export function createControls(target: Window, buttons: readonly HTMLButtonElement[]) {
  const keys = new Set<string>();
  const pointers = new Map<number, string>();
  const bindings = new Set(['KeyA', 'KeyD', 'KeyW', 'KeyS', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'ShiftLeft', 'ShiftRight']);
  const cleanup: (() => void)[] = [];

  function keyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || (event.target instanceof Element &&
      event.target.closest('input, textarea, select, [contenteditable], [role="tablist"]'))) return;
    if (event.metaKey || event.ctrlKey || event.altKey || !bindings.has(event.code)) return;
    event.preventDefault();
    keys.add(event.code);
  }
  function keyUp(event: KeyboardEvent) { keys.delete(event.code); }
  function clear() {
    keys.clear();
    pointers.clear();
    for (const button of buttons) button.setAttribute('aria-pressed', 'false');
  }

  target.addEventListener('keydown', keyDown);
  target.addEventListener('keyup', keyUp);
  target.addEventListener('blur', clear);
  for (const button of buttons) {
    const control = button.dataset.control;
    if (!control) continue;
    function down(event: PointerEvent) {
      event.preventDefault();
      pointers.set(event.pointerId, control ?? '');
      button.setPointerCapture(event.pointerId);
      button.setAttribute('aria-pressed', 'true');
    }
    function up(event: PointerEvent) {
      pointers.delete(event.pointerId);
      button.setAttribute('aria-pressed', String([...pointers.values()].includes(control ?? '')));
    }
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointercancel', up);
    button.addEventListener('lostpointercapture', up);
    cleanup.push(() => {
      button.removeEventListener('pointerdown', down);
      button.removeEventListener('pointerup', up);
      button.removeEventListener('pointercancel', up);
      button.removeEventListener('lostpointercapture', up);
    });
  }

  return {
    sample(mode: 'water' | 'air' | 'return' = 'water'): PlayerIntent {
      const held = new Set(pointers.values());
      const left = keys.has('KeyA') || keys.has('ArrowLeft') || held.has('left');
      const right = keys.has('KeyD') || keys.has('ArrowRight') || held.has('right');
      const up = keys.has('KeyW') || keys.has('ArrowUp') || held.has('thrust');
      const down = keys.has('KeyS') || keys.has('ArrowDown') || held.has('down');
      const x = Number(right) - Number(left);
      const y = Number(up) - Number(down);
      const length = Math.max(1, Math.hypot(x, y));
      return {
        ...idleIntent(), turn: Number(left) - Number(right), thrust: up,
        move: mode === 'air' ? { x: x / length, y: y / length } : { x: 0, y: 0 },
        dash: mode === 'air' && (keys.has('ShiftLeft') || keys.has('ShiftRight') || held.has('dash')),
        commit: mode === 'air' && (keys.has('Space') || held.has('commit')),
      };
    },
    clear,
    destroy() {
      clear();
      target.removeEventListener('keydown', keyDown);
      target.removeEventListener('keyup', keyUp);
      target.removeEventListener('blur', clear);
      for (const remove of cleanup) remove();
    },
  };
}

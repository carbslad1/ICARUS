import { idleIntent, type PlayerIntent } from '../sim/intent';

export function createControls(target: Window, buttons: readonly HTMLButtonElement[]) {
  const keys = new Set<string>();
  const pointers = new Map<number, string>();
  const bindings = new Set(['KeyA', 'KeyD', 'KeyW', 'ArrowLeft', 'ArrowRight', 'ArrowUp']);
  const cleanup: (() => void)[] = [];

  function keyDown(event: KeyboardEvent) {
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
    sample(): PlayerIntent {
      const held = new Set(pointers.values());
      const left = keys.has('KeyA') || keys.has('ArrowLeft') || held.has('left');
      const right = keys.has('KeyD') || keys.has('ArrowRight') || held.has('right');
      return { ...idleIntent(), turn: Number(left) - Number(right), thrust: keys.has('KeyW') || keys.has('ArrowUp') || held.has('thrust') };
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

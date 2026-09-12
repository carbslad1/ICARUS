import './style.css';
import { createBrowserDriver, registerTestHook } from './harness/browser';
import { createWaterRenderer } from './render/water';
import { createControls } from './input/controls';
import { createWaterWorld, createWorld } from './sim/world';
import { CONSTANTS } from './sim/constants';
import { seconds } from './sim/units';

async function start() {
  const host = document.querySelector<HTMLElement>('#stage');
  const output = document.querySelector<HTMLOutputElement>('#telemetry');
  if (!host || !output) throw new Error('Missing application shell.');
  const renderer = await createWaterRenderer(host, output);
  const controls = createControls(window, [...document.querySelectorAll<HTMLButtonElement>('[data-control]')]);
  const query = new URLSearchParams(location.search);
  const manual = query.get('test') === '1';
  const factory = (manual || import.meta.env.DEV) && query.get('scene') === 'empty' ? createWorld : createWaterWorld;
  const driver = createBrowserDriver(renderer.render, factory, controls.sample);
  registerTestHook(window, driver.hook, import.meta.env.DEV, location.search);
  driver.hook.setPaused(manual);
  renderer.render(driver.hook.snapshot(), 0);
  const pauseButton = document.querySelector<HTMLButtonElement>('#pause');
  const restartButton = document.querySelector<HTMLButtonElement>('#restart');
  const pauseState = document.querySelector<HTMLElement>('#pause-state');
  let paused = manual;
  function pause(value: boolean) {
    paused = value;
    controls.clear();
    driver.hook.setPaused(value);
    if (pauseState) pauseState.hidden = !value;
    if (pauseButton) {
      pauseButton.textContent = value ? '\u25b6' : '\u275a\u275a';
      pauseButton.setAttribute('aria-label', value ? 'Resume' : 'Pause');
      pauseButton.title = value ? 'Resume' : 'Pause';
    }
  }
  function togglePause() { pause(!paused); }
  function restart() {
    controls.clear();
    driver.hook.reset(CONSTANTS.RNG.DEFAULT_SEED);
    pause(false);
  }
  function pauseKey(event: KeyboardEvent) {
    if (event.code === 'Escape' && !event.repeat) togglePause();
  }
  pauseButton?.addEventListener('click', togglePause);
  restartButton?.addEventListener('click', restart);
  window.addEventListener('keydown', pauseKey);

  // Wall-clock sampling belongs to the browser driver, never the simulation.
  let previous: number | undefined;
  let request: number | undefined;
  function animate(timestamp: number) {
    const elapsed = previous === undefined ? 0 : (timestamp - previous) / 1000;
    previous = timestamp;
    driver.advance(seconds(elapsed));
    request = requestAnimationFrame(animate);
  }
  request = requestAnimationFrame(animate);
  document.documentElement.dataset.ready = 'true';

  import.meta.hot?.dispose(() => {
    if (request !== undefined) cancelAnimationFrame(request);
    delete window.__icarus;
    pauseButton?.removeEventListener('click', togglePause);
    restartButton?.removeEventListener('click', restart);
    window.removeEventListener('keydown', pauseKey);
    controls.destroy();
    renderer.destroy();
  });
}

void start().catch((error: unknown) => {
  const output = document.querySelector<HTMLOutputElement>('#telemetry');
  if (output) output.value = 'RENDERER UNAVAILABLE';
  console.error(error);
});

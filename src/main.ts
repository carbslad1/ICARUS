import './style.css';
import { createBrowserDriver, registerTestHook } from './harness/browser';
import { createEmptyRenderer } from './render/empty';
import { seconds } from './sim/units';

async function start() {
  const host = document.querySelector<HTMLElement>('#stage');
  const output = document.querySelector<HTMLOutputElement>('#telemetry');
  if (!host || !output) throw new Error('Missing application shell.');
  const renderer = await createEmptyRenderer(host, output);
  const driver = createBrowserDriver(renderer.render);
  registerTestHook(window, driver.hook, import.meta.env.DEV, location.search);
  renderer.render(driver.hook.snapshot(), 0);

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
    renderer.destroy();
  });
}

void start().catch((error: unknown) => {
  const output = document.querySelector<HTMLOutputElement>('#telemetry');
  if (output) output.value = 'RENDERER UNAVAILABLE';
  console.error(error);
});

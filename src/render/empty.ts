import { Application } from 'pixi.js';
import type { StateFrame } from '../harness/headless';
import { cssColour, PALETTE } from './palette';

export async function createEmptyRenderer(host: HTMLElement, output: HTMLOutputElement) {
  const app = new Application();
  await app.init({
    preference: 'webgl',
    preferWebGLVersion: 2,
    backgroundColor: PALETTE.VOID,
    width: host.clientWidth,
    height: host.clientHeight,
    resolution: 1,
    autoStart: false,
    sharedTicker: false,
    antialias: false,
    preserveDrawingBuffer: true,
  });
  app.canvas.setAttribute('aria-label', 'Empty Icarus world');
  app.canvas.setAttribute('role', 'img');
  host.append(app.canvas);
  document.documentElement.style.setProperty('--void', cssColour(PALETTE.VOID));
  document.documentElement.style.setProperty('--primary', cssColour(PALETTE.PLAYER));
  document.documentElement.style.setProperty('--text', cssColour(PALETTE.PLAYER_HOT));
  document.documentElement.style.setProperty('--water', cssColour(PALETTE.ABYSS));
  document.documentElement.style.setProperty('--surface', cssColour(PALETTE.SURFACE));
  document.documentElement.style.setProperty('--warning', cssColour(PALETTE.TELEGRAPH));
  document.documentElement.style.setProperty('--panel', cssColour(PALETTE.PANEL));
  document.documentElement.style.setProperty('--panel-border', cssColour(PALETTE.PANEL_BORDER));
  document.documentElement.style.setProperty('--panel-divider', cssColour(PALETTE.PANEL_DIVIDER));
  document.documentElement.style.setProperty('--input', cssColour(PALETTE.INPUT));
  document.documentElement.style.setProperty('--input-border', cssColour(PALETTE.INPUT_BORDER));
  document.documentElement.style.setProperty('--muted', cssColour(PALETTE.MUTED));
  document.documentElement.style.setProperty('--action-border', cssColour(PALETTE.ACTION_BORDER));
  const observer = new ResizeObserver(() => {
    app.renderer.resize(host.clientWidth, host.clientHeight);
    app.render();
  });
  observer.observe(host);
  return {
    app,
    render(frame: StateFrame, alpha: number) {
      output.value = `SEED ${frame.seed} / STEP ${frame.stepIndex} / ENTITIES ${frame.entityCount}`;
      host.dataset.alpha = String(alpha);
      app.render();
    },
    destroy() {
      observer.disconnect();
      app.destroy(true);
    },
  };
}

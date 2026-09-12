import { Graphics } from 'pixi.js';
import type { StateFrame } from '../harness/headless';
import { CONSTANTS } from '../sim/constants';
import { angleDifference, radians, worldPos } from '../sim/units';
import { createProjection } from './coordinates';
import { createEmptyRenderer } from './empty';
import { PALETTE } from './palette';

// Phase 1 silhouette only; the sprite atlas and lighting belong to Phase 7.
const outline: readonly [number, number][] = [
  [-0.5, 0.2], [-0.43, 0.03], [-0.32, 0.13], [-0.14, 0.17],
  [-0.11, 0.32], [0.04, 0.17], [0.24, 0.12], [0.36, 0.01],
  [0.5, -0.02], [0.5, -0.09], [0.34, -0.12], [0.17, -0.17],
  [0.02, -0.13], [-0.02, -0.28], [-0.1, -0.1], [-0.32, -0.08],
  [-0.43, -0.02], [-0.5, -0.22], [-0.48, 0],
];

function output(id: string): HTMLOutputElement {
  const element = document.querySelector<HTMLOutputElement>(`#${id}`);
  if (!element) throw new Error(`Missing output ${id}.`);
  return element;
}

export async function createWaterRenderer(host: HTMLElement, telemetry: HTMLOutputElement) {
  const base = await createEmptyRenderer(host, telemetry);
  const scene = new Graphics();
  base.app.stage.addChild(scene);
  const speedOutput = output('speed');
  const depthOutput = output('depth');
  const bestOutput = output('best');
  const streakOutput = output('streak');
  const timeOutput = output('elapsed');
  const entryOutput = output('entry');
  const mediumOutput = output('medium');
  const depthLabel = document.querySelector<HTMLElement>('#depth-label');
  const waterElements = document.querySelectorAll<HTMLElement>('[data-water]');
  const phase = document.querySelector<HTMLElement>('#phase');

  return {
    render(frame: StateFrame, alpha: number, previous?: StateFrame) {
      const body = frame.player;
      scene.clear();
      for (const element of waterElements) element.hidden = !body;
      telemetry.hidden = Boolean(body);
      if (phase) phase.textContent = body ? 'WATER TRIAL' : 'PHASE 0';
      base.app.canvas.setAttribute('aria-label', body ? 'Icarus water trial' : 'Empty Icarus world');
      if (body && frame.camera) {
        const before = previous?.player ?? body;
        const mix = previous ? alpha : 1;
        const position = worldPos(before.position.x + (body.position.x - before.position.x) * mix, before.position.y + (body.position.y - before.position.y) * mix);
        const heading = before.heading + angleDifference(body.heading, before.heading) * mix;
        const oldCamera = previous?.camera ?? frame.camera;
        const camera = worldPos(oldCamera.x + (frame.camera.x - oldCamera.x) * mix, oldCamera.y + (frame.camera.y - oldCamera.y) * mix);
        const projection = createProjection(host.clientWidth, host.clientHeight, camera);
        const surface = projection.toScreen(worldPos(camera.x, CONSTANTS.SURFACE.SURFACE_Y));
        const waterTop = Math.max(0, surface.y);
        scene.rect(0, waterTop, host.clientWidth, Math.max(0, host.clientHeight - waterTop)).fill(PALETTE.ABYSS);
        scene.moveTo(0, surface.y).lineTo(host.clientWidth, surface.y).stroke({ color: PALETTE.SURFACE, width: 1 });
        const length = CONSTANTS.PLAYER.DOLPHIN_LENGTH;
        const cosine = Math.cos(heading);
        const sine = Math.sin(heading);
        const points = outline.flatMap(([x, y]) => {
          const vertex = projection.toScreen(worldPos(position.x + (x * cosine - y * sine) * length, position.y + (x * sine + y * cosine) * length));
          return [vertex.x, vertex.y];
        });
        scene.poly(points).fill(PALETTE.PLAYER);
        const eye = projection.toScreen(worldPos(position.x + (0.25 * cosine - 0.03 * sine) * length, position.y + (0.25 * sine + 0.03 * cosine) * length));
        scene.circle(eye.x, eye.y, Math.max(1, projection.scale * length * 0.025)).fill(PALETTE.VOID);
        const speed = Math.hypot(body.velocity.x, body.velocity.y);
        if (speed > 0) {
          const start = projection.toScreen(position);
          const end = projection.toScreen(worldPos(position.x + body.velocity.x / speed * length, position.y + body.velocity.y / speed * length));
          scene.moveTo(start.x, start.y).lineTo(end.x, end.y).stroke({ color: PALETTE.PLAYER_HOT, width: 1, alpha: 0.4 });
        }
        speedOutput.value = speed.toFixed(1);
        depthOutput.value = Math.abs(body.position.y).toFixed(1);
        bestOutput.value = body.bestApex.toFixed(1);
        streakOutput.value = String(body.streak);
        if (depthLabel) depthLabel.textContent = body.medium === 'water' ? 'DEPTH' : 'HEIGHT';
        mediumOutput.value = body.medium.toUpperCase();
        timeOutput.value = `${Math.floor(frame.time / 60).toString().padStart(2, '0')}:${Math.floor(frame.time % 60).toString().padStart(2, '0')}`;
        const entry = body.lastCrossing;
        entryOutput.value = entry?.kind === 'entry' ? `${entry.grade?.toUpperCase()} / ${(entry.error * 180 / Math.PI).toFixed(1)}°` : entry?.kind.toUpperCase() ?? '';
        entryOutput.dataset.grade = entry?.grade ?? '';
        host.dataset.heading = String(radians(heading));
      }
      base.render(frame, alpha);
    },
    destroy: base.destroy,
  };
}

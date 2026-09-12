import { Graphics } from 'pixi.js';
import type { StateFrame } from '../harness/headless';
import { CONSTANTS } from '../sim/constants';
import { angleDifference, localPos, radians, seconds, toWorld, worldPos } from '../sim/units';
import type { WaterBody } from '../sim/water/body';
import { flightValue, tierForApex } from '../sim/flight/frame';
import { DEFAULT_TUNING } from '../sim/tuning';
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

function displayPlayer(frame: StateFrame): Readonly<WaterBody> | undefined {
  const air = frame.flight;
  return frame.player ?? (air ? {
    ...air.stats, position: toWorld(air.arena.player.position, air.arena), velocity: air.velocity,
    heading: air.arena.player.heading, medium: 'air', lockout: seconds(0),
  } : undefined);
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
  const flightInfo = document.querySelector<HTMLElement>('#flight-info');
  const tierOutput = output('tier');
  const airtimeOutput = output('airtime');
  const apexOutput = output('apex');
  const dashOutput = output('dash-charges');
  const flightProgress = document.querySelector<HTMLProgressElement>('#flight-progress');

  return {
    render(frame: StateFrame, alpha: number, previous?: StateFrame) {
      const body = displayPlayer(frame);
      const air = frame.flight;
      const preview = Boolean(frame.breach?.active);
      const flightGame = frame.scenario === 'flight';
      const mode = air ? 'air' : frame.returning ? 'return' : 'water';
      const playfield = document.querySelector<HTMLElement>('#playfield');
      if (playfield) { playfield.dataset.mode = mode; playfield.classList.toggle('flight-scene', flightGame); }
      for (const element of document.querySelectorAll<HTMLElement>('[data-air-control]')) element.hidden = !air;
      for (const element of document.querySelectorAll<HTMLElement>('[data-swim-control]')) element.hidden = Boolean(air);
      if (flightInfo) flightInfo.hidden = !(air || preview || frame.returning);
      scene.clear();
      for (const element of waterElements) element.hidden = !body;
      telemetry.hidden = Boolean(body);
      if (phase) phase.textContent = flightGame ? 'FLIGHT TRIAL' : body ? 'WATER TRIAL' : 'PHASE 0';
      base.app.canvas.setAttribute('aria-label', flightGame ? 'Icarus flight arena' : body ? 'Icarus water trial' : 'Empty Icarus world');
      if (body && frame.camera) {
        const before = previous && Boolean(previous.flight) === Boolean(air) && Boolean(previous.returning) === Boolean(frame.returning)
          ? displayPlayer(previous) ?? body : body;
        const mix = previous ? alpha : 1;
        const position = worldPos(before.position.x + (body.position.x - before.position.x) * mix, before.position.y + (body.position.y - before.position.y) * mix);
        const heading = before.heading + angleDifference(body.heading, before.heading) * mix;
        const continuous = previous && Boolean(previous.flight) === Boolean(air) && Boolean(previous.returning) === Boolean(frame.returning);
        const oldCamera = continuous ? previous.camera ?? frame.camera : frame.camera;
        const camera = worldPos(oldCamera.x + (frame.camera.x - oldCamera.x) * mix, oldCamera.y + (frame.camera.y - oldCamera.y) * mix);
        const compact = host.clientHeight < 400;
        const top = flightGame ? compact ? 142 : 170 : 0;
        const viewportHeight = flightGame ? Math.max(60, host.clientHeight - top - (compact ? 85 : 120)) : host.clientHeight;
        const visibleHeight = flightGame ? Math.max(34, 56 * viewportHeight / Math.max(1, host.clientWidth - 40)) : CONSTANTS.CAMERA.VISIBLE_HEIGHT;
        const projection = createProjection(host.clientWidth, viewportHeight, camera, visibleHeight, top);
        const surface = projection.toScreen(worldPos(camera.x, CONSTANTS.SURFACE.SURFACE_Y));
        const waterTop = Math.max(0, surface.y);
        scene.rect(0, waterTop, host.clientWidth, Math.max(0, host.clientHeight - waterTop)).fill(PALETTE.ABYSS);
        scene.moveTo(0, surface.y).lineTo(host.clientWidth, surface.y).stroke({ color: PALETTE.SURFACE, width: 1 });
        if (air || preview) {
          const arena = air ? { ...air.arena, origin: camera } : { origin: worldPos(body.position.x, body.position.y), bounds: { x: CONSTANTS.FLIGHT.HALF_WIDTH, y: CONSTANTS.FLIGHT.HALF_HEIGHT } };
          const opacity = air ? 1 : CONSTANTS.BREACH.PREVIEW_ALPHA;
          const topLeft = projection.toScreen(toWorld(localPos(-arena.bounds.x, arena.bounds.y), arena));
          const bottomRight = projection.toScreen(toWorld(localPos(arena.bounds.x, -arena.bounds.y), arena));
          scene.rect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y)
            .fill({ color: PALETTE.PANEL, alpha: opacity * 0.6 })
            .stroke({ color: PALETTE.PLAYER, width: 1, alpha: opacity * 0.65 });
          for (let x = -24; x <= 24; x += 6) {
            const a = projection.toScreen(toWorld(localPos(x, -arena.bounds.y), arena));
            const b = projection.toScreen(toWorld(localPos(x, arena.bounds.y), arena));
            scene.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PALETTE.SURFACE, width: 1, alpha: opacity * 0.09 });
          }
          for (let y = -12; y <= 12; y += 6) {
            const a = projection.toScreen(toWorld(localPos(-arena.bounds.x, y), arena));
            const b = projection.toScreen(toWorld(localPos(arena.bounds.x, y), arena));
            scene.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ color: PALETTE.SURFACE, width: 1, alpha: opacity * 0.09 });
          }
          const value = air?.arena ?? flightValue(body.velocity.y, (frame.tuning ?? DEFAULT_TUNING).airGravity, body.position.y);
          tierOutput.value = String(air?.arena.tier ?? tierForApex(value.apex));
          apexOutput.value = `${value.apex.toFixed(0)} m`;
          airtimeOutput.value = `${Math.max(0, value.airtime - (air?.elapsed ?? 0)).toFixed(1)} s`;
          dashOutput.value = String(air?.arena.player.dashCharges ?? CONSTANTS.FLIGHT.DASH_CHARGES);
          if (flightProgress) { flightProgress.max = value.airtime || 1; flightProgress.value = Math.max(0, value.airtime - (air?.elapsed ?? 0)); }
          if (air) {
            // World-space altitude marks stream past a stationary local arena.
            for (let altitude = Math.floor((camera.y - visibleHeight / 2) / 10) * 10; altitude < camera.y + visibleHeight / 2; altitude += 10) {
              const mark = projection.toScreen(worldPos(camera.x, altitude));
              scene.moveTo(host.clientWidth - 22, mark.y).lineTo(host.clientWidth - 10, mark.y).stroke({ color: PALETTE.SURFACE, width: 1, alpha: 0.35 });
            }
          }
        }
        const length = Math.max(CONSTANTS.PLAYER.DOLPHIN_LENGTH, flightGame ? 20 / projection.scale : 0);
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
        mediumOutput.value = frame.returning ? 'DIVE' : preview ? 'BREACH' : body.medium.toUpperCase();
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

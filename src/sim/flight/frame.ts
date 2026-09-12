import { CONSTANTS } from '../constants';
import { metres, seconds, velocity, worldPos, type Metres, type MetresPerSec2, type Seconds, type Vec2, type MetresPerSec } from '../units';
import { frameReturned, surfaceCrossing } from '../water/surface';
import type { Arena } from './state';

export function flightValue(vy: MetresPerSec, gravity: MetresPerSec2, height: Metres = metres(0)) {
  const rise = Math.max(0, vy);
  return {
    apex: metres(height + rise * rise / (2 * Math.abs(gravity))),
    airtime: seconds((vy + Math.sqrt(vy * vy + 2 * Math.abs(gravity) * Math.max(0, height))) / Math.abs(gravity)),
  };
}

export function tierForApex(apex: Metres): number {
  const spec = CONSTANTS.FLIGHT;
  return 1 + [spec.TIER_TWO, spec.TIER_THREE, spec.TIER_FOUR, spec.TIER_FIVE].filter((threshold) => apex >= threshold).length;
}

export function integrateFrame(arena: Arena, movement: Vec2<MetresPerSec>, gravity: MetresPerSec2, duration: Seconds) {
  if (frameReturned(arena.origin.y, movement.y)) return { velocity: movement, elapsed: seconds(0), landed: true };
  const crossing = surfaceCrossing(arena.origin.y, movement.y, gravity, duration, 1 / 2);
  const elapsed = crossing?.kind === 'entry' ? crossing.time : duration;
  arena.origin = worldPos(arena.origin.x + movement.x * elapsed,
    crossing?.kind === 'entry' ? CONSTANTS.SURFACE.SURFACE_Y : arena.origin.y + movement.y * elapsed + gravity * elapsed * elapsed / 2);
  return { velocity: velocity(movement.x, movement.y + gravity * elapsed), elapsed, landed: crossing?.kind === 'entry' };
}

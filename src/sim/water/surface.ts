import { CONSTANTS } from '../constants';
import { seconds, type Metres, type MetresPerSec, type MetresPerSec2, type Seconds } from '../units';

export type Medium = 'water' | 'air';
export type CrossingKind = 'breach' | 'entry' | 'skip';

export function resolveMedium(previous: Medium, y: Metres, crossing?: CrossingKind): Medium {
  if (crossing) return crossing === 'entry' ? 'water' : 'air';
  if (y > CONSTANTS.SURFACE.SURFACE_Y + CONSTANTS.SURFACE.HYSTERESIS) return 'air';
  if (y < CONSTANTS.SURFACE.SURFACE_Y - CONSTANTS.SURFACE.HYSTERESIS) return 'water';
  return previous;
}

export function surfaceCrossing(y: Metres, vy: MetresPerSec, ay: MetresPerSec2, duration: Seconds, positionFactor: number): { time: Seconds; kind: 'breach' | 'entry' } | undefined {
  const a = ay * positionFactor;
  const b = vy;
  const c = y - CONSTANTS.SURFACE.SURFACE_Y;
  let roots: number[];
  if (a === 0) {
    roots = b === 0 ? [] : [-c / b];
  } else {
    const discriminant = b * b - (2 * 2) * a * c;
    if (discriminant <= 0) return undefined;
    // The q form avoids cancellation for a fast crossing very close to the surface.
    const q = -(b + (b < 0 ? -1 : 1) * Math.sqrt(discriminant)) / 2;
    roots = q === 0 ? [] : [q / a, c / q];
  }
  for (const root of roots.sort((left, right) => left - right)) {
    if (root <= 0 || root > duration + CONSTANTS.SURFACE.ROOT_EPSILON) continue;
    const time = seconds(Math.min(root, duration));
    const direction = b + 2 * a * time;
    if (direction === 0) continue;
    return { time, kind: direction > 0 ? 'breach' : 'entry' };
  }
  return undefined;
}

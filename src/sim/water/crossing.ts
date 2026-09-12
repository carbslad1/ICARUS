import { CONSTANTS } from '../constants';
import { magnitude } from '../math';
import { acceleration, metres, metresPerSec, radians, radiansPerSec, seconds, velocity, worldPos } from '../units';
import type { Seconds } from '../units';
import type { WaterBody, CrossingEvent } from './body';
import { entryQuality, shouldSkip } from './entry';
import { integrateMotion, passiveWaterForces, type Motion } from './physics';
import { surfaceCrossing, type CrossingKind } from './surface';
import { DEFAULT_TUNING, type MovementTuning } from '../tuning';

export function resolveCrossings(body: Readonly<WaterBody>, initialMotion: Motion, integrated: ReturnType<typeof integrateMotion>, dt: Seconds, stepIndex: number, tuning: MovementTuning = DEFAULT_TUNING) {
  let result = { ...body };
  let remaining = dt;
  let elapsed = 0;
  let motion = initialMotion;
  let full = integrated;
  let lastKind: CrossingKind | undefined;
  for (let count = 0; count < CONSTANTS.SURFACE.MAX_CROSSINGS_PER_STEP; count += 1) {
    const crossing = surfaceCrossing(result.position.y, result.velocity.y, motion.acceleration.y, remaining, motion.positionFactor);
    if (!crossing) {
      result = {
        ...result, ...full,
        heading: radians(result.heading + motion.headingRate * remaining),
        lockout: seconds(Math.max(0, result.lockout - remaining)),
        bestApex: metres(Math.max(result.bestApex, full.position.y)),
      };
      return { body: result, lastKind };
    }
    const impact = integrateMotion(result.position, result.velocity, motion, crossing.time);
    const heading = radians(result.heading + motion.headingRate * crossing.time);
    elapsed += crossing.time;
    remaining = seconds(Math.max(0, dt - elapsed));
    const speed = metresPerSec(magnitude(impact.velocity.x, impact.velocity.y));
    const event: CrossingEvent = {
      kind: crossing.kind,
      fraction: elapsed / dt,
      time: seconds(stepIndex * dt + elapsed),
      incomingSpeed: speed,
      grade: null,
      error: radians(0),
    };
    result = {
      ...result, ...impact, heading,
      position: worldPos(impact.position.x, CONSTANTS.SURFACE.SURFACE_Y),
      lockout: seconds(Math.max(0, result.lockout - crossing.time)),
      lastCrossing: event,
    };
    if (crossing.kind === 'breach') {
      result.breaches += 1;
      lastKind = 'breach';
    } else if (shouldSkip(impact.velocity)) {
      result.velocity = velocity(impact.velocity.x, -impact.velocity.y * CONSTANTS.ENTRY.SKIP_RESTITUTION);
      result.skips += 1;
      result.lastCrossing = { ...event, kind: 'skip' };
      lastKind = 'skip';
    } else {
      const quality = entryQuality(heading, impact.velocity, result.streak, tuning);
      const scale = speed === 0 ? 0 : quality.speed / speed;
      result.velocity = velocity(impact.velocity.x * scale, impact.velocity.y * scale);
      result.streak = quality.streak;
      result.entries += 1;
      result.lockout = quality.grade === 'belly-flop' ? tuning.flopLockout : seconds(0);
      result.lastCrossing = { ...event, grade: quality.grade, error: quality.error };
      lastKind = 'entry';
    }
    // Finish the fractional transition here; no second phase update or input sample runs.
    const intoWater = lastKind === 'entry';
    motion = {
      acceleration: intoWater ? passiveWaterForces(result.velocity, tuning) : acceleration(0, tuning.airGravity),
      headingRate: result.lockout > 0 ? radiansPerSec(0) : initialMotion.headingRate,
      positionFactor: intoWater ? 1 : 1 / 2,
    };
    full = integrateMotion(result.position, result.velocity, motion, remaining);
    if (remaining === 0) return { body: result, lastKind };
  }
  throw new Error('Too many surface crossings in one fixed step.');
}

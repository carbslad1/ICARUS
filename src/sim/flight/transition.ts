import { CONSTANTS } from '../constants';
import { atan2, magnitude } from '../math';
import { angleDifference, metres, metresPerSec, radians, seconds, toWorld, velocity, worldPos, type Seconds } from '../units';
import type { MovementTuning } from '../tuning';
import type { WaterBody } from '../water/body';
import { entryQuality, shouldSkip } from '../water/entry';
import { integrateMotion, type Motion } from '../water/physics';
import { surfaceCrossing } from '../water/surface';
import { createAir, type AirState, type ReturnState } from './state';
import { integrateFrame } from './frame';

export function launchFlight(body: WaterBody, motion: Motion, dt: Seconds, stepIndex: number, tuning: MovementTuning): AirState | undefined {
  const crossing = surfaceCrossing(body.position.y, body.velocity.y, motion.acceleration.y, dt, motion.positionFactor);
  if (crossing?.kind !== 'breach') return undefined;
  const impact = integrateMotion(body.position, body.velocity, motion, crossing.time);
  const launched: WaterBody = {
    ...body, ...impact, position: worldPos(impact.position.x, CONSTANTS.SURFACE.SURFACE_Y),
    heading: radians(body.heading + motion.headingRate * crossing.time), medium: 'air', breaches: body.breaches + 1,
    lastCrossing: {
      kind: 'breach', fraction: crossing.time / dt, time: seconds(stepIndex * dt + crossing.time),
      incomingSpeed: metresPerSec(magnitude(impact.velocity.x, impact.velocity.y)), grade: null, error: radians(0),
    },
  };
  const air = createAir(launched, tuning);
  const remaining = seconds(dt - crossing.time);
  const frame = integrateFrame(air.arena, air.velocity, tuning.airGravity, remaining);
  air.velocity = frame.velocity;
  air.elapsed = remaining;
  return air;
}

export function startReturn(air: AirState, forced: boolean): ReturnState {
  const player = air.arena.player;
  const incoming = velocity(air.velocity.x, -Math.abs(air.velocity.y));
  const direction = radians(atan2(incoming.y, incoming.x));
  const heading = forced
    ? radians(player.heading + angleDifference(direction, player.heading) * CONSTANTS.FLIGHT.FORCED_ASSIST)
    : player.heading;
  return {
    body: {
      ...air.stats, position: toWorld(player.position, air.arena), velocity: incoming,
      heading, medium: 'air', lockout: seconds(0),
    },
    remaining: CONSTANTS.FLIGHT.COMMIT_DURATION, forced, dashCharges: player.dashCharges,
  };
}

export function advanceReturn(state: ReturnState, turn: number, dt: Seconds, stepIndex: number, tuning: MovementTuning): boolean {
  const body = state.body;
  const duration = seconds(Math.min(dt, state.remaining));
  // The return is a short, explicit arcade transition. It banks commitment speed;
  // visual descent cannot manufacture the energy that an early escape gives up.
  const amount = duration / state.remaining;
  body.position = worldPos(body.position.x + body.velocity.x * duration,
    body.position.y + (CONSTANTS.SURFACE.SURFACE_Y - body.position.y) * amount);
  body.heading = radians(body.heading + turn * tuning.airTurnRate * duration);
  state.remaining = seconds(Math.max(0, state.remaining - dt));
  if (state.remaining > CONSTANTS.SURFACE.ROOT_EPSILON) return false;
  body.position = worldPos(body.position.x, CONSTANTS.SURFACE.SURFACE_Y);
  const speed = metresPerSec(magnitude(body.velocity.x, body.velocity.y));
  const quality = entryQuality(body.heading, body.velocity, body.streak, tuning);
  const skip = shouldSkip(body.velocity);
  body.lastCrossing = {
    kind: skip ? 'skip' : 'entry', fraction: duration / dt, time: seconds(stepIndex * dt + duration),
    incomingSpeed: speed, grade: skip ? null : quality.grade, error: skip ? radians(0) : quality.error,
  };
  if (skip) {
    body.velocity = velocity(body.velocity.x, -body.velocity.y * CONSTANTS.ENTRY.SKIP_RESTITUTION);
    body.skips += 1;
  } else {
    const scale = speed === 0 ? 0 : quality.speed / speed;
    body.velocity = velocity(body.velocity.x * scale, body.velocity.y * scale);
    body.medium = 'water';
    body.streak = quality.streak;
    body.entries += 1;
    body.lockout = quality.grade === 'belly-flop' ? tuning.flopLockout : seconds(0);
  }
  body.bestApex = metres(Math.max(body.bestApex, body.position.y));
  return true;
}

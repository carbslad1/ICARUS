import { CONSTANTS } from '../constants';
import { atan2, cos, sin, magnitude } from '../math';
import type { PlayerIntent } from '../intent';
import { acceleration, angleDifference, radians, velocity, worldPos } from '../units';
import type { MetresPerSec, MetresPerSec2, RadiansPerSec, Seconds, Vec2, WorldPos } from '../units';
import { radiansPerSec } from '../units';
import type { WaterBody } from './body';
import { DEFAULT_TUNING, type MovementTuning } from '../tuning';

export interface Motion {
  readonly acceleration: Vec2<MetresPerSec2>;
  readonly headingRate: RadiansPerSec;
  readonly positionFactor: number;
}

export function passiveWaterForces(movement: Vec2<MetresPerSec>, tuning: MovementTuning = DEFAULT_TUNING): Vec2<MetresPerSec2> {
  const drag = tuning.waterDrag * magnitude(movement.x, movement.y);
  return acceleration(-movement.x * drag, tuning.waterGravity - movement.y * drag);
}

export function headingRate(body: Readonly<WaterBody>, intent: PlayerIntent, dt: Seconds, tuning: MovementTuning = DEFAULT_TUNING): RadiansPerSec {
  const active = Math.max(0, dt - body.lockout) / dt;
  return radiansPerSec(intent.turn * tuning.airTurnRate * active);
}

export function waterForces(body: Readonly<WaterBody>, intent: PlayerIntent, dt: Seconds, tuning: MovementTuning = DEFAULT_TUNING): Motion {
  const speed = magnitude(body.velocity.x, body.velocity.y);
  const direction = speed === 0 ? body.heading : radians(atan2(body.velocity.y, body.velocity.x));
  const active = Math.max(0, dt - body.lockout) / dt;
  const lead = tuning.steerLead;
  const flow = speed < CONSTANTS.WATER.WATER_FLOW_MIN_SPEED ? body.heading : direction;
  // Steering leads the flow by a bounded angle; the body cannot lap its own trajectory.
  const target = radians(flow + intent.turn * lead);
  const rate = radiansPerSec(Math.max(-tuning.turnRate,
    Math.min(tuning.turnRate, angleDifference(target, body.heading) / dt)) * active);
  const heading = radians(body.heading + rate * dt);
  const slip = Math.max(-lead, Math.min(lead, angleDifference(heading, direction)));
  const rotated = slip * tuning.redirectRate * dt;
  const kept = Math.max(0, speed * (1 - tuning.turnCost * Math.abs(rotated)));
  const redirected = velocity(cos(direction + rotated) * kept, sin(direction + rotated) * kept);
  const passive = passiveWaterForces(redirected, tuning);
  // Limit added thrust at the ceiling without clamping momentum earned elsewhere.
  const available = Math.max(0, tuning.thrustSpeed - speed) / dt;
  const thrust = intent.thrust ? Math.min(tuning.thrust * active, available) : 0;
  return {
    headingRate: rate,
    positionFactor: 1,
    acceleration: acceleration(
      (redirected.x - body.velocity.x) / dt + passive.x + cos(heading) * thrust,
      (redirected.y - body.velocity.y) / dt + passive.y + sin(heading) * thrust,
    ),
  };
}

export function airForces(body: Readonly<WaterBody>, intent: PlayerIntent, dt: Seconds, tuning: MovementTuning = DEFAULT_TUNING): Motion {
  return { acceleration: acceleration(0, tuning.airGravity), headingRate: headingRate(body, intent, dt, tuning), positionFactor: 1 / 2 };
}

export function integrateMotion(position: WorldPos, movement: Vec2<MetresPerSec>, motion: Motion, duration: Seconds) {
  return {
    position: worldPos(
      position.x + movement.x * duration + motion.acceleration.x * duration * duration * motion.positionFactor,
      position.y + movement.y * duration + motion.acceleration.y * duration * duration * motion.positionFactor,
    ),
    velocity: velocity(movement.x + motion.acceleration.x * duration, movement.y + motion.acceleration.y * duration),
  };
}

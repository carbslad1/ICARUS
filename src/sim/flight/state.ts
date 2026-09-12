import { CONSTANTS } from '../constants';
import { localPos, seconds, velocity, type LocalPos, type Metres, type MetresPerSec, type Radians, type Seconds, type Vec2, type WorldPos } from '../units';
import type { WaterBody } from '../water/body';
import type { MovementTuning } from '../tuning';
import { flightValue, tierForApex } from './frame';

export interface AirPlayer {
  position: LocalPos;
  velocity: Vec2<MetresPerSec>;
  heading: Radians;
  dashRemaining: Seconds;
  dashCooldown: Seconds;
  dashDirection: Vec2;
  dashCharges: number;
  dashHeld: boolean;
}

export interface Arena {
  origin: WorldPos;
  readonly bounds: { readonly x: Metres; readonly y: Metres };
  readonly tier: number;
  readonly apex: Metres;
  readonly airtime: Seconds;
  player: AirPlayer;
}

export type FlightStats = Pick<WaterBody, 'streak' | 'breaches' | 'entries' | 'skips' | 'bestApex' | 'lastCrossing'>;

export interface AirState {
  arena: Arena;
  velocity: Vec2<MetresPerSec>;
  stats: FlightStats;
  elapsed: Seconds;
}

export interface ReturnState {
  body: WaterBody;
  remaining: Seconds;
  readonly forced: boolean;
  readonly dashCharges: number;
}

export interface BreachState {
  active: boolean;
  elapsedReal: Seconds;
  cooldown: Seconds;
  dilation: number;
}

export interface FlightCycle {
  breach: BreachState;
  air: AirState | null;
  returning: ReturnState | null;
}

export function createCycle(): FlightCycle {
  return { breach: { active: false, elapsedReal: seconds(0), cooldown: seconds(0), dilation: 1 }, air: null, returning: null };
}

export function createAir(body: WaterBody, tuning: MovementTuning): AirState {
  const value = flightValue(body.velocity.y, tuning.airGravity, body.position.y);
  return {
    arena: {
      origin: body.position,
      bounds: Object.freeze({ x: CONSTANTS.FLIGHT.HALF_WIDTH, y: CONSTANTS.FLIGHT.HALF_HEIGHT }),
      tier: tierForApex(value.apex), ...value,
      player: {
        position: localPos(0, 0), velocity: velocity(0, 0), heading: body.heading,
        dashRemaining: seconds(0), dashCooldown: seconds(0), dashDirection: Object.freeze({ x: 0, y: 0 }),
        dashCharges: CONSTANTS.FLIGHT.DASH_CHARGES, dashHeld: false,
      },
    },
    velocity: body.velocity,
    stats: { streak: body.streak, breaches: body.breaches, entries: body.entries, skips: body.skips, bestApex: body.bestApex, lastCrossing: body.lastCrossing },
    elapsed: seconds(0),
  };
}

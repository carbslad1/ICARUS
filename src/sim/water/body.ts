import { CONSTANTS } from '../constants';
import { atan2 } from '../math';
import { metres, radians, seconds, velocity, worldPos } from '../units';
import type { Metres, MetresPerSec, Radians, Seconds, Vec2, WorldPos } from '../units';
import { resolveMedium, type Medium } from './surface';

export type EntryGrade = 'perfect' | 'clean' | 'sloppy' | 'belly-flop';

export interface CrossingEvent {
  readonly kind: 'breach' | 'entry' | 'skip';
  readonly time: Seconds;
  readonly fraction: number;
  readonly incomingSpeed: MetresPerSec;
  readonly grade: EntryGrade | null;
  readonly error: Radians;
}

export interface WaterBody {
  position: WorldPos;
  velocity: Vec2<MetresPerSec>;
  heading: Radians;
  medium: Medium;
  lockout: Seconds;
  streak: number;
  breaches: number;
  entries: number;
  skips: number;
  bestApex: Metres;
  lastCrossing: CrossingEvent | null;
}

export interface BodyInitial {
  readonly position?: WorldPos;
  readonly velocity?: Vec2<MetresPerSec>;
  readonly heading?: Radians;
  readonly medium?: Medium;
}

export function createBody(initial: BodyInitial = {}): WaterBody {
  const position = initial.position ?? worldPos(0, CONSTANTS.PLAYER.START_DEPTH);
  const movement = initial.velocity ?? velocity(CONSTANTS.PLAYER.START_SPEED_X, CONSTANTS.PLAYER.START_SPEED_Y);
  return {
    position,
    velocity: movement,
    heading: initial.heading ?? radians(atan2(movement.y, movement.x)),
    medium: initial.medium ?? resolveMedium('water', position.y),
    lockout: seconds(0),
    streak: 0,
    breaches: 0,
    entries: 0,
    skips: 0,
    bestApex: metres(0),
    lastCrossing: null,
  };
}

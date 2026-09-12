import { CONSTANTS } from './constants';
import { idleIntent, type PlayerIntent } from './intent';
import { createRng, type Rng } from './rng';
import { worldPos, type WorldPos } from './units';
import { createBody, type BodyInitial, type WaterBody } from './water/body';
import { DEFAULT_TUNING, type MovementTuning } from './tuning';
import { createCycle, type FlightCycle } from './flight/state';

export interface World {
  readonly seed: number;
  readonly origin: WorldPos;
  readonly rng: Rng;
  entities: readonly WaterBody[];
  cycle?: FlightCycle;
  camera: WorldPos;
  stepIndex: number;
  intent: PlayerIntent;
  tuning: MovementTuning;
}

export function createWorld(seed: number = CONSTANTS.RNG.DEFAULT_SEED): World {
  return {
    seed,
    origin: worldPos(0, 0),
    camera: worldPos(0, 0),
    rng: createRng(seed),
    entities: Object.freeze([]),
    stepIndex: 0,
    intent: idleIntent(),
    tuning: DEFAULT_TUNING,
  };
}

export function createWaterWorld(seed: number = CONSTANTS.RNG.DEFAULT_SEED, initial: BodyInitial = {}, tuning: MovementTuning = DEFAULT_TUNING): World {
  const body = createBody(initial);
  return { ...createWorld(seed), entities: Object.freeze([body]), camera: body.position, tuning };
}

export function createFlightWorld(seed: number = CONSTANTS.RNG.DEFAULT_SEED, initial: BodyInitial = {}, tuning: MovementTuning = DEFAULT_TUNING): World {
  return { ...createWaterWorld(seed, initial, tuning), cycle: createCycle() };
}

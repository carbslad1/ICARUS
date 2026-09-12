import { CONSTANTS } from './constants';
import { idleIntent, type PlayerIntent } from './intent';
import { createRng, type Rng } from './rng';
import { worldPos, type WorldPos } from './units';
import { createBody, type BodyInitial, type WaterBody } from './water/body';

export interface World {
  readonly seed: number;
  readonly origin: WorldPos;
  readonly rng: Rng;
  readonly entities: readonly WaterBody[];
  camera: WorldPos;
  stepIndex: number;
  intent: PlayerIntent;
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
  };
}

export function createWaterWorld(seed: number = CONSTANTS.RNG.DEFAULT_SEED, initial: BodyInitial = {}): World {
  const body = createBody(initial);
  return { ...createWorld(seed), entities: Object.freeze([body]), camera: body.position };
}

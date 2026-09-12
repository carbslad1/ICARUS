import { CONSTANTS } from './constants';
import { idleIntent, type PlayerIntent } from './intent';
import { createRng, type Rng } from './rng';
import { worldPos, type WorldPos } from './units';

export interface World {
  readonly seed: number;
  readonly origin: WorldPos;
  readonly rng: Rng;
  readonly entities: readonly never[];
  stepIndex: number;
  intent: PlayerIntent;
}

export function createWorld(seed: number = CONSTANTS.RNG.DEFAULT_SEED): World {
  return {
    seed,
    origin: worldPos(0, 0),
    rng: createRng(seed),
    entities: Object.freeze([]),
    stepIndex: 0,
    intent: idleIntent(),
  };
}

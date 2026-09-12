import { CONSTANTS } from '../sim/constants';
import type { PlayerIntent } from '../sim/intent';
import { stepWorld } from '../sim/step';
import { seconds, type Metres, type Seconds } from '../sim/units';
import { createWorld, type World } from '../sim/world';

export interface StateFrame {
  readonly stepIndex: number;
  readonly time: Seconds;
  readonly seed: number;
  readonly rngState: number;
  readonly originX: Metres;
  readonly originY: Metres;
  readonly entityCount: number;
  readonly intent: PlayerIntent;
}

export interface SimHarness {
  reset(seed: number): World;
  step(intent: PlayerIntent): World;
  snapshot(): StateFrame;
}

export function createHarness(seed: number = CONSTANTS.RNG.DEFAULT_SEED): SimHarness {
  let world = createWorld(seed);
  return {
    reset(nextSeed) {
      world = createWorld(nextSeed);
      return world;
    },
    step(intent) {
      stepWorld(world, intent, CONSTANTS.TIME.SIM_DT);
      return world;
    },
    snapshot() {
      return Object.freeze({
        stepIndex: world.stepIndex,
        time: seconds(world.stepIndex * CONSTANTS.TIME.SIM_DT),
        seed: world.seed,
        rngState: world.rng.state,
        originX: world.origin.x,
        originY: world.origin.y,
        entityCount: world.entities.length,
        intent: world.intent,
      });
    },
  };
}

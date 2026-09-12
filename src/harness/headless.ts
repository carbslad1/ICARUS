import { CONSTANTS } from '../sim/constants';
import type { PlayerIntent } from '../sim/intent';
import { stepWorld } from '../sim/step';
import { seconds, type Metres, type Seconds, type WorldPos } from '../sim/units';
import { createWorld, type World } from '../sim/world';
import type { WaterBody } from '../sim/water/body';
import { isDefaultTuning, type MovementTuning } from '../sim/tuning';

export interface StateFrame {
  readonly stepIndex: number;
  readonly time: Seconds;
  readonly seed: number;
  readonly rngState: number;
  readonly originX: Metres;
  readonly originY: Metres;
  readonly entityCount: number;
  readonly intent: PlayerIntent;
  readonly player?: Readonly<WaterBody>;
  readonly camera?: WorldPos;
  readonly tuning?: MovementTuning;
}

export interface SimHarness {
  reset(seed: number): World;
  step(intent: PlayerIntent, tuning?: MovementTuning): World;
  snapshot(): StateFrame;
}

export function createHarness(seed: number = CONSTANTS.RNG.DEFAULT_SEED, create: (seed: number) => World = createWorld): SimHarness {
  let world = create(seed);
  return {
    reset(nextSeed) {
      world = create(nextSeed);
      return world;
    },
    step(intent, tuning) {
      if (tuning) world.tuning = tuning;
      stepWorld(world, intent, CONSTANTS.TIME.SIM_DT);
      return world;
    },
    snapshot() {
      const body = world.entities[0];
      return Object.freeze({
        stepIndex: world.stepIndex,
        time: seconds(world.stepIndex * CONSTANTS.TIME.SIM_DT),
        seed: world.seed,
        rngState: world.rng.state,
        originX: world.origin.x,
        originY: world.origin.y,
        entityCount: world.entities.length,
        intent: world.intent,
        ...(body ? {
          player: Object.freeze({ ...body, lastCrossing: body.lastCrossing ? Object.freeze({ ...body.lastCrossing }) : null }),
          camera: world.camera,
          ...(!isDefaultTuning(world.tuning) ? { tuning: world.tuning } : {}),
        } : {}),
      });
    },
  };
}

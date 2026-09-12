import { CONSTANTS } from './constants';
import { copyIntent, type PlayerIntent } from './intent';
import type { Seconds } from './units';
import type { World } from './world';

export function stepWorld(world: World, intent: PlayerIntent, dt: Seconds): void {
  if (dt !== CONSTANTS.TIME.SIM_DT) throw new RangeError('Simulation timestep must remain fixed.');

  // 1. Drivers have sampled input upstream; latch this step's PlayerIntent.
  world.intent = copyIntent(intent);
  // 2. Empty worlds have no breach state, so dilation is always one.
  // 3-15. No water body, frame, arena, or gameplay entities exist in Phase 0.
  // 16. No camera exists until Phase 1.
  // 17. The harness reads telemetry after the completed integer step.
  world.stepIndex += 1;
}

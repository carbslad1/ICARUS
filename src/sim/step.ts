import { CONSTANTS } from './constants';
import { expSmall } from './math';
import { copyIntent, type PlayerIntent } from './intent';
import { worldPos, type Seconds } from './units';
import type { World } from './world';
import { waterForces, airForces, integrateMotion } from './water/physics';
import { resolveCrossings } from './water/crossing';
import { resolveMedium } from './water/surface';

export function stepWorld(world: World, intent: PlayerIntent, dt: Seconds): void {
  if (dt !== CONSTANTS.TIME.SIM_DT) throw new RangeError('Simulation timestep must remain fixed.');

  // 1. Drivers have sampled input upstream; latch this step's PlayerIntent.
  world.intent = copyIntent(intent);
  // 2. Breach-window dilation starts in Phase 2. dt is never scaled.
  const body = world.entities[0];
  if (body) {
    if (body.medium === 'water') {
      // 3. Water thrust, steering, redirect loss, gravity, and drag.
      const forces = waterForces(body, world.intent, dt);
      // 4. Semi-implicit Euler; its trajectory is also used by the crossing solver.
      const integrated = integrateMotion(body.position, body.velocity, forces, dt);
      // 5. Exact surface crossing and fractional transition resolution.
      const resolved = resolveCrossings(body, forces, integrated, dt, world.stepIndex);
      Object.assign(body, resolved.body, { medium: resolveMedium(body.medium, resolved.body.position.y, resolved.lastKind) });
    } else {
      // 6. Phase 1 uses a simple ballistic body. The flight frame starts in Phase 2.
      const forces = airForces(body, world.intent, dt);
      const integrated = integrateMotion(body.position, body.velocity, forces, dt);
      // 7. No arena yet. 8. Heading control is evaluated at the exact impact time.
      // 9-14. No enemies, projectiles, collisions, or rewards yet.
      // 15. Return to water; position and velocity are resolved at the crossing.
      const resolved = resolveCrossings(body, forces, integrated, dt, world.stepIndex);
      Object.assign(body, resolved.body, { medium: resolveMedium(body.medium, resolved.body.position.y, resolved.lastKind) });
    }
    // 16. Camera follows the body with velocity look-ahead.
    const follow = 1 - expSmall(-CONSTANTS.CAMERA.RESPONSE * dt);
    world.camera = worldPos(
      world.camera.x + (body.position.x + body.velocity.x * CONSTANTS.CAMERA.LOOK_AHEAD - world.camera.x) * follow,
      world.camera.y + (body.position.y + body.velocity.y * CONSTANTS.CAMERA.LOOK_AHEAD - world.camera.y) * follow,
    );
  }
  // 17. The harness reads telemetry after the completed integer step.
  world.stepIndex += 1;
}

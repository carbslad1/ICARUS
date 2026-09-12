import { CONSTANTS } from './constants';
import { expSmall } from './math';
import { copyIntent, type PlayerIntent } from './intent';
import { metres, seconds, worldPos, type Seconds } from './units';
import type { World } from './world';
import { waterForces, airForces, integrateMotion } from './water/physics';
import { resolveCrossings } from './water/crossing';
import { resolveMedium } from './water/surface';
import { endBreach, updateBreach } from './breach/window';
import { launchFlight, startReturn, advanceReturn } from './flight/transition';
import { integrateFrame } from './flight/frame';
import { moveAirPlayer } from './flight/control';
import { createAir } from './flight/state';

export function stepWorld(world: World, intent: PlayerIntent, dt: Seconds): void {
  if (dt !== CONSTANTS.TIME.SIM_DT) throw new RangeError('Simulation timestep must remain fixed.');

  // 1. Drivers have sampled input upstream; latch this step's PlayerIntent.
  world.intent = copyIntent(intent);
  const body = world.entities[0];
  const cycle = world.cycle;
  // 2. Breach-window state supplies the driver's fixed-step scheduling rate.
  if (cycle) updateBreach(cycle.breach, body, dt);
  if (body) {
    if (body.medium === 'water') {
      // 3. Water thrust, steering, redirect loss, gravity, and drag.
      const forces = waterForces(body, world.intent, dt, world.tuning);
      // 4. Semi-implicit Euler; its trajectory is also used by the crossing solver.
      const integrated = integrateMotion(body.position, body.velocity, forces, dt);
      // 5. Exact surface crossing and fractional transition resolution.
      const launched = cycle ? launchFlight(body, forces, dt, world.stepIndex, world.tuning) : undefined;
      if (cycle && launched) {
        cycle.air = launched;
        world.entities = Object.freeze([]);
        endBreach(cycle.breach);
      } else {
        const resolved = resolveCrossings(body, forces, integrated, dt, world.stepIndex, world.tuning);
        Object.assign(body, resolved.body, { medium: resolveMedium(body.medium, resolved.body.position.y, resolved.lastKind) });
      }
    } else {
      // 6. Phase 1 uses a simple ballistic body. The flight frame starts in Phase 2.
      const forces = airForces(body, world.intent, dt, world.tuning);
      const integrated = integrateMotion(body.position, body.velocity, forces, dt);
      // 7. No arena yet. 8. Heading control is evaluated at the exact impact time.
      // 9-14. No enemies, projectiles, collisions, or rewards yet.
      // 15. Return to water; position and velocity are resolved at the crossing.
      const resolved = resolveCrossings(body, forces, integrated, dt, world.stepIndex, world.tuning);
      Object.assign(body, resolved.body, { medium: resolveMedium(body.medium, resolved.body.position.y, resolved.lastKind) });
    }
  } else if (cycle?.air) {
    const air = cycle.air;
    // 6-7. The uncontrolled ballistic origin carries a fixed local arena.
    const frame = integrateFrame(air.arena, air.velocity, world.tuning.airGravity, dt);
    air.velocity = frame.velocity;
    air.elapsed = seconds(air.elapsed + frame.elapsed);
    air.stats.bestApex = metres(Math.max(air.stats.bestApex, air.arena.origin.y));
    // 8. Direct arena-local movement and bounded dash.
    moveAirPlayer(air.arena, world.intent, frame.elapsed);
    // 9-14. The empty-arena gate precedes enemies and combat.
    // 15. Commitment discards the arena and transfers the sprite's actual position.
    if (world.intent.commit || frame.landed) {
      cycle.returning = startReturn(air, frame.landed);
      cycle.air = null;
    }
  } else if (cycle?.returning) {
    // 6-14. The committed return has no arena or free movement.
    // 15. Complete the alignment window and resolve entry from its banked vector.
    const returning = cycle.returning;
    if (advanceReturn(returning, world.intent.turn, dt, world.stepIndex, world.tuning)) {
      if (returning.body.lastCrossing?.kind === 'skip') {
        cycle.air = createAir(returning.body, world.tuning);
        cycle.air.arena.player.dashCharges = returning.dashCharges;
      } else world.entities = Object.freeze([returning.body]);
      cycle.returning = null;
    }
  }
  // 16. Flight tracks the frame, never the player's local movement.
  const targetBody = world.entities[0] ?? cycle?.returning?.body;
  if (cycle?.air) {
    world.camera = cycle.air.arena.origin;
  } else if (targetBody) {
    const body = targetBody;
    const follow = 1 - expSmall(-CONSTANTS.CAMERA.RESPONSE * dt);
    world.camera = worldPos(
      world.camera.x + (body.position.x + body.velocity.x * CONSTANTS.CAMERA.LOOK_AHEAD - world.camera.x) * follow,
      world.camera.y + (body.position.y + body.velocity.y * CONSTANTS.CAMERA.LOOK_AHEAD - world.camera.y) * follow,
    );
  }
  // 17. The harness reads telemetry after the completed integer step.
  world.stepIndex += 1;
}

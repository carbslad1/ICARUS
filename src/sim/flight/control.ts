import { CONSTANTS } from '../constants';
import type { PlayerIntent } from '../intent';
import { atan2, cos, magnitude, sin } from '../math';
import { localPos, radians, seconds, velocity, type Seconds } from '../units';
import type { Arena } from './state';

export function moveAirPlayer(arena: Arena, intent: PlayerIntent, dt: Seconds): void {
  const player = arena.player;
  const spec = CONSTANTS.FLIGHT;
  const moving = intent.move.x !== 0 || intent.move.y !== 0;
  const lerp = moving ? spec.AIR_ACCEL_LERP : spec.AIR_DECEL_LERP;
  player.dashCooldown = seconds(Math.max(0, player.dashCooldown - dt));
  if (intent.dash && !player.dashHeld && player.dashCharges > 0 && player.dashCooldown === 0) {
    const length = magnitude(intent.move.x, intent.move.y);
    player.dashDirection = length > 0
      ? Object.freeze({ x: intent.move.x / length, y: intent.move.y / length })
      : Object.freeze({ x: cos(player.heading), y: sin(player.heading) });
    player.dashRemaining = spec.DASH_DURATION;
    player.dashCooldown = spec.DASH_COOLDOWN;
    player.dashCharges -= 1;
  }
  player.dashHeld = intent.dash;
  let dx: number;
  let dy: number;
  if (player.dashRemaining > 0) {
    const duration = Math.min(dt, player.dashRemaining);
    const speed = spec.DASH_DISTANCE / spec.DASH_DURATION;
    player.velocity = velocity(player.dashDirection.x * speed, player.dashDirection.y * speed);
    dx = player.velocity.x * duration;
    dy = player.velocity.y * duration;
    player.dashRemaining = seconds(Math.max(0, player.dashRemaining - dt));
    if (player.dashRemaining === 0) player.velocity = velocity(0, 0);
  } else {
    player.velocity = velocity(
      player.velocity.x + (intent.move.x * spec.AIR_MAX_SPEED - player.velocity.x) * lerp,
      player.velocity.y + (intent.move.y * spec.AIR_MAX_SPEED - player.velocity.y) * lerp,
    );
    dx = player.velocity.x * dt;
    dy = player.velocity.y * dt;
  }
  function bound(position: number, delta: number, extent: number): number {
    const edge = extent - spec.EDGE_MARGIN;
    const next = position + delta;
    const push = Math.sign(next) * Math.max(0, Math.abs(next) - edge) * spec.EDGE_RESPONSE * dt;
    return Math.max(-extent, Math.min(extent, next - push));
  }
  player.position = localPos(bound(player.position.x, dx, arena.bounds.x), bound(player.position.y, dy, arena.bounds.y));
  if (moving) player.heading = radians(atan2(intent.move.y, intent.move.x));
}

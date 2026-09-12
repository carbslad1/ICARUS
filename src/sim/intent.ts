import type { Vec2 } from './units';

export interface PlayerIntent {
  readonly turn: number;
  readonly thrust: boolean;
  readonly move: Vec2;
  readonly dash: boolean;
  readonly commit: boolean;
}

export function idleIntent(): PlayerIntent {
  return Object.freeze({
    turn: 0,
    thrust: false,
    move: Object.freeze({ x: 0, y: 0 }),
    dash: false,
    commit: false,
  });
}

export function copyIntent(intent: PlayerIntent): PlayerIntent {
  if (!Number.isFinite(intent.turn) || Math.abs(intent.turn) > 1 ||
      !Number.isFinite(intent.move.x) || !Number.isFinite(intent.move.y) ||
      Math.hypot(intent.move.x, intent.move.y) > 1 ||
      typeof intent.thrust !== 'boolean' || typeof intent.dash !== 'boolean' || typeof intent.commit !== 'boolean') {
    throw new RangeError('PlayerIntent requires finite, normalised input.');
  }
  return Object.freeze({ ...intent, move: Object.freeze({ ...intent.move }) });
}

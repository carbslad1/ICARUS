import type { StateFrame } from './headless';

export const CSV_HEADER = 'step,time_s,seed,rng_state,origin_x_m,origin_y_m,entities,turn,thrust,move_x,move_y,dash,commit';

export function stateCsv(frames: readonly StateFrame[]): string {
  const rows = frames.map((frame) => [
    frame.stepIndex, frame.time, frame.seed, frame.rngState,
    frame.originX, frame.originY, frame.entityCount,
    frame.intent.turn, Number(frame.intent.thrust), frame.intent.move.x, frame.intent.move.y,
    Number(frame.intent.dash), Number(frame.intent.commit),
  ].join(','));
  return `${[CSV_HEADER, ...rows].join('\n')}\n`;
}

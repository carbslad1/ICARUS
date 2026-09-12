import { CONSTANTS } from '../sim/constants';
import type { Seconds } from '../sim/units';

export function createFixedLoop(step: () => void) {
  let accumulator = 0;
  let paused = false;
  return {
    reset() { accumulator = 0; },
    setPaused(value: boolean) { paused = value; accumulator = 0; },
    advance(frameTime: Seconds, dilation = 1): number {
      if (frameTime < 0 || !Number.isFinite(frameTime) || !Number.isFinite(dilation) || dilation < 0 || dilation > 1) {
        throw new RangeError('Invalid frame time or dilation.');
      }
      if (paused) return 0;
      accumulator += Math.min(frameTime, CONSTANTS.TIME.MAX_FRAME_TIME) * dilation;
      while (accumulator >= CONSTANTS.TIME.SIM_DT) {
        step();
        accumulator -= CONSTANTS.TIME.SIM_DT;
      }
      return accumulator / CONSTANTS.TIME.SIM_DT;
    },
    stepFrames(count: number) {
      if (!Number.isSafeInteger(count) || count < 0) throw new RangeError('Frame count must be a non-negative integer.');
      for (let index = 0; index < count; index += 1) step();
    },
  };
}

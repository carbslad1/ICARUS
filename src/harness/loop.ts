import { CONSTANTS } from '../sim/constants';
import type { Seconds } from '../sim/units';

export function createFixedLoop(step: () => void) {
  let accumulator = 0;
  let paused = false;
  return {
    reset() { accumulator = 0; },
    setPaused(value: boolean) { paused = value; accumulator = 0; },
    advance(frameTime: Seconds, dilation: number | (() => number) = 1): number {
      const rate = typeof dilation === 'function' ? dilation() : dilation;
      if (frameTime < 0 || !Number.isFinite(frameTime) || !Number.isFinite(rate) || rate < 0 || rate > 1) {
        throw new RangeError('Invalid frame time or dilation.');
      }
      if (paused) return 0;
      if (typeof dilation === 'function') {
        let remaining = Math.min(frameTime, CONSTANTS.TIME.MAX_FRAME_TIME);
        while (remaining > 0) {
          const current = dilation();
          if (!Number.isFinite(current) || current < 0 || current > 1) throw new RangeError('Invalid dilation.');
          if (current === 0) break;
          const needed = (CONSTANTS.TIME.SIM_DT - accumulator) / current;
          if (remaining + CONSTANTS.TIME.ACCUMULATOR_EPSILON < needed) { accumulator += remaining * current; break; }
          remaining = Math.max(0, remaining - needed);
          accumulator = 0;
          step();
        }
        return accumulator / CONSTANTS.TIME.SIM_DT;
      }
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

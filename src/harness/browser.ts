import { CONSTANTS } from '../sim/constants';
import { copyIntent, idleIntent, type PlayerIntent } from '../sim/intent';
import type { Seconds } from '../sim/units';
import { createHarness, type StateFrame } from './headless';
import { createFixedLoop } from './loop';
import { parseTrace, type InputTrace } from './trace';

export interface IcarusTestHook {
  reset(seed: number): void;
  setIntent(intent: PlayerIntent): void;
  stepFrames(n: number): void;
  loadTrace(trace: InputTrace): void;
  snapshot(): StateFrame;
  setPaused(paused: boolean): void;
}

declare global { interface Window { __icarus?: IcarusTestHook } }

export function createBrowserDriver(render: (frame: StateFrame, alpha: number) => void) {
  const harness = createHarness();
  let intent = idleIntent();
  let trace: InputTrace | undefined;
  let cursor = 0;
  const loop = createFixedLoop(() => {
    const entry = trace?.entries[cursor];
    if (entry?.stepIndex === harness.snapshot().stepIndex) {
      intent = entry.intent;
      cursor += 1;
    }
    harness.step(intent);
  });

  function reset(seed: number) {
    harness.reset(seed);
    intent = idleIntent();
    trace = undefined;
    cursor = 0;
    loop.reset();
  }

  const hook: IcarusTestHook = Object.freeze({
    reset(seed: number) {
      reset(seed);
      // Reset enters manual mode so screenshots never race an animation callback.
      loop.setPaused(true);
      render(harness.snapshot(), 0);
    },
    setIntent(next: PlayerIntent) {
      intent = copyIntent(next);
      trace = undefined;
      cursor = 0;
    },
    stepFrames(n: number) {
      loop.stepFrames(n);
      render(harness.snapshot(), 0);
    },
    loadTrace(input: InputTrace) {
      const parsed = parseTrace(input);
      reset(parsed.seed);
      loop.setPaused(true);
      trace = parsed;
      render(harness.snapshot(), 0);
    },
    snapshot: () => harness.snapshot(),
    setPaused(value: boolean) { loop.setPaused(value); },
  });

  return {
    hook,
    advance(time: Seconds) {
      const alpha = loop.advance(time);
      render(harness.snapshot(), alpha);
    },
  };
}

export function registerTestHook(target: Window, hook: IcarusTestHook, dev: boolean, search: string): boolean {
  const enabled = dev || new URLSearchParams(search).get('test') === '1';
  if (enabled) {
    hook.reset(CONSTANTS.RNG.DEFAULT_SEED);
    target.__icarus = hook;
  }
  return enabled;
}

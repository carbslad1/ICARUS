import { CONSTANTS } from '../sim/constants';
import { copyIntent, idleIntent, type PlayerIntent } from '../sim/intent';
import type { Seconds } from '../sim/units';
import { createWaterWorld, createWorld, type World } from '../sim/world';
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

export function createBrowserDriver(
  render: (frame: StateFrame, alpha: number, previous?: StateFrame) => void,
  create: (seed: number) => World = createWorld,
  sampleInput: () => PlayerIntent = idleIntent,
) {
  let harness = createHarness(CONSTANTS.RNG.DEFAULT_SEED, create);
  let intent = idleIntent();
  let override: PlayerIntent | undefined;
  let previous = harness.snapshot();
  let paused = false;
  let trace: InputTrace | undefined;
  let cursor = 0;
  const loop = createFixedLoop(() => {
    previous = harness.snapshot();
    const entry = trace?.entries[cursor];
    if (entry?.stepIndex === harness.snapshot().stepIndex) {
      intent = entry.intent;
      cursor += 1;
    }
    if (!trace) intent = override ?? sampleInput();
    harness.step(intent);
  });

  function reset(seed: number, factory = create) {
    harness = createHarness(seed, factory);
    intent = idleIntent();
    override = undefined;
    trace = undefined;
    cursor = 0;
    loop.reset();
    previous = harness.snapshot();
  }

  function setPaused(value: boolean) {
    paused = value;
    loop.setPaused(value);
    previous = harness.snapshot();
  }

  const hook: IcarusTestHook = Object.freeze({
    reset(seed: number) {
      reset(seed);
      // Reset enters manual mode so screenshots never race an animation callback.
      setPaused(true);
      render(harness.snapshot(), 0);
    },
    setIntent(next: PlayerIntent) {
      override = copyIntent(next);
      trace = undefined;
      cursor = 0;
    },
    stepFrames(n: number) {
      loop.stepFrames(n);
      previous = harness.snapshot();
      render(harness.snapshot(), 0);
    },
    loadTrace(input: InputTrace) {
      const parsed = parseTrace(input);
      reset(parsed.seed, parsed.version === 2 ? createWaterWorld : createWorld);
      setPaused(true);
      trace = parsed;
      render(harness.snapshot(), 0);
    },
    snapshot: () => harness.snapshot(),
    setPaused,
  });

  return {
    hook,
    advance(time: Seconds) {
      const alpha = loop.advance(time);
      if (paused) render(harness.snapshot(), 0);
      else render(harness.snapshot(), alpha, previous);
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

import { idleIntent } from '../sim/intent';
import { createHarness, type StateFrame } from './headless';
import { parseTrace, type InputTrace } from './trace';
import { stateCsv } from './csv';
import { createWaterWorld, createWorld } from '../sim/world';

export function replayTrace(input: InputTrace): { frames: readonly StateFrame[]; csv: string } {
  const trace = parseTrace(input);
  const harness = createHarness(trace.seed, trace.version === 2 ? (seed) => createWaterWorld(seed, {}, trace.tuning) : createWorld);
  const frames: StateFrame[] = [harness.snapshot()];
  let cursor = 0;
  let intent = idleIntent();
  for (let step = 0; step < trace.steps; step += 1) {
    const entry = trace.entries[cursor];
    if (entry?.stepIndex === step) {
      intent = entry.intent;
      cursor += 1;
    }
    harness.step(intent, entry?.stepIndex === step ? entry.tuning : undefined);
    frames.push(harness.snapshot());
  }
  return { frames, csv: stateCsv(frames) };
}

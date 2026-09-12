import { idleIntent } from '../sim/intent';
import { createHarness, type StateFrame } from './headless';
import { parseTrace, type InputTrace } from './trace';
import { stateCsv } from './csv';
import { scenarioFactory } from './scenario';

export function replayTrace(input: InputTrace): { frames: readonly StateFrame[]; csv: string } {
  const trace = parseTrace(input);
  const factory = scenarioFactory(trace.version === 2 ? trace.scenario : 'empty');
  const harness = createHarness(trace.seed, (seed) => factory(seed, {}, trace.version === 2 ? trace.tuning : undefined));
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

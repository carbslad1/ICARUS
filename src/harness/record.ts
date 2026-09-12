import { copyIntent, type PlayerIntent } from '../sim/intent';
import { createHarness, type StateFrame } from './headless';
import { parseTrace, type InputTrace, type TraceEntry } from './trace';
import { stateCsv } from './csv';

export function createRecorder(seed: number) {
  const harness = createHarness(seed);
  const frames: StateFrame[] = [harness.snapshot()];
  const entries: TraceEntry[] = [];

  return {
    step(intent: PlayerIntent): StateFrame {
      const entry = { stepIndex: harness.snapshot().stepIndex, intent: copyIntent(intent) };
      harness.step(entry.intent);
      entries.push(entry);
      const frame = harness.snapshot();
      frames.push(frame);
      return frame;
    },
    trace(): InputTrace {
      return parseTrace({ version: 1, seed, steps: harness.snapshot().stepIndex, entries });
    },
    csv(): string { return stateCsv(frames); },
  };
}

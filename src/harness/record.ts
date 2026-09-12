import { copyIntent, type PlayerIntent } from '../sim/intent';
import { createHarness, type StateFrame } from './headless';
import { parseTrace, type InputTrace, type TraceEntry } from './trace';
import { stateCsv } from './csv';
import { scenarioFactory } from './scenario';
import { DEFAULT_TUNING, isDefaultTuning, parseMovementTuning, type MovementTuning } from '../sim/tuning';

export function createRecorder(seed: number, scenario: 'empty' | 'water' | 'flight' = 'empty', initial: MovementTuning = DEFAULT_TUNING) {
  const tuning = parseMovementTuning(initial);
  if (scenario === 'empty' && !isDefaultTuning(tuning)) throw new RangeError('Empty recordings cannot tune movement.');
  const harness = createHarness(seed, (seed) => scenarioFactory(scenario)(seed, {}, tuning));
  const frames: StateFrame[] = [harness.snapshot()];
  const entries: TraceEntry[] = [];

  return {
    step(intent: PlayerIntent, nextTuning?: MovementTuning): StateFrame {
      if (scenario === 'empty' && nextTuning !== undefined) throw new RangeError('Empty recordings cannot tune movement.');
      const entry: TraceEntry = { stepIndex: harness.snapshot().stepIndex, intent: copyIntent(intent),
        ...(nextTuning === undefined ? {} : { tuning: parseMovementTuning(nextTuning) }),
      };
      harness.step(entry.intent, entry.tuning);
      entries.push(entry);
      const frame = harness.snapshot();
      frames.push(frame);
      return frame;
    },
    trace(): InputTrace {
      return parseTrace({ ...(scenario !== 'empty' ? { version: 2, scenario } : { version: 1 }), seed, steps: harness.snapshot().stepIndex, entries,
        ...(!isDefaultTuning(tuning) ? { tuning } : {}),
      });
    },
    csv(): string { return stateCsv(frames); },
  };
}

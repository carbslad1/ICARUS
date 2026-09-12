import { copyIntent, type PlayerIntent } from '../sim/intent';
import { createRng } from '../sim/rng';
import { parseMovementTuning, type MovementTuning } from '../sim/tuning';

export interface TraceEntry {
  /** Zero-based: this intent is applied before executing this step. */
  readonly stepIndex: number;
  readonly intent: PlayerIntent;
  readonly tuning?: MovementTuning;
}

interface TraceData {
  readonly seed: number;
  readonly steps: number;
  readonly entries: readonly TraceEntry[];
}

export type InputTrace = (TraceData & { readonly version: 1 }) |
  (TraceData & { readonly version: 2; readonly scenario: 'water' | 'flight'; readonly tuning?: MovementTuning });

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Expected a JSON object.');
  }
  return Object.fromEntries(Object.entries(value));
}

function number(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('Expected a finite number.');
  return value;
}

function boolean(value: unknown): boolean {
  if (typeof value !== 'boolean') throw new TypeError('Expected a boolean.');
  return value;
}

function intentFromJson(value: unknown): PlayerIntent {
  const input = record(value);
  const move = record(input.move);
  return copyIntent({
    turn: number(input.turn),
    thrust: boolean(input.thrust),
    move: { x: number(move.x), y: number(move.y) },
    dash: boolean(input.dash),
    commit: boolean(input.commit),
  });
}

export function parseTrace(value: unknown): InputTrace {
  const input = record(value);
  if (input.version !== 1 && !(input.version === 2 && (input.scenario === 'water' || input.scenario === 'flight'))) throw new RangeError('Unsupported trace version or scenario.');
  if (input.version === 1 && input.tuning !== undefined) throw new RangeError('Empty traces cannot tune movement.');
  const seed = number(input.seed);
  createRng(seed);
  const steps = number(input.steps);
  if (!Number.isSafeInteger(steps) || steps < 0) throw new RangeError('Trace steps must be a non-negative integer.');
  if (!Array.isArray(input.entries)) throw new TypeError('Trace entries must be an array.');
  let previous = -1;
  const entries = input.entries.map((value: unknown): TraceEntry => {
    const entry = record(value);
    const stepIndex = number(entry.stepIndex);
    if (!Number.isSafeInteger(stepIndex) || stepIndex <= previous || stepIndex >= steps) {
      throw new RangeError('Trace entries must be strictly increasing and inside the trace.');
    }
    previous = stepIndex;
    if (input.version === 1 && entry.tuning !== undefined) throw new RangeError('Empty traces cannot tune movement.');
    return Object.freeze({ stepIndex, intent: intentFromJson(entry.intent),
      ...(entry.tuning === undefined ? {} : { tuning: parseMovementTuning(entry.tuning) }),
    });
  });
  return input.version === 1
    ? Object.freeze({ version: 1, seed, steps, entries: Object.freeze(entries) })
    : Object.freeze({ version: 2, scenario: input.scenario === 'flight' ? 'flight' : 'water', seed, steps, entries: Object.freeze(entries),
      ...(input.tuning === undefined ? {} : { tuning: parseMovementTuning(input.tuning) }),
    });
}

export function traceJson(trace: InputTrace): string {
  return `${JSON.stringify(parseTrace(trace), null, 2)}\n`;
}

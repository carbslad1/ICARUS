import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { idleIntent } from '../../src/sim/intent';
import { createHarness } from '../../src/harness/headless';
import { createRecorder } from '../../src/harness/record';
import { replayTrace } from '../../src/harness/replay';
import { parseTrace, traceJson } from '../../src/harness/trace';

test('Phase 0 gate: record 1000 empty steps and replay byte-identical CSV', () => {
  const recorded = createRecorder(42);
  for (let step = 0; step < 1000; step += 1) recorded.step(idleIntent());
  const trace = parseTrace(JSON.parse(traceJson(recorded.trace())));
  const replay = replayTrace(trace);
  expect(replay.frames).toHaveLength(1001);
  for (const [index, frame] of replay.frames.entries()) {
    expect(frame.stepIndex).toBe(index);
    expect(frame.time).toBe(index * (1 / 120));
    expect([frame.originX, frame.originY, frame.entityCount]).toEqual([0, 0, 0]);
    expect(frame.rngState).toBe(42);
  }
  expect(Buffer.from(replay.csv)).toEqual(Buffer.from(recorded.csv()));
  const golden = readFileSync('tests/golden/empty.csv', 'utf8');
  expect(recorded.csv()).toBe(golden);
  expect(replayTrace(parseTrace(JSON.parse(readFileSync('tests/golden/empty.trace.json', 'utf8')))).csv).toBe(golden);
  mkdirSync('artifacts/gate', { recursive: true });
  writeFileSync('artifacts/gate/recorded.csv', recorded.csv());
  writeFileSync('artifacts/gate/replayed.csv', replay.csv);
  writeFileSync('artifacts/gate/trace.json', traceJson(trace));
  console.log('PASS Phase 0 gate: 1000 steps, 1001 state rows, record/replay/golden CSV byte-identical.');
});

test('sparse input changes are applied on the exact step and held until replaced', () => {
  const thrust = { ...idleIntent(), thrust: true, turn: 1 };
  const replay = replayTrace({ version: 1, seed: 0, steps: 5, entries: [
    { stepIndex: 1, intent: thrust }, { stepIndex: 4, intent: idleIntent() },
  ] });
  expect(replay.frames.map((frame) => frame.intent.thrust)).toEqual([false, false, true, true, true, false]);
  expect(replay.frames.at(-1)?.stepIndex).toBe(5);
});

test('reset restores the initial world and snapshots cannot mutate it', () => {
  const harness = createHarness(42);
  const before = harness.snapshot();
  harness.step({ ...idleIntent(), thrust: true });
  expect(before.stepIndex).toBe(0);
  expect(Object.isFrozen(before)).toBe(true);
  harness.reset(42);
  expect(harness.snapshot()).toEqual(before);
});

test.each([
  { version: 2, seed: 1, steps: 1, entries: [] },
  { version: 1, seed: -1, steps: 1, entries: [] },
  { version: 1, seed: 1, steps: 0.5, entries: [] },
  { version: 1, seed: 1, steps: 1, entries: [{ stepIndex: 1, intent: idleIntent() }] },
  { version: 1, seed: 1, steps: 2, entries: [{ stepIndex: 0, intent: idleIntent() }, { stepIndex: 0, intent: idleIntent() }] },
  { version: 1, seed: 1, steps: 1, entries: [{ stepIndex: 0, intent: { ...idleIntent(), turn: 2 } }] },
])('rejects corrupt traces %#', (trace) => { expect(() => parseTrace(trace)).toThrow(); });

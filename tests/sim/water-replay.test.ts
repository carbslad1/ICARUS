import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { createRecorder } from '../../src/harness/record';
import { replayTrace } from '../../src/harness/replay';
import { parseTrace } from '../../src/harness/trace';
import { idleIntent } from '../../src/sim/intent';
import { createHarness } from '../../src/harness/headless';
import { createWaterWorld } from '../../src/sim/world';
import { createFixedLoop } from '../../src/harness/loop';
import { seconds } from '../../src/sim/units';

test('water recording and replay match the reviewed golden, including a breach and perfect re-entry', () => {
  const trace = parseTrace(JSON.parse(readFileSync('tests/golden/water.trace.json', 'utf8')));
  const expected = readFileSync('tests/golden/water.csv', 'utf8');
  const replay = replayTrace(trace);
  expect(replay.csv).toBe(expected);
  const recorder = createRecorder(trace.seed, 'water', trace.version === 2 ? trace.tuning : undefined);
  let intent = idleIntent();
  let cursor = 0;
  for (let index = 0; index < trace.steps; index += 1) {
    if (trace.entries[cursor]?.stepIndex === index) {
      intent = trace.entries[cursor]?.intent ?? idleIntent();
      cursor += 1;
    }
    recorder.step(intent);
  }
  expect(recorder.csv()).toBe(expected);
  const last = replay.frames.at(-1)?.player;
  expect(last?.breaches).toBe(1);
  expect(last?.entries).toBe(1);
  expect(last?.streak).toBe(1);
  expect(last?.lastCrossing?.grade).toBe('perfect');
  expect(last?.bestApex).toBeGreaterThan(10);
  expect(replay.frames[300]?.player?.medium).toBe('air');
  console.log('PASS water golden: 600 steps, breach, ballistic arc, perfect entry; recording and replay byte-identical.');
});

test('water state is identical when render frames group one, two, or four fixed steps', () => {
  const states = [30, 60, 120].map((fps) => {
    const harness = createHarness(42, createWaterWorld);
    const loop = createFixedLoop(() => {
      const index = harness.snapshot().stepIndex;
      harness.step({ ...idleIntent(), thrust: true, turn: index < 87 || index >= 270 && index < 425 ? 1 : 0 });
    });
    for (let frame = 0; frame < fps * 6; frame += 1) loop.advance(seconds(1 / fps));
    expect(harness.snapshot().stepIndex).toBe(720);
    return harness.snapshot();
  });
  expect(states[0]).toEqual(states[1]);
  expect(states[1]).toEqual(states[2]);
});

test('snapshots do not expose a mutable player or change after further steps', () => {
  const harness = createHarness(42, createWaterWorld);
  const before = harness.snapshot();
  const json = JSON.stringify(before);
  harness.step({ ...idleIntent(), thrust: true });
  expect(JSON.stringify(before)).toBe(json);
  expect(Object.isFrozen(before.player)).toBe(true);
  expect(Object.isFrozen(before.player?.position)).toBe(true);
});

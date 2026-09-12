import { bench, describe } from 'vitest';
import { createHarness } from '../../src/harness/headless';
import { idleIntent } from '../../src/sim/intent';

describe('empty-world baseline (content budgets begin in Phase 3)', () => {
  const harness = createHarness(42);
  const intent = idleIntent();
  bench('1000 fixed steps', () => {
    harness.reset(42);
    for (let step = 0; step < 1000; step += 1) harness.step(intent);
  });
});

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const [directory] = process.argv.slice(2);
if (!directory) throw new Error('Usage: npm run record:water -- new-output-directory');
mkdirSync(directory, { recursive: true });
const server = await createServer({ server: { middlewareMode: true, ws: false, watch: null }, appType: 'custom' });
try {
  const { createRecorder } = await server.ssrLoadModule('/src/harness/record.ts');
  const { idleIntent } = await server.ssrLoadModule('/src/sim/intent.ts');
  const { traceJson } = await server.ssrLoadModule('/src/harness/trace.ts');
  const recorder = createRecorder(42, 'water');
  for (let step = 0; step < 600; step += 1) {
    recorder.step({ ...idleIntent(), thrust: true, turn: step < 87 || step >= 270 && step < 425 ? 1 : 0 });
  }
  writeFileSync(join(directory, 'water.trace.json'), traceJson(recorder.trace()), { flag: 'wx' });
  writeFileSync(join(directory, 'water.csv'), recorder.csv(), { flag: 'wx' });
  console.log('Recorded a new 600-step water baseline: launch, ballistic arc, aligned entry. Existing files cannot be overwritten.');
} finally {
  await server.close();
}

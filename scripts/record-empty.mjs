import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';

const [directory] = process.argv.slice(2);
if (!directory) throw new Error('Usage: npm run record:empty -- new-output-directory');
mkdirSync(directory, { recursive: true });
const server = await createServer({ server: { middlewareMode: true, ws: false, watch: null }, appType: 'custom' });
try {
  const { createRecorder } = await server.ssrLoadModule('/src/harness/record.ts');
  const { idleIntent } = await server.ssrLoadModule('/src/sim/intent.ts');
  const { traceJson } = await server.ssrLoadModule('/src/harness/trace.ts');
  const recorder = createRecorder(42);
  for (let step = 0; step < 1000; step += 1) recorder.step(idleIntent());
  writeFileSync(join(directory, 'empty.trace.json'), traceJson(recorder.trace()), { flag: 'wx' });
  writeFileSync(join(directory, 'empty.csv'), recorder.csv(), { flag: 'wx' });
  console.log('Recorded 1000 stationary-world steps; existing files cannot be overwritten.');
} finally {
  await server.close();
}

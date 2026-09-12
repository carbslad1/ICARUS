import { readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const [input, output] = process.argv.slice(2);
if (!input) throw new Error('Usage: npm run replay -- trace.json [output.csv]');
const server = await createServer({ server: { middlewareMode: true, ws: false, watch: null }, appType: 'custom' });
try {
  const { parseTrace } = await server.ssrLoadModule('/src/harness/trace.ts');
  const { replayTrace } = await server.ssrLoadModule('/src/harness/replay.ts');
  const result = replayTrace(parseTrace(JSON.parse(readFileSync(input, 'utf8'))));
  if (output) writeFileSync(output, result.csv, { flag: 'wx' });
  else process.stdout.write(result.csv);
} finally {
  await server.close();
}

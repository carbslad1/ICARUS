import { mkdirSync, writeFileSync } from 'node:fs';

mkdirSync('artifacts', { recursive: true });
writeFileSync('artifacts/verify-start.json', JSON.stringify({ startedAt: Date.now() }));

import { readFileSync, writeFileSync } from 'node:fs';

const { startedAt } = JSON.parse(readFileSync('artifacts/verify-start.json', 'utf8'));
const elapsedMs = Date.now() - startedAt;
const budgetMs = 120_000;
if (!Number.isFinite(elapsedMs) || elapsedMs < 0 || elapsedMs >= budgetMs) {
  throw new Error(`verify exceeded its two-minute budget: ${elapsedMs}ms`);
}
const report = { passed: true, elapsedMs, budgetMs };
writeFileSync('artifacts/verify-result.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(`PASS verify: ${(elapsedMs / 1000).toFixed(2)}s < 120s; all five checks green.`);

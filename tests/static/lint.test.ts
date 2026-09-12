import { ESLint } from 'eslint';
import { expect, test } from 'vitest';

const eslint = new ESLint();

test.each([
  ['Math.random()', 'no-restricted-properties'],
  ['Date.now()', 'no-restricted-properties'],
  ['performance.now()', 'no-restricted-properties'],
  ['import "pixi.js"', 'no-restricted-imports'],
  ['import "../render/empty"', 'architecture/sim-boundary'],
  ['export * from "../audio/synth"', 'architecture/sim-boundary'],
  ['import("../input/keyboard")', 'architecture/sim-boundary'],
  ['export const speed = 1 + 7', 'no-magic-numbers'],
  ['export const mode = navigator.platform', 'architecture/no-conditional-gameplay'],
])('rejects %s', async (code, rule) => {
  const results = await eslint.lintText(code, { filePath: 'src/sim/probe.ts' });
  expect(results.flatMap((result) => result.messages.map((message) => message.ruleId))).toContain(rule);
});

test.each(['0xff00ff', '"#ff00ff"', '"rgb(255, 0, 0)"'])('renderer rejects raw colour %s', async (literal) => {
  const results = await eslint.lintText(`export const colour = ${literal}`, { filePath: 'src/render/probe.ts' });
  expect(results.flatMap((result) => result.messages.map((message) => message.ruleId))).toContain('architecture/no-raw-colours');
});

test('unit casts are rejected away from their constructors', async () => {
  const results = await eslint.lintText('export const value = 1 as Metres', { filePath: 'src/sim/probe.ts' });
  expect(results.flatMap((result) => result.messages.map((message) => message.ruleId))).toContain('architecture/no-unit-casts');
});

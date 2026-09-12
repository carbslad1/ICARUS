import { expect, test } from 'vitest';
import ts from 'typescript';
import { CONSTANTS } from '../../src/sim/constants';
import { sourceFiles, syntaxTree, visit } from '../helpers/source';

function leaves(value: object): string[] {
  expect(Object.isFrozen(value)).toBe(true);
  return Object.entries(value).flatMap(([key, item]: [string, unknown]) =>
    typeof item === 'object' && item !== null ? leaves(item) : [key]);
}

test('every deeply frozen constant leaf is read by production source, not just comments or tests', () => {
  const references = new Set<string>();
  for (const file of sourceFiles('src').filter((file) => !file.endsWith('/constants.ts'))) {
    visit(syntaxTree(file), (node) => {
      if (ts.isPropertyAccessExpression(node)) references.add(node.name.text);
      if (ts.isElementAccessExpression(node) && ts.isStringLiteral(node.argumentExpression)) references.add(node.argumentExpression.text);
    });
  }
  const keys = leaves(CONSTANTS);
  expect(keys.length).toBeGreaterThan(0);
  for (const key of keys) expect(references.has(key), `Unused constant: ${key}`).toBe(true);
});

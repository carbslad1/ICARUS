import { describe, expect, test } from 'vitest';
import { dirname, resolve, sep } from 'node:path';
import ts from 'typescript';
import { sourceFiles, syntaxTree, visit } from '../helpers/source';

describe('simulation architecture, independent of lint configuration', () => {
  const files = sourceFiles('src/sim');
  test('discovers a non-empty simulation', () => { expect(files.length).toBeGreaterThan(0); });

  test.each(files)('%s imports only simulation modules', (file) => {
    visit(syntaxTree(file), (node) => {
      let source: ts.Node | undefined;
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) source = node.moduleSpecifier;
      if (ts.isImportTypeNode(node)) source = node.argument;
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || node.expression.getText() === 'require')) source = node.arguments[0];
      if (source && ts.isLiteralTypeNode(source)) source = source.literal;
      if (!source) return;
      expect(ts.isStringLiteral(source), `Non-literal import in ${file}`).toBe(true);
      if (!ts.isStringLiteral(source)) return;
      expect(source.text).not.toMatch(/(?:^|\/)(?:render|input|audio|harness)(?:\/|$)|^pixi\.js/);
      expect(source.text.startsWith('.'), `External import ${source.text}`).toBe(true);
      expect(resolve(dirname(file), source.text).startsWith(`${resolve('src/sim')}${sep}`)).toBe(true);
    });
  });

  test.each(files.filter((file) => !file.endsWith('/constants.ts')))('%s has no scattered tunables', (file) => {
    visit(syntaxTree(file), (node) => {
      if (ts.isNumericLiteral(node)) {
        expect([0, 1, 2], `Move ${node.text} in ${file} into constants.ts`).toContain(Number(node.text));
      }
    });
  });

  test.each(sourceFiles('src').filter((file) => !file.endsWith('/units.ts')))('%s cannot bypass branded constructors', (file) => {
    visit(syntaxTree(file), (node) => {
      expect(ts.isAsExpression(node) || ts.isTypeAssertionExpression(node), `Type assertion outside units.ts in ${file}`).toBe(false);
    });
  });
});

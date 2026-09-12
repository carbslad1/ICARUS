import { expect, test } from 'vitest';
import { sourceFiles } from '../helpers/source';

const modules = import.meta.glob('../../src/sim/**/*.ts');

test('every simulation module loads in pure Node, without DOM or WebGL shims', async () => {
  expect(typeof window).toBe('undefined');
  expect(typeof document).toBe('undefined');
  expect(typeof WebGL2RenderingContext).toBe('undefined');
  expect(Object.keys(modules).length).toBe(sourceFiles('src/sim').length);
  for (const load of Object.values(modules)) await expect(load()).resolves.toBeDefined();
});

import tseslint from 'typescript-eslint';
import globals from 'globals';
import architecture from './tools/eslint-architecture.mjs';

export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'artifacts/**', 'test-results/**', 'playwright-report/**'] },
  { linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' } },
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,mjs}'],
    languageOptions: { globals: { ...globals.node } },
    plugins: { architecture },
  },
  {
    files: ['src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser } },
    rules: { 'architecture/no-unit-casts': 'error' },
  },
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error',
        { object: 'Math', property: 'random', message: 'Use world.rng' },
        { object: 'Date', property: 'now', message: 'No wall clock in sim/' },
        { object: 'performance', property: 'now', message: 'No wall clock in sim/' },
      ],
      'no-restricted-imports': ['error', { patterns: [
        'pixi.js', 'pixi.js/**', '**/render/**', '**/input/**', '**/audio/**',
      ] }],
      'architecture/sim-boundary': 'error',
      'architecture/no-conditional-gameplay': 'error',
    },
  },
  {
    files: ['src/sim/**/*.ts'],
    ignores: ['src/sim/constants.ts'],
    rules: { 'no-magic-numbers': ['error', { ignore: [0, 1, -1, 2], enforceConst: true }] },
  },
  {
    files: ['src/render/**/*.ts'],
    ignores: ['src/render/palette.ts'],
    rules: { 'architecture/no-raw-colours': 'error' },
  },
);

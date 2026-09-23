import js from '@eslint/js';
import ts from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

export default ts.config(
  { ignores: ['dist/', '.astro/', 'node_modules/', 'test-results/', 'playwright-report/', '.lighthouseci/'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },
  {
    files: ['**/*.astro'],
    rules: {
      // Astro components declare props in frontmatter that the template consumes.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
);

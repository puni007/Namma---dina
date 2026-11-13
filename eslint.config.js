import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { files: ['client/src/**/*.{ts,tsx}'], languageOptions: { globals: globals.browser }, plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh }, rules: { ...reactHooks.configs.recommended.rules, 'react-refresh/only-export-components': ['warn', { allowConstantExport: true }] } },
  { files: ['server/**/*.ts'], languageOptions: { globals: globals.node }, rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
  // These registries intentionally index Prisma's generated delegates and Zod schemas dynamically.
  { files: ['server/src/routes/crud.ts', 'server/src/routes/resources.ts'], rules: { '@typescript-eslint/no-explicit-any': 'off' } },
  // Express request augmentation uses declaration merging to carry the authenticated principal.
  { files: ['server/src/middleware/auth.ts'], rules: { '@typescript-eslint/no-namespace': 'off' } },
);

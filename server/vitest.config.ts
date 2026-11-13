import { defineConfig } from 'vitest/config';

const localDbUrl = process.env.TEST_DATABASE_URL || 'postgresql://namma:namma_local@localhost:5432/namma_dina?schema=public';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    env: {
      DATABASE_URL: localDbUrl,
      DATABASE_URL_UNPOOLED: localDbUrl,
    },
  },
});

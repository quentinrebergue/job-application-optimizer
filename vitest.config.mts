import { configDefaults, defineConfig } from 'vitest/config'
import path from 'path'

// Two projects (#221):
//  - unit: everything except the tests that need a database;
//  - db: the `*.db.test.ts` files, run against a real Postgres when TEST_DATABASE_URL is set (a throwaway
//    schema made by the global setup) and skipped, with a message, when it is not. One file at a time:
//    they share that schema.
// `npm test` runs both; `npm run test:db` runs the second only.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: { name: 'unit', exclude: [...configDefaults.exclude, '**/*.db.test.ts'] },
      },
      {
        extends: true,
        test: {
          name: 'db',
          include: ['**/*.db.test.ts'],
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
          globalSetup: ['./src/tests/db/global-setup.ts'],
        },
      },
    ],
  },
})

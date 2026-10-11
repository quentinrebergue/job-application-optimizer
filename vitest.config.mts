import { configDefaults, defineConfig } from 'vitest/config'
import path from 'path'

// Two projects (#221):
//  - unit: everything except the tests that need a database;
//  - db: the `*.db.test.ts` files, run against a real Postgres when TEST_DATABASE_URL is set (a throwaway
//    schema made by the global setup) and skipped, with a message, when it is not. One file at a time:
//    they share that schema.
// `npm test` runs both; `npm run test:db` runs the second only; `npm run test:coverage` runs both and measures
// what they execute (a tool to look at from time to time, with no threshold: #129).
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    // The code where a bug costs most. The pages and components are left out: they are not unit tested, and
    // counting them would hide what this shows. Run with TEST_DATABASE_URL set, or lib/data reads as untested.
    coverage: {
      provider: 'v8',
      include: ['src/lib/**', 'src/app/api/**', 'src/app/actions/**', 'src/emails/**'],
      exclude: ['**/*.test.*', '**/README.md', 'src/tests/**'],
      reporter: ['text-summary', ['text', { skipFull: true }], 'html'],
    },
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

import { defineConfig } from 'vitest/config'

// Default test run — unit tests only.
// Integration tests live in __tests__/integration/ and require a running
// dev server (npm run dev). They are excluded here so that npm test and
// the GitHub Actions CI pipeline never try to call localhost:3000.
// To run integration tests locally use: npm run test:int
export default defineConfig({
  test: {
    exclude: [
      '**/node_modules/**',
      '__tests__/integration/**',
    ],
  },
})

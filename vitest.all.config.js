import { defineConfig } from 'vitest/config'

// Full test run — unit tests + integration tests together.
// Used by npm run test:all for a complete local verification
// before pushing. Requires npm run dev to be running first.
export default defineConfig({
  test: {
    include: ['__tests__/**/*.test.js'],
    reporter: 'verbose',
  },
})

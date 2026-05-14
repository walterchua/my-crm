import { defineConfig } from 'vitest/config'

// Integration test run — used by npm run test:int only.
// These tests call the real server at localhost:3000 and require
// npm run dev to be running before you execute this config.
// Unit tests are not included here — run npm test for those.
export default defineConfig({
  test: {
    include: ['__tests__/integration/**/*.test.js'],
    reporter: 'verbose',
  },
})

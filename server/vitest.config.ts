import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './src/tests/globalSetup.ts',
    testTimeout: 30000,
    hookTimeout: 30000,
    // All integration test files share ONE in-memory MongoDB instance
    // (see globalSetup.ts). Running test files in parallel would let them
    // race on shared collections — e.g. a reviewer-visibility assertion in
    // one file counting trades a different file created concurrently.
    // Running files sequentially trades some speed for correctness here.
    fileParallelism: false,
  },
});

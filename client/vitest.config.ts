import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vitest doesn't load vite.config.ts, so the __APP_VERSION__/__GIT_SHA__
  // globals it defines (see vite.config.ts) need their own, test-only
  // values here — otherwise importing Footer.tsx in a test throws a
  // ReferenceError before the test body even runs.
  define: {
    __APP_VERSION__: JSON.stringify('test'),
    __GIT_SHA__: JSON.stringify('testsha'),
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.ts',
    css: false,
  },
});

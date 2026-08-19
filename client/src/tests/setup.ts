import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Vitest doesn't run in "globals" mode here, so React Testing Library's
// automatic afterEach(cleanup) never registers itself. Without this, DOM
// nodes from one test's render() leak into the next test.
afterEach(() => {
  cleanup();
});

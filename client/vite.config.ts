import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string;
};

// Best-effort commit identity for the footer's version signature. Works
// out of the box for local dev/build and CI (both have .git present); the
// Docker build stage doesn't copy .git into its context, so it falls back
// to a VITE_GIT_SHA build arg if one was passed, or shows no commit at all
// — never a build failure either way.
function getGitSha(): string {
  try {
    const repoRoot = fileURLToPath(new URL('..', import.meta.url));
    return execSync('git rev-parse --short HEAD', { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return process.env.VITE_GIT_SHA ?? '';
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_SHA__: JSON.stringify(getGitSha()),
  },
});

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Injected by vite.config.ts's `define` — the app version (from
// package.json) and short git commit SHA (empty string if unavailable,
// e.g. a Docker build with no .git in its context).
declare const __APP_VERSION__: string;
declare const __GIT_SHA__: string;

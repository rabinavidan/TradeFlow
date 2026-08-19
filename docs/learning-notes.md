# Learning Notes

Phase-by-phase log of what was built, what it teaches, and what to remember
before an interview. Newest phase at the bottom.

---

## Phase 0 — Project Setup

### What we built

- An **npm workspaces monorepo**: one root `package.json` with `client` and
  `server` as workspaces, so `npm install` at the root installs both, and
  scripts like `npm run lint` fan out to each workspace.
- **`client/`** — a Vite + React + TypeScript app (strict mode) with a
  placeholder page that calls the backend's `/api/health` endpoint, proving
  the two sides are connected.
- **`server/`** — a Node + Express + TypeScript API with:
  - `src/config/env.ts` — loads and **validates** environment variables with
    Zod at startup (fail fast if `JWT_SECRET` or `MONGODB_URI` are missing).
  - `src/config/db.ts` — connects to MongoDB via Mongoose.
  - `src/config/logger.ts` — structured logging with `pino`.
  - `src/middleware/requestLogger.ts` — logs method/route/status/duration
    for every request, with a correlation id.
  - `src/middleware/errorHandler.ts` + `src/utils/AppError.ts` — a single
    place that turns any thrown error (validation, "not found", unexpected
    bug) into a consistent `{ error: { code, message } }` JSON shape.
  - `src/routes/health.routes.ts` — `GET /api/health` reports API + DB status.
- Root ESLint (flat config) + Prettier shared across both workspaces.

### Concepts learned

**Monorepo vs. separate repos.** A monorepo keeps frontend and backend in one
place, sharing tooling (lint, format) while still deploying as separate
services. npm workspaces link `client` and `server` as independent
`package.json`s under one root without a heavier tool like Nx/Turborepo —
appropriate for a two-package portfolio project.

**Environment variables & fail-fast config.** Secrets and environment-specific
values (`JWT_SECRET`, `MONGODB_URI`) never get hard-coded — they come from
`.env` (gitignored) via `dotenv`. Validating them with Zod at boot means a
missing secret crashes immediately with a clear message, instead of causing a
confusing failure three requests later.

**Why a global error handler.** Express lets you `throw` (or call `next(err)`)
from anywhere, and a single middleware with 4 parameters — `(err, req, res,
next)` — catches all of it. This is the "error boundary between layers" from
the master brief: controllers/services just throw `AppError`s or let
unexpected errors bubble, and one place decides the HTTP status + JSON shape
and whether to leak details (never in production).

**TypeScript `strict: true`.** Both `client` and `server` compile with strict
mode. This catches null/undefined bugs and implicit `any` at compile time
instead of runtime — the `pino-http` import bug below is a good example of
strict mode paying for itself immediately.

### Important code

```ts
// server/src/config/env.ts — fail fast on bad config
const envSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  // ...
});
export const env = loadEnv(); // throws at import time if invalid
```

```ts
// server/src/middleware/errorHandler.ts — one shape for every error
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const { status, body } = toErrorBody(err); // AppError | ZodError | Mongoose error | unknown
  res.status(status).json(body);
}
```

### Important commands

```bash
npm install                 # installs client + server workspaces
npm run dev:server           # start API on :4000 (tsx watch)
npm run dev:client           # start Vite on :5173
npm run lint / typecheck / build   # quality gates, run across both workspaces
curl http://localhost:4000/api/health
```

### Problems solved

**Bug:** `tsc --noEmit` failed with `This expression is not callable` on
`import pinoHttp from 'pino-http'`.
**Root cause:** `pino-http`'s type definitions export `pinoHttp` as a *named*
export (`export { PinoHttp as pinoHttp }`), not the default export. A default
import under `NodeNext` module resolution doesn't fall back to a named export
even with `esModuleInterop`.
**Fix:** `import { pinoHttp } from 'pino-http';`
**Prevention:** When a third-party package's default import "isn't callable",
check its `.d.ts` for the actual `export` statements rather than assuming CJS
default-export behavior.

### Interview questions

1. **Why validate environment variables at startup instead of using them
   directly?** — Fail fast with one clear error, instead of a confusing crash
   deep in a request handler minutes/hours later.
2. **What problem does a global Express error handler solve?** — Centralizes
   the mapping from "something went wrong" to "the right HTTP status + a
   consistent JSON error shape", so every controller doesn't need its own
   try/catch boilerplate.
3. **Why keep `client` and `server` in one repo but as separate npm
   packages?** — Shared tooling and one PR can touch both sides atomically,
   while each package still has its own independent dependency tree and can
   still be deployed/scaled separately.

### What I should remember

- `npm workspaces` = one root `package.json` + `"workspaces": [...]`, then
  `npm run <script> --workspace <name>` targets one package.
- Express error middleware is recognized **by having exactly 4 parameters**
  `(err, req, res, next)` — that's not a convention, Express inspects the
  function's arity.
- `strict: true` in `tsconfig.json` is non-negotiable for this project — it's
  what makes TypeScript actually useful instead of decorative.

---

### Phase 0 review

**TOP 5 THINGS TO REMEMBER**
1. Monorepo = one root, two independently-versioned workspaces.
2. Validate config with Zod at boot; never trust `process.env` blindly.
3. Express error middleware is identified by 4-argument arity.
4. Structured JSON logs (pino) beat `console.log` for anything you'll ever
   need to search or ship to a log aggregator.
5. `/api/health` should report **dependency** health (DB), not just "the
   process is alive".

**TOP 5 INTERVIEW QUESTIONS**
1. Why validate env vars at startup?
2. What does a global Express error handler solve?
3. Why keep client/server in one repo as separate packages?
4. What does `strict: true` actually change in TypeScript?
5. What's the difference between `console.log` and structured logging?

**TOP 3 DEVELOPMENT TIPS**
1. Wire the error-handling foundation (AppError + errorHandler) before the
   first real feature — retrofitting it later means touching every route.
2. Keep environment config in one typed module (`env.ts`) and import that,
   never `process.env` scattered through the codebase.
3. Prove frontend↔backend wiring with the simplest possible request
   (`/api/health`) before building real features on top.

**TOP 3 COMMON MISTAKES**
1. Letting `process.env.SOME_VAR` be read in ten different files with ten
   different assumptions about whether it's optional.
2. Forgetting Express error middleware needs exactly 4 parameters — 3 params
   makes Express treat it as regular (non-error) middleware, silently.
3. Logging stack traces or full error objects to the client response in
   production.

**MINI EXERCISE**
Add a new env var `REQUEST_BODY_LIMIT` (default `"100kb"`) to `env.ts` and
use it in `app.ts`'s `express.json({ limit: ... })` instead of the
hard-coded string.

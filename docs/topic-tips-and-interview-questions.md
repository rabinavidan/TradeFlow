# Topic Tips & Interview Questions

Deep-dive reference, one block per topic, added only once that topic is
actually used in the project. Each block covers: Development Tips, Common
Mistakes, Debugging Tips, Interview Questions, Strong Interview Answers,
Project-Specific Example, and a Mini Exercise.

---

## B. TypeScript

**Development Tips**
- Keep `strict: true` on from day one — retrofitting strict mode onto a loose
  codebase is far more painful than starting with it.
- Avoid `any`; prefer `unknown` for values you haven't validated yet (e.g.
  `catch (err: unknown)`), then narrow before use.
- Let the compiler design your interfaces: write the shape you wish existed,
  then make the code satisfy it, rather than fighting inferred types.

**Common Mistakes**
- Reaching for `any` to silence an error instead of understanding why
  TypeScript is complaining.
- Assuming a third-party package's default export works the way CommonJS
  `require` would — check the `.d.ts` file's actual `export` statements.

**Debugging Tips**
- Read the *first* TypeScript error in a chain — later ones are often
  downstream noise from the first.
- `tsc --noEmit` is the fastest way to type-check without producing output
  files; that's what `npm run typecheck` runs.

**Interview Questions**
1. `any` vs `unknown` — when would you use each?
2. What does `strict: true` actually enable?
3. Why do we still validate with Zod at runtime if TypeScript already
   "types" the data?

**Strong Interview Answers**
- *Why Zod if TypeScript exists?* TypeScript types are erased at compile
  time — they provide zero runtime protection. Data crossing a real boundary
  (an HTTP request body, an environment variable, a third-party API
  response) must be validated at runtime; Zod does that and *also* gives you
  a static type via `z.infer`, so you write the shape once.

**Project Example**
`server/src/config/env.ts` uses a Zod schema to validate `process.env` at
boot, and infers the `env` object's TypeScript type from that same schema —
one source of truth for both compile-time types and runtime validation.

**Mini Exercise**
Add a `LOG_LEVEL` env var (`z.enum(['debug','info','warn','error'])`,
default `'info'`) to `env.ts` and use it in `logger.ts` instead of the
hard-coded `'info'`.

---

## G. Node.js

**Development Tips**
- Keep async work non-blocking — don't do CPU-heavy synchronous work (large
  loops, sync file I/O) on the main thread; it blocks every other request.
- Centralize environment configuration in one module instead of reading
  `process.env` all over the codebase.

**Common Mistakes**
- Forgetting that an unhandled promise rejection (e.g. `connectDB()` failing
  without a `.catch`) can crash the process silently or hang forever.
- Reading `process.env.X` directly in business logic instead of through a
  validated config object.

**Debugging Tips**
- `node --import tsx src/index.ts` runs TypeScript directly for local dev;
  check `dist/` output with `node dist/index.js` to debug a *build* issue
  specifically (compiled-output bugs differ from source bugs).
- Structured JSON logs (pino) are grep-able; `console.log` scattered through
  the code is not something you'd want in production.

**Interview Questions**
1. What makes Node.js good for I/O-heavy services?
2. What is the event loop, in one sentence?
3. What is `process.env` and where does it come from?

**Strong Interview Answers**
- *What makes Node good for I/O-heavy services?* A single JS thread handles
  request logic, but I/O (disk, network, DB) is delegated to the
  system/libuv thread pool or async OS calls — the JS thread is free to
  handle other requests while waiting, rather than blocking one
  thread-per-request like some traditional server models.

**Project Example**
`server/src/index.ts`'s `main()` awaits `connectDB()` before calling
`app.listen()` — so the server never starts accepting traffic without a
database connection, and a `.catch` on `main()` ensures a failed startup
exits with a non-zero code instead of hanging silently.

**Mini Exercise**
Add a `SIGTERM` handler in `index.ts` that logs "shutting down" and calls
`process.exit(0)` — this is what lets Docker/Kubernetes stop the container
gracefully instead of killing it after a timeout.

---

## H. Express

**Development Tips**
- Keep routes thin — a route file should only map `verb + path` to a
  controller function, no logic inside the route definition itself.
- Centralize error handling in one middleware instead of try/catch in every
  controller.

**Common Mistakes**
- Writing error-handling middleware with the wrong number of parameters —
  Express identifies error middleware **by its 4-argument arity**, not a
  naming convention. `(req, res, next)` (3 args) is treated as a normal
  middleware and silently never receives errors.
- Registering the error handler (or 404 handler) *before* the routes — order
  matters in Express; middleware and routes run in registration order.

**Debugging Tips**
- If an error handler never fires, check argument count first, then check
  it's registered *after* all routes.
- `pino-http`'s request logger assigns a correlation id per request
  (`x-request-id` header) — include it when asking "why did this one request
  fail" in a shared/prod environment.

**Interview Questions**
1. How does Express know a piece of middleware is an error handler?
2. What does `next()` do, and what does `next(err)` do differently?
3. Why keep controllers thin and push logic into a service layer?

**Strong Interview Answers**
- *How does Express know a function is error-handling middleware?* By
  counting its declared parameters — exactly 4 (`err, req, res, next`)
  marks it as an error handler; Express skips it for normal requests and
  only invokes it when `next(err)` is called or a synchronous handler
  throws.

**Project Example**
`server/src/app.ts` registers `notFoundHandler` then `errorHandler` as the
very last two `app.use()` calls, after every route — so any unmatched route
or thrown error still reaches them.

**Mini Exercise**
Add a `requestId` field to the JSON error body in `errorHandler.ts`, pulled
from `req.id` (set by `pino-http`), so a client-visible error can be
correlated with a specific server log line.

---

## M. Git

**Development Tips**
- Commit small, logical changes with a `type: description` prefix (`feat:`,
  `fix:`, `test:`, `refactor:`, `ci:`, `docs:`) — this project's history
  should read like a changelog.
- Run `git status` before any command that could discard work
  (`checkout`, `reset --hard`, `clean`).

**Common Mistakes**
- Committing `.env` (secrets) instead of `.env.example` (a template).
- One giant commit for an entire phase, instead of commits per logical step
  (scaffold → feature → tests → docs).

**Debugging Tips**
- `git diff --staged` before every commit — confirms exactly what's about to
  be committed, catching accidental debug code or stray files.

**Interview Questions**
1. What belongs in `.gitignore` for a Node/React project, and why?
2. What's the difference between `git fetch` and `git pull`?
3. What is a pull request, and why use one even solo?

**Strong Interview Answers**
- *What belongs in `.gitignore`?* Anything regenerable or environment-
  specific: `node_modules/` (regenerated by `npm install`), `dist/`/`build/`
  (regenerated by the build), `.env` (secrets — never committed, only
  `.env.example` is), and OS/editor cruft (`.DS_Store`).

**Project Example**
This repo's root `.gitignore` excludes `node_modules/`, `dist/`, `.env`
(with `.env.example` explicitly un-ignored via `!.env.example`), and test
artifacts (`coverage/`, Playwright reports).

**Mini Exercise**
Make a one-line change to `README.md`, then run `git diff` before staging
and `git diff --staged` after — notice how the two commands show the same
diff from different states of the working tree/index.

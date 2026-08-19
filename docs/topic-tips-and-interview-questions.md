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

## C. React

**Development Tips**
- Keep server state (data that lives on the backend) in TanStack Query;
  keep client/UI state (form inputs, toggles) in local `useState`.
- Don't copy props into `useState` "just in case" — read them directly, or
  derive values during render instead of syncing them with `useEffect`.
- Wrap custom components in `forwardRef` if they need to accept a `ref`
  meant for a native element inside them.

**Common Mistakes**
- Wrapping a form `<input>` in a component without `forwardRef`, silently
  breaking any library (React Hook Form, focus management) that needs a
  real DOM ref.
- Treating server data as client state: fetching it once into `useState`
  and never revalidating, so the UI silently goes stale.

**Debugging Tips**
- React's own console warnings are precise — "Function components cannot be
  given refs" points directly at a missing `forwardRef`.
- React DevTools' Components tab shows the live props/state of a mounted
  component — faster than sprinkling `console.log` through render.

**Interview Questions**
1. What causes a React component to re-render?
2. When should you *not* reach for `useEffect`?
3. What is `forwardRef` for, and when do you need it?

**Strong Interview Answers**
- *What causes a re-render?* A component re-renders when its own state
  changes, its parent re-renders (and it isn't memoized), or a context value
  it subscribes to changes. Props changing is really a special case of "the
  parent re-rendered and passed a new value."

**Project Example**
`AuthContext` keeps the authenticated user as TanStack Query server state
instead of local `useState`; `ProtectedRoute` reads it via `useAuth()` and
redirects with `<Navigate/>` when there's no user.

**Mini Exercise**
Convert `Dashboard.tsx`'s inline JSX for the "signed in as…" line into a
small reusable `<UserBadge user={user} />` component that takes a typed
`User` prop.

---

## D. React Router

**Development Tips**
- Centralize route definitions in one place (`App.tsx`) rather than scattering
  `<Route>` declarations across the codebase.
- Model "requires login" as a layout route wrapping children with `<Outlet/>`,
  not as a check duplicated inside every page component.
- Preserve the attempted location (`state: { from: location }`) when
  redirecting to `/login`, so a successful login can send the user back.

**Common Mistakes**
- Checking auth state inside every protected page instead of once, in a
  shared `ProtectedRoute` wrapper.
- Forgetting `replace: true` on a redirect after login/logout, leaving a
  confusing back-button trail through pages the user shouldn't revisit.

**Debugging Tips**
- If a protected route renders even though the user should be logged out,
  check whether the loading state is being handled — redirecting *during*
  an in-flight "am I logged in?" query is a classic race.

**Interview Questions**
1. What is a protected route, and how do you implement one with React Router?
2. What's the difference between a route param (`/trades/:id`) and a query
   param (`?status=approved`)?
3. How do you navigate programmatically after an action (e.g. after login)?

**Strong Interview Answers**
- *How do you implement a protected route?* Wrap the routes that require
  auth in a layout route whose element checks auth state: while loading,
  show a loading state; if unauthenticated, `<Navigate to="/login" />`
  (ideally carrying the attempted path in `state`); otherwise render
  `<Outlet/>` so the real nested route renders.

**Project Example**
`components/ProtectedRoute.tsx` wraps `/dashboard` (and will wrap `/trades/*`
in Phase 3); `Login.tsx` reads `location.state.from` to return the user to
where they were headed.

**Mini Exercise**
Add a `RoleRoute` variant that also checks `user.role`, redirecting to a
"not authorized" page instead of rendering `<Outlet/>` for the wrong role —
this is exactly what Phase 4's reviewer-only actions will need.

---

## E. TanStack Query

**Development Tips**
- Choose query keys that describe *what* the data is (`['auth', 'me']`,
  `['trades', { page, status }]`), not how you fetch it.
- Use `enabled` to skip queries that can't succeed yet (no token → don't
  fetch `/me`).
- After a mutation, either invalidate the affected query key or, if you
  already have the fresh data (e.g. login's response), seed the cache
  directly with `setQueryData` — cheaper and instant.

**Common Mistakes**
- Manually tracking loading/error state with `useState` next to a query that
  already exposes `isLoading`/`isError`.
- Forgetting `enabled`, causing a query to fire (and fail) before its
  prerequisites (like an auth token) exist.

**Debugging Tips**
- React Query Devtools (not yet installed here, worth adding in Phase 3)
  show every query's status, cache, and staleness live.
- A query stuck on `isLoading: true` forever usually means `queryFn` never
  resolves or rejects — check for a swallowed promise.

**Interview Questions**
1. Why use TanStack Query instead of `useEffect` + `fetch` + `useState`?
2. What does `enabled: false` do?
3. What's the difference between `invalidateQueries` and `setQueryData`?

**Strong Interview Answers**
- *Why TanStack Query over useEffect+fetch?* It replaces a lot of
  hand-rolled, easy-to-get-wrong logic — request deduplication, caching,
  background refetching, loading/error state, retries — with a declarative
  `useQuery` call, and treats server data as fundamentally different from
  local UI state (it can go stale outside of React's control).

**Project Example**
`AuthContext`'s `useQuery(['auth', 'me'], fetchCurrentUser, { enabled: hasToken })`
only runs once a token exists, and `login`/`register` seed that same cache
key directly with the response instead of triggering a second request.

**Mini Exercise**
Add `staleTime: Infinity` to the `/auth/me` query and explain, in a comment,
why that's a reasonable choice given the user object rarely changes during a
session.

---

## F. Forms + Zod

**Development Tips**
- Validate the same rules on both client (fast feedback) and server
  (the actual security boundary) — never trust the client copy alone.
- Set `defaultValues` on every `useForm` call so untouched fields are typed
  strings (`''`), not `undefined`, at submit time.
- Attach `aria-invalid` and `aria-describedby` to inputs so validation
  errors are accessible, not just visually adjacent.

**Common Mistakes**
- Skipping `defaultValues`, causing Zod's generic "Required" message to
  appear instead of your custom, more helpful one.
- Wrapping a registered `<input>` in a component without `forwardRef` (see
  the React section) — the single most common way a form "just doesn't
  submit" for no visible reason.

**Debugging Tips**
- Log `formState.errors` directly to see exactly what Zod rejected and why.
- If a field never seems to register, check the browser console for React's
  ref warning first.

**Interview Questions**
1. Why validate on both the frontend and backend instead of just one?
2. What does `zodResolver` do?
3. What's the risk of relying on browser-native `required`/`type="email"`
   validation alone?

**Strong Interview Answers**
- *Why validate on both ends?* Frontend validation is a UX convenience —
  instant feedback without a round-trip. Backend validation is the actual
  security/data-integrity boundary: any client (a browser, curl, a malicious
  script) can send arbitrary data directly to the API, bypassing whatever
  the frontend enforces.

**Project Example**
`schemas/auth.schema.ts` exists in both `client/` and `server/` with
matching rules (min password length, valid email); the server's is the one
that actually protects the database.

**Mini Exercise**
Add a `.superRefine()` to the client's register schema that rejects
passwords equal to the email's local part (before the `@`) — a simple,
teachable custom validation rule.

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

## I. REST API Design

**Development Tips**
- Design around resources (`/trades`, `/trades/:id`), not actions
  (`/getTradeById`) — let the HTTP verb carry the action.
- Support pagination on every list endpoint from day one; retrofitting it
  once clients depend on unpaginated responses is painful.
- Keep the error contract identical across every endpoint
  (`{ error: { code, message } }`) so frontend error handling is generic.
- Scope authorization at the query level, not by filtering an unscoped
  result set after the fact.

**Common Mistakes**
- Returning `200` for everything, including creates (`201`) and deletes with
  no body (`204`) — status codes are part of the API contract, not decoration.
- Building a list endpoint without pagination "for now," which becomes a
  breaking change to fix later.
- Mixing `403` and `404` inconsistently across endpoints in the same API.

**Debugging Tips**
- When an endpoint returns the wrong data for the wrong user, check the
  *query filter* first — it's the most common place authorization silently
  breaks (an unscoped `find({})` instead of `find({ createdBy })`).
- A `422` with `error.details` (from `err.flatten()`) tells you exactly
  which field failed Zod validation and why — read it before guessing.

**Interview Questions**
1. Why does `POST /trades` return `201`, not `200`?
2. Why does `DELETE /trades/:id` return `204` with an empty body?
3. When would you choose `403` over `404` for an authorization failure?

**Strong Interview Answers**
- *Why 201 for POST?* `200 OK` says "here's the result of your request";
  `201 Created` more precisely says "a new resource now exists" — and
  conventionally the response body is the resource that was created, which
  is exactly what `create` returns here.

**Project Example**
`server/src/controllers/trade.controller.ts`: `create` → `201`, `list`/`getOne`/`update` → `200`, `remove` → `204` with `res.status(204).send()` (no body).

**Mini Exercise**
Add a `PATCH /api/trades/:id/status` route stub (no logic yet — that's
Phase 4) and explain in a comment why `PATCH` is the right verb here instead
of `PUT`.

---

## J. MongoDB

**Development Tips**
- Design indexes for the queries you actually run — `{ createdBy: 1, createdAt: -1 }`
  and `{ status: 1, createdAt: -1 }` here, not a blanket index on every field.
- Use `Promise.all` for independent queries (`find` + `countDocuments`)
  instead of sequential `await`s.
- Prefer referencing (`createdBy: ObjectId`) over embedding for data that
  has its own identity and lifecycle (a `User` isn't part of a `TradeRequest`).
- Keep a `toJSON` transform on the schema for a consistent, clean API shape
  instead of re-mapping fields in every controller.

**Common Mistakes**
- Adding an index for every field "just in case" — each index costs write
  performance and storage; only add what a real query needs.
- Passing a different filter to `find()` than to `countDocuments()`,
  producing a `pagination.total` that doesn't match what pagination actually
  returns.
- Trusting a raw `req.params.id` without considering it might not be a valid
  ObjectId — Mongoose throws a `CastError`, which needs to map to a `400`,
  not leak as a `500`.

**Debugging Tips**
- `db.traderequests.getIndexes()` in `mongosh` shows what's actually
  indexed; `.explain('executionStats')` on a query shows whether it used one.
- A `CastError` (`This expression is not callable`... no — `Cast to ObjectId
  failed`) means the ID string wasn't a valid 24-character hex ObjectId.

**Interview Questions**
1. How do you decide what to index?
2. Embedding vs. referencing — how did you choose for `TradeRequest.createdBy`?
3. How does this project implement pagination, and why keep the same filter
   for `find()` and `countDocuments()`?

**Strong Interview Answers**
- *Embedding vs. referencing?* Embed data that's always accessed together
  with its parent and doesn't have independent identity (e.g. an address
  embedded in an order). Reference data with its own lifecycle, queried
  independently, or shared across many parents — a `User` is referenced from
  `TradeRequest.createdBy` because users are queried on their own (login,
  profile) and one user is referenced by many trades.

**Project Example**
`server/src/models/TradeRequest.ts`'s two compound indexes match this
project's two real access patterns exactly (a user's own list; a reviewer's
status-filtered queue); the text index backs the search box.

**Mini Exercise**
Run `db.traderequests.find({ createdBy: ObjectId("...") }).sort({ createdAt: -1 }).explain('executionStats')`
in `mongosh` against seeded data and confirm `totalDocsExamined` is close to
`nReturned` (proof the index is actually being used, not a full collection scan).

---

## K. Authentication + JWT

**Development Tips**
- Hash passwords with bcrypt (or argon2); never store or log plaintext.
- Keep the JWT payload minimal — an id and a role, not the whole user
  object; it's readable by anyone (base64, not encrypted).
- Return the same generic error for "no such user" and "wrong password".
- Keep `JWT_SECRET` out of source control; validate its presence (and
  minimum length) at boot.

**Common Mistakes**
- Storing sensitive data in a JWT payload, forgetting it's only
  *signed*, not encrypted — anyone can decode and read it.
- Returning different error messages/status codes for "unknown email" vs.
  "wrong password", leaking which emails are registered.
- Logging the raw password or token anywhere, even at debug level.

**Debugging Tips**
- Decode a JWT at [jwt.io] (or `jwt.decode()`, no secret needed) to inspect
  its payload during debugging — but verifying the signature is what
  actually matters for trust.
- A `401` on a protected route with a valid-looking token usually means an
  expired token, a `JWT_SECRET` mismatch (e.g. between environments), or a
  missing `Bearer ` prefix on the `Authorization` header.

**Interview Questions**
1. What's inside a JWT, and is it encrypted?
2. Why hash passwords instead of encrypting them (reversibly)?
3. Where should a JWT be stored on the client, and what are the tradeoffs?

**Strong Interview Answers**
- *Where should a JWT be stored client-side?* Common options: `localStorage`
  (simple, but readable by any JS on the page — vulnerable to XSS) or an
  httpOnly cookie (immune to JS/XSS reading it, but needs CSRF protection
  and more server-side wiring). This project uses `localStorage` for
  simplicity, appropriate for a portfolio app — a production app handling
  sensitive data would weigh httpOnly cookies more seriously.
- *Why hash instead of encrypt?* Encryption is reversible by design (you can
  decrypt with the right key) — the server should never need to recover the
  original password, only verify a guess against it. A one-way hash (bcrypt)
  means even a full database leak doesn't hand over usable passwords, only
  hashes that are deliberately expensive to crack.

**Project Example**
`services/auth.service.ts` signs `{ sub: user._id, role: user.role }`;
`middleware/auth.ts`'s `requireAuth` verifies it and attaches the payload to
`req.user` for every downstream handler.

**Mini Exercise**
Decode a token issued by `POST /api/auth/login` at jwt.io (or with
`node -e "console.log(require('jsonwebtoken').decode(process.argv[1]))" <token>`)
and confirm it contains no password, name, or email — only `sub` and `role`.

---

## L. Security

**Development Tips**
- Validate all untrusted input at the boundary (Zod on every request body).
- Use `helmet()` for sensible default security headers.
- Configure CORS to an explicit origin list, not `*`, once you have real
  frontend domains.
- Rate-limit sensitive endpoints (login/register) separately from the rest
  of the API.
- Never leak stack traces or internal error details to the client in
  production.

**Common Mistakes**
- Trusting `Content-Type` or client-side validation as if they were a
  security boundary.
- Leaving CORS wide open (`origin: '*'`) with credentials enabled — the spec
  actually forbids combining wildcard origin with credentials, which is a
  hint credentials + wildcard CORS was never a safe combination.
- Returning verbose error messages/stack traces from a production API.

**Debugging Tips**
- A blocked request that never reaches your route handler, with a CORS
  error in the browser console, is a browser-enforced check — inspect the
  `Access-Control-*` response headers, not the server logs, first.
- `429 Too Many Requests` locally during testing usually means you've hit
  your own rate limiter — check `windowMs`/`limit` before assuming a bug.

**Interview Questions**
1. What is CORS, and why does the browser enforce it (not the server)?
2. What does `helmet()` actually do?
3. Why rate-limit login specifically?

**Strong Interview Answers**
- *What is CORS and who enforces it?* CORS (Cross-Origin Resource Sharing)
  is a **browser** security mechanism, not a server one — the server just
  advertises which origins may read its responses (via
  `Access-Control-Allow-Origin` and related headers), and the browser
  enforces that policy client-side. A non-browser client (curl, a mobile
  app, server-to-server) is entirely unaffected by CORS; it only protects
  browser users from a malicious page silently reading responses from a
  site the victim is authenticated against.

**Project Example**
`app.ts` applies `helmet()` and a `cors({ origin: env.CORS_ORIGIN })`
allow-list; `middleware/rateLimit.ts`'s `authRateLimiter` caps login/register
attempts to 20 per 15 minutes per IP.

**Mini Exercise**
Temporarily set `CORS_ORIGIN` to a different port than the client's dev
server, restart, and observe the browser console CORS error — then explain
in one sentence why curl to the same endpoint still works fine.

---

## P. Testing

**Development Tips**
- Keep the pyramid shape: many fast unit/integration tests, fewer
  component tests, only a handful of E2E tests for genuinely critical paths.
- Test behavior (what a user/caller observes), not implementation details
  (internal state, private functions) — implementation can change freely
  as long as behavior doesn't.
- Make tests deterministic: unique fixture data per test (unique emails),
  no reliance on execution order, no shared mutable state between tests
  unless deliberately isolated.

**Common Mistakes**
- Depending on a resolved `await` for an action's *trigger* as proof that
  everything it kicked off asynchronously has finished.
- Sharing database state across parallel test files without either
  isolating it or running those files sequentially.
- Debugging a flaky test by treating the first plausible-looking cause as
  confirmed, without actually verifying it eliminates the failure.

**Debugging Tips**
- Reproduce a flaky failure in the smallest possible isolated script before
  trusting an environmental explanation.
- Read the actual page/state snapshot in a failure report — don't assume
  you know what's rendered; confirm it.
- When a fix doesn't change the observed failure, that's real information:
  the theory was wrong, not that the fix "needs more tweaking."

**Interview Questions**
1. What's the test pyramid, and why shape testing effort that way?
2. What should be mocked, and what shouldn't?
3. What is AAA (Arrange-Act-Assert), and why does it help test readability?

**Strong Interview Answers**
- *What should be mocked?* Mock external dependencies you don't control or
  that make tests slow/flaky (real third-party APIs, wall-clock time,
  randomness). Don't mock the thing you're actually testing, or so much of
  the system that the test stops verifying real behavior — Phase 6's E2E
  suite deliberately mocks nothing, running the real API against a real
  (in-memory) database, because its entire purpose is verifying real
  integration.

**Project Example**
Server integration tests use a real in-memory MongoDB (no DB mocking);
client component tests mock only the API layer (`vi.mock('../api/...')`),
never React or the DOM; E2E tests mock nothing at all.

**Mini Exercise**
Take one existing Vitest integration test and rewrite its assertions using
explicit Arrange/Act/Assert comments — notice whether the test already
reads that way naturally, or whether commenting it reveals a step out of order.

---

## Q. Playwright

**Development Tips**
- Prefer user-facing locators (`getByRole`, `getByLabel`) over CSS
  selectors — they fail loudly when accessibility semantics break, and
  read like what a real user would look for.
- Rely on Playwright's auto-waiting (locators wait for actionability) —
  avoid manual `waitForTimeout` sleeps, which are both slow and flaky.
- After any action that triggers async client-side work (an API call, a
  React Router navigation), assert on the observable result
  (`toHaveURL`, a visible element) before depending on it — never assume a
  resolved click means its side effects are done.
- Use the Page Object Model to keep spec files reading like user behavior,
  with selectors/low-level actions isolated in one place.

**Common Mistakes**
- Reading `page.url()` (or any other page state) immediately after a
  triggering action without first waiting for the navigation it causes.
- Brittle CSS-class or nth-child selectors that break on unrelated styling
  changes.
- Assuming a failure's most visible/noisy symptom (e.g. console errors) is
  automatically its root cause.

**Debugging Tips**
- `trace: 'retain-on-failure'` + `npx playwright show-trace` gives a full
  timeline (DOM snapshots, network, console) for any failure — read it
  before guessing.
- A failure's page snapshot in the HTML report shows exactly what was
  rendered at the moment of failure — often the fastest way to disprove a
  wrong theory about the cause.

**Interview Questions**
1. What does Playwright's auto-waiting do, and why does it reduce flakiness?
2. Locator vs. raw CSS selector — what's the difference in intent?
3. What is the Page Object Model, and what's its main benefit?
4. How do you debug a flaky E2E test?

**Strong Interview Answers**
- *How do you debug a flaky E2E test?* Reproduce it in isolation with a
  minimal script and explicit logging (network responses, URLs, page
  state) rather than staring at the full suite's noisy output. Check the
  trace/snapshot for what actually rendered at failure time instead of
  assuming. Verify any fix by confirming the failure is actually gone —
  not just that the theory sounds plausible.

**Project Example**
`e2e/pages/*.ts` — one POM class per page/concern; `e2e/tests/permissions.spec.ts`
explicitly asserts `toHaveURL(...)` after every registration and trade
creation before depending on the resulting URL, after two real bugs
(missing exactly that wait) were found and fixed during this phase.

**Mini Exercise**
Remove one `await expect(page).toHaveURL(...)` assertion from
`permissions.spec.ts` and re-run the suite a few times — observe how often
(not always) it fails, and why that unpredictability is exactly what makes
missing-wait bugs dangerous in E2E suites.

---

## U. Logging + Observability

**Development Tips**
- Use structured (JSON) logs, not `console.log` — they're queryable/
  filterable by a log aggregator, unlike free-form text.
- Attach a correlation/request ID at the very first middleware, and thread
  it through logs, response headers, and error bodies.
- Handle `SIGTERM` for graceful shutdown — stop new work, finish in-flight
  work, release resources, then exit — always backed by a force-exit timer.
- Let `uncaughtException`/`unhandledRejection` log and exit; don't try to
  keep a process alive once its state is unknown.

**Common Mistakes**
- Logging unstructured strings that are hard to search/filter at scale.
- Never testing graceful shutdown manually — it "compiles" but nobody
  actually sent it a SIGTERM to see what happens.
- Confusing a liveness check ("is the process running") with a readiness
  check ("can it actually serve traffic right now") — this project's
  single `/api/health` intentionally conflates them for simplicity, a
  reasonable tradeoff at this scale but worth being able to explain.

**Debugging Tips**
- Search production logs by request ID first when investigating a specific
  user's reported issue — it's the fastest path from "user says X" to "the
  exact request that caused it."
- `kill -TERM $(pgrep -f your-process)` locally is the fastest way to
  verify graceful shutdown actually behaves as coded.

**Interview Questions**
1. Logging vs. monitoring — what's the difference?
2. What is a correlation ID, and where should it appear?
3. How would you debug a production API issue reported by one user?

**Strong Interview Answers**
- *How would you debug a one-user production issue?* Start from whatever
  identifying information the user can provide — ideally a request/
  correlation ID surfaced in the error they saw, which maps directly to a
  structured log line with full context (timestamp, route, user id if
  available, the actual error). Without an ID, fall back to narrowing by
  timestamp range, user identity, and route — much slower and less certain.

**Project Example**
`server/src/middleware/requestLogger.ts` assigns a request id (echoed on
`x-request-id`); `errorHandler.ts` includes that same id in every JSON
error body; `index.ts` handles `SIGTERM`/`SIGINT` for graceful shutdown
and `uncaughtException`/`unhandledRejection` as a last-resort safety net.

**Mini Exercise**
Trigger a `500` locally (e.g. temporarily throw inside a controller),
note the `requestId` in the JSON response, and find the matching log line
by searching the server's stdout for that exact id.

---

## S. HTML + CSS

**Development Tips**
- Use semantic elements (`<nav>`, `<main>`, `<table>`, `<dl>`/`<dt>`/`<dd>`)
  instead of generic `<div>`s wherever the content has real structure.
- Prefer Flexbox for one-dimensional layouts (a nav bar, a button row) and
  Grid for two-dimensional ones (the trade details' label/value grid).
- Use `rem`/relative units and `max-width` + `overflow-x: auto` on wide
  content (tables) instead of letting the whole page scroll horizontally.

**Common Mistakes**
- Reaching for a `<div>` + a pile of custom ARIA attributes when a native
  element (`<table>`, `<button>`, `<select>`) already provides the right
  semantics and keyboard behavior for free.
- Fixed pixel widths that don't adapt to a phone-sized viewport.

**Debugging Tips**
- Browser DevTools' responsive/device toolbar catches layout breakage at
  common breakpoints before a real device does.
- If a table overflows the page instead of scrolling within itself, check
  for a missing `overflow-x: auto` wrapper.

**Interview Questions**
1. Flexbox vs. Grid — when would you pick one over the other?
2. Why use `<table>` for tabular data instead of styled `<div>`s?
3. What is the box model?

**Strong Interview Answers**
- *Flexbox vs. Grid?* Flexbox distributes items along a single axis (a row
  or a column) and is ideal when content size should drive layout (a nav
  bar, a button group). Grid defines both rows and columns explicitly and
  suits layouts with real two-dimensional structure (a details page's
  label/value pairs, a dashboard of cards).

**Project Example**
`.app-header` uses Flexbox for the nav bar; `.detail-list` uses
`grid-template-columns: max-content 1fr` for the trade details' label/value
layout; `.trade-table-wrapper` uses `overflow-x: auto` so a wide table
scrolls within itself on small screens.

**Mini Exercise**
Resize the browser to a phone width and confirm the trade list's filter row
wraps sensibly (it uses `flex-wrap: wrap`) instead of overflowing.

---

## T. Accessibility

**Development Tips**
- Every input needs an associated `<label for="...">` — a placeholder is
  not a label.
- Use `aria-invalid` and `aria-describedby` to connect an input to its
  error message for assistive tech, not just visual proximity.
- Prefer native interactive elements (`<button>`, `<select>`, `<a>`) over
  `<div onClick>` — you get keyboard support and correct semantics for free.

**Common Mistakes**
- A validation error that only changes text color, with no `role="alert"`
  or `aria-describedby` link back to the field.
- Icon-only buttons with no accessible label at all.

**Debugging Tips**
- Tab through a page with only the keyboard — every interactive element
  should be reachable and show a visible focus state.
- Browser DevTools' Accessibility tree/Lighthouse audit surfaces missing
  labels and contrast issues automatically.

**Interview Questions**
1. Why is a placeholder not a substitute for a label?
2. What does `aria-describedby` do?
3. Why prefer a native `<button>` over a styled `<div>` with an `onClick`?

**Strong Interview Answers**
- *Why isn't a placeholder a label?* A placeholder disappears the moment the
  user types, isn't reliably announced by every screen reader the same way
  a label is, and fails as a persistent field description for users who
  need it — e.g. someone who looks away mid-form. A `<label for="id">`
  stays visible and is programmatically associated with the input.

**Project Example**
`FormField` renders `<label htmlFor={name}>` plus `aria-invalid` and
`aria-describedby` pointing at a `role="alert"` error paragraph — used
identically by the auth forms and `TradeForm`.

**Mini Exercise**
Tab through the Register page using only the keyboard and confirm you can
reach and submit the form without ever touching the mouse.

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

---

## N. Docker

**Development Tips**
- Use multi-stage builds: a build stage with the full toolchain, a runtime
  stage with only what's needed to run — smaller, more secure final images.
- In an npm-workspace monorepo, set the build context to the repo root so
  `npm ci` can see the shared lockfile, even when building one service.
- Give services other containers depend on a real healthcheck — `depends_on`
  alone only orders container *startup*, not readiness.
- Use `.dockerignore` to keep `node_modules/`, `.git/`, and secrets out of
  the build context.

**Common Mistakes**
- Using `localhost` in a containerized service's config when it should be
  the other service's Compose *service name*.
- Copying a full development `node_modules` into the runtime image instead
  of a clean, production-only install.
- Assuming `depends_on: mongo` means "mongo is ready" rather than "mongo's
  container has started."

**Debugging Tips**
- `docker compose logs -f <service>` for live logs; `docker compose ps`
  for container/health status at a glance.
- If a build step fails with a generic, tool-level error (not a clear
  application error), test the layer underneath your code first — e.g. can
  the container reach the network at all — before assuming your Dockerfile
  is wrong.
- `docker exec -it <container> sh` to poke around inside a running
  container directly when logs alone aren't enough.

**Interview Questions**
1. Image vs. container — what's the difference?
2. Why use a multi-stage Dockerfile?
3. How do containers on the same Compose network find each other?
4. What does a Docker volume do, and when do you need one?

**Strong Interview Answers**
- *Image vs. container?* An image is a read-only, versioned snapshot (a
  filesystem + metadata) — the *recipe*. A container is a running (or
  stopped) instance created *from* an image, with its own writable layer
  on top — the *actual running thing*. One image can back many containers.

**Project Example**
`server/Dockerfile`'s build stage runs the full workspace `npm ci` +
`tsc`; its runtime stage does a completely separate, standalone
`npm install --omit=dev` from just `server/package.json`, then copies in
the compiled `dist/` — two different installs for two different purposes.

**Mini Exercise**
Run `docker images` after building and compare the reported size of
`tradeflow-server` against what a single-stage Dockerfile (keeping
TypeScript, dev dependencies, and source files in the final image) would
produce — explain the difference in your own words.

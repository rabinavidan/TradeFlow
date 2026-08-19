# Interview Cheatsheet

Quick-reference answers, organized by topic. Only sections for topics
actually used in TradeFlow Lite are filled in — this file grows every phase.
For deep dives (dev tips, common mistakes, exercises) see
[topic-tips-and-interview-questions.md](topic-tips-and-interview-questions.md).
For a wide Q&A bank see [interview-question-bank.md](interview-question-bank.md).

## TypeScript

- **Why TypeScript over plain JS?** Catches a whole class of bugs (wrong
  types, null/undefined misuse, typos in property names) at compile time.
- **`strict: true`** turns on `strictNullChecks`, `noImplicitAny`, and more —
  without it TypeScript is much closer to "JS with comments".
- **`any` vs `unknown`**: `any` disables type checking entirely; `unknown`
  forces you to narrow (`typeof`, `in`, type guards) before using the value.
  We use `unknown` for caught errors (`catch (err: unknown)`).

## Node.js

- **Event loop**: Node is single-threaded for JS execution but non-blocking
  for I/O — expensive I/O (DB queries, file reads, network calls) is handed
  off and the loop keeps serving other requests while waiting.
- **`process.env`**: how config/secrets reach the process at runtime; loaded
  here via `dotenv` in development and real environment variables in
  production/Docker.

## Express

- **Middleware** is just a function `(req, res, next)` that can inspect/
  modify the request, end the response, or call `next()` to continue. Order
  matters — `app.use(helmet())` before routes, error handler *last*.
- **Error middleware** has 4 parameters — `(err, req, res, next)` — Express
  detects this signature specifically and routes thrown/`next(err)` errors to it.

## REST

- **Status codes used so far**: `200` OK, `201` created (`POST /trades`),
  `204` no content (`DELETE /trades/:id` — nothing to return), `400` bad
  request (malformed `:id`), `401` unauthorized (no/invalid token), `403`
  forbidden (valid token, not allowed), `404` not found, `409` conflict (the
  resource's *state* blocks the action — editing a non-Draft trade), `422`
  unprocessable entity (request body fails Zod validation), `503` health
  degraded (DB down).
- **`403` vs `404`**: this project uses `403` when a resource exists but the
  caller isn't allowed to see/touch it (clearer for teaching purposes); some
  real systems deliberately return `404` instead, to avoid confirming the
  resource exists at all.
- **`409` vs `422`**: `422` = the request body itself is invalid (bad shape,
  wrong types). `409` = the request is well-formed, but the resource's
  *current state* makes it impossible (e.g. trying to edit an `Approved`
  trade request).

## RBAC + Workflow

- **Transition table over conditionals**: `TRANSITIONS[currentStatus]` maps
  to allowed next statuses + which roles may perform each — readable as
  data, easy to extend, and testable in isolation from Express entirely.
- **Validate the action before the actor**: check the transition itself is
  legal (`409` if not) before checking whether *this* requester is allowed
  to perform it (`403` if not) — different failure reasons, different codes.
- **Audit trail = append-only**: `StatusHistory` is never updated/deleted,
  only created — that immutability is what makes it trustworthy.
- **Client-side RBAC mirror is UX, not enforcement**: `StatusActions.tsx`
  predicts what buttons should be shown; the server independently
  re-validates every transition regardless of what the UI offered.

## MongoDB

- **Indexes are designed around real queries**: `{ createdBy: 1, createdAt: -1 }`
  for "my requests, newest first"; `{ status: 1, createdAt: -1 }` for a
  reviewer's queue; a text index on `title`/`customerName` for search.
- **Pagination**: `skip((page - 1) * limit).limit(limit)`, run alongside
  `countDocuments(filter)` with `Promise.all` — using the *same* filter
  object for both keeps the returned page and the reported total consistent.
- **`toJSON` transform**: a schema-level transform turns Mongoose's internal
  `_id`/`__v` into a clean `id` field on every serialized response, instead
  of hand-mapping every field in every controller.
- **`$facet` (aggregation)**: runs multiple sub-pipelines against the same
  `$match`ed set of documents in one round trip — used for the dashboard's
  total count + status breakdown + recent list, instead of three queries.
- **Derived vs. stored data**: this project computes dashboard stats fresh
  on every request rather than maintaining a running counter — no
  stored/actual drift is possible, and it's cheap at this data scale.

## Testing / Playwright (E2E)

- **Test pyramid**: many fast unit/integration tests, fewer component
  tests, a handful of E2E tests for critical paths only — E2E is slow and
  comparatively fragile because it exercises the real, un-mocked system.
- **Never trust a resolved `await` on a UI trigger as proof its async side
  effects finished** — always assert on the observable result (a URL, a
  visible element) before depending on it.
- **HSTS is environment-sensitive**: `helmet({ hsts: env.NODE_ENV === 'production' })` —
  sending it unconditionally breaks plain-HTTP dev/test environments in
  confusing, hard-to-diagnose ways (the browser silently retries requests
  over HTTPS from then on).
- **Test-only DB backdoors** are legitimate for fixture setup the product
  deliberately doesn't expose (e.g. promoting a role) — keep them isolated,
  well-commented, and never imported by application code.

## Docker

- **Multi-stage builds**: a build stage (full toolchain, compiles
  TypeScript) and a separate runtime stage (only what's needed to run) —
  the client's runtime stage doesn't even need Node.js, just nginx.
- **Build context = repo root** for both Dockerfiles here, because npm
  workspaces share one root lockfile; `dockerfile:` still points at
  `server/Dockerfile` / `client/Dockerfile` in `docker-compose.yml`.
- **Two separate npm installs**: the build stage's `npm ci` (full
  workspace, needs TypeScript) vs. the runtime stage's standalone
  `npm install --omit=dev` (just that service's own `package.json`) — kept
  deliberately separate so the final image only has what it needs.
- **Service names as hostnames**: `mongodb://mongo:27017/...` inside
  Compose, not `localhost` — Compose's internal DNS resolves service names.
- **`depends_on` + healthcheck**: plain `depends_on` only orders container
  *startup*; `condition: service_healthy` waits for an actual healthcheck
  to pass before starting the dependent service.

## Logging + Observability / Reliability

- **Graceful shutdown**: handle `SIGTERM`, stop accepting new connections
  (`server.close()`), let in-flight requests finish, disconnect the
  database, exit — always with a force-exit timer as a backstop.
- **Process safety nets**: `uncaughtException`/`unhandledRejection` log and
  exit — never try to keep running once state is unknown; let the
  orchestrator restart cleanly.
- **Correlation/request ID**: one id per request, present in logs, the
  `x-request-id` response header, and (here) the JSON error body — the
  fastest path from "user reports an error" to "the exact log line."

## Git

- **`git status`** before anything destructive.
- **Small, typed commits**: `feat:`, `fix:`, `test:`, `refactor:`, `ci:` —
  keeps history scannable and is exactly what `git log --oneline` should read
  like in a portfolio repo.

## Authentication

- **bcrypt** hashes passwords with a random salt baked into the output and
  is deliberately slow (cost factor 12 here) — the opposite of what you want
  from a general-purpose hash like SHA-256.
- **JWT** = header.payload.signature, base64url-encoded and
  **signature-verified, not encrypted** — never put secrets in the payload.
  We store `sub` (user id) and `role`.
- **Generic login errors**: "Invalid email or password" for both a missing
  account and a wrong password, to avoid leaking which emails are registered.
- **`select: false`** on `User.passwordHash` keeps it out of query results
  unless explicitly requested with `.select('+passwordHash')`.

## React

- **Server state vs. client state**: the logged-in user, trade requests,
  dashboard stats — all server state, all in TanStack Query. Form input
  values, a modal's open/closed flag — client state, `useState`.
- **`forwardRef`**: required whenever a custom component wraps a native
  element and needs to accept a `ref` meant for that element (form
  libraries, focus management). A plain function component silently drops
  a `ref` prop.

## React Router

- **Protected routes**: a layout route (`<Route element={<ProtectedRoute/>}>`)
  wrapping child routes via `<Outlet/>`; redirects to `/login` with the
  attempted location in `state` so login can send the user back afterward.

## TanStack Query

- **`enabled`**: controls whether a query runs at all — here, `/auth/me`
  only fires `enabled: hasToken`, so an anonymous visitor never makes a
  doomed authenticated request.
- **`setQueryData`**: seed the cache directly with data you already have
  (e.g. the user returned from a successful login) instead of invalidating
  and re-fetching.

## React Router (layout routes)

- A **layout route** (an element with no `path`, wrapping children via
  `<Outlet/>`) composes with other layout routes — `ProtectedRoute` (auth
  gate) wraps `Layout` (nav chrome) wraps the actual pages, each concern
  isolated and independently testable.

## TanStack Query (mutations)

- **`setQueryData` vs. `invalidateQueries`**: use `setQueryData` when the
  mutation's response *is* the fresh data for a specific cache entry (e.g.
  updating one trade's detail). Use `invalidateQueries` when the mutation
  only partially describes the effect on a broader query (e.g. a list that's
  filtered/sorted/paginated — the mutation response doesn't tell you whether
  the changed record still belongs on the current page).
- **`placeholderData: (previous) => previous`**: keeps the last successful
  result on screen (marked via `isPlaceholderData`) while a new page/filter
  loads, instead of flashing a loading state on every change.

## Forms + Zod

- Client and server both validate — the server copy
  (`server/src/schemas/auth.schema.ts`) is the security boundary; the client
  copy (`client/src/schemas/auth.schema.ts`) is just fast UX feedback. They
  aren't literally the same file (different runtimes/build steps) but encode
  the same rules on purpose.
- **`defaultValues`** on `useForm` matters: without it, an untouched field is
  `undefined` at submit time and Zod reports its generic "Required" message
  instead of your custom one.

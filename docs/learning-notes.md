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

---

## Phase 1 — Authentication

### What we built

**Backend**
- `models/User.ts` — a Mongoose schema with `name`, unique `email`,
  `passwordHash` (`select: false` so it's never returned by default),
  and `role` (`user | reviewer | admin`, default `user`).
- `schemas/auth.schema.ts` — Zod schemas for register/login request bodies.
- `services/auth.service.ts` — `registerUser`, `loginUser`, `getUserById`:
  hashes passwords with bcrypt (12 salt rounds), issues a JWT, and always
  strips `passwordHash` from anything returned to a controller.
- `utils/jwt.ts` — `signAccessToken` / `verifyAccessToken` wrapping
  `jsonwebtoken`.
- `middleware/auth.ts` — `requireAuth` (authentication: is there a valid
  token?) and `requireRole(...roles)` (authorization: is this user allowed?).
- `middleware/rateLimit.ts` — a tighter rate limit specifically on
  `/api/auth/*` to slow down credential stuffing.
- `utils/asyncHandler.ts` — wraps async controllers so a rejected promise
  reaches the centralized `errorHandler` (Express 4 doesn't do this
  automatically).
- Routes: `POST /api/auth/register`, `POST /api/auth/login`,
  `GET /api/auth/me` (protected).
- `server/src/tests/globalSetup.ts` + `auth.test.ts` + `jwt.test.ts` — a
  real in-memory MongoDB (`mongodb-memory-server`) backs Supertest
  integration tests; a plain unit test covers the JWT round-trip.

**Frontend**
- `context/AuthContext.tsx` + `hooks/useAuth.ts` — the authenticated user is
  server state, fetched with TanStack Query (`GET /api/auth/me`) whenever a
  token exists in `localStorage`; login/register call the API, store the
  token, and seed the query cache directly with `setQueryData` (no extra
  round-trip needed).
- `components/ProtectedRoute.tsx` — a layout route using React Router's
  `<Outlet/>` that redirects to `/login` (preserving the attempted location)
  when there's no user.
- `components/FormField.tsx` — a reusable labeled input, wired for React
  Hook Form via `forwardRef` (see the bug below).
- `pages/Login.tsx`, `pages/Register.tsx` — React Hook Form + Zod
  (`schemas/auth.schema.ts`, mirroring the backend's validation rules),
  with disabled-while-submitting buttons and a visible API error banner.
- `pages/Dashboard.tsx` (placeholder), `pages/NotFound.tsx` (404).
- `App.tsx` now defines real routes; `main.tsx` wraps the app in
  `QueryClientProvider` → `BrowserRouter` → `AuthProvider`.
- Component tests (`Login.test.tsx`, `ProtectedRoute.test.tsx`) mock the
  `api/auth.api` module and assert on real DOM behavior (validation
  messages, error banners, redirects) via Testing Library + `userEvent`.

### Concepts learned

**Authentication vs. authorization.** `requireAuth` answers "who are you?"
(valid JWT → `req.user` is set, otherwise 401). `requireRole(...)` answers
"are you allowed to do this?" (checks `req.user.role`, otherwise 403) — and
it only makes sense to run *after* `requireAuth`.

**Why bcrypt, not plain hashing.** `bcrypt.hash(password, 12)` is
deliberately slow (12 "salt rounds" ≈ 2¹² iterations) and generates a random
salt automatically, embedded in the resulting hash. This makes brute-forcing
leaked hashes and rainbow-table attacks impractical, unlike a fast
general-purpose hash (SHA-256) which is *designed* to be fast — the wrong
property for passwords.

**Generic auth error messages.** `loginUser` throws the exact same
`401 UNAUTHORIZED` / "Invalid email or password" whether the email doesn't
exist or the password is wrong. Returning "no such user" vs. "wrong
password" would let an attacker enumerate valid emails.

**Server state vs. client state, for real this time.** The current user is
*server* state — it lives on the backend and can go stale (token expires,
role changes). `AuthContext` fetches it with `useQuery` instead of copying
it into local `useState` at login time and hoping it stays in sync; a
successful login/register just seeds the cache directly with
`queryClient.setQueryData` instead of triggering a redundant `/me` request.

### Important code

```ts
// server/src/services/auth.service.ts — same error for both failure modes
const user = await User.findOne({ email: input.email }).select('+passwordHash');
if (!user) throw AppError.unauthorized('Invalid email or password');
const ok = await bcrypt.compare(input.password, user.passwordHash);
if (!ok) throw AppError.unauthorized('Invalid email or password');
```

```tsx
// client/src/context/AuthContext.tsx — auth user as TanStack Query state
const { data: user, isLoading } = useQuery({
  queryKey: ['auth', 'me'],
  queryFn: fetchCurrentUser,
  enabled: hasToken,   // don't even try without a stored token
  retry: false,
});
```

### Important commands

```bash
npm run test --workspace server   # Vitest + Supertest + mongodb-memory-server
npm run test --workspace client   # Vitest + React Testing Library
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"supersecret123"}'
```

### Problems solved

**Bug:** In the browser, typing into the Login/Register form's email and
password fields updated the visible input (confirmed via
`input.value` in a debug script) but React Hook Form still reported them as
empty ("Required") on submit — `loginRequest` was never called.

**What I thought caused it (hint given first):** *Hint: check what
`{...register('email')}` actually returns, and where each of those props
ends up once you pass them through a second component instead of straight
onto an `<input>`.*

**Root cause:** `FormField` was a plain function component receiving
`{...register('email')}` as props. `register()` returns
`{ name, onChange, onBlur, ref }`. React treats `ref` specially **only at
the JSX call site for the component actually being instantiated** — when
that component is a plain function component (not wrapped in
`React.forwardRef`), React strips `ref` out before the function ever runs
and logs a dev warning ("Function components cannot be given refs"). So
`FormField` silently never received a `ref` to forward to its inner
`<input>`, React Hook Form's internal field registration never attached to
the real DOM node, and every field was permanently "unregistered" — hence
always empty at submit time, regardless of what the user typed.

**Fix:** Wrap `FormField` in `forwardRef<HTMLInputElement, FormFieldProps>`
and explicitly pass the forwarded `ref` to the `<input>`.

**Prevention:** Any time you wrap a native form element in your own
component *and* need `ref` to work (form libraries, focus management,
measuring size), that wrapper must use `forwardRef` — plain function
components cannot receive `ref` as a prop, full stop. A quick way to catch
this class of bug: check the browser console for React's own
"Function components cannot be given refs" warning; it points directly at
the mistake.

### Interview questions

1. **Why is a generic "Invalid email or password" better than distinct
   "user not found" / "wrong password" messages?** — Prevents email/account
   enumeration by an attacker probing which emails are registered.
2. **What's the difference between `requireAuth` and `requireRole` in this
   codebase, and why does order matter?** — Authentication (is this a valid
   token?) vs. authorization (is this role allowed?); `requireRole` reads
   `req.user`, which only exists after `requireAuth` has run.
3. **Why does a plain function component silently drop a `ref` prop, and
   how do you fix it?** — React only forwards `ref` to a component's own
   implementation when it's wrapped in `React.forwardRef`; otherwise React
   intercepts and drops it (with a dev warning) before the function runs.
   Fix: wrap the component in `forwardRef`.

### What I should remember

- `bcrypt` salt rounds trade off security for CPU cost — 10–12 is a common
  default for real apps.
- A JWT's payload is base64-encoded, **not encrypted** — never put secrets
  in it; here it only carries `sub` (user id) and `role`.
- Server state (anything that can change on the backend independent of this
  browser tab) belongs in TanStack Query, not `useState` + `useEffect`.
- `forwardRef` is required any time a custom component needs to accept a
  `ref` meant for a native DOM element inside it.

---

### Phase 1 review

**TOP 5 THINGS TO REMEMBER**
1. Authentication ("who are you") and authorization ("are you allowed") are
   two different middleware concerns — keep them as two functions.
2. Never let a login endpoint reveal whether the *email* or the *password*
   was wrong — same generic message, same status code, either way.
3. `select: false` on a sensitive Mongoose field (like `passwordHash`) keeps
   it out of query results by default; opt in with `.select('+passwordHash')`
   only where you actually need it (during login).
4. A `ref` passed to a plain function component is silently dropped — wrap
   with `forwardRef` whenever a wrapper needs to forward one.
5. Seed the TanStack Query cache directly after a mutation
   (`queryClient.setQueryData`) instead of invalidating and re-fetching data
   you already have in hand.

**TOP 5 INTERVIEW QUESTIONS**
1. Why hash passwords with bcrypt instead of SHA-256?
2. What's inside a JWT, and is it encrypted?
3. Authentication vs. authorization — give a one-sentence definition of each.
4. Why must email-enumeration be avoided on a login endpoint?
5. Why does `forwardRef` exist, and when do you need it?

**TOP 3 DEVELOPMENT TIPS**
1. Build the error-shape contract (`{ error: { code, message } }`) and stick
   to it from the very first real endpoint — the frontend's `getApiErrorMessage`
   helper depends on it being consistent everywhere.
2. Write the Zod validation schema once conceptually, then implement it
   twice on purpose — once on the server (source of truth, security
   boundary) and once on the client (fast feedback, UX) — rather than trying
   to literally share one file across a client/server boundary that doesn't
   share a build step.
3. When a form "isn't working" and the DOM looks right, check for dropped
   refs, stale closures, or a missing `defaultValues` before assuming the
   validation library is broken.

**TOP 3 COMMON MISTAKES**
1. Wrapping a form input in a custom component without `forwardRef`.
2. Forgetting `defaultValues` on `useForm`, so untouched fields validate as
   `undefined` and show a generic "Required" instead of the schema's real
   message.
3. Trusting client-side validation alone — always re-validate on the server;
   the browser's rules are a UX nicety, not a security boundary.

**MINI CODING EXERCISE**
Add a `confirmPassword` field to the Register form (client-only — the
server doesn't need it) using Zod's `.refine()` to assert it matches
`password`, with the error attached to the `confirmPassword` field.

---

## Phase 2 — Trade Backend

### What we built

- `models/TradeRequest.ts` — title, customerName, amount, currency, country,
  requestType (enum), description, status (enum, default `Draft`),
  `createdBy` (ref `User`). Compound indexes for the two real query
  patterns (`{ createdBy, createdAt }` for "my requests, newest first" and
  `{ status, createdAt }` for a reviewer's queue), plus a text index on
  `title`/`customerName` for search. A schema-level `toJSON` transform turns
  Mongoose's `_id`/`__v` into a clean `id` field for every API response.
- `schemas/trade.schema.ts` — `createTradeSchema` (strict), `updateTradeSchema`
  (the same shape, `.partial()` — every field optional for `PUT`),
  `listTradesQuerySchema` (page/limit/search/status/requestType/sortBy/sortOrder,
  all with sane defaults via `z.coerce` since query strings arrive as text).
- `services/trade.service.ts` — the actual business rules:
  - **Visibility**: a plain `user` only ever sees their own trades; `reviewer`
    and `admin` see everything. Enforced by scoping the MongoDB filter itself
    (`{ createdBy: requester.sub }`), not by filtering results after the
    fact — so pagination counts stay correct.
  - **Ownership**: viewing/editing/deleting someone else's trade as a
    non-privileged user is a `403`, not a silent empty result.
  - **Editability**: only `Draft`/`Rejected` trades can be edited or deleted
    by their owner (an `Approved` request shouldn't be quietly rewritten);
    `admin` can override. This is a deliberately light guard — the *real*
    status workflow (who can move a trade from `Submitted` to `In Review`,
    etc.) is Phase 4's job.
- Routes: `GET /api/trades` (list), `POST /api/trades` (create),
  `GET/PUT/DELETE /api/trades/:id` — all behind `requireAuth`.
- 12 new Supertest integration tests covering auth requirement, ownership
  scoping (user vs. reviewer), pagination, search, status filtering,
  validation errors, and the editability guard.

### Concepts learned

**Scoping the query, not the results.** `listTrades` builds a MongoDB
`filter` object that already excludes other users' trades for a plain user
— `TradeRequest.find(filter)` and `countDocuments(filter)` both use it. This
is different (and much better) than fetching *all* trades and filtering them
in JavaScript afterward: the database does the work, pagination totals stay
accurate, and there's no risk of accidentally including a document in one
step but not the other.

**A JWT's role claim is a snapshot, not a live value.** While testing
reviewer-only visibility, promoting a test user's DB role to `reviewer`
*after* they'd already registered had no effect on their existing token —
because the token's `role` claim was baked in at sign-time. The fix (in the
test, and in reality) is to re-authenticate after a role change; there's no
way for a previously-issued JWT to "notice" a later DB change without some
form of token refresh or revocation list. This is a real, common gotcha with
any stateless-token auth system, not just a test artifact.

**`z.coerce` for query strings.** Every value in `req.query` arrives as a
string (`"page=2"` → `"2"`, never the number `2`). `z.coerce.number()`
converts-then-validates in one step, so `listTradesQuerySchema.parse(req.query)`
can just be used directly instead of hand-parsing each param.

**Editable-status guard vs. Phase 4's workflow.** It would have been
tempting to build the full `Draft → Submitted → In Review → Approved/Rejected`
state machine right now, but that's explicitly a separate concern (RBAC +
audit history) — Phase 2 only needed "can this trade still be freely
edited," which only needs to distinguish "still a draft/rejected" from
"already in the pipeline."

### Important code

```ts
// server/src/services/trade.service.ts — scope the query, don't filter after
const filter: Record<string, unknown> = canSeeAllTrades(requester.role)
  ? {}
  : { createdBy: requester.sub };
// ...filter.status, filter.$or for search...
const [data, total] = await Promise.all([
  TradeRequest.find(filter).sort(sort).skip(skip).limit(query.limit),
  TradeRequest.countDocuments(filter),
]);
```

```ts
// server/src/schemas/trade.schema.ts — query strings need coercion
export const listTradesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  // ...
});
```

### Important commands

```bash
# create (needs a Bearer token from /api/auth/login)
curl -X POST http://localhost:4000/api/trades \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Import financing","customerName":"Acme","amount":25000,"currency":"usd","country":"Germany","requestType":"Letter of Credit"}'

# list, paginated + filtered + searched
curl "http://localhost:4000/api/trades?page=1&limit=10&status=Draft&search=Acme" \
  -H "Authorization: Bearer <token>"
```

### Problems solved

**Bug (in the test, not the app):** A test expected a promoted `reviewer`
user to see all trades, but got `0` back instead of `2`.
**What I thought caused it (hint given first):** *Hint: when exactly does
the JWT's `role` claim get decided — at sign-time, or read fresh from the
database on every request?*
**Root cause:** The test elevated the user's role in MongoDB directly
(`User.findByIdAndUpdate(..., { role: 'reviewer' })`) but kept using the
JWT issued *before* that update — which still carried `role: 'user'` in its
payload, since `requireAuth` trusts the token's claims rather than looking
the user up fresh on every request (a deliberate performance tradeoff of
stateless JWTs).
**Fix:** Re-login after the role change in the test helper, so the returned
token actually carries the new role.
**Prevention:** In a real app, changing a user's role would need to either
force re-login (short token expiry) or use a shorter-lived access token +
refresh token pattern so privilege changes take effect promptly.

### Interview questions

1. **Why scope the MongoDB query itself instead of fetching everything and
   filtering in application code?** — Correctness (pagination totals stay
   accurate) and performance (the database does far less work, and never
   sends data the requester isn't allowed to see over the wire).
2. **Why does promoting a user's role in the database not immediately
   affect requests made with their existing token?** — A JWT's claims are
   fixed at sign-time; the server doesn't re-check the database on every
   request unless it's designed to (which defeats much of the point of a
   stateless token).
3. **Why return `403` for viewing someone else's trade instead of `404`?**
   — This project chooses to teach the distinction clearly (the resource
   exists, you're just not allowed); note some real systems deliberately use
   `404` instead specifically to avoid confirming a resource exists at all.

### What I should remember

- Build MongoDB filters conditionally and pass the *same* filter object to
  both `find()` and `countDocuments()` — never let pagination metadata and
  actual results drift apart.
- `z.coerce` converts before validating — essential for anything coming from
  `req.query` (always strings) or `req.params`.
- A `409 Conflict` fits "the resource exists, but its current state doesn't
  allow this action" (like editing a non-Draft trade) — different from `422`
  (the request body itself is invalid) or `403` (you're not allowed, period).

---

### Phase 2 review

**TOP 5 THINGS TO REMEMBER**
1. Scope database queries for authorization — don't fetch-then-filter.
2. A JWT's claims are a snapshot; role/permission changes need a fresh token
   to take effect.
3. `z.coerce.number()` (etc.) handles the string→typed conversion that every
   query-string parameter needs.
4. Use `Promise.all` for independent async calls (`find` + `countDocuments`)
   instead of awaiting them one after another.
5. `409 Conflict` = valid request, wrong resource *state*; `422` = the
   request body itself is invalid; `403` = not allowed regardless of state.

**TOP 5 INTERVIEW QUESTIONS**
1. Why scope a MongoDB query instead of filtering results in JS afterward?
2. What happens to already-issued JWTs when you change a user's role in the DB?
3. What's the difference between 403 and 404, and when would you pick one over the other?
4. Why use `Promise.all` for `find()` + `countDocuments()` here?
5. What does a compound MongoDB index like `{ createdBy: 1, createdAt: -1 }` optimize for?

**TOP 3 DEVELOPMENT TIPS**
1. Design indexes around the queries you actually run (owner + recency,
   status + recency), not defensively on every field.
2. Keep the Zod schema for `PUT` as `createSchema.partial()` instead of a
   hand-duplicated schema — one source of truth for field rules.
3. Write the "who can see/edit/delete this" rule as small service-level
   helper functions (`canSeeAllTrades`, `isOwnerOrPrivileged`) so
   controllers stay declarative and the rule is unit-testable on its own.

**TOP 3 COMMON MISTAKES**
1. Filtering "my data only" in application code after an unscoped DB query —
   works until pagination totals or performance expose the mistake.
2. Assuming a role change takes effect immediately for a user already holding
   a valid JWT.
3. Reaching for `404` and `403` interchangeably without a consistent rule
   for which one a given endpoint should use.

**MINI CODING EXERCISE**
Add a `minAmount`/`maxAmount` query filter to `listTradesQuerySchema` and
`listTrades`, following the same pattern as `status`/`requestType`.

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

---

## Phase 3 — React UI

### What we built

- `components/Layout.tsx` — the authenticated shell (top nav + `<Outlet/>`),
  separated from `ProtectedRoute` (auth *gate*) on purpose: one component
  decides "can you be here," the other decides "what does 'here' look like."
- `components/TradeForm.tsx` — one form, shared by `CreateTrade` and
  `EditTrade` via props (`defaultValues`, `onSubmit`, `submitLabel`), instead
  of two near-identical copies.
- `components/StatusBadge.tsx`, `components/Pagination.tsx` — small, focused,
  reusable presentational components.
- `hooks/useTrades.ts` — `useTradesQuery`, `useTradeQuery`,
  `useCreateTradeMutation`, `useUpdateTradeMutation`, `useDeleteTradeMutation`:
  every trade-related server interaction goes through TanStack Query, with
  mutations invalidating (`list`) or directly seeding (`detail`) the cache.
- `hooks/useDebouncedValue.ts` — a tiny custom hook so the search box doesn't
  fire a request on every keystroke.
- `pages/TradeList.tsx` — pagination, status/type filters, debounced search,
  and explicit loading/empty/error states (not just "spinner or nothing").
- `pages/CreateTrade.tsx`, `pages/EditTrade.tsx`, `pages/TradeDetails.tsx` —
  the full CRUD loop from the UI, with ownership/editable-status logic
  mirrored from the backend to decide whether Edit/Delete are even shown.
- New client component tests (`TradeList.test.tsx`, `TradeForm.test.tsx`)
  covering loading/empty/error states, debounced search, and form validation
  + normalization.

### Concepts learned

**Layout routes vs. guard routes.** `ProtectedRoute` and `Layout` are both
"wrapper" components rendering `<Outlet/>`, but they answer different
questions: is the user allowed here at all (auth), vs. what chrome (nav,
header) wraps every authenticated page (presentation). Nesting them
(`<ProtectedRoute><Layout><actual pages/></Layout></ProtectedRoute>`) keeps
each one simple and independently testable.

**One form, two pages.** `TradeForm` doesn't know or care whether it's
creating or editing — it just takes `defaultValues` and an `onSubmit`
callback. `CreateTrade` and `EditTrade` differ only in *what* they do with
the submitted values (POST vs. PUT) and where they navigate afterward. This
is composition over duplication: change a validation rule once, and both
flows pick it up.

**`placeholderData: (previous) => previous`.** Without it, changing a page
number or filter shows a jarring loading flash between "page 1's data" and
"page 2's data." With it, TanStack Query keeps rendering the *previous*
result while the new one loads in the background — this project dims it
slightly (`opacity: isPlaceholderData ? 0.6 : 1`) so it's still obvious a
fetch is in flight.

**Mirroring backend authorization in the UI is a UX nicety, not security.**
`TradeDetails` computes `canEdit` client-side (ownership + editable status)
purely to decide whether to *show* Edit/Delete buttons — a user could still
hit the API directly. The actual enforcement is still 100% the backend's
`trade.service.ts` checks from Phase 2; hiding the buttons just avoids
showing a user a button that would 403 if clicked.

### Important code

```tsx
// client/src/hooks/useTrades.ts — mutation seeds/invalidates the right cache
export function useUpdateTradeMutation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => updateTradeRequest(id, payload),
    onSuccess: (trade) => {
      queryClient.setQueryData(['trades', 'detail', id], trade); // instant
      queryClient.invalidateQueries({ queryKey: ['trades', 'list'] }); // eventually consistent
    },
  });
}
```

```tsx
// client/src/components/TradeForm.tsx — one schema/component, two callers
<TradeForm defaultValues={trade} onSubmit={handleSubmit} submitLabel="Save changes" />
```

### Important commands

```bash
npm run dev:client   # http://localhost:5173/trades
npm run test --workspace client
```

### Problems solved

No new bugs this phase beyond test-authoring mistakes (documented as part
of the "problems solved" pattern anyway, since they're genuinely
instructive):

**Test mistake:** A component test asserted
`expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({...}))` and
failed even though the printed "received" values looked identical to what
was expected.
**Root cause:** React Hook Form's `handleSubmit(onSubmit)` calls
`onSubmit(values, event)` with **two** arguments, not one — the
`SyntheticEvent` is passed along as the second argument.
`toHaveBeenCalledWith` checks the *entire* argument list, so a single
matcher for a two-argument call always fails, regardless of how well that
one matcher matches the first argument.
**Fix:** Assert on `onSubmit.mock.calls[0][0]` directly with `.toEqual(...)`
instead of `toHaveBeenCalledWith(...)`, when you only care about one
argument out of several.
**Prevention:** When a mock assertion fails but the diff *looks* like it
should pass, check the actual argument count/shape
(`mock.calls[0]`) before assuming the values themselves are wrong.

### Interview questions

1. **Why separate `ProtectedRoute` (auth gate) from `Layout` (page chrome)
   instead of one combined wrapper?** — Single responsibility: one decides
   "allowed here," the other decides "what surrounds the page." Testable and
   reusable independently (e.g. a future public page could reuse `Layout`'s
   nav without the auth requirement).
2. **Why does `TradeForm` accept `onSubmit` as a prop instead of calling the
   create/update API directly?** — Keeps the form itself dumb/reusable;
   `CreateTrade` and `EditTrade` own the decision of *which* API call to make
   and where to navigate afterward — a classic "lift the side effect up"
   pattern.
3. **What does `queryClient.setQueryData` buy you over just calling
   `invalidateQueries` after every mutation?** — Instant UI update with data
   you already have in hand (no extra round-trip) for the exact record you
   just changed, while still invalidating the *list* query (which the
   mutation response doesn't fully describe — you don't know if the updated
   record still matches the list's current filters/sort).

### What I should remember

- A form component that only knows about `defaultValues` + `onSubmit` can be
  reused for both create and edit — don't build two forms.
- `placeholderData` (formerly `keepPreviousData` in React Query v4) is the
  fix for pagination/filter loading flicker.
- Client-side permission checks control what's *shown*; server-side checks
  control what's *allowed*. Never confuse the two, and never skip the latter.
- Mock assertion failures that "look right" in the diff often mean an
  argument-count mismatch, not a value mismatch — check `mock.calls` directly.

---

### Phase 3 review

**TOP 5 THINGS TO REMEMBER**
1. Separate the "can you be here" gate from the "what does here look like"
   layout — two different concerns, two different components.
2. One shared form component + a prop for the submit behavior beats two
   near-duplicate forms.
3. `placeholderData` keeps stale data on screen during a refetch instead of
   flashing a loading state on every page/filter change.
4. Debounce search input — don't fire a network request per keystroke.
5. Client-side permission checks are UX, not security; the server remains
   the actual enforcement point.

**TOP 5 INTERVIEW QUESTIONS**
1. Why does this app separate ProtectedRoute from Layout?
2. How is one TradeForm reused for both create and edit?
3. What problem does `placeholderData` solve?
4. Why debounce a search input, and what would happen without it?
5. Why does a mutation's `onSuccess` sometimes call `setQueryData` and
   sometimes `invalidateQueries` — why not always the same one?

**TOP 3 DEVELOPMENT TIPS**
1. Build reusable presentational components (`StatusBadge`, `Pagination`)
   the moment you notice a second place that would need the same markup —
   not before, not much after.
2. Give every list view three real states beyond "has data": loading,
   empty, and error — each with its own visible feedback, not a blank screen.
3. When wrapping a mutation, decide deliberately: does the response fully
   replace what a query already has (→ `setQueryData`), or does it only
   partially describe what changed (→ `invalidateQueries`)?

**TOP 3 COMMON MISTAKES**
1. Writing near-identical Create and Edit forms instead of one shared,
   prop-driven component.
2. Letting a list re-fetch on every keystroke in a search box instead of
   debouncing.
3. Assuming a mock assertion diff that "looks equal" must be a false
   failure, instead of checking the actual call signature.

**MINI CODING EXERCISE**
Add a `sortBy` dropdown to `TradeList` (Title / Amount / Created date) wired
to the existing `useTradesQuery` params — the backend already supports it.

---

## Phase 4 — Roles + Workflow

### What we built

- `models/StatusHistory.ts` — an append-only audit trail: `tradeRequestId`,
  `previousStatus`, `newStatus`, `changedBy`, `comment`, and `createdAt`
  (aliased to `changedAt` on output — a status change is immutable once
  recorded, so there's deliberately no `updatedAt`).
- `services/workflow.service.ts` — a `TRANSITIONS` table that is the single
  source of truth for both *what* transitions exist
  (`Draft → Submitted → In Review → Approved/Rejected`) and *who* may
  perform each one (`owner`, `reviewer`, `admin`). `changeTradeStatus`
  checks the transition is valid, checks the requester is allowed, updates
  the trade, and appends a `StatusHistory` record — in that order, so an
  invalid or unauthorized request never touches the database.
- `PATCH /api/trades/:id/status` and `GET /api/trades/:id/history` routes.
- Client-side mirror: `components/StatusActions.tsx` has its own copy of the
  same `TRANSITIONS` table, purely to decide which buttons to *show* —
  clearly commented as UX only, never a security boundary.
- `components/StatusHistoryList.tsx` renders the audit trail with the
  reviewer's name/role (via `.populate('changedBy', 'name role')` on the
  server) and any comment left with the decision.
- 9 new integration tests (owner-submits-own-draft, RBAC rejections in both
  directions, the full Submitted → In Review → Approved happy path with
  history assertions, invalid transitions, terminal-state rejection) plus 7
  new component tests for `StatusActions`' visibility logic.

### Concepts learned

**One transition table, two "views" of it.** The business rule ("who can
move a request from X to Y") is genuinely defined once — in
`workflow.service.ts`. The frontend's copy in `StatusActions.tsx` isn't a
second *source of truth*; it's a UX prediction of what the backend will
allow, so the UI doesn't offer a button that would immediately 403. If they
ever drift out of sync, the backend still wins — a user might see (or not
see) a slightly wrong button, but can never actually perform a
disallowed transition.

**Business rules as a data structure, not a pile of `if`s.** `TRANSITIONS`
is a plain object mapping current status → allowed next statuses → allowed
roles. This makes the whole workflow readable at a glance, and adding a new
transition later is a one-line data change instead of a new branch in a
growing `if/else` chain.

**Audit trails are append-only by design.** `StatusHistory` documents are
never updated or deleted — each status change creates a new record. This is
what makes it a trustworthy audit trail: nobody (including a bug) can quietly
edit history after the fact, only add to it.

### Important code

```ts
// server/src/services/workflow.service.ts — one table, two questions answered
const TRANSITIONS: Record<TradeStatus, { to: TradeStatus; allowedRoles: Role[] }[]> = {
  Draft: [{ to: 'Submitted', allowedRoles: ['owner', 'admin'] }],
  Submitted: [{ to: 'In Review', allowedRoles: ['reviewer', 'admin'] }],
  'In Review': [
    { to: 'Approved', allowedRoles: ['reviewer', 'admin'] },
    { to: 'Rejected', allowedRoles: ['reviewer', 'admin'] },
  ],
  Approved: [],
  Rejected: [],
};
```

```ts
// server/src/services/workflow.service.ts — validate transition, THEN authorize, THEN mutate
const validNextStatuses = TRANSITIONS[trade.status]?.map((r) => r.to) ?? [];
if (!validNextStatuses.includes(toStatus)) throw AppError.conflict(/* ... */);
if (!isTransitionAllowedForRequester(trade, toStatus, requester)) throw AppError.forbidden(/* ... */);
// only now: trade.status = toStatus; await trade.save(); await StatusHistory.create(...)
```

### Important commands

```bash
curl -X PATCH http://localhost:4000/api/trades/<id>/status \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"status":"Submitted"}'

curl http://localhost:4000/api/trades/<id>/history -H "Authorization: Bearer <token>"
```

### Problems solved

**Bug:** After adding `workflow.test.ts` (a 3rd server test file), an
existing, previously-passing test in `trade.test.ts` started failing —
`GET /api/trades > scopes results to the caller for a plain user, but not
for a reviewer` expected `total: 2` but got `total: 3`.

**What I thought caused it (hint given first):** *Hint: nothing in
`trade.test.ts` itself changed. What else runs at the same time now that
didn't before, and what do all the test files have in common?*

**Root cause:** Every server test file shares **one** in-memory MongoDB
instance (started once in `globalSetup.ts` for the whole run). Vitest runs
test *files* in parallel by default. Once a third file existed,
`workflow.test.ts`'s tests could be creating trade requests in the shared
database at the exact moment `trade.test.ts`'s reviewer-visibility test ran
its unscoped `find({})` query (a reviewer sees *all* trades) — so it
occasionally counted trades from a completely different, concurrently-running
test file.

**Fix:** Set `fileParallelism: false` in `server/vitest.config.ts`, so test
files run one at a time against the shared database.

**Prevention:** Any assertion on an *unscoped* query ("all documents in this
collection") is unsafe against shared state run in parallel — either give
each test file its own isolated database/collection namespace, or run
files sequentially when they share state. For this project's size, running
sequentially was the simpler, more honest fix.

### Interview questions

1. **Why does `changeTradeStatus` check "is this transition valid" before
   "is this requester allowed to do it"?** — Order matters for correct error
   codes: an invalid transition is a `409` (bad request regardless of who's
   asking); an unauthorized valid transition is `403`. Checking validity
   first also means we never leak "you'd be allowed to do this, but the
   transition itself doesn't exist."
2. **Why is `StatusHistory` never updated or deleted, only created?** — It's
   an audit trail; its value comes entirely from being an immutable,
   append-only record of what actually happened, in order.
3. **Why did parallel test files cause a previously-passing test to
   fail after a new file was added — and why not before?** — All test files
   share one in-memory database; an unscoped query run in a race with
   concurrent test files created by an unrelated file can pick up their
   data. It didn't happen before because there was no test creating
   competing data at the exact right moment — an unlucky-then-lucky timing
   window, which is exactly what makes shared-state races so easy to miss
   until they aren't.

### What I should remember

- Encode business rules ("who can do what, from what state") as a data
  table you can read top-to-bottom, not nested conditionals.
- Client-side copies of authorization rules are for UX prediction only —
  write a comment saying so, right next to the code, so nobody mistakes it
  for enforcement later.
- Validate *what* before *who* — check the action itself is legal before
  checking whether this particular requester may perform it.
- Shared test state (one DB for the whole suite) plus parallel test files is
  a recipe for flaky, hard-to-reproduce failures — decide test isolation
  strategy deliberately, not by accident.

---

### Phase 4 review

**TOP 5 THINGS TO REMEMBER**
1. Model a workflow as a transition table (current state → allowed next
   states → allowed roles), not scattered conditionals.
2. Check "is this transition valid" before "is this requester allowed" —
   different failure modes deserve different status codes (409 vs 403).
3. An audit trail (`StatusHistory`) should only ever be appended to, never
   mutated — that's what makes it trustworthy.
4. A client-side permission mirror controls what's shown, never what's
   allowed — the server re-checks everything, always.
5. Shared database state across parallel test files can produce
   intermittent, confusing failures — prefer sequential test execution or
   real per-file isolation.

**TOP 5 INTERVIEW QUESTIONS**
1. How would you design a status-transition system that's easy to extend
   with a new status later?
2. Why validate the transition itself before validating the requester's
   permission to perform it?
3. Why should an audit-trail collection never support updates or deletes?
4. What's the actual security boundary when both client and server encode
   the same authorization rule?
5. Why can parallel test execution against shared state cause a previously
   passing test to fail without that test itself changing?

**TOP 3 DEVELOPMENT TIPS**
1. Write the transition/permission table as an explicit, readable data
   structure — it becomes both the implementation and the documentation.
2. When mirroring a backend rule on the frontend for UX, comment clearly
   that it's a prediction, not enforcement — future-you (or a teammate)
   should never mistake it for the real check.
3. Decide test isolation strategy (shared DB + sequential, or per-file
   isolated DB) deliberately as the test suite grows, not after the first
   flaky failure.

**TOP 3 COMMON MISTAKES**
1. Encoding a workflow as deeply nested `if/else` instead of a lookup table.
2. Trusting a frontend permission check as if it were the real enforcement.
3. Letting integration tests race against shared, unscoped database state
   without either isolation or sequential execution.

**MINI CODING EXERCISE**
Add a `Rejected → Draft` transition (allowing the owner to revise and
resubmit a rejected request) to both `TRANSITIONS` tables, plus a test
confirming the owner — and only the owner — can perform it.

---

## Phase 5 — Analytics

### What we built

- `services/analytics.service.ts` — `getAnalyticsSummary` runs **one**
  MongoDB aggregation with `$facet` to compute three independent results
  from the same filtered set of documents in a single round trip: a total
  count, a count grouped by status, and the 5 most recent requests.
- `GET /api/analytics/summary` — reuses the same visibility rule as the
  trade list (`canSeeAllTrades`): a plain user's dashboard reflects only
  their own requests; a reviewer/admin sees totals across everyone.
- `pages/Dashboard.tsx` — replaced the Phase 1 placeholder with real stat
  cards (total + one per status) and a "recent requests" list linking into
  the details page.
- 5 new integration tests (auth requirement, per-role scoping, counts
  reacting to a status change, zero-state) and 2 new Dashboard component
  tests (populated state, empty state).

### Concepts learned

**`$facet`: one query, several derived views.** Without `$facet`, getting a
total count, a status breakdown, and a recent list would mean three
separate queries (`countDocuments`, an `aggregate` with `$group`, and a
`find().sort().limit()`) — three round trips to MongoDB for what's
conceptually one "give me the dashboard data" request. `$facet` runs
multiple sub-pipelines against the *same* `$match`ed input document set in
a single aggregation call, so all three shapes come back together.

**Derived data vs. stored data.** Nothing about "total requests" or "counts
by status" is stored anywhere — it's *computed* from the same
`TradeRequest` collection the rest of the app already writes to, on every
request. This avoids an entire category of bugs (a stored counter drifting
out of sync with reality) at the cost of a slightly heavier read — an
entirely reasonable tradeoff at this data scale, and the same compound
indexes from Phase 2 (`{ createdBy, createdAt }`, `{ status, createdAt }`)
still help the `$match` stage here.

**Consistent authorization across features.** The analytics endpoint
reuses `canSeeAllTrades` from `trade.service.ts` instead of re-implementing
"who can see what" — the *same* rule that scopes the trade list also scopes
the dashboard, so there's no risk of the two disagreeing about what a plain
user is allowed to see in aggregate versus in the list.

### Important code

```ts
// server/src/services/analytics.service.ts — three views, one round trip
const [result] = await TradeRequest.aggregate([
  { $match: matchStage },
  {
    $facet: {
      totalCount: [{ $count: 'count' }],
      byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
      recent: [{ $sort: { createdAt: -1 } }, { $limit: 5 }, { $project: { /* ... */ } }],
    },
  },
]);
```

### Important commands

```bash
curl http://localhost:4000/api/analytics/summary -H "Authorization: Bearer <token>"
```

### Problems solved

No new bugs this phase — the aggregation pipeline worked as designed on the
first pass, which is itself worth noting: building the `$facet` query
incrementally (first `$match` + `totalCount` alone, verified against a known
seed, then adding `byStatus`, then `recent`) rather than writing the whole
pipeline blind made it easy to be confident about the final shape.

### Interview questions

1. **Why use `$facet` instead of three separate queries?** — One round trip
   to the database instead of three, and all three results are guaranteed
   to reflect the exact same snapshot of data (no risk of a write landing
   between separate queries and making the count and the list disagree).
2. **Why doesn't this project store a running total instead of computing it
   on every dashboard load?** — A computed value can never drift from
   reality; a cached/stored counter can, if any write path forgets to update
   it. At this data scale, computing it fresh is cheap and correct.
3. **Why does `getAnalyticsSummary` call the same `canSeeAllTrades` helper
   as the trade list, instead of writing its own role check?** — Consistency:
   one function is the single source of truth for "who can see all trades
   vs. just their own," used everywhere that distinction matters.

### What I should remember

- `$facet` is the right tool when you need several *different shapes* of
  derived data from the same filtered document set in one request.
- Prefer computing derived/aggregate data over storing and incrementally
  maintaining it, unless the computation becomes a measured performance
  problem — premature caching invites drift bugs for no proven benefit.
- Reuse authorization helpers across features instead of re-deriving the
  same rule in more than one place.

---

### Phase 5 review

**TOP 5 THINGS TO REMEMBER**
1. `$facet` computes multiple derived views from one filtered pipeline in a
   single database round trip.
2. Prefer deriving aggregate data on read over maintaining a stored counter.
3. Reuse the same authorization helper everywhere a rule applies — don't
   let two endpoints quietly diverge on "who can see what."
4. Build aggregation pipelines incrementally, verifying each stage against
   known data before adding the next.
5. The same compound indexes that serve a list endpoint's queries typically
   also serve that same data's aggregations.

**TOP 5 INTERVIEW QUESTIONS**
1. What problem does `$facet` solve versus running separate queries?
2. When would you choose a stored/cached counter over computing a value on
   every read?
3. What's the risk of a stored aggregate value that isn't kept in sync?
4. Why reuse the same `canSeeAllTrades` helper for both the trade list and
   the analytics endpoint?
5. How would you test that an aggregation pipeline is using an index rather
   than a full collection scan?

**TOP 3 DEVELOPMENT TIPS**
1. Build a `$facet` pipeline one sub-pipeline at a time against known seed
   data, rather than writing the whole thing and debugging blind.
2. Give derived/read-only endpoints the same authorization scoping as the
   underlying data they summarize — don't let a "just for the dashboard"
   endpoint quietly skip a rule the rest of the API enforces.
3. Keep the response shape typed end-to-end (server interface → client
   type) so a field rename doesn't silently break the UI.

**TOP 3 COMMON MISTAKES**
1. Running N separate queries for a dashboard when one `$facet` aggregation
   would return everything consistently in one round trip.
2. Storing and incrementally maintaining a counter "for performance" before
   there's any evidence computing it fresh is actually too slow.
3. Re-implementing an authorization rule per endpoint instead of extracting
   and reusing it.

**MINI CODING EXERCISE**
Add an `averageAmount` field to the analytics summary using `$avg` inside
the existing `$facet`, and surface it as a new stat card on the dashboard.

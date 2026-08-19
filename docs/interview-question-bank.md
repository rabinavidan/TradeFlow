# Interview Question Bank

A growing bank of Q&A, grouped by topic. Only topics actually implemented or
studied so far have entries — this file grows every phase.

## TypeScript

### Question: `any` vs `unknown` — what's the difference?
**Short Answer:** `any` disables type checking; `unknown` requires narrowing
before use.
**Strong Answer:** Both accept any value, but `unknown` is type-safe: the
compiler forces you to check the value's type (`typeof`, `instanceof`, a
custom type guard) before you can call methods on it or assign it elsewhere.
`any` opts a value out of type checking entirely, silently disabling the
safety TypeScript exists to provide.
**Project Example:** `catch (err: unknown)` throughout the server — errors
are narrowed with `instanceof AppError` / `instanceof ZodError` /
`instanceof mongoose.Error...` in `errorHandler.ts` before their properties
are accessed.
**Common Mistake:** Typing caught errors as `any` and accessing `err.message`
directly — this compiles but is unsafe if the thrown value isn't actually an
`Error`.
**Follow-up Question:** How would you narrow an `unknown` value to check it's
a plain object with a `code` property?

### Question: Why validate with Zod when TypeScript already provides types?
**Short Answer:** TypeScript types don't exist at runtime; Zod schemas do.
**Strong Answer:** TypeScript's type system is fully erased during
compilation — it can't stop malformed JSON from an HTTP request or a missing
environment variable at runtime. Zod validates real, incoming data and can
derive a static TypeScript type from the same schema (`z.infer<typeof
schema>`), so there's one source of truth instead of two definitions that
can drift apart.
**Project Example:** `server/src/config/env.ts`'s `envSchema` validates
`process.env` at startup and its inferred type becomes the type of `env`.
**Common Mistake:** Writing a TypeScript `interface` for API request bodies
and assuming that alone protects the endpoint — it only helps the *caller's*
editor, not the running server.
**Follow-up Question:** Where else in this project's API layer will Zod
schemas be needed once trade requests exist?

## Node.js

### Question: What is the event loop, and why does it matter for Node?
**Short Answer:** It's the mechanism that lets single-threaded Node handle
many concurrent I/O operations without blocking.
**Strong Answer:** Node runs JavaScript on a single thread, but I/O
operations (network, disk, timers) are delegated to the OS or a background
thread pool (libuv). The event loop keeps checking for completed operations
and runs their callbacks, so the main thread is never stuck waiting — it's
free to process other requests. This is why Node handles many concurrent
I/O-bound connections well but is a poor fit for CPU-bound work.
**Project Example:** `connectDB()` and every MongoDB query in the API are
`async`/`await`ed — the process can serve other requests while a query is in
flight.
**Common Mistake:** Assuming Node is "multi-threaded" because it can handle
many concurrent requests — the JS execution itself is single-threaded; the
concurrency comes from non-blocking I/O, not parallel JS execution.
**Follow-up Question:** What would happen to request latency if a route
handler ran a synchronous, CPU-heavy loop for 2 seconds?

## Express

### Question: How does Express distinguish error-handling middleware from regular middleware?
**Short Answer:** By counting its function parameters — exactly 4 means
"error handler".
**Strong Answer:** Express inspects the arity (`function.length`) of each
middleware you register. A function with `(req, res, next)` — 3 parameters —
is treated as regular middleware and only runs for non-error requests. A
function with `(err, req, res, next)` — 4 parameters — is registered as
error-handling middleware and is only invoked when `next(err)` is called or a
synchronous handler throws. This is why the unused `_next` parameter in
`errorHandler.ts` must stay, even though it's never called — removing it
would silently break the error handler.
**Project Example:** `server/src/middleware/errorHandler.ts` — 4 parameters,
registered last in `app.ts` after all routes and the 404 handler.
**Common Mistake:** Writing an error handler with 3 parameters "by mistake"
after refactoring, and having errors silently become unhandled 500s with no
custom formatting.
**Follow-up Question:** What's the difference between calling `next()` and
`next(err)` inside a normal route handler?

## React

### Question: Why did a `ref` passed through a custom wrapper component silently fail to reach the real `<input>`?
**Short Answer:** The wrapper wasn't wrapped in `forwardRef`.
**Strong Answer:** React only forwards a `ref` prop to a component's own
render logic when that component is created via `React.forwardRef`. For a
plain function component, React intercepts and drops any `ref` passed to it
before the function body ever runs (with a dev-mode console warning) —
because React doesn't know what DOM node or instance that ref should
attach to. This is exactly what happened with this project's `FormField`
component: React Hook Form's `register('email')` returns a `ref` callback
meant for the real `<input>`, but since `FormField` wasn't wrapped in
`forwardRef`, that `ref` never reached the input, so RHF never "saw" the
field — it stayed permanently unregistered, and typed values were invisible
to the form on submit.
**Project Example:** `client/src/components/FormField.tsx`, wrapped with
`forwardRef<HTMLInputElement, FormFieldProps>` and explicitly rendering
`<input ref={ref} ... />`.
**Common Mistake:** Assuming a form "just isn't submitting" is a validation
library bug, without checking the browser console for React's own ref
warning first.
**Follow-up Question:** Would this bug have been caught by TypeScript alone?
Why or why not?

## Authentication

### Question: Why does this app return the exact same error for "unknown email" and "wrong password"?
**Short Answer:** To prevent account/email enumeration.
**Strong Answer:** If a login endpoint returns a distinct message for "no
account with that email" vs. "wrong password", an attacker can script
attempts against a list of email addresses and learn — without ever
guessing a correct password — which of those emails have accounts on the
system. That's a privacy/security leak on its own (confirming someone is a
user of a service), and it also narrows a credential-stuffing attack's
search space. Returning one generic `401 UNAUTHORIZED` / "Invalid email or
password" for both cases closes that side channel.
**Project Example:** `server/src/services/auth.service.ts`'s `loginUser`
throws the identical `AppError.unauthorized('Invalid email or password')`
whether `User.findOne` returns nothing or `bcrypt.compare` returns false.
**Common Mistake:** Optimizing for developer-friendly error messages during
login ("no account found for that email") without considering what that
message reveals to an attacker.
**Follow-up Question:** Does the same "don't leak which case failed"
principle apply to the *register* endpoint's "email already in use" error?
Why might that case be different?

## Security

### Question: Who enforces CORS — the browser or the server?
**Short Answer:** The browser enforces it; the server just declares a policy.
**Strong Answer:** CORS is fundamentally a **browser-side** security
mechanism. The server sends `Access-Control-Allow-Origin` (and related)
response headers describing which origins are permitted to read its
responses via JavaScript; it's the requesting *browser* that inspects those
headers and blocks the page's script from reading the response if the
origin isn't allowed. The server still processes the request and sends a
real response either way — CORS doesn't stop the request from happening,
it stops the browser from *exposing the response* to the calling page's
script. Non-browser clients (curl, Postman, server-to-server calls, mobile
apps) aren't affected by CORS at all, since there's no browser enforcing it.
**Project Example:** `server/src/app.ts` configures
`cors({ origin: env.CORS_ORIGIN, credentials: true })`, so only requests
originating from the configured frontend origin can read API responses
from a browser context.
**Common Mistake:** Believing a CORS error in the browser console means the
server "blocked" or "rejected" the request — the server usually processed
it fine; the browser just hid the response from the page's JavaScript.
**Follow-up Question:** Why does the CORS spec forbid combining a wildcard
`origin: '*'` with `credentials: true`?

## REST

### Question: Why scope a MongoDB query for authorization instead of filtering an unscoped result in application code?
**Short Answer:** Correctness (accurate pagination) and performance (less
data fetched and transferred).
**Strong Answer:** If you fetch all trade requests and then filter down to
"only mine" in JavaScript, `countDocuments()` (used for `pagination.total`)
and the actual returned page can disagree — the count reflects *all*
documents while the filtered array reflects only some, or you have to
duplicate the filtering logic in two places and hope they stay in sync.
Worse, the unfiltered data leaves the database and crosses the network
before being discarded, which is both slower and a bigger blast radius if
the filtering step is ever buggy or skipped. Building the MongoDB filter
object once and passing the *same* object to `find()` and
`countDocuments()` keeps both paths correct by construction.
**Project Example:** `server/src/services/trade.service.ts`'s `listTrades`
builds one `filter` object (`{ createdBy: requester.sub }` for a plain
user, `{}` for a reviewer/admin) and reuses it for both queries via
`Promise.all`.
**Common Mistake:** Fetching broadly and filtering "downstream" (in a
controller, or in the frontend) because it felt simpler at the time, then
discovering it doesn't scale or leaks data.
**Follow-up Question:** How would this approach change if "my trades" also
needed to include trades where the user was a *reviewer assigned to it*,
not just the creator?

## MongoDB

### Question: How did this project decide what to index, and how would you verify an index is actually being used?
**Short Answer:** Index for the queries you actually run; verify with
`.explain()`.
**Strong Answer:** Indexes aren't free — every index adds overhead to every
write (insert/update must maintain it) and consumes storage, so the right
approach is to look at the application's actual query patterns and index
exactly those. This project has two real list views (a user's own requests,
newest first; a reviewer's queue filtered by status, newest first), so it
has exactly two compound indexes matching them:
`{ createdBy: 1, createdAt: -1 }` and `{ status: 1, createdAt: -1 }`. To
verify an index is used rather than a full collection scan, run the query
with `.explain('executionStats')` in `mongosh` and check that
`totalDocsExamined` is close to `nReturned` (a full scan would show
`totalDocsExamined` close to the entire collection's size regardless of how
few documents matched).
**Project Example:** `server/src/models/TradeRequest.ts`'s two
`tradeRequestSchema.index(...)` calls.
**Common Mistake:** Adding an index to every field defensively, without
checking whether any real query filters or sorts by it — this slows down
every write for no benefit.
**Follow-up Question:** Would `{ createdBy: 1, createdAt: -1 }` also
efficiently serve a query that filters by `createdBy` alone, with no sort?
What about a query that sorts by `createdAt` alone, with no `createdBy`
filter?

## TanStack Query

### Question: When would a mutation's `onSuccess` call `setQueryData` instead of `invalidateQueries`, and when would it call `invalidateQueries` instead?
**Short Answer:** `setQueryData` when the response is the complete fresh
value for a specific cache key; `invalidateQueries` when it isn't.
**Strong Answer:** A mutation's response often *is* exactly what a specific
query would return — e.g. `PUT /trades/:id` returns the full updated trade,
which is precisely what `useTradeQuery(id)` wants. In that case,
`setQueryData(['trades', 'detail', id], trade)` updates the UI instantly
with zero extra network round-trip. But the *list* query
(`['trades', 'list', params]`) is filtered, sorted, and paginated — the
mutation response can't tell you whether the updated trade still belongs on
the currently-viewed page, or where it should sort. Rather than trying to
patch that query's cache by hand, `invalidateQueries({ queryKey: ['trades', 'list'] })`
marks it stale and lets TanStack Query refetch it correctly from the
server.
**Project Example:** `client/src/hooks/useTrades.ts`'s
`useUpdateTradeMutation` does both: `setQueryData` for the detail view,
`invalidateQueries` for the list.
**Common Mistake:** Always reaching for `invalidateQueries` everywhere
"to be safe," even for data you already have in hand — costing an
unnecessary extra request and a brief loading flicker.
**Follow-up Question:** What would go wrong if `setQueryData` were used for
the *list* query instead of `invalidateQueries`, after an edit changes a
trade's status such that it no longer matches the list's active status filter?

## MongoDB (aggregation)

### Question: What problem does `$facet` solve, and why not just run three separate queries for a dashboard?
**Short Answer:** One round trip instead of three, with a guaranteed
consistent snapshot.
**Strong Answer:** A dashboard needing a total count, a breakdown by
status, and a recent-items list could run three independent queries
(`countDocuments`, an aggregation with `$group`, and a sorted/limited
`find`). That works, but costs three round trips to the database and opens
a small window where a write could land between them, making the count and
the list technically inconsistent with each other. `$facet` runs multiple
named sub-pipelines against the exact same `$match`-filtered input set in a
single aggregation call, so `totalCount`, `byStatus`, and `recent` are
guaranteed to reflect the same underlying snapshot, in one request.
**Project Example:** `server/src/services/analytics.service.ts`'s
`getAnalyticsSummary` — one aggregation, one `$match` stage, three facets.
**Common Mistake:** Reaching for `$facet` even when the "views" don't
actually need to share the same filtered input — if they're genuinely
independent, separate queries can be simpler and more parallelizable.
**Follow-up Question:** What's a downside of `$facet` compared to separate
queries, especially as the input document set gets large?

## Testing

### Question: Why did adding a third server test file break a previously-passing test in a different file, with no code change to that test?
**Short Answer:** Shared database state + parallel test file execution.
**Strong Answer:** All server integration test files in this project share
a single in-memory MongoDB instance (started once in `globalSetup.ts` for
the entire test run, not per file). Vitest, like most modern test runners,
runs test *files* in parallel by default for speed. A test in one file
asserting on an *unscoped* query result (e.g. "a reviewer sees all trades
in the database" → `total: 2`) is implicitly assuming it's the only file
touching that collection at that moment. Once a third file existed that
also created trade requests, it could do so concurrently with that
assertion running, and the unscoped query legitimately returned more
documents than the test author expected — not a bug in either file
individually, but an emergent race between them.
**Project Example:** `server/vitest.config.ts` sets `fileParallelism: false`
after this was discovered, trading some test-suite speed for determinism
against the shared in-memory database.
**Common Mistake:** Debugging this kind of failure by staring at the failing
test's own code for a long time — the bug isn't there; it's in an
assumption about isolation that stopped being true once the suite grew.
**Follow-up Question:** What's an alternative fix that would let test files
run in parallel again while keeping this kind of test safe?

## Playwright / E2E

### Question: Why did `Strict-Transport-Security` cause confusing, hard-to-diagnose failures specifically in the E2E test environment?
**Short Answer:** The browser caches HSTS per-origin and then silently
retries requests over HTTPS, which fails instantly against a plain-HTTP
dev/test server.
**Strong Answer:** `helmet()`'s defaults include sending
`Strict-Transport-Security: max-age=31536000; includeSubDomains` on every
response — correct and desirable behavior in production, where the app is
actually served over HTTPS. But a browser that receives this header
remembers, for that origin, "always use HTTPS from now on, for up to a
year" — regardless of whether the server was ever actually reachable over
HTTPS. In this project's E2E environment, the test API server is plain
HTTP; once the browser received that header from an earlier request, it
began silently attempting to upgrade background/prefetch requests to
HTTPS, which failed instantly (nothing is listening for TLS), producing a
flood of confusing network errors with no direct connection to anything
in the test code. The fix is to make HSTS conditional:
`helmet({ hsts: env.NODE_ENV === 'production' })`.
**Project Example:** `server/src/app.ts`.
**Common Mistake:** Treating "the security middleware defaults are always
safe to apply everywhere" as true — some security headers are only correct
given assumptions (like "this is actually served over TLS") that don't
hold in every environment.
**Follow-up Question:** What other `helmet()` defaults might also need to
be environment-conditional, and why?

### Question: Why did `page.url()` sometimes return a stale value immediately after a button click that triggers navigation?
**Short Answer:** A resolved click only means the click event fired — not
that whatever it asynchronously triggered has completed.
**Strong Answer:** In this app, submitting the "create trade" form doesn't
navigate synchronously — it calls a mutation, waits for the API response,
and only then calls React Router's `navigate()` inside a `.then()`/`await`
chain in an event handler. Playwright's `locator.click()` resolves once
the click event has been dispatched and any immediate DOM updates settle —
it has no way to know about a `fetch` call and subsequent `navigate()`
still in flight afterward. Reading `page.url()` right after that click
races against that async chain: sometimes it wins (URL already updated),
sometimes it doesn't (URL still shows the previous page). The fix is to
never depend on `page.url()` (or any other post-navigation state) without
first asserting the expected result, e.g.
`await expect(page).toHaveURL(/\/trades\/[a-f0-9]+$/)`.
**Project Example:** `e2e/tests/permissions.spec.ts`, after this bug was
found and fixed.
**Common Mistake:** Assuming synchronous-looking test code
(`await click(); const url = page.url();`) is safe just because it reads
top-to-bottom — async side effects don't respect that ordering unless
explicitly awaited via their observable result.
**Follow-up Question:** Would this bug have been caught by a unit or
component test instead? Why or why not?

## Docker

### Question: Why does the runtime stage of this project's Dockerfiles run a completely separate `npm install` instead of copying `node_modules` forward from the build stage?
**Short Answer:** The build stage's `node_modules` reflects the whole
workspace (both services' deps plus every dev dependency needed to
compile); a fresh, standalone install from just the runtime service's own
`package.json` produces a smaller, correctly-scoped image.
**Strong Answer:** Because this is an npm workspace, the build stage's
`npm ci` runs against the shared root lockfile and installs dependencies
for *every* workspace — the server image's build stage temporarily has
React, Vite, and every client devDependency present too, purely because
the lockfile ties them together. None of that belongs in the final image:
the compiled server only needs Express, Mongoose, a handful of runtime
libraries, and nothing related to the client or to TypeScript itself
(which is only needed to *produce* `dist/`, not to run it). The runtime
stage's `npm install --omit=dev`, run against *only* `server/package.json`
in complete isolation from the workspace, resolves and installs exactly
what the compiled JavaScript needs — nothing more.
**Project Example:** `server/Dockerfile`'s two `FROM node:22-alpine`
stages — `build` and `runtime` — with completely different `COPY`/`RUN`
steps for their respective installs.
**Common Mistake:** Assuming "just copy node_modules from the build stage,
it's simpler" — simpler to write, but ships an unnecessarily large,
less-scoped image with build-only tooling and another service's
dependencies along for the ride.
**Follow-up Question:** What would you lose if the runtime stage's install
used `npm install` (no lockfile involved) versus something closer to `npm ci`'s guarantees — and why doesn't a per-service lockfile exist here to fix that?

## Reliability

### Question: Why does this app handle SIGTERM instead of just letting the process die when stopped?
**Short Answer:** To finish in-flight requests and release resources
cleanly instead of severing connections mid-response.
**Strong Answer:** Every container orchestrator (Docker, Kubernetes) and
most deploy tools send `SIGTERM` first when stopping a process, giving it
a grace period before escalating to an unavoidable `SIGKILL`. If the app
ignores `SIGTERM`, the default Node.js behavior is to exit immediately —
cutting off any request currently mid-flight (a client gets a connection
reset instead of a response) and skipping any cleanup (like closing the
database connection cleanly). Handling `SIGTERM` explicitly lets the app
stop accepting *new* connections via `server.close()`, wait for requests
already in progress to finish, disconnect from MongoDB, and only then
exit — turning what would be a hard cutoff into a clean handoff. A
force-exit timer backs this up in case something in that cleanup sequence
itself hangs.
**Project Example:** `server/src/index.ts`'s `registerGracefulShutdown`.
**Common Mistake:** Assuming this doesn't matter "because it works
locally" — you rarely `Ctrl+C` mid-request in development, so the gap is
invisible until it's costing dropped requests on every production deploy.
**Follow-up Question:** What would you add to make in-flight WebSocket
connections (not just HTTP requests) shut down gracefully too?

## Git

### Question: What belongs in `.gitignore` for a full-stack Node/React project?
**Short Answer:** Anything regenerable (`node_modules/`, `dist/`) or secret
(`.env`).
**Strong Answer:** `.gitignore` should exclude: dependency directories
(`node_modules/` — regenerated by `npm install` from `package-lock.json`),
build output (`dist/`, `build/` — regenerated by the build command), secrets
(`.env` — never committed; `.env.example` documents the *shape* without real
values), and OS/editor artifacts (`.DS_Store`, IDE settings). Committing any
of these bloats the repo, leaks secrets, or creates merge conflicts on
generated files.
**Project Example:** The root `.gitignore` excludes `node_modules/`, `dist/`,
`.env` (with `.env.example` explicitly un-ignored), and test artifacts.
**Common Mistake:** Committing a `.env` file with real secrets because it
"just worked locally" and nobody double-checked `git status` before
committing.
**Follow-up Question:** If a secret was already committed and pushed, is
adding it to `.gitignore` afterwards enough to remove it from the repo?

## CI/CD

### Question: Why did this project's Playwright config need to change before it could run reliably in CI, even though it already worked in the dev sandbox?
**Short Answer:** It hardcoded a Chromium binary path that only exists in
one specific local sandbox.
**Strong Answer:** The original config unconditionally set
`launchOptions.executablePath` to a fixed path
(`/opt/pw-browsers/chromium`) that happened to exist in this particular dev
environment. On a real GitHub Actions runner, no such path exists — Playwright
manages its own browser install via `npx playwright install --with-deps
chromium`, at a different, runner-managed location. Hardcoding the sandbox's
path meant the config only worked by coincidence in one environment and
would fail immediately anywhere else. The fix makes the override
conditional: `executablePath` is only set when `PLAYWRIGHT_CHROMIUM_PATH` is
explicitly provided via environment variable; otherwise Playwright is left
to find its own managed browser, which is what both a normal CI runner and
most local dev machines expect.
**Project Example:** `e2e/playwright.config.ts`'s `use.launchOptions`.
**Common Mistake:** Verifying something works in "your" environment and
assuming that proves portability — a hardcoded path, port, or credential
specific to one sandbox is an easy way to ship a config that silently only
works for its author.
**Follow-up Question:** What other parts of a Playwright/CI config are
common places for environment-specific assumptions to sneak in (think
ports, base URLs, timeouts)?

### Question: Why isn't this project's Playwright E2E job wired as a required, merge-blocking status check, when the unit/integration test jobs are?
**Short Answer:** E2E is the slowest and most environment-sensitive layer of
the test pyramid — a flake there shouldn't itself block every merge the way
a real regression in a fast, deterministic test should.
**Strong Answer:** The test pyramid exists because different test layers
have different cost/reliability tradeoffs: unit and integration tests are
fast, deterministic, and isolate failures precisely, so treating them as
required makes sense — a red one almost always means a real regression.
E2E tests exercise the entire real system end-to-end (a real browser, real
navigation, real async timing) and are, by nature, more prone to
environment-specific flakiness that has nothing to do with the actual code
change (a slow runner, a timing edge case). Running E2E on every PR still
gives valuable visibility into UI regressions, but making it a hard merge
gate risks blocking legitimate changes on noise instead of signal. A real
UI regression is still very likely to be caught by client-side unit/
component tests too, which *are* required.
**Project Example:** `.github/workflows/ci.yml`'s `e2e` job runs on every
PR and uploads a Playwright HTML report on failure, but branch protection
(if configured) would name `lint-and-typecheck`, `server-tests`, and
`client-tests` as required checks, not `e2e`.
**Common Mistake:** Concluding "E2E tests are less important" from this
decision — the actual reasoning is about *flake tolerance in a gate*, not
about the value of the coverage itself.
**Follow-up Question:** What would you need to add to this project's E2E
suite before you'd be comfortable making it a required check?

### Question: Why run `lint-and-typecheck`, `server-tests`, and `client-tests` as three separate parallel CI jobs instead of one job running all three commands in sequence?
**Short Answer:** Faster feedback (they run concurrently) and clearer
failure isolation (each job's status shows exactly which category failed).
**Strong Answer:** These three checks are fully independent of each other —
a lint failure has nothing to do with whether server tests pass. Running
them as separate jobs lets GitHub Actions schedule them on separate runners
concurrently, so total wall-clock time is roughly the slowest single job
instead of the sum of all three. It also means a PR's checks list shows
precisely which category is red at a glance, rather than one monolithic
"CI" job whose failure could be any of several unrelated causes, requiring
someone to open the log and scroll to find out which step actually failed.
**Project Example:** `.github/workflows/ci.yml` defines
`lint-and-typecheck`, `server-tests`, and `client-tests` as three top-level
jobs with no `needs:` between them, so they start simultaneously; `build`
only adds a real dependency (`needs: [lint-and-typecheck]`) where one
actually exists.
**Common Mistake:** Over-splitting jobs that *do* have a real dependency
(e.g. running `build` before `lint-and-typecheck` finishes) just to
maximize parallelism, wasting runner time building code that's about to
fail a type check anyway.
**Follow-up Question:** What tradeoff would you be making by merging all
three jobs back into one sequential job on a single runner?

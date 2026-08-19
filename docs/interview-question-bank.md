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

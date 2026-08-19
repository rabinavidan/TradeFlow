# Final Full-Stack Interview Prep — 50 Questions

A fast, run-through-them-all review across the whole stack, each with a
short answer grounded in this project. For the deep-dive version of any of
these (strong answer, project example, common mistake, follow-up) see
[interview-question-bank.md](interview-question-bank.md) and
[topic-tips-and-interview-questions.md](topic-tips-and-interview-questions.md).

## TypeScript

1. **`any` vs `unknown`?** `any` disables type checking; `unknown` forces
   narrowing before use. This project types every caught error as `unknown`.
2. **Why validate with Zod when TypeScript already has types?** TypeScript
   is erased at compile time — it can't stop bad data arriving at runtime.
   Zod validates real data and derives a static type from the same schema.
3. **What does `strict: true` enable?** `strictNullChecks`, `noImplicitAny`,
   and more — without it, TypeScript is much closer to "JS with comments."

## React

4. **What causes a re-render?** Own state changing, a non-memoized parent
   re-rendering, or a subscribed context value changing.
5. **What is `forwardRef` for?** Letting a custom component accept a `ref`
   meant for a native element inside it — a real bug in this project
   (`FormField`) came from skipping it.
6. **Server state vs. client state?** Server state (trades, the logged-in
   user) lives in TanStack Query; client/UI state (form inputs, toggles)
   lives in local `useState`.

## React Router

7. **How do you implement a protected route?** A layout route whose element
   checks auth state and either shows a loading state, redirects to
   `/login`, or renders `<Outlet/>`.
8. **Route param vs. query param?** `/trades/:id` identifies a specific
   resource; `?status=Approved` filters/modifies a request to a collection.

## TanStack Query

9. **Why TanStack Query over `useEffect` + `fetch`?** It replaces
   hand-rolled caching, deduplication, retries, and loading/error state with
   one declarative hook.
10. **`setQueryData` vs. `invalidateQueries`?** Use `setQueryData` when the
    mutation response *is* the fresh value for a specific cache key; use
    `invalidateQueries` when it only partially describes a broader query's
    result (e.g. a filtered/paginated list).
11. **What does `enabled: false` do?** Skips a query until its prerequisite
    is met — e.g. `/auth/me` only runs once a token exists.

## Forms + Zod

12. **Why validate on both client and server?** Client validation is UX
    convenience; server validation is the real security/data-integrity
    boundary — any client can bypass the frontend entirely.
13. **What's the risk of relying only on browser-native validation?** It's
    inconsistent across browsers/inputs and provides zero protection once a
    request reaches the server directly (curl, a script).

## Node.js

14. **What makes Node good for I/O-heavy services?** A single JS thread
    delegates I/O to the OS/thread pool, so it's free to serve other
    requests while waiting — good for I/O-bound work, bad for CPU-bound work.
15. **What's `process.env`?** How config/secrets reach the process at
    runtime — via `dotenv` locally, real environment variables in Docker/CI.

## Express

16. **How does Express detect error-handling middleware?** By counting
    parameters — exactly 4 (`err, req, res, next`) marks it as an error
    handler.
17. **Why keep controllers thin?** So business logic lives in one testable
    service layer instead of being duplicated or hidden in route handlers.

## REST API design

18. **Why does `POST /trades` return `201`, not `200`?** `201 Created` more
    precisely says "a new resource now exists"; the body is that resource.
19. **`403` vs. `404` for an authorization failure?** `403` confirms the
    resource exists but denies access (this project's choice, made for
    teaching clarity); some systems return `404` to avoid confirming
    existence at all.
20. **`409` vs. `422`?** `422` = the request body itself is invalid.
    `409` = the request is well-formed but the resource's *current state*
    blocks it (e.g. editing an `Approved` trade).

## MongoDB

21. **How do you decide what to index?** Index the queries you actually
    run — this project has exactly two compound indexes matching its two
    real list views.
22. **Embedding vs. referencing?** Embed data always accessed with its
    parent and without independent identity; reference data with its own
    lifecycle, queried independently (`User`, referenced from
    `TradeRequest.createdBy`).
23. **What does `$facet` solve?** Runs multiple named sub-pipelines against
    the same filtered input in one round trip, guaranteeing a consistent
    snapshot — used for the dashboard summary.

## Authentication + JWT

24. **What's inside a JWT — is it encrypted?** Header, payload, signature,
    base64url-encoded; it's **signed, not encrypted** — anyone can decode
    and read the payload.
25. **Why hash passwords instead of encrypting them?** The server should
    never need to recover the original password — only verify a guess —
    so a one-way, deliberately slow hash (bcrypt) is the right tool.
26. **Why does login return the same error for "unknown email" and "wrong
    password"?** To prevent account/email enumeration.

## Security

27. **Who enforces CORS — browser or server?** The browser. The server just
    declares a policy via response headers; the server still processes the
    request either way.
28. **What does `helmet()` do, and what's one pitfall?** Sets sensible
    security headers by default; one default (HSTS) must be
    environment-gated, or it breaks plain-HTTP dev/test environments in
    confusing ways (a real bug found in this project).
29. **Why rate-limit login specifically?** To slow down credential-stuffing
    and brute-force attempts against the one endpoint most worth attacking.

## Testing

30. **What's the test pyramid?** Many fast unit/integration tests, fewer
    component tests, a handful of E2E tests for genuinely critical paths.
31. **What should be mocked?** External dependencies you don't control or
    that make tests slow/flaky — never the thing you're actually testing.
32. **Why did adding a third test file break a passing test in a different
    file?** Shared in-memory database + parallel file execution — an
    implicit isolation assumption stopped holding once a third file existed
    (fixed with `fileParallelism: false`).

## Playwright / E2E

33. **What does Playwright's auto-waiting do?** Locators wait for
    actionability automatically, reducing the need for manual sleeps/flake.
34. **Why did `page.url()` sometimes read stale right after a click?** A
    resolved click only means the click event fired — not that its async
    side effects (an API call, then `navigate()`) have completed; fix by
    asserting on the observable result first.

## Docker

35. **Image vs. container?** An image is a read-only versioned snapshot;
    a container is a running instance created from one, with its own
    writable layer.
36. **Why a multi-stage Dockerfile?** A build stage with the full toolchain,
    a separate runtime stage with only what's needed to run — smaller, more
    secure final image.
37. **How do containers on the same Compose network find each other?**
    Compose's internal DNS resolves service names as hostnames
    (`mongodb://mongo:27017`, not `localhost`).

## CI/CD

38. **CI vs. CD?** CI verifies every change automatically; CD/Delivery goes
    further and ships a passing change to a real environment. This project
    only implements CI.
39. **Why separate parallel jobs instead of one script?** Faster feedback
    and clearer failure attribution — one job's failure doesn't bury
    another's result.
40. **Why isn't E2E a required, merge-blocking check here?** It's the
    slowest, most environment-sensitive layer of the pyramid — valuable for
    visibility, but a flake there shouldn't itself block every merge.

## Optional AI integration

41. **How do you design around an optional dependency?** Give it sensible
    defaults so the app boots without it, convert every failure mode into
    one documented error, and keep that feature's failure isolated from the
    rest of the app.
42. **Why put a timeout on a call to a local service?** A local process can
    hang or misbehave just as easily as a remote one — `fetch` doesn't wait
    forever on its own.

## Git

43. **What belongs in `.gitignore`?** Anything regenerable
    (`node_modules/`, `dist/`) or secret (`.env` — `.env.example` documents
    the shape without real values).
44. **Why small, typed commits (`feat:`, `fix:`, `ci:`)?** Keeps history
    scannable and readable as a changelog, one logical change per commit.

## HTML + CSS / Accessibility

45. **Flexbox vs. Grid?** Flexbox distributes items along one axis (a nav
    bar); Grid defines rows and columns explicitly for real two-dimensional
    layouts (a details page's label/value grid).
46. **Why isn't a placeholder a substitute for a label?** It disappears once
    typing starts and isn't reliably announced by every screen reader the
    way a persistent `<label for="...">` is.
47. **Why prefer a native `<button>` over a styled `<div onClick>`?**
    Keyboard support and correct semantics (focus, `Enter`/`Space`
    activation, screen reader role) come for free.

## Logging + Reliability

48. **Why handle `SIGTERM` instead of letting the process die?** To finish
    in-flight requests and disconnect cleanly instead of cutting connections
    off mid-response — orchestrators send `SIGTERM` before an unavoidable
    `SIGKILL`.
49. **What's a correlation/request ID for?** One id per request, present in
    logs, the response header, and the error body — the fastest path from
    "a user reports an error" to the exact log line.
50. **`uncaughtException`/`unhandledRejection` — log and exit, or try to
    keep running?** Log and exit; once a process's state is unknown, an
    orchestrator restarting it cleanly is safer than limping on.

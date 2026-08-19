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

## Forms + Zod

- Client and server both validate — the server copy
  (`server/src/schemas/auth.schema.ts`) is the security boundary; the client
  copy (`client/src/schemas/auth.schema.ts`) is just fast UX feedback. They
  aren't literally the same file (different runtimes/build steps) but encode
  the same rules on purpose.
- **`defaultValues`** on `useForm` matters: without it, an untouched field is
  `undefined` at submit time and Zod reports its generic "Required" message
  instead of your custom one.

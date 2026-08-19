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

- **Status codes used so far**: `200` (health OK), `503` (health degraded —
  DB down). More codes (`201`, `204`, `400`, `401`, `403`, `404`, `409`,
  `422`) are introduced with the endpoints that use them in later phases.

## Git

- **`git status`** before anything destructive.
- **Small, typed commits**: `feat:`, `fix:`, `test:`, `refactor:`, `ci:` —
  keeps history scannable and is exactly what `git log --oneline` should read
  like in a portfolio repo.

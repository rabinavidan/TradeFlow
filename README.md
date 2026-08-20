# TradeFlow Lite

[![CI](https://github.com/rabinavidan/TradeFlow/actions/workflows/ci.yml/badge.svg)](https://github.com/rabinavidan/TradeFlow/actions/workflows/ci.yml)
[![Nightly E2E](https://github.com/rabinavidan/TradeFlow/actions/workflows/nightly-e2e.yml/badge.svg)](https://github.com/rabinavidan/TradeFlow/actions/workflows/nightly-e2e.yml)
![Node](https://img.shields.io/badge/node-%3E%3D20-339933?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Tests](https://img.shields.io/badge/tests-72%20passing-brightgreen)

A full-stack trade-finance workflow application: users submit **Trade
Requests** (Letter of Credit, Guarantee, Collection, Other) and move them
through an auditable review pipeline — **Draft → Submitted → In Review →
Approved / Rejected** — under role-based permissions for requesters,
reviewers, and admins.

Built end-to-end as a portfolio project to demonstrate production-grade
engineering practice, not just a working feature set: a single
source-of-truth state machine drives both server enforcement and client
UX, every request boundary is validated on both sides, and the whole
system is backed by a 72-scenario test suite, a Dockerized deployment, and
a CI pipeline with parallel jobs and nightly regression reporting.

*(This is a technical demo — it does not model real financial regulation,
KYC, or payment rails.)*

## Highlights

- **Workflow engine, not `if`-chains.** Every legal status transition and
  who's allowed to perform it lives in one `TRANSITIONS` table
  ([`workflow.service.ts`](server/src/services/workflow.service.ts)) — the
  single source of truth the server enforces and the client mirrors for
  UX only. Every change is recorded to an append-only audit trail.
- **Defense in depth.** JWT auth with bcrypt hashing, Zod validation
  independently enforced on client and server, role-based authorization
  checked server-side on every request, environment-gated security
  headers, and rate-limited auth endpoints.
- **72 tests across the pyramid.** 42 server (Vitest + Supertest against a
  real in-memory MongoDB), 22 client (React Testing Library), 8 end-to-end
  (Playwright, Page Object Model) — plus a nightly scheduled E2E run with
  [Allure](https://allurereport.org) reporting for trend visibility.
- **Ships in one command.** Multi-stage Docker builds and a Compose stack
  (`docker compose up --build`) run the client, API, and MongoDB together
  with zero local installs.
- **CI that means something.** Parallel GitHub Actions jobs (lint,
  typecheck, build, both test suites, E2E) gate every pull request; every
  command CI runs is one a contributor can run locally, verbatim.
- **Optional AI, zero paid APIs.** A "Generate with AI" description
  button calls a locally-run [Ollama](https://ollama.com) model — with a
  documented, tested fallback (`503`, not a crash) when it isn't running.
- **Self-documenting API.** Interactive OpenAPI/Swagger docs at
  `GET /api/docs` for every endpoint, request shape, and status code.

## Screenshots

| Dashboard | Trade details |
| --- | --- |
| ![Dashboard](docs/screenshots/02-dashboard.png) | ![Trade details](docs/screenshots/04-trade-details.png) |

| New trade request (with AI description) | Interactive API docs |
| --- | --- |
| ![New trade request](docs/screenshots/05-create-trade.png) | ![API docs](docs/screenshots/06-api-docs.png) |

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, TypeScript, Vite, React Router, React Hook Form, Zod, TanStack Query |
| Backend | Node.js, TypeScript, Express, MongoDB, Mongoose, Zod, JWT, bcrypt, pino |
| Testing | Vitest, React Testing Library, Supertest, Playwright, Allure |
| Engineering | ESLint, Prettier, Docker, Docker Compose, GitHub Actions, Swagger/OpenAPI |
| Optional AI | Ollama (local, open-source model — never a paid API) |

## Architecture

```
tradeflow-lite/
  client/   React + Vite + TypeScript frontend
  server/   Node + Express + TypeScript API
  e2e/      Playwright end-to-end tests (Page Object Model)
  docs/     Architecture, learning notes, and interview-prep material
```

Both sides keep one clean layering discipline: **UI → API client → React
Query hooks** on the frontend, **route → controller → service → model** on
the backend — no business logic in a route handler, no data-fetching logic
in a component. Full request-lifecycle and data-model diagrams live in
[docs/architecture.md](docs/architecture.md).

## Quick start

The fastest way to see it running, no local Node.js or MongoDB required:

```bash
git clone https://github.com/rabinavidan/TradeFlow.git && cd TradeFlow
docker compose up --build
```

Then open **http://localhost:5173** (API on `:4000`, MongoDB on `:27017`
with data persisted in a named volume). Set `JWT_SECRET` in a root `.env`
file (see `.env.example`) to override the demo default; `docker compose
down -v` stops everything and removes the MongoDB volume.

To explore with realistic data instead of a blank slate, seed the database
first — see [Demo accounts](#demo-accounts) below.

<details>
<summary><strong>Run locally without Docker</strong></summary>

### Prerequisites

- Node.js 20+
- A running MongoDB instance (local install, Docker, or Atlas)

### 1. Install

```bash
npm install
```

Installs both `client/` and `server/` workspaces from the repo root (npm
workspaces) in one pass.

### 2. Configure

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` if MongoDB isn't at the default
`mongodb://localhost:27017/tradeflow-lite`, and set a real `JWT_SECRET`.
`OLLAMA_BASE_URL`/`OLLAMA_MODEL` are optional — only needed for the
"Generate with AI" button; the app works fully without them.

### 3. Run

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

### 4. (Optional) Load demo data

```bash
npm run seed --workspace server
```

### 5. Verify

```bash
npm run lint && npm run typecheck && npm run build
npm run test           # 42 server + 22 client tests
npm run test:e2e       # 8 Playwright scenarios, starts its own real servers + in-memory MongoDB
```

</details>

## Demo accounts

After seeding (`npm run seed --workspace server`), these accounts are
ready to use — all share the password `demo-password-123`:

| Email | Role | Notes |
| --- | --- | --- |
| `user@tradeflow.demo` | user | Owns all five seeded trade requests |
| `reviewer@tradeflow.demo` | reviewer | Can move requests through review |
| `admin@tradeflow.demo` | admin | Sees and can act on everything |

## Optional: AI-assisted description generation

The trade request form's "Generate with AI" button drafts a description
from whatever fields are already filled in, using a locally running
[Ollama](https://ollama.com) model — no paid API, no account, no data
leaving the machine:

```bash
ollama pull llama3.2   # or set OLLAMA_MODEL to whatever you've pulled
ollama serve
```

Entirely optional: with Ollama not running, the button shows a small
inline notice and the rest of the form works identically.

## API documentation

Interactive Swagger/OpenAPI docs are served at `/api/docs`
(http://localhost:4000/api/docs locally) — every endpoint, request/response
shape, and status code, generated from
[server/src/docs/openapi.ts](server/src/docs/openapi.ts).

```bash
curl http://localhost:4000/api/health
# { "status": "ok", "db": "connected", "uptimeSeconds": 12, "timestamp": "…" }
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — system diagram and data flow
- [docs/learning-notes.md](docs/learning-notes.md) — build log: what was built and why, with real bugs found and fixed along the way
- [docs/commands-cheatsheet.md](docs/commands-cheatsheet.md) — every command used in this repo
- [docs/interview-cheatsheet.md](docs/interview-cheatsheet.md) — quick interview reference by topic
- [docs/topic-tips-and-interview-questions.md](docs/topic-tips-and-interview-questions.md) — deep dive per topic
- [docs/interview-question-bank.md](docs/interview-question-bank.md) — Q&A bank with project-grounded answers
- [docs/interview-demo-script.md](docs/interview-demo-script.md) — a live-demo walkthrough for interviews
- [docs/final-fullstack-interview-prep.md](docs/final-fullstack-interview-prep.md) — 50-question full-stack review
- [docs/cv-description.md](docs/cv-description.md) — resume/CV blurbs for this project

## Deployment

There's no live deployment for this portfolio project, but the Docker
setup is deploy-ready as-is:

1. Push `server/Dockerfile` and `client/Dockerfile` images to a registry
   (or build directly on the host) and run them with
   `docker-compose.yml` as a starting point — most container platforms
   (Fly.io, Render, Railway, a plain VPS with Docker Compose) can take
   this directly.
2. Swap the `mongo` service for a managed instance (e.g.
   [MongoDB Atlas](https://www.mongodb.com/atlas)) for anything beyond a
   local demo, and set `MONGODB_URI` accordingly.
3. Set real values for `JWT_SECRET` (long, random) and `CORS_ORIGIN` (the
   deployed frontend's actual origin) as environment variables — never
   commit them.
4. Terminate TLS in front of the app (a platform load balancer, or
   nginx/Caddy) — `helmet`'s HSTS header is already gated on
   `NODE_ENV=production` and only makes sense once real HTTPS is in place.
5. Point CI at a deploy step once a real target exists — today it
   deliberately stops at a verified build, since there's nothing to ship
   to yet.

## Known limitations & roadmap

Honest tradeoffs made to keep this project focused, and what would come
next for a production system:

| Limitation | What production would need |
| --- | --- |
| Single long-lived JWT, no refresh flow | Refresh tokens + silent re-auth |
| No file attachments on a request | Upload support with type/size validation |
| Any reviewer can act on any submitted request | Reviewer assignment + notifications |
| No pagination on the status-history audit trail | Fine at this scale; would need it for very long histories |
| Single MongoDB instance, no replica set | Managed MongoDB with replication for durability |
| Docker images aren't built in CI, only linted/tested | A `docker build` job to catch Dockerfile regressions pre-merge |

## Contact

Built and maintained by **Rabin Avidan**.

- LinkedIn: [linkedin.com/in/rabin-avidan-1aab6653](https://www.linkedin.com/in/rabin-avidan-1aab6653/)
- Email: [Rabin.Avidan.dev@gmail.com](mailto:Rabin.Avidan.dev@gmail.com)
- Phone: +972 50-687-0046

## License

© 2026 Rabin Avidan. All rights reserved.

This repository is published as a portfolio piece to demonstrate engineering
work — reviewing and running the code (e.g. as part of a job application or
technical interview) is welcome. No permission is granted to copy,
redistribute, or reuse this code, in whole or in part, for any other
purpose without prior written consent from the author.

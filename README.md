# TradeFlow Lite

A portfolio-ready, full-stack workflow management app inspired by trade-finance
processes. Users register, create **Trade Requests** (Letter of Credit,
Guarantee, Collection, Other), and move them through a review workflow —
**Draft → Submitted → In Review → Approved/Rejected** — while reviewers and
admins act on them under role-based permissions.

This is a technical portfolio project. It does not model real financial
regulation.

> **Status:** Phase 0 complete (project scaffold, health check). See
> [docs/learning-notes.md](docs/learning-notes.md) for phase-by-phase
> progress and [docs](docs) for the full learning material.

## Stack

| Layer      | Technology                                                                 |
| ---------- | --------------------------------------------------------------------------- |
| Frontend   | React, TypeScript, Vite, React Router, React Hook Form, Zod, TanStack Query |
| Backend    | Node.js, TypeScript, Express, MongoDB, Mongoose, Zod, JWT, bcrypt, pino     |
| Testing    | Vitest, React Testing Library, Supertest, Playwright                        |
| Engineering| ESLint, Prettier, Docker, Docker Compose, GitHub Actions, Swagger/OpenAPI   |
| Optional AI| Ollama (local, open-source model — never a paid API)                       |

## Project structure

```
tradeflow-lite/
  client/   React + Vite + TypeScript frontend
  server/   Node + Express + TypeScript API
  e2e/      Playwright end-to-end tests (Page Object Model)
  docs/     Learning notes, cheat sheets, architecture, interview prep
```

Each side keeps a clean layering: **UI → API client → React Query/hooks**
on the frontend, and **route → controller → service → model** on the
backend. See [docs/architecture.md](docs/architecture.md) for a diagram.

## Getting started

### Prerequisites

- Node.js 20+
- A running MongoDB instance (local install, Docker, or Atlas)

### 1. Install dependencies

```bash
npm install
```

This installs both `client/` and `server/` workspaces from the repo root
(npm workspaces).

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edit `server/.env` if your MongoDB instance isn't at the default
`mongodb://localhost:27017/tradeflow-lite`, and set a real `JWT_SECRET`.

### 3. Run the app

```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173
```

Open http://localhost:5173 — the page pings `/api/health` on the server
and shows the API/DB status, proving the two are wired together.

### 4. Verify everything works

```bash
npm run lint
npm run typecheck
npm run build
```

## Quick health check

```bash
curl http://localhost:4000/api/health
```

```json
{ "status": "ok", "db": "connected", "uptimeSeconds": 12, "timestamp": "…" }
```

## Documentation

- [docs/architecture.md](docs/architecture.md) — system diagram and data flow
- [docs/learning-notes.md](docs/learning-notes.md) — what was built and learned, phase by phase
- [docs/commands-cheatsheet.md](docs/commands-cheatsheet.md) — every command used in this repo
- [docs/interview-cheatsheet.md](docs/interview-cheatsheet.md) — quick interview reference by topic
- [docs/topic-tips-and-interview-questions.md](docs/topic-tips-and-interview-questions.md) — deep dive per topic
- [docs/interview-question-bank.md](docs/interview-question-bank.md) — growing Q&A bank

## Known limitations

- This is a demo app: no real payment rails, no real KYC/compliance logic.
- Optional AI (Phase 10) requires a local [Ollama](https://ollama.com) install; the
  app works fully without it.

## License

Portfolio project — no license restrictions implied beyond showcasing the code.

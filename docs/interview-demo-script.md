# Interview Demo Script

A ~8-10 minute walkthrough for showing TradeFlow Lite live in an interview.
Each step names what to click/say and, where useful, what it's meant to
prove about the underlying engineering — not just the UI.

## Before the interview

```bash
npm install
npm run seed --workspace server   # loads 3 demo accounts + 5 trade requests
npm run dev:server
npm run dev:client
```

Have `http://localhost:5173` and `http://localhost:4000/api/docs` open in
two tabs ahead of time. Password for every demo account is
`demo-password-123` (see [README's Demo accounts](../README.md#demo-accounts)).

## 1. Frame it (30 seconds)

"This is a full-stack workflow app — trade finance requests moving through
Draft → Submitted → In Review → Approved/Rejected, with three roles. I built
the whole stack: React/TypeScript frontend, Node/Express/MongoDB backend,
full test suite, Docker, CI, and an optional local-AI feature. I'll show the
happy path, then a couple of the more interesting engineering decisions."

## 2. Register + login as a plain user (1 minute)

- Register a brand-new account live (`demo+interview@example.com`).
- Point out the client-side validation errors (Zod + React Hook Form)
  appearing instantly, then submit successfully and land on the dashboard.
- **Talking point:** "Validation runs on both sides — this is UX
  convenience; the server independently re-validates everything with the
  same rules, because that's the actual security boundary."

## 3. Create a trade request, use the AI button (1.5 minutes)

- Click "New Request," fill in Title, Country, Request type only.
- Click "Generate with AI." If Ollama is running, show the drafted
  description land in the field. If not, show the inline "unavailable"
  notice.
- **Talking point (either outcome):** "This is a deliberately optional
  integration — Ollama, a local open-source model, no paid API, no data
  leaving the machine. If it's not running, the endpoint returns a
  documented `503`, not a crash, and the rest of the form works exactly the
  same either way."
- Submit the form (status starts as `Draft`).

## 4. Log in as the reviewer, walk a request through the workflow (2 minutes)

- Log out, log back in as `reviewer@tradeflow.demo`.
- Open the dashboard — point out it now shows **every** user's requests,
  not just one person's.
- Open the seeded "Textile export guarantee" (status `Submitted`), move it
  to `In Review`, then `Approved`, adding a comment each time.
- Scroll to **Status history** — show the append-only audit trail.
- **Talking point:** "Every legal transition and who's allowed to perform
  it comes from one table (`TRANSITIONS`) in `workflow.service.ts` — it's
  the single source of truth on the server; the client has a matching
  table too, but that copy is UX-only. The server never trusts it."

## 5. Show a permission boundary failing correctly (1 minute)

- As the reviewer, try to open the URL of a trade request directly by id
  that belongs to a different plain user account (or just describe it: "if
  I were a stranger to this request, this returns a `403`, not a `404` —
  we chose to reveal the resource exists but deny access, which is the
  documented tradeoff versus systems that hide existence entirely").

## 6. API docs (1 minute)

- Switch to the `/api/docs` tab.
- Expand `POST /api/trades` — show the request/response schema.
- **Talking point:** "Hand-written OpenAPI spec, not generated from the Zod
  schemas — a deliberate tradeoff for a project this size: generation keeps
  things in sync automatically, but it's more tooling than this scale
  needs to justify."

## 7. Tests + CI (1.5 minutes)

```bash
npm run test           # or show CI green on GitHub
```

- Mention the numbers: 42 server tests, 22 client tests, 8 Playwright E2E
  scenarios.
- **Talking point:** "I can point to two real bugs the test suite or a
  manual smoke test actually caught, if you want a war story — one was a
  form ref bug (`forwardRef`), one was an HSTS header breaking E2E tests in
  a subtle way, one was a mismatch between a form's default value and what
  the API schema considered 'optional.' All documented in
  `docs/learning-notes.md` with the debugging process, not just the fix."

## 8. Docker + CI, briefly (1 minute)

```bash
docker compose up --build
```

(Or just show `.github/workflows/ci.yml` if time is short.)

- **Talking point:** "Multi-stage Dockerfiles — a build stage with the full
  toolchain, a runtime stage with only what's needed to run. CI runs lint,
  typecheck, build, and both test suites in parallel jobs on every PR, with
  E2E running for visibility but not as a hard merge gate, since it's the
  slowest, most environment-sensitive layer."

## Likely follow-up questions to be ready for

- "Why MongoDB over a relational database here?" → workflow/state data
  fits a document model well; no complex joins needed at this scale; see
  `docs/interview-cheatsheet.md`'s MongoDB section for the fuller answer.
- "What would you change for a real production deployment?" → point
  straight at the README's **Known limitations** / **Future improvements**
  sections — refresh tokens, file attachments, reviewer assignment,
  notifications.
- "Walk me through what happens when someone submits a trade request." →
  narrate client validation → API call → server Zod validation → service
  layer → Mongoose write → response → TanStack Query cache update.
- "How did you test this?" → test pyramid explanation (see
  `docs/topic-tips-and-interview-questions.md`'s Testing section) — most
  coverage in fast unit/integration tests, a thin E2E layer for the
  handful of truly critical paths.

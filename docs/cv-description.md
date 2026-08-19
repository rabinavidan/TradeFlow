# CV / Resume Descriptions

A few ready-to-use versions of this project for a resume, LinkedIn, or a
portfolio site, at different lengths. Adjust the tech list to match
whichever stack the role you're applying to actually cares about.

## One-liner (resume project title line)

> **TradeFlow Lite** — Full-stack trade-finance workflow app (React,
> TypeScript, Node.js, Express, MongoDB) with JWT auth, role-based
> permissions, and a CI/CD pipeline.

## Resume bullet points

> **TradeFlow Lite** — Full-stack workflow management application
> - Built a full-stack TypeScript application (React/Vite frontend,
>   Node.js/Express/MongoDB backend) modeling a trade-finance request
>   workflow with role-based access control (user/reviewer/admin) and an
>   auditable status-history trail.
> - Designed a JWT-based authentication system with bcrypt password
>   hashing, Zod-validated request boundaries on both client and server,
>   and a centralized error-handling contract across the API.
> - Wrote a 70+ test suite (Vitest unit/integration, React Testing
>   Library, Playwright E2E) and a GitHub Actions CI pipeline running lint,
>   type-checking, tests, and builds as parallel jobs on every pull request.
> - Containerized the application with multi-stage Docker builds and Docker
>   Compose, and integrated an optional local-LLM feature (Ollama) for
>   AI-assisted content generation with no paid API dependency.

## Short paragraph (portfolio site / LinkedIn "About" section)

> TradeFlow Lite is a full-stack workflow management application inspired
> by trade-finance processes, built to demonstrate production-style
> engineering practices end to end. Users create trade requests and move
> them through a review workflow (Draft → Submitted → In Review →
> Approved/Rejected) under role-based permissions, with every status
> change recorded in an append-only audit trail. The stack is React,
> TypeScript, Vite, React Router, React Hook Form, and TanStack Query on
> the frontend; Node.js, Express, MongoDB/Mongoose, Zod, and JWT on the
> backend. The project includes a 70+ test suite spanning unit,
> integration, and end-to-end coverage (Vitest, React Testing Library,
> Playwright), a Dockerized deployment with multi-stage builds, a GitHub
> Actions CI pipeline, interactive OpenAPI/Swagger documentation, and an
> optional AI-assisted description generator backed by a locally-run
> Ollama model — deliberately built without any paid third-party API.

## Talking points if asked "walk me through a project" in an interview

- Lead with the *workflow/state machine* design (a single `TRANSITIONS`
  table drives both server enforcement and the client's UX mirror) — it's
  the most interesting architectural decision in the project.
- Have one real bug story ready (see
  [interview-demo-script.md](interview-demo-script.md)'s step 7) —
  interviewers respond well to a specific, honestly-described debugging
  process over a vague "everything went smoothly."
- Know the one thing you'd change for production (see the README's
  **Future improvements**) — shows awareness of the gap between a
  portfolio project and a production system, without over-claiming scope.

# Architecture

## High-level system

```mermaid
flowchart LR
    subgraph Browser
        UI[React SPA]
    end

    subgraph Server["Node.js / Express API"]
        MW[Middleware<br/>helmet, cors, auth, logging]
        RT[Routes]
        CT[Controllers]
        SV[Services]
    end

    DB[(MongoDB)]
    AI[(Ollama<br/>local LLM, optional)]

    UI -- "HTTPS / JSON (Axios)" --> MW
    MW --> RT --> CT --> SV --> DB
    SV -.optional.-> AI
```

## Request lifecycle

Every API request flows through the same layers, in the same order:

```mermaid
sequenceDiagram
    participant B as Browser
    participant M as Middleware
    participant R as Route
    participant C as Controller
    participant S as Service
    participant D as MongoDB

    B->>M: HTTP request
    M->>M: helmet, cors, JSON parsing, request logger
    M->>R: authenticated request
    R->>C: matched route handler
    C->>C: validate input (Zod)
    C->>S: call business logic
    S->>D: query / mutate via Mongoose
    D-->>S: documents
    S-->>C: domain result
    C-->>B: JSON response + status code
```

**Why this layering?** Each layer has one job:

- **Routes** just map an HTTP verb + path to a controller — no logic.
- **Controllers** parse/validate the request and shape the response — no DB calls.
- **Services** hold business rules (e.g. "only a reviewer can approve") and talk to MongoDB.
- **Models** (Mongoose schemas) define the shape of data and DB-level validation.

This keeps each piece independently testable: services can be unit tested without
spinning up Express, and controllers can be tested with a mocked service.

## Frontend data flow

```mermaid
flowchart LR
    Page[Page component] --> Hook[TanStack Query hook]
    Hook --> API[api/ Axios client]
    API --> Server[Express API]
    Hook -- cached server state --> Page
    Form[React Hook Form + Zod] --> Hook
```

- **Server state** (trades, dashboard stats, current user) lives in TanStack Query —
  it owns caching, loading/error states, and refetching.
- **Client/UI state** (form inputs before submit, modal open/closed, filters typed
  but not yet applied) lives in local `useState`/`useReducer`.

## Data model

```mermaid
erDiagram
    USER ||--o{ TRADE_REQUEST : creates
    USER ||--o{ STATUS_HISTORY : changes
    TRADE_REQUEST ||--o{ STATUS_HISTORY : has

    USER {
        ObjectId _id
        string name
        string email
        string passwordHash
        string role
    }
    TRADE_REQUEST {
        ObjectId _id
        string title
        string customerName
        number amount
        string currency
        string country
        string requestType
        string description
        string status
        ObjectId createdBy
    }
    STATUS_HISTORY {
        ObjectId _id
        ObjectId tradeRequestId
        string previousStatus
        string newStatus
        ObjectId changedBy
        string comment
    }
```

## Deployment shape (Docker Compose, Phase 8)

```mermaid
flowchart TB
    subgraph "docker compose"
        C[client container<br/>nginx serving Vite build]
        S[server container<br/>Node/Express]
        M[(mongo container)]
    end
    Browser --> C
    C -- "/api proxy" --> S
    S --> M
```

This document grows as later phases (auth, RBAC, analytics, Docker, CI/CD) add
new pieces to the system.

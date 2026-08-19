# Commands Cheatsheet

Every command used to develop, test, and ship TradeFlow Lite. Grows with each phase.

## npm / workspaces

```bash
npm install                         # install client + server workspaces
npm run dev:client                  # Vite dev server (http://localhost:5173)
npm run dev:server                  # Express API with hot reload (http://localhost:4000)
npm run lint                        # ESLint, both workspaces
npm run typecheck                   # tsc --noEmit, both workspaces
npm run build                       # build server then client
npm run test                        # Vitest, both workspaces
npm run format                      # Prettier --write .

npm run <script> --workspace client # run a script in just one workspace
npm run <script> --workspace server
```

## Git

```bash
git status
git switch -c feat/some-feature     # create + switch to a branch
git add <files>
git commit -m "feat: short description"
git push -u origin <branch>
git log --oneline -10
git diff                            # unstaged changes
git diff --staged                   # staged changes
```

## MongoDB

```bash
# local mongod (if installed)
mongod --dbpath ./data

# mongosh
mongosh "mongodb://localhost:27017/tradeflow-lite"
> show collections
> db.traderequests.find().limit(5)
```

## Testing

```bash
npm run test --workspace server           # Vitest: unit + API integration
npm run test --workspace client           # Vitest + React Testing Library
npm run test                              # both, in sequence

npm run test:e2e                          # full Playwright E2E suite (starts real servers)
npx playwright test --config e2e/playwright.config.ts e2e/tests/auth.spec.ts   # one file
npx playwright show-report e2e/playwright-report                               # open last HTML report
npx playwright show-trace e2e/test-results/<test-dir>/trace.zip                # inspect one failure's trace
```

## Docker

```bash
docker compose up --build         # build (if needed) and start client + server + mongo
docker compose up -d --build      # same, detached
docker compose ps                 # see running services + health status
docker compose logs -f server     # follow one service's logs
docker compose down               # stop and remove containers
docker compose down -v            # also remove the mongo data volume
docker compose build server       # rebuild just one service's image
docker exec -it tradeflow-server-1 sh   # shell into a running container
```

## CI (Phase 9)

CI runs the same commands above (`lint`, `typecheck`, `test`, `build`) on
every PR and push to `main` — see `.github/workflows/ci.yml`.

## Health check

```bash
curl http://localhost:4000/api/health
```

## Auth (Phase 1)

```bash
# register
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com","password":"supersecret123"}'

# login
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ada@example.com","password":"supersecret123"}'

# current user (needs a token from the responses above)
curl http://localhost:4000/api/auth/me -H "Authorization: Bearer <token>"
```

## Trades (Phase 2)

```bash
# create
curl -X POST http://localhost:4000/api/trades \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Import financing","customerName":"Acme","amount":25000,"currency":"usd","country":"Germany","requestType":"Letter of Credit"}'

# list (paginated, filtered, searched)
curl "http://localhost:4000/api/trades?page=1&limit=10&status=Draft&search=Acme" \
  -H "Authorization: Bearer <token>"

# get one / edit / delete
curl http://localhost:4000/api/trades/<id> -H "Authorization: Bearer <token>"
curl -X PUT http://localhost:4000/api/trades/<id> -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" -d '{"title":"Updated title"}'
curl -X DELETE http://localhost:4000/api/trades/<id> -H "Authorization: Bearer <token>"
```

## Optional AI (Phase 10)

```bash
# one-time local setup — the app works fully without this
ollama pull llama3.2
ollama serve

curl -X POST http://localhost:4000/api/ai/generate-description \
  -H "Authorization: Bearer <token>" -H "Content-Type: application/json" \
  -d '{"title":"Import shipment financing","country":"Germany","requestType":"Letter of Credit"}'
```

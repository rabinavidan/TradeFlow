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

## Testing (added in later phases)

```bash
npm run test --workspace server           # Vitest: unit + API integration
npm run test --workspace client           # Vitest + React Testing Library
npm run test:e2e                          # Playwright E2E suite
npx playwright show-report                # open last E2E HTML report
```

## Docker (Phase 8)

```bash
docker compose up --build
docker compose down
docker compose logs -f server
```

## CI (Phase 9)

CI runs the same commands above (`lint`, `typecheck`, `test`, `build`) on
every PR and push to `main` — see `.github/workflows/ci.yml`.

## Health check

```bash
curl http://localhost:4000/api/health
```

# Build context is the repo root (see docker-compose.yml) because this is
# an npm workspace: compiling needs the shared root package-lock.json.
# Build stage: install every workspace's deps (locked) and compile TS -> JS.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci
COPY server ./server
RUN npm run build --workspace server

# Runtime stage: a completely standalone install from server/package.json
# alone (no workspace, no client deps) keeps the final image to just what
# the compiled server actually needs.
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /app/server/dist ./dist

EXPOSE 4000
USER node
CMD ["node", "dist/index.js"]

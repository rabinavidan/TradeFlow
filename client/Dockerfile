# Build context is the repo root (see docker-compose.yml) — same reason
# as server/Dockerfile: this is an npm workspace with a shared lockfile.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/
RUN npm ci
COPY client ./client

# Vite inlines VITE_* env vars into the built JS at build time (not
# runtime) — so the API URL the client will call has to be known now.
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace client

# Runtime stage: nginx serving the static build — no Node.js needed at all
# once the app is compiled to plain HTML/CSS/JS.
FROM nginx:alpine AS runtime
COPY --from=build /app/client/dist /usr/share/nginx/html
COPY client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

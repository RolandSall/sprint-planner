# ── Stage 1: Build API + Web ─────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY . .

RUN node node_modules/nx/bin/nx.js build api --configuration=production
RUN node node_modules/nx/bin/nx.js build web --configuration=production

# Pre-generate migrations (no DB required — schema files are in /app)
RUN cd apps/api && node ../../node_modules/.bin/drizzle-kit generate --config ./drizzle.config.ts 2>&1 || true

# ── Stage 2: All-in-one runtime (PostgreSQL + Node API + Nginx) ──────────────
FROM postgres:16

# Install Node.js 20 + nginx
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl gnupg ca-certificates nginx \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# ── API artifacts ────────────────────────────────────────────────────────────
WORKDIR /app
COPY --from=builder /app/apps/api/dist                                      ./dist
COPY --from=builder /app/node_modules                                       ./node_modules
COPY --from=builder /app/apps/api/drizzle.config.ts                         ./drizzle.config.ts
COPY --from=builder /app/apps/api/src/infra/database/drizzle/migrations     ./src/infra/database/drizzle/migrations

# ── Web artifacts ────────────────────────────────────────────────────────────
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# ── Nginx config (proxy /api → localhost:3000) ───────────────────────────────
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN sed -i 's|proxy_pass http://api:3000|proxy_pass http://127.0.0.1:3000|' /etc/nginx/conf.d/default.conf \
    && rm -f /etc/nginx/sites-enabled/default

# ── Entrypoint ───────────────────────────────────────────────────────────────
COPY docker-entrypoint-aio.sh /docker-entrypoint-aio.sh
RUN chmod +x /docker-entrypoint-aio.sh

# Postgres env defaults
ENV POSTGRES_DB=pi_planning \
    POSTGRES_USER=planning \
    POSTGRES_PASSWORD=planning \
    DATABASE_URL=postgres://planning:planning@127.0.0.1:5432/pi_planning \
    NODE_ENV=production \
    PORT=3000

EXPOSE 4200

ENTRYPOINT ["/docker-entrypoint-aio.sh"]

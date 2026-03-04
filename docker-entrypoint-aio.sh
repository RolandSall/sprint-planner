#!/usr/bin/env bash
set -e

# ── 1. Start PostgreSQL ─────────────────────────────────────────────────────
# Use the official postgres entrypoint which handles initdb + user/db creation.
# It execs into `postgres`, so we background it.
echo "[aio] Starting PostgreSQL..."
docker-entrypoint.sh postgres &
PG_PID=$!

# Wait for postgres to be fully initialized (user + database created, real server running).
# The postgres entrypoint does: initdb → temp server → create user/db → stop → start real server.
# pg_isready returns true during the temp server, so instead we verify the actual database is connectable.
for i in $(seq 1 60); do
  if psql "postgresql://${POSTGRES_USER:-planning}:${POSTGRES_PASSWORD:-planning}@127.0.0.1:5432/${POSTGRES_DB:-pi_planning}" -c 'SELECT 1' > /dev/null 2>&1; then
    echo "[aio] PostgreSQL is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "[aio] ERROR: PostgreSQL did not become ready in time." >&2
    exit 1
  fi
  sleep 1
done

# ── 2. Run database migrations ──────────────────────────────────────────────
echo "[aio] Running database migrations..."
cd /app
node_modules/.bin/drizzle-kit migrate --config ./drizzle.config.ts
echo "[aio] Migrations complete."

# ── 3. Start NestJS API ─────────────────────────────────────────────────────
echo "[aio] Starting API server..."
node dist/main.js &
API_PID=$!

# Wait for API to be ready
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:${PORT:-3000}/api/teams > /dev/null 2>&1; then
    echo "[aio] API is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "[aio] WARNING: API health check timed out, continuing anyway..."
  fi
  sleep 1
done

# ── 4. Start Nginx ───────────────────────────────────────────────────────────
echo "[aio] Starting Nginx..."
nginx -g 'daemon off;' &
NGINX_PID=$!

echo "[aio] All services running. Listening on port 4200."

# ── 5. Wait — if any process exits, shut down everything ─────────────────────
cleanup() {
  echo "[aio] Shutting down..."
  kill $NGINX_PID $API_PID $PG_PID 2>/dev/null || true
  wait $NGINX_PID $API_PID $PG_PID 2>/dev/null || true
  exit 0
}
trap cleanup SIGTERM SIGINT

wait -n $PG_PID $API_PID $NGINX_PID 2>/dev/null
echo "[aio] A process exited unexpectedly, shutting down..."
cleanup

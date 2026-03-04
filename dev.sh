#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# dev.sh — Run PI Planning locally (DB in Docker, API + Web native)
# Usage:
#   ./dev.sh                       # default: platform-team-pi-2026-q1.csv
#   ./dev.sh --scenario=easy       # 8 stories, 4 sprints, simple deps
#   ./dev.sh --scenario=medium     # 20 stories, 5 sprints, cross-feature deps
#   ./dev.sh --scenario=complex    # 45 stories, 6 sprints, deep chains + ext deps
#   ./dev.sh --with-mediatorflow   # enable MediatorFlow dashboard on :4800
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

# ── Colours ──────────────────────────────────────────────────────────────────
G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; N='\033[0m'
log()  { echo -e "${B}[dev]${N} $*"; }
ok()   { echo -e "${G}[dev]${N} $*"; }
warn() { echo -e "${Y}[dev]${N} $*"; }
die()  { echo -e "${R}[dev] ERROR:${N} $*" >&2; exit 1; }

# ── Prereq checks ────────────────────────────────────────────────────────────
command -v docker  &>/dev/null || die "docker not found. Install Docker Desktop."
command -v node    &>/dev/null || die "node not found."
[ -f "node_modules/.bin/drizzle-kit" ] || die "Run 'npm install' first."

# ── Flags ──────────────────────────────────────────────────────────────────────
WITH_MEDIATORFLOW=false
SCENARIO=""
for arg in "$@"; do
  case $arg in
    --with-mediatorflow) WITH_MEDIATORFLOW=true ;;
    --scenario=*) SCENARIO="${arg#*=}" ;;
  esac
done

# Resolve CSV file: --scenario overrides, otherwise use original
if [ -n "$SCENARIO" ]; then
  CSV_FILE="sample-data/${SCENARIO}.csv"
  [ -f "$CSV_FILE" ] || die "Unknown scenario '${SCENARIO}'. Available: easy, medium, complex"
  log "Scenario: ${SCENARIO} (${CSV_FILE})"
else
  SCENARIO="default"
  CSV_FILE="sample-data/platform-team-pi-2026-q1.csv"
  log "Using default sample data (${CSV_FILE})"
fi

# ── .env setup ───────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env created from .env.example — edit if you need custom passwords."
fi
set -a; source .env; set +a

DB_USER="${DB_USER:-planning}"
DB_PASSWORD="${DB_PASSWORD:-planning}"
export DATABASE_URL="postgres://${DB_USER}:${DB_PASSWORD}@localhost:5432/pi_planning"

# ── Start DB ─────────────────────────────────────────────────────────────────
log "Starting PostgreSQL (Docker)..."
docker compose up db -d

log "Waiting for PostgreSQL to be ready..."
ATTEMPTS=0
until docker compose exec -T db pg_isready -U "$DB_USER" -q 2>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  [ $ATTEMPTS -gt 30 ] && die "PostgreSQL did not become healthy after 30s."
  sleep 1
done
ok "PostgreSQL ready at localhost:5432"

# ── MediatorFlow (optional) ─────────────────────────────────────────────────
if $WITH_MEDIATORFLOW; then
  log "Starting MediatorFlow dashboard (Docker)..."
  docker rm -f mediatorflow-dev 2>/dev/null || true
  docker run -d --name mediatorflow-dev -p 4800:4800 rolandsall24/mediatorflow:latest >/dev/null
  export MEDIATOR_FLOW_ENABLED=true
  export MEDIATOR_FLOW_URL=http://localhost:4800
  ok "MediatorFlow running at http://localhost:4800"
fi

# ── Migrations ───────────────────────────────────────────────────────────────
log "Generating migrations from schema..."
(cd apps/api && DATABASE_URL="$DATABASE_URL" \
  node ../../node_modules/.bin/drizzle-kit generate \
  --config ./drizzle.config.ts 2>&1) | grep -vE "^$|No schema changes" || true

log "Applying migrations..."
(cd apps/api && DATABASE_URL="$DATABASE_URL" \
  node ../../node_modules/.bin/drizzle-kit migrate \
  --config ./drizzle.config.ts 2>&1) | grep -v "^$" || true
ok "Database schema up to date"

# ── Seed demo data (idempotent) ───────────────────────────────────────────────
log "Seeding demo data for scenario '${SCENARIO}' (skips if already present)..."
SEED_OUTPUT=$(DATABASE_URL="$DATABASE_URL" node scripts/seed.js --scenario="$SCENARIO" 2>&1) || warn "Seed script failed (non-fatal)"
echo "$SEED_OUTPUT"
PI_ID=$(echo "$SEED_OUTPUT" | grep '^PI_ID=' | tail -1 | cut -d= -f2)
[ -n "$PI_ID" ] && ok "Seed PI ID: $PI_ID" || warn "Could not extract PI ID from seed output"

# ── Trap for cleanup ─────────────────────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  log "Shutting down..."
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  if $WITH_MEDIATORFLOW; then
    log "Stopping MediatorFlow container..."
    docker rm -f mediatorflow-dev 2>/dev/null || true
  fi
  log "Stopping PostgreSQL container..."
  docker compose stop db 2>/dev/null || true
  ok "Done. Goodbye."
  exit 0
}
trap cleanup INT TERM EXIT

# ── Start API ────────────────────────────────────────────────────────────────
log "Starting API (NestJS) on http://localhost:3000 ..."
DATABASE_URL="$DATABASE_URL" \
  node node_modules/nx/bin/nx.js serve api --configuration=development \
  2>&1 | sed 's/^/  [api] /' &
PIDS+=($!)

# ── Start Web ────────────────────────────────────────────────────────────────
log "Starting Web (Vite) on http://localhost:4200 ..."
node node_modules/nx/bin/nx.js serve web \
  2>&1 | sed 's/^/  [web] /' &
PIDS+=($!)

# ── Wait for API to be ready, then import CSV ────────────────────────────────
log "Waiting for API to be ready..."
API_READY=false
for i in $(seq 1 30); do
  if curl -sf http://localhost:3000/api/teams >/dev/null 2>&1; then
    API_READY=true
    break
  fi
  sleep 1
done

if $API_READY; then
  ok "API is ready"
  if [ -n "${PI_ID:-}" ] && [ -f "$CSV_FILE" ]; then
    log "Importing ${SCENARIO} scenario data into PI $PI_ID..."
    IMPORT_RESULT=$(curl -sf -X POST \
      "http://localhost:3000/api/import/csv?piId=$PI_ID" \
      -F "file=@${CSV_FILE}" 2>&1) && \
      ok "CSV import result: $IMPORT_RESULT" || \
      warn "CSV import failed (non-fatal): $IMPORT_RESULT"
  else
    warn "Skipping CSV import (no PI_ID or CSV file missing)"
  fi
else
  warn "API did not become ready in 30s — skipping CSV import"
fi

# ── Ready banner ─────────────────────────────────────────────────────────────
echo ""
ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok " PI Planning is starting up"
ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${G}Web app:${N}  http://localhost:4200"
echo -e "  ${G}API:${N}      http://localhost:3000/api"
echo -e "  ${G}Swagger:${N}  http://localhost:3000/api/docs"
if $WITH_MEDIATORFLOW; then
  echo -e "  ${G}MediatorFlow:${N} http://localhost:4800"
fi
echo ""
echo -e "  ${Y}Press Ctrl+C to stop all services.${N}"
echo ""

wait

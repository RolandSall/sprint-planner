#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# docker-run.sh — Build and run PI Planning in Docker (full production stack)
# Usage:
#   ./docker-run.sh          # build + run (incremental Docker layer cache)
#   ./docker-run.sh --fresh  # force full rebuild, no cache
#   ./docker-run.sh --down   # tear down containers + volumes
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'; R='\033[0;31m'; N='\033[0m'
log()  { echo -e "${B}[docker]${N} $*"; }
ok()   { echo -e "${G}[docker]${N} $*"; }
warn() { echo -e "${Y}[docker]${N} $*"; }
die()  { echo -e "${R}[docker] ERROR:${N} $*" >&2; exit 1; }

command -v docker &>/dev/null || die "docker not found. Install Docker Desktop."

# ── Flags ────────────────────────────────────────────────────────────────────
FRESH=false
DOWN=false
for arg in "$@"; do
  case $arg in
    --fresh) FRESH=true ;;
    --down)  DOWN=true  ;;
  esac
done

# ── Tear down ────────────────────────────────────────────────────────────────
if $DOWN; then
  warn "Tearing down containers and volumes..."
  docker compose down -v --remove-orphans
  ok "Done."
  exit 0
fi

# ── .env setup ───────────────────────────────────────────────────────────────
if [ ! -f .env ]; then
  cp .env.example .env
  warn ".env created from .env.example"
fi

# ── Build ────────────────────────────────────────────────────────────────────
echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log " Building PI Planning Docker images"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if $FRESH; then
  warn "Running full rebuild (--no-cache)..."
  docker compose build --no-cache
else
  log "Building with Docker layer cache..."
  docker compose build
fi
ok "Images built successfully."

# ── Run ──────────────────────────────────────────────────────────────────────
echo ""
log "Starting services (db → api → web)..."
echo ""

# Start only the compose.yml (not the override which is for dev hot-reload)
docker compose -f docker-compose.yml up --remove-orphans &
COMPOSE_PID=$!

# ── Wait for API to be healthy ───────────────────────────────────────────────
log "Waiting for API to be ready..."
ATTEMPTS=0
until curl -sf http://localhost:3000/api/teams &>/dev/null; do
  ATTEMPTS=$((ATTEMPTS + 1))
  if [ $ATTEMPTS -gt 60 ]; then
    warn "API is taking longer than expected — check logs with: docker compose logs api"
    break
  fi
  sleep 2
done

echo ""
ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
ok " PI Planning is running"
ok "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "  ${G}Web app:${N}  http://localhost:80"
echo -e "  ${G}API:${N}      http://localhost:3000/api"
echo -e "  ${G}Swagger:${N}  http://localhost:3000/api/docs"
echo ""
echo -e "  ${Y}Useful commands:${N}"
echo -e "    docker compose logs -f api     # API logs"
echo -e "    docker compose logs -f db      # DB logs"
echo -e "    ./docker-run.sh --down         # Stop & remove volumes"
echo ""
echo -e "  ${Y}Press Ctrl+C to stop.${N}"
echo ""

trap 'docker compose -f docker-compose.yml down; exit 0' INT TERM
wait $COMPOSE_PID

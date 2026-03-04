#!/usr/bin/env bash
set -euo pipefail

IMAGE="rolandsall24/pi-planning"
TAG="${1:-latest}"
BUILDER="multiplatform"

echo "==> Building and pushing $IMAGE:$TAG (linux/amd64 + linux/arm64)"

# Ensure multi-platform builder exists
if ! docker buildx inspect "$BUILDER" &>/dev/null; then
  echo "==> Creating buildx builder: $BUILDER"
  docker buildx create --name "$BUILDER" --driver docker-container
fi
docker buildx use "$BUILDER"

# Build + push
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t "$IMAGE:$TAG" \
  --push .

echo "==> Done! Pushed $IMAGE:$TAG"
echo ""
echo "Run it with:"
echo "  docker run -d -p 4200:4200 -v pi_data:/var/lib/postgresql/data $IMAGE:$TAG"

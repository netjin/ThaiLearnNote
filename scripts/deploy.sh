#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required." >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required." >&2
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "docker compose is required." >&2
  exit 1
fi

if [ ! -d .git ]; then
  echo "This directory is not a Git repository: $ROOT_DIR" >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo "Missing .env. Copy .env.example to .env and set OPENAI_API_KEY." >&2
  exit 1
fi

if [ "${SKIP_GIT_PULL:-0}" != "1" ]; then
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  echo "Pulling latest code on branch: $current_branch"
  git fetch origin "$current_branch"
  git pull --ff-only origin "$current_branch"
else
  echo "Skipping git pull because SKIP_GIT_PULL=1"
fi

echo "Validating Docker Compose configuration"
docker compose config >/dev/null

echo "Building and restarting containers"
docker compose up -d --build --remove-orphans

echo "Pruning dangling Docker images"
docker image prune -f >/dev/null

echo "Deployment complete."
docker compose ps

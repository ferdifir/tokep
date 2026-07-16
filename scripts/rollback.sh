#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-root@109.111.53.58}"
SSH_PORT="${DEPLOY_PORT:-38954}"
APP_NAME="${APP_NAME:-tokep}"
APP_PORT="${APP_PORT:-3002}"
BASE_DIR="${BASE_DIR:-/var/www/tokep}"
APP_DIR="$BASE_DIR/current"
REPO_URL="${REPO_URL:-https://github.com/ferdifir/tokep.git}"
TARGET_REF="${1:-}"
SSH=(ssh -p "$SSH_PORT" "$HOST")

if [ -z "$TARGET_REF" ]; then
  cat >&2 <<MSG
Usage: scripts/rollback.sh <commit-or-tag-on-main>

Rollback sekarang berbasis commit di branch main.
Contoh:
  scripts/rollback.sh v0.1.3
  scripts/rollback.sh 17b6f16
MSG
  exit 2
fi

echo "Rolling back $APP_NAME to $TARGET_REF on $HOST"

"${SSH[@]}" "bash -se" <<REMOTE
set -euo pipefail

APP_NAME="$APP_NAME"
APP_PORT="$APP_PORT"
APP_DIR="$APP_DIR"
BASE_DIR="$BASE_DIR"
REPO_URL="$REPO_URL"
TARGET_REF="$TARGET_REF"

if [ ! -d "\$APP_DIR/.git" ]; then
  echo "\$APP_DIR is not a git checkout. Run scripts/deploy.sh first." >&2
  exit 1
fi

cd "\$APP_DIR"
git remote set-url origin "\$REPO_URL"
git fetch --prune origin --tags

target_commit="\$(git rev-parse --verify "\$TARGET_REF^{commit}")"

if ! git merge-base --is-ancestor "\$target_commit" origin/main; then
  echo "Ref \$TARGET_REF resolves to \$target_commit, but it is not on origin/main." >&2
  echo "Rollback is intentionally limited to commits reachable from main." >&2
  exit 1
fi

current_commit="\$(git rev-parse HEAD)"
git checkout --force "\$target_commit"

test -f "\$BASE_DIR/shared/.env.production"
ln -sfn "\$BASE_DIR/shared/.env.production" .env
ln -sfn "\$BASE_DIR/shared/konten" konten

npm ci
npm run db:generate
npm run media:sync
npm run build

if pm2 describe "\$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "\$APP_NAME"
fi
PORT="\$APP_PORT" pm2 start npm --name "\$APP_NAME" --cwd "\$APP_DIR" -- start -- -p "\$APP_PORT"
pm2 save

for attempt in \$(seq 1 20); do
  if curl -fsS --max-time 5 "http://127.0.0.1:\$APP_PORT/api/health" >/tmp/"\$APP_NAME"-health.json; then
    cat /tmp/"\$APP_NAME"-health.json
    printf '%s\n' "\$target_commit" > "\$BASE_DIR/shared/last-successful-commit"
    printf '%s\n' "\$current_commit" > "\$BASE_DIR/shared/previous-commit"
    echo
    echo "Rolled back to \$target_commit"
    exit 0
  fi
  sleep 2
done

echo "Health check failed after rollback to \$target_commit." >&2
exit 1
REMOTE

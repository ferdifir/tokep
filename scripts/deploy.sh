#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-root@109.111.53.58}"
SSH_PORT="${DEPLOY_PORT:-38954}"
APP_NAME="${APP_NAME:-tokep}"
APP_PORT="${APP_PORT:-3002}"
DOMAIN="${DOMAIN:-mandirijayas.my.id}"
BASE_DIR="${BASE_DIR:-/var/www/tokep}"
APP_DIR="$BASE_DIR/current"
REPO_URL="${REPO_URL:-https://github.com/ferdifir/tokep.git}"
DEPLOY_REF="${DEPLOY_REF:-origin/main}"
SSH=(ssh -p "$SSH_PORT" "$HOST")

echo "Deploying $DEPLOY_REF from $REPO_URL to $HOST"

"${SSH[@]}" "bash -se" <<REMOTE
set -euo pipefail

APP_NAME="$APP_NAME"
APP_PORT="$APP_PORT"
APP_DIR="$APP_DIR"
BASE_DIR="$BASE_DIR"
REPO_URL="$REPO_URL"
DEPLOY_REF="$DEPLOY_REF"

mkdir -p "\$BASE_DIR/shared/konten/video" "\$BASE_DIR/shared/konten/foto"

if [ ! -d "\$APP_DIR/.git" ]; then
  rm -rf "\$APP_DIR"
  git clone "\$REPO_URL" "\$APP_DIR"
fi

cd "\$APP_DIR"
git remote set-url origin "\$REPO_URL"
git fetch --prune origin

previous_commit=""
if git rev-parse --verify HEAD >/dev/null 2>&1; then
  previous_commit="\$(git rev-parse HEAD)"
fi

git checkout --force "\$DEPLOY_REF"
deploy_commit="\$(git rev-parse HEAD)"

test -f "\$BASE_DIR/shared/.env.production"
ln -sfn "\$BASE_DIR/shared/.env.production" .env
ln -sfn "\$BASE_DIR/shared/konten" konten

npm ci
npm run db:generate
npx prisma migrate deploy
npm run media:index
npm run build

if pm2 describe "\$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "\$APP_NAME"
fi
PORT="\$APP_PORT" pm2 start npm --name "\$APP_NAME" --cwd "\$APP_DIR" -- start -- -p "\$APP_PORT"
pm2 save

for attempt in \$(seq 1 20); do
  if curl -fsS --max-time 5 "http://127.0.0.1:\$APP_PORT/api/health" >/tmp/"\$APP_NAME"-health.json; then
    cat /tmp/"\$APP_NAME"-health.json
    printf '%s\n' "\$deploy_commit" > "\$BASE_DIR/shared/last-successful-commit"
    printf '%s\n' "\$previous_commit" > "\$BASE_DIR/shared/previous-commit"
    echo
    echo "Deployed commit \$deploy_commit"
    exit 0
  fi
  sleep 2
done

echo "Health check failed for \$deploy_commit." >&2
if [ -n "\$previous_commit" ]; then
  echo "Previous commit was \$previous_commit. Run scripts/rollback.sh \$previous_commit after checking logs." >&2
fi
exit 1
REMOTE

echo
echo "Deployed $DOMAIN"

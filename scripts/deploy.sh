#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-root@109.111.53.58}"
SSH_PORT="${DEPLOY_PORT:-38954}"
APP_NAME="${APP_NAME:-tokep}"
APP_PORT="${APP_PORT:-3002}"
DOMAIN="${DOMAIN:-mandirijayas.my.id}"
BASE_DIR="${BASE_DIR:-/var/www/tokep}"
APP_DIR="$BASE_DIR/current"
SSH=(ssh -p "$SSH_PORT" "$HOST")
RSYNC_RSH="ssh -p $SSH_PORT"

echo "Preparing single-build app directory on $HOST"
"${SSH[@]}" "bash -se" <<REMOTE
set -euo pipefail
mkdir -p "$BASE_DIR/shared/konten"

if [ -L "$APP_DIR" ]; then
  current_target="\$(readlink -f "$APP_DIR")"
  rm "$APP_DIR"
  mv "\$current_target" "$APP_DIR"
fi

mkdir -p "$APP_DIR"
REMOTE

if [ "${SYNC_MEDIA:-0}" = "1" ]; then
  echo "Syncing shared media from local konten/ because SYNC_MEDIA=1"
  rsync -az --delete \
    -e "$RSYNC_RSH" \
    ./konten/ "$HOST:$BASE_DIR/shared/konten/"
else
  echo "Skipping media upload. Server media is managed in $BASE_DIR/shared/konten"
fi

echo "Uploading source"
rsync -az --delete \
  -e "$RSYNC_RSH" \
  --exclude ".git" \
  --exclude ".next" \
  --exclude "node_modules" \
  --exclude ".env" \
  --exclude ".env.local" \
  --exclude ".env.production" \
  --exclude "konten" \
  ./ "$HOST:$APP_DIR/"

echo "Installing, migrating, syncing media, and building"
"${SSH[@]}" "bash -se" <<REMOTE
set -euo pipefail
cd "$APP_DIR"
test -f "$BASE_DIR/shared/.env.production"
ln -sfn "$BASE_DIR/shared/.env.production" .env
ln -sfn "$BASE_DIR/shared/konten" konten
npm ci
npm run db:generate
npx prisma migrate deploy
npm run media:sync
npm run build
REMOTE

echo "Reloading PM2"
"${SSH[@]}" "bash -se" <<REMOTE
set -euo pipefail
cd "$APP_DIR"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 delete "$APP_NAME"
fi
PORT="$APP_PORT" pm2 start npm --name "$APP_NAME" --cwd "$APP_DIR" -- start -- -p "$APP_PORT"
pm2 save
REMOTE

echo "Running health check"
"${SSH[@]}" "bash -se" <<REMOTE
set -euo pipefail
for attempt in \$(seq 1 20); do
  if curl -fsS --max-time 5 "http://127.0.0.1:$APP_PORT/api/health" >/tmp/"$APP_NAME"-health.json; then
    cat /tmp/"$APP_NAME"-health.json
    exit 0
  fi
  sleep 2
done
echo "Health check failed. Fix the current build and rerun deploy." >&2
exit 1
REMOTE

echo
echo "Deployed $DOMAIN"

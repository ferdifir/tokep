#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: CONFIRM_RESTORE=1 scripts/db-restore.sh /var/www/tokep/backups/db/tokep-YYYYMMDDTHHMMSSZ.dump" >&2
  exit 1
fi

if [ "${CONFIRM_RESTORE:-0}" != "1" ]; then
  echo "Refusing to restore without CONFIRM_RESTORE=1" >&2
  exit 1
fi

HOST="${DEPLOY_HOST:-root@109.111.53.58}"
SSH_PORT="${DEPLOY_PORT:-38954}"
BASE_DIR="${BASE_DIR:-/var/www/tokep}"
BACKUP_FILE="$1"
SSH=(ssh -p "$SSH_PORT" "$HOST")

echo "Restoring database on $HOST from $BACKUP_FILE"

"${SSH[@]}" "bash -se" <<REMOTE
set -euo pipefail

BASE_DIR="$BASE_DIR"
BACKUP_FILE="$BACKUP_FILE"
ENV_FILE="\$BASE_DIR/shared/.env.production"

test -f "\$ENV_FILE"
test -f "\$BACKUP_FILE"

if [ -f "\$BACKUP_FILE.sha256" ]; then
  sha256sum --check "\$BACKUP_FILE.sha256"
fi

set -a
# shellcheck disable=SC1090
. "\$ENV_FILE"
set +a

test -n "\${DATABASE_URL:-}"
pg_restore --clean --if-exists --no-owner --dbname "\$DATABASE_URL" "\$BACKUP_FILE"
REMOTE

echo "Restore completed"

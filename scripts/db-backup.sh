#!/usr/bin/env bash
set -euo pipefail

HOST="${DEPLOY_HOST:-root@109.111.53.58}"
SSH_PORT="${DEPLOY_PORT:-38954}"
BASE_DIR="${BASE_DIR:-/var/www/tokep}"
BACKUP_DIR="${BACKUP_DIR:-$BASE_DIR/backups/db}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
SSH=(ssh -p "$SSH_PORT" "$HOST")

echo "Creating database backup on $HOST"

"${SSH[@]}" "bash -se" <<REMOTE
set -euo pipefail

BASE_DIR="$BASE_DIR"
BACKUP_DIR="$BACKUP_DIR"
RETENTION_DAYS="$RETENTION_DAYS"
ENV_FILE="\$BASE_DIR/shared/.env.production"

test -f "\$ENV_FILE"
set -a
# shellcheck disable=SC1090
. "\$ENV_FILE"
set +a

test -n "\${DATABASE_URL:-}"
mkdir -p "\$BACKUP_DIR"

timestamp="\$(date -u +%Y%m%dT%H%M%SZ)"
backup_file="\$BACKUP_DIR/tokep-\$timestamp.dump"

pg_dump "\$DATABASE_URL" --format=custom --no-owner --file="\$backup_file"
sha256sum "\$backup_file" > "\$backup_file.sha256"

find "\$BACKUP_DIR" -type f -name 'tokep-*.dump' -mtime +"$RETENTION_DAYS" -delete
find "\$BACKUP_DIR" -type f -name 'tokep-*.dump.sha256' -mtime +"$RETENTION_DAYS" -delete

echo "\$backup_file"
REMOTE

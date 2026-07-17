# Deploy and Rollback

Deploy uses a single active checkout on the server:

```text
/var/www/tokep/current
```

The server fetches this repository and builds the selected Git ref in that
directory. Old build folders are not kept.

## Main Branch Rule

`main` is the rollback source of truth. Only semantic-version release commits or
tags should be placed on `main`.

Use feature/work commits outside `main`, then land a versioned release commit or
tag on `main`, for example:

```bash
git tag v0.1.1
git push origin main --tags
```

## Deploy Latest Main

```bash
scripts/deploy.sh
```

By default this deploys `origin/main`.

## Deploy a Specific Ref

```bash
DEPLOY_REF=v0.1.1 scripts/deploy.sh
DEPLOY_REF=17b6f16 scripts/deploy.sh
```

## Rollback

Rollback checks out a commit or tag that is reachable from `origin/main`, then
rebuilds the single active checkout and restarts PM2.

```bash
scripts/rollback.sh v0.1.1
scripts/rollback.sh 17b6f16
```

The script rejects refs that are not part of `origin/main`.

## Environment and Media

The server must already have:

```text
/var/www/tokep/shared/.env.production
/var/www/tokep/shared/konten/video
/var/www/tokep/shared/konten/foto
```

Use `.env.production.example` as the template for
`/var/www/tokep/shared/.env.production`. Production must set at least:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `ADMIN_SESSION_SECRET`
- `ADMIN_TELEGRAM_ID`

Local development can copy `.env.development.example` to `.env`. Development may
use `ALLOW_DEV_TELEGRAM_FALLBACK=1`; production never accepts the dummy Telegram
user.

`konten/` is not committed. Videos are read only from `konten/video`, and
photos are read only from `konten/foto`. Deploy indexes the server-side shared
folder into the database; it does not upload or download media.

## Database Note

Deploy runs `prisma migrate deploy`. Rollback does not reverse database
migrations. If a release includes a migration, keep it backward-compatible with
the previous app version or prepare a manual database recovery plan.

## Database Backup

Create a production database backup on the server:

```bash
scripts/db-backup.sh
```

By default backups are stored in:

```text
/var/www/tokep/backups/db
```

The script writes a PostgreSQL custom dump plus a `.sha256` checksum and deletes
backups older than `BACKUP_RETENTION_DAYS` days, default `14`.

Suggested daily cron on the server:

```cron
15 2 * * * cd /var/www/tokep/current && BACKUP_RETENTION_DAYS=14 scripts/db-backup.sh >> /var/log/tokep-db-backup.log 2>&1
```

Restore is intentionally guarded:

```bash
CONFIRM_RESTORE=1 scripts/db-restore.sh /var/www/tokep/backups/db/tokep-YYYYMMDDTHHMMSSZ.dump
```

Run restore only after stopping traffic or confirming the app can tolerate the
database being replaced. Restore does not move media files in `konten/`.

## Telegram Bot Webhook

After deploy, configure the bot webhook and command list:

```bash
npm run telegram:webhook
```

The script registers `/api/telegram/webhook` for `@tokepaibot` and sets `/start`
plus `/help`. `/start` replies with the Mini App feature summary and buttons
that open the Mini App.

Telegram Mini App direct links use these formats:

```text
https://t.me/tokepaibot?startapp
https://t.me/tokepaibot/<mini-app-short-name>?startapp
https://t.me/tokepaibot/<mini-app-short-name>?startapp=<start-param>
```

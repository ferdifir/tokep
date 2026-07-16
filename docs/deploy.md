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
/var/www/tokep/shared/konten
```

Use `.env.production.example` as the template for
`/var/www/tokep/shared/.env.production`. Production must set at least:

- `DATABASE_URL`
- `TELEGRAM_BOT_TOKEN`
- `ADMIN_SESSION_SECRET`
- `ADMIN_TELEGRAM_ID`

Local development can copy `.env.development.example` to `.env`. Development may
use `ALLOW_DEV_TELEGRAM_FALLBACK=1`; production never accepts the dummy Telegram
user.

`konten/` is not committed. Media sync is handled from the server-side shared
folder.

## Database Note

Deploy runs `prisma migrate deploy`. Rollback does not reverse database
migrations. If a release includes a migration, keep it backward-compatible with
the previous app version or prepare a manual database recovery plan.

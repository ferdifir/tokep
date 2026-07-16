<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Release and Deploy Rules

- `main` is the rollback source of truth. Only put semantic-version release commits or tags on `main`.
- Do not use `main` for arbitrary work-in-progress commits. Prepare changes elsewhere, then land a versioned release commit/tag.
- Rollback uses `scripts/rollback.sh <commit-or-tag-on-main>` and intentionally rejects commits that are not reachable from `origin/main`.
- `konten/` is local/server media and must not be committed.

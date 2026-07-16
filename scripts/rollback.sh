#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'MSG'
Rollback berbasis release sudah dinonaktifkan.

Deploy sekarang memakai satu build aktif di /var/www/tokep/current untuk menghemat disk server.
Untuk memulihkan versi lama, checkout commit yang diinginkan di lokal lalu jalankan scripts/deploy.sh.
MSG

exit 1

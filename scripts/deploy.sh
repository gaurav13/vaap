#!/usr/bin/env bash
# Production deploy for the DigitalOcean droplet.
# Run as the user that owns the app directory and the PM2 daemon.
# These commands do not use sudo. Passwordless sudo is not required when that
# user can already run git, pnpm, and pm2.
set -euo pipefail

cd "${DEPLOY_DIR:-/var/www/vaap}"

step() { printf '::step::%s\n' "$1"; }

step "Reset working tree"
git reset --hard

step "Pull origin/main"
git pull origin main

step "Install dependencies"
pnpm install --no-frozen-lockfile

step "Push database schema"
pnpm run db:push

step "Build application"
pnpm run build

# The admin API sets SKIP_PM2_RESTART=1, streams the log, then restarts PM2
# itself so the HTTP response can finish before this process is recycled.
if [[ "${SKIP_PM2_RESTART:-}" != "1" ]]; then
  step "Restart application"
  pm2 restart "${PM2_APP:-vaap}"
fi

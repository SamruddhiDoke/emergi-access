#!/bin/sh
set -e
# The compose healthcheck guarantees PostgreSQL is accepting connections before this runs.
echo "[entrypoint] applying database migrations"
npx prisma migrate deploy
if [ "$SEED_ON_START" = "true" ]; then
  echo "[entrypoint] seeding demo data (skipped if data already exists)"
  node prisma/seed.js --if-empty
fi
exec node src/server.js

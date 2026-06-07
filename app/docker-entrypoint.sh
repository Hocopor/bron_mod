#!/bin/sh
set -e

# Синхронизируем схему БД (миграций нет — используем db push).
echo "Syncing database schema (prisma db push)..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

# Чиним старые slug номеров с кириллицей (см. scripts/fix-room-slugs.mjs).
echo "Fixing non-ASCII room slugs..."
node scripts/fix-room-slugs.mjs || true

echo "Starting Next.js..."
exec node server.js

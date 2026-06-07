#!/bin/sh
set -e

# Синхронизируем схему БД (миграций нет — используем db push).
echo "Syncing database schema (prisma db push)..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

echo "Starting Next.js..."
exec node server.js

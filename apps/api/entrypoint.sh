#!/bin/sh
# apps/api/entrypoint.sh — roda migration e inicia a API
set -e

echo "▶ Rodando migrations do Prisma..."
npx prisma migrate deploy

echo "▶ Iniciando API NestJS..."
exec node dist/main

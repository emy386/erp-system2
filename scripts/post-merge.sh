#!/bin/bash
set -e

pnpm install --frozen-lockfile

# Only run DB push if DATABASE_URL is set (Kidzy uses Supabase, not Replit PostgreSQL)
if [ -n "$DATABASE_URL" ]; then
  pnpm --filter @workspace/db run push
fi

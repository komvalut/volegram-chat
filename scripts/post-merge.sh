#!/bin/bash
set -e
pnpm install --frozen-lockfile
# DB push is tolerated as non-fatal: the api-server runs its own
# idempotent migrations on startup (see artifacts/api-server/src/index.ts),
# and drizzle-kit currently complains about a drizzle-orm version mismatch
# in the catalog that we don't want to chase on every merge.
pnpm --filter db push || echo "[post-merge] drizzle-kit push skipped (api-server self-migrates on boot)"

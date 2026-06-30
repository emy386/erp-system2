#!/bin/bash
# Start all Kidzy services in parallel
pnpm --filter @workspace/api-server run dev &
pnpm --filter @workspace/kidzy run dev &
pnpm --filter @workspace/kidzy-mobile run dev &
wait

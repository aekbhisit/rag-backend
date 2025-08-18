# Backend Tests

Prereqs: Build packages; start infra or run with stubs.

- T-BE-001 Start dev
  - Steps: `pnpm --filter @rag/backend run dev`
  - Expect: logs "Backend listening on http://localhost:3001"

- T-BE-002 Start prod
  - Steps: `pnpm --filter @rag/backend run build && node apps/backend/dist/index.js`
  - Expect: same ready log

- T-BE-003 Liveness
  - Steps: `curl -s -i http://localhost:3001/health`
  - Expect: 200; `{ "status": "ok" }`

- T-BE-004 Aggregated health
  - Steps: `curl -s http://localhost:3001/api/health | jq`
  - Expect: `{ status: "ok"|"degraded", db: {status}, cache: {status}, search: {status}, storage: {status} }`

- T-BE-005 Graceful shutdown
  - Steps: send SIGINT/SIGTERM to process
  - Expect: server closes without error

- T-BE-006 Unknown route
  - Steps: GET `/unknown`
  - Expect: 404

- T-BE-007 Index ensure idempotent
  - Steps: call ensure twice (via startup)
  - Expect: first creates; second `{ created: false }`

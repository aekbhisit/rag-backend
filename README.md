# RAG Monorepo

This monorepo hosts the multi-tenant RAG backend and the Next.js Admin UI, plus shared packages and infra.

## Structure

- apps/
  - backend: Backend service (API)
  - admin-web: Next.js Admin UI
- packages/
  - shared: Shared types, schemas, utilities
- infra/
  - docker, k8s, db (migrations/rls/seed), search
- .github/workflows: CI
- thinking: Specifications and guidelines

## Getting Started

Prerequisites:
- Node.js 18+
- pnpm 10+ (repo is configured with pnpm workspaces)
- Docker Desktop (for local infra: Postgres/Redis/OpenSearch/MinIO/Langfuse)

Install and build:
```
pnpm install
pnpm -r run build
```

Start local infra (Docker):
```
npm run infra:up
```

Run backend (dev):
```
pnpm run dev:backend
```

Run Admin Web (dev):
```
pnpm --filter @rag/admin-web run dev
```

### Admin Login (Demo)

- URL: `http://localhost:3100/login`
- Email: `admin@example.com`
- Password: `password`

Notes:
- The current login/logout flow is client-side for development: credentials are validated on the client and a session flag is stored in `localStorage`. The admin area enforces access via a guard in `apps/admin-web/app/admin/layout.tsx`, and you can logout from the header menu. For production, replace with server-side authentication.

Health checks:
- Backend liveness: `curl -s http://localhost:3001/health`
- Aggregated health: `curl -s http://localhost:3001/api/health | jq`

Shut down infra:
```
npm run infra:down
```

## Application Paths

See `thinking/ai-master-guidelines.md` → Application Path Conventions.

## Database Migrations (manual dev)

With infra running (Postgres on localhost:5432):
```
psql -h localhost -U postgres -d rag_assistant -f infra/db/migrations/0001_init.sql
psql -h localhost -U postgres -d rag_assistant -f infra/db/rls/rls_policies.sql
```

## Tests (manual)

- Backend unit tests:
```
pnpm --filter @rag/backend test
```
- Admin build smoke:
```
pnpm --filter @rag/admin-web run build
```
- See detailed test cases in `thinking/tests/`.

## Run backend without Docker (local adapters skipped)

```
pnpm run build:backend
pnpm run dev:backend:local
```


Go to http://localhost:3100/login
Sign in with:
Email: admin@example.com
Password: password

maps k:  AIzaSyANSL5wWT2ZgcDRgxSvQAA6vT0rr3E18x8
firecraw: fc-94a0ac82fb4a4c4b808b92ecfe0b35c9
## Code Structure: Multi‑Tenant RAG Backend + Next.js (NextAdmin)

### Monorepo Layout
```text
rag-backend/
  apps/
    backend/                  # Express + TS service (RAG APIs)
    admin-web/                # Next.js 15 app with NextAdmin
  packages/
    shared/                   # Shared types, zod schemas, API SDK
  infra/
    docker/                   # Dockerfiles, docker-compose
    k8s/                      # Kubernetes manifests
    db/                       # SQL migrations, RLS policies, seed scripts
    search/                   # OpenSearch index templates/mappings
  thinking/                   # Requirements, architecture and structure docs
  .github/workflows/          # CI/CD pipelines
  README.md
```

### apps/backend (Express + TypeScript)
```text
apps/backend/
  package.json
  tsconfig.json
  src/
    index.ts                  # bootstrap server
    app.ts                    # express app wiring

    config/                   # env, constants, feature flags
      env.ts
      config.ts

    server/                   # http server concerns
      routes/
        health.routes.ts
        classify.routes.ts
        answer.routes.ts
        preview.routes.ts
        admin/
          contexts.routes.ts
          intents.routes.ts
          profiles.routes.ts
          profileTargets.routes.ts
          overrides.routes.ts
          logs.routes.ts
      middleware/
        security.middleware.ts       # auth, API keys, tenant guard
        rateLimit.middleware.ts
        tenant.middleware.ts         # sets app.current_tenant_id
        validation.middleware.ts     # zod schema validation
        error.middleware.ts          # error formatter

    schemas/                  # zod request/response schemas
      classify.schema.ts
      answer.schema.ts
      admin/
        contexts.schema.ts
        intents.schema.ts
        profiles.schema.ts
        targets.schema.ts
        overrides.schema.ts

    types/                    # shared backend-only TS types
      index.ts

    core/                     # domain services (business logic)
      orchestrator/
        QueryOrchestrator.ts
      intent/
        IntentFilterService.ts
      strategy/
        StrategySelector.ts
      retrieval/
        RetrievalEngine.ts
        reranker/
          RerankerClient.ts
      context/
        ContextManager.ts
      logging/
        QueryLogger.ts

    repositories/             # data access layer (Postgres)
      ContextRepository.ts
      IntentRepository.ts
      ProfileRepository.ts
      ProfileTargetRepository.ts
      OverrideRepository.ts
      QueryLogRepository.ts
      TenantRepository.ts

    adapters/                 # external integrations
      db/
        postgresClient.ts           # node-postgres/Prisma/Knex
      cache/
        redisClient.ts
      search/
        openSearchClient.ts
        indexManager.ts
      storage/
        minioClient.ts
      ai/
        EmbeddingClient.ts
        LlmClient.ts
        provider/
          openai.ts
          cohere.ts
          jina.ts
      telemetry/
        langfuseClient.ts

    utils/
      logger.ts
      id.ts
      time.ts

    openapi/
      schema.yaml                  # API contract (generated or hand-written)

  tests/
    unit/
    integration/
    e2e/

  Dockerfile
```

#### Backend Responsibilities Map
- `QueryOrchestrator`: preprocess (lang detect, tenant), route to intent/strategy, call retrieval, call LLM, postprocess, log.
- `IntentFilterService`: flexible scope/action filtering; query enhancement.
- `StrategySelector`: resolve instruction profile via `profile_targets`, apply `context_profile_overrides`.
- `RetrievalEngine`: structured fast‑path, hybrid (BM25 + vector), rerank, trust gating.
- `ContextManager`: CRUD, indexing, bulk import/export; link/unlink intents.
- `QueryLogger`: persist structured query logs for audit and analytics.

#### Backend Middleware
- `security.middleware`: API key/tenant validation, rate limiting hooks.
- `tenant.middleware`: set `app.current_tenant_id` (for Postgres RLS) per request.
- `validation.middleware`: enforce zod schemas; return standardized error shape.
- `error.middleware`: 400/401/403/404/409/5xx with ErrorResponse contract.

### apps/admin-web (Next.js 15 + NextAdmin)
```text
apps/admin-web/
  package.json
  next.config.js
  tsconfig.json
  .env.example

  app/
    layout.tsx
    page.tsx                   # dashboard landing

    admin/                     # NextAdmin root
      page.tsx
      config/
        admin.ts               # NextAdmin setup (resources, data provider)
      resources/
        contexts/
          list.tsx
          create.tsx
          edit.tsx
          show.tsx
        intents/
          list.tsx
          create.tsx
          edit.tsx
        profiles/
          list.tsx
          create.tsx
          edit.tsx
          diff.tsx
        profile-targets/
          list.tsx
          create.tsx
          edit.tsx
        overrides/
          list.tsx
          create.tsx
          edit.tsx
        logs/
          list.tsx
          show.tsx

    preview/
      page.tsx                 # dry-run UI for operators

    chat/
      page.tsx                 # end-user demo chat calling /answer

  components/
    charts/
    forms/
    layout/

  lib/
    apiClient.ts               # talks to backend service
    auth.ts                    # NextAuth or API key client-side guard

  styles/
    globals.css
```

#### NextAdmin Wiring (example)
```typescript
// app/admin/config/admin.ts
import { NextAdmin } from 'nextadmin';
import { apiDataProvider } from '@/lib/apiClient';

export default function AdminApp() {
  return (
    <NextAdmin
      dataProvider={apiDataProvider}
      resources={[
        { name: 'contexts', list: '/admin/resources/contexts/list', edit: '/admin/resources/contexts/edit', create: '/admin/resources/contexts/create' },
        { name: 'intents', list: '/admin/resources/intents/list', create: '/admin/resources/intents/create', edit: '/admin/resources/intents/edit' },
        { name: 'profiles', list: '/admin/resources/profiles/list', create: '/admin/resources/profiles/create', edit: '/admin/resources/profiles/edit' },
        { name: 'profile-targets', list: '/admin/resources/profile-targets/list', create: '/admin/resources/profile-targets/create', edit: '/admin/resources/profile-targets/edit' },
        { name: 'overrides', list: '/admin/resources/overrides/list', create: '/admin/resources/overrides/create', edit: '/admin/resources/overrides/edit' },
        { name: 'logs', list: '/admin/resources/logs/list', show: '/admin/resources/logs/show' },
      ]}
    />
  );
}
```

### packages/shared (Types, Schemas, SDK)
```text
packages/shared/
  package.json
  src/
    types/
      api.ts                 # request/response contracts
      domain.ts              # Intent, Context, Profile, etc.
    schemas/
      answer.ts              # zod schemas mirrored from backend
      classify.ts
      admin/
        contexts.ts
        intents.ts
        profiles.ts
    sdk/
      client.ts              # typed API client used by admin-web
```

### infra (Ops, Data, Search)
```text
infra/
  docker/
    docker-compose.yml       # app + postgres + redis + opensearch + minio + langfuse
  k8s/
    deployment.yaml
    service.yaml
    hpa.yaml
  db/
    migrations/              # SQL or Prisma migrations
    rls/                     # RLS policies per table
    seed/                    # demo tenant/intents/contexts/profiles
  search/
    context-index.json       # OpenSearch settings/mappings
```

### API Surface (routes → handlers)
- `POST /classify` → `classify.routes` → `IntentFilterService`
- `POST /answer` → `answer.routes` → `QueryOrchestrator` → `RetrievalEngine` → `LlmClient`
- `GET /preview` → `preview.routes` → dry-run path with traces
- Admin CRUD
  - `GET/POST/PUT/DELETE /api/admin/contexts`
  - `GET/POST/PUT/DELETE /api/admin/intents`
  - `GET/POST/PUT/DELETE /api/admin/profiles`
  - `GET/POST/PUT/DELETE /api/admin/profile-targets`
  - `GET/POST/PUT/DELETE /api/admin/overrides`
  - `GET /api/admin/logs`
- Health: `GET /health`

### Configuration & Secrets
- Required env (backend):
  - `DB_URL`, `REDIS_URL`, `OPENSEARCH_URL`, `MINIO_ENDPOINT`, `EMBEDDINGS_PROVIDER`, `RERANKER_PROVIDER`, `LLM_PROVIDER`, `LANGFUSE_API_KEY`, `API_KEYS`
- Required env (admin-web):
  - `NEXT_PUBLIC_API_BASE_URL`, `NEXTAUTH_SECRET` (if used), tenant-scoped API key

### Testing Strategy
- Unit: service logic (`core/*`), repositories with mocks
- Integration: routes + adapters against test containers (Postgres, OpenSearch, Redis)
- E2E: happy-path `/answer`, `/preview`, admin CRUD flows

### Dependency Boundaries
- Routes/controllers only depend on services; services depend on repositories/adapters; adapters encapsulate external clients.
- Shared contracts live in `packages/shared` and are the single source of truth for API types and zod schemas.

### Build & CI/CD
- Lint, type-check, unit tests for all packages
- Build backend and admin-web
- Docker images for backend; Next.js output (standalone) for admin-web
- Deploy via GitHub Actions to K8s; run migrations and index updates on release

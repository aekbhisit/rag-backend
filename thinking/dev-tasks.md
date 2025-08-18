## Development Task Breakdown (Sequenced for AI Implementation)

Always include the Prompt Prefix from `thinking/ai-master-guidelines.md` in each AI task. Do not invent colors or styles; use the CSS variables and contrast rules.

### Phase 0: Foundations

1) Repo and Monorepo Scaffolding
- Objective: Initialize the repository structure per `thinking/structure.md`.
- Inputs: `thinking/structure.md`
- Steps:
  - Create directories `apps/backend`, `apps/admin-web`, `packages/shared`, `infra/{docker,k8s,db,search}`.
  - Add root README and minimal package.json workspaces config.
- Deliverables: Folder tree and workspace config.
- Acceptance: Folder structure matches `structure.md` and builds locally with no errors.

2) Design Guidelines Enforcement
- Objective: Add global CSS variables and base styles per `thinking/ai-master-guidelines.md`.
- Inputs: `thinking/ai-master-guidelines.md`
- Steps:
  - Create `apps/admin-web/styles/globals.css` with provided CSS variables and defaults.
  - Wire styles in Next.js layout.
- Deliverables: `globals.css`, layout import.
- Acceptance: Example page renders with tokens; body text uses `--text` and meets contrast rules.

### Phase 1: Shared Contracts

3) Shared Types, Zod Schemas, SDK
- Objective: Centralize API contracts.
- Inputs: `thinking/final-requirements.md`
- Steps:
  - Define domain types: Tenant, Intent, Context, Profile, ProfileTarget, Override, QueryLog.
  - Define API contracts: classify, answer, preview, admin CRUD.
  - Implement zod schemas in `packages/shared/schemas` and typed client in `packages/shared/sdk/client.ts`.
- Deliverables: `packages/shared/{types,schemas,sdk}`.
- Acceptance: Type-check passes; basic SDK call compiles.

### Phase 2: Infrastructure (Dev)

4) Docker Compose (Dev)
- Objective: Run app + Postgres + Redis + OpenSearch + MinIO + Langfuse.
- Steps:
  - Create `infra/docker/docker-compose.yml` with services and required env.
- Deliverables: docker-compose.yml.
- Acceptance: `docker compose up` starts all containers; health endpoints OK.

5) OpenSearch Index Templates
- Objective: Provision context index with mappings.
- Steps:
  - Add `infra/search/context-index.json` as per spec.
  - Create index manager utility in backend adapters.
- Acceptance: Index created with correct mapping and kNN settings.

6) Database Migrations + RLS
- Objective: Create schema and row-level security.
- Steps:
  - Migrations for tenants, contexts, intents, instruction_profiles, profile_targets, overrides, query_logs, context_intents.
  - RLS policies using `app.current_tenant_id`.
- Deliverables: `infra/db/migrations`, `infra/db/rls`.
- Acceptance: Fresh DB migration succeeds; RLS enforced by tenant.

### Phase 3: Backend Scaffolding

7) Backend App Bootstrapping
- Objective: Express app with core middleware and error handling.
- Steps:
  - Set up `src/index.ts`, `src/app.ts` with routes, error handler, zod validation, rate limit, security.
  - Standardized `ErrorResponse` format.
- Acceptance: `GET /health` returns 200; errors follow contract.

8) Adapters Setup
- Objective: Create clients for postgres, redis, opensearch, minio, telemetry, AI providers.
- Acceptance: Each adapter supports init, health check, and basic operation.

9) Repositories
- Objective: Implement data access for all entities with tenant scoping.
- Acceptance: CRUD functions exist; unit tests with test DB pass.

### Phase 4: Core Domain Services

10) IntentFilterService
- Objective: Scope/action filtering; text-only fallback; combined query enhancement.
- Acceptance: Unit tests for scope-only, action-only, scope+action, fallback.

11) StrategySelector
- Objective: Resolve profile by targets with priority/specificity; apply context overrides.
- Acceptance: Unit tests covering tie-break and override application.

12) RetrievalEngine
- Objective: Structured fast-path + hybrid (BM25 + vector) + reranker + trust gating.
- Acceptance: Given seeded data, returns reranked 8–12 contexts; drops below min_trust.

13) QueryOrchestrator
- Objective: End-to-end pipeline (preprocess → intent → strategy → retrieval → LLM → postprocess → log).
- Acceptance: Mocks for AI services; returns shaped payload with citations and latency.

14) QueryLogger
- Objective: Persist structured logs with trace IDs and timings.
- Acceptance: Log entries persist and can be filtered by tenant/time.

### Phase 5: Backend APIs

15) Classification API
- Endpoint: POST `/classify`
- Acceptance: Returns {scope, action, detail}; validated by zod; logs request/latency.

16) Answer API
- Endpoint: POST `/answer`
- Acceptance: Executes orchestrator; returns {answer, citations[], intent_used, profile_id, confidence, latency_ms}.

17) Preview API
- Endpoint: GET `/preview`
- Acceptance: Dry-run with traces; no writes; includes retrieval diagnostics and chosen profile.

18) Admin CRUD APIs
- Endpoints: `/api/admin/{contexts,intents,profiles,profile-targets,overrides,logs}`
- Acceptance: Full CRUD with validation; RLS enforced; pagination and filtering.

### Phase 6: Seed and Fixtures

19) Seed Scripts
- Objective: Seed demo tenant, intents, contexts, profiles, targets, overrides.
- Acceptance: Running seed populates DB and OpenSearch; `/answer` works on sample queries.

### Phase 7: Admin Web (Next.js + NextAdmin)

20) Next.js App Scaffold
- Objective: Create Next.js 15 app with App Router and NextAdmin shell.
- Acceptance: Admin loads; global CSS tokens applied; dark mode toggle via `data-theme`.

21) API Client + Auth
- Objective: Configure API client to backend; simple API key/tenant id.
- Acceptance: All admin pages authenticate and call backend.

22) NextAdmin Resources
- Objective: Implement resources for contexts, intents, profiles, profile-targets, overrides, logs.
- Acceptance: List/create/edit/show work with validation; toasts and error states styled via tokens.

23) Preview Tool Page
- Objective: Operator dry-run UI calling `/preview` with query, tenant, channel, profile.
- Acceptance: Shows chosen profile, retrieval hits, citations, timings.

24) Chat Demo Page
- Objective: Minimal end-user chat calling `/answer` with tenant selection and language auto-detect.
- Acceptance: Produces cited answers; handles errors gracefully.

### Phase 8: Observability, Quality, and Delivery

25) Tracing & Metrics
- Objective: Integrate Langfuse and basic Prometheus metrics.
- Acceptance: Traces for classify/answer/preview visible; key metrics exported.

26) Testing
- Objective: Unit (services), integration (routes/adapters), e2e (answer, preview, admin CRUD).
- Acceptance: CI passes; coverage ≥ 80% for services.

27) CI/CD
- Objective: GitHub Actions for test→build→deploy; Dockerfile(s); K8s manifests.
- Acceptance: Successful pipeline on main; rollout with health checks.

28) Performance Baseline
- Objective: Meet SLAs (p95 < 1.5s RAG, < 400ms structured).
- Acceptance: Performance test suite passes; zero-hit and low-confidence tracked.

### Phase 9: Acceptance and Handover

29) Acceptance Criteria Verification
- Objective: Verify all MVP acceptance criteria in `thinking/final-requirements.md`.
- Acceptance: Checklist complete with evidence (screens, logs, metrics).

30) Documentation
- Objective: README, setup, environment, API docs, admin usage, prompt prefix usage.
- Acceptance: New dev can follow docs to run and operate locally.

---

Notes for AI implementers
- Always include the Prompt Prefix from `thinking/ai-master-guidelines.md`.
- Enforce contrast rules: body text must use `--text`; links `--primary` (600) with underline.
- Follow `thinking/structure.md` for file locations and names.
- Favor clarity and testability; add unit tests as you implement services.

## Final Requirements: Multi‑Tenant RAG Backend with Next.js + NextAdmin Interface

### 1) Goal & Scope
- **Goal**: Build a multi-tenant RAG assistant backend with a web interface built on Next.js and an admin UI using NextAdmin. The system decides when to answer directly vs via retrieval, selects a strategy (instruction profile) by intent and tenant, retrieves the best contexts (official KB, places, tickets, websites), and responds in a controlled, auditable format with citations.
- **Primary users**:
  - **End users**: consume answers via channels (LINE/Web/email) and demo web UI
  - **Operators/Admins**: manage content, intents, instruction profiles, targets, overrides
  - **Observers**: review logs and metrics
- **Languages**: TH/EN with auto-detect and per-tenant/channel overrides

### 2) Core Concepts
- **Intent**: {scope, action, detail}
- **Instruction Profile (Strategy)**: rules controlling tone, format, retrieval policy, trust/safety, glossary
- **Profile Target**: mapping profiles to tenant/intent/channel/segment with priority ordering
- **Context**: knowledge items (place, website, ticket, doc_chunk) with flexible attributes
- **Context→Intent Link**: many-to-many linking of contexts to intents
- **Context Profile Override**: per-context tweak or alternate profile
- **Query Log**: immutable record of request→response pipeline

### 3) Architecture Overview
- **Interface**: Next.js 15 (App Router) SPA/SSR with **NextAdmin** for admin UI
- **Backend Runtime**: Node.js 18+, TypeScript, Express.js (or Next.js API routes for thin proxy if desired)
- **APIs**: REST with OpenAPI, Zod validation
- **Search**: OpenSearch (BM25 + k‑NN HNSW) for hybrid retrieval
- **Data**: Postgres (RLS for tenant isolation) for metadata/config/logs; MinIO for raw docs; Redis for caching
- **AI Services**: Embeddings (OpenAI or bge-m3), Reranker (Cohere/Jina), LLM (GPT/Claude/Llama)
- **Observability**: Langfuse for traces; metrics via Prometheus/Grafana

### 4) Data Model (summary)
- Tenants own: `intents`, `instruction_profiles`, `contexts`, `query_logs`
- Links: `context_intents` (contexts↔intents), `profile_targets` (profiles↔tenant/intent/channel), `context_profile_overrides`
- Context attributes by type:
  - place: lat, lon, address, phone, hours
  - website: url, domain, last_crawled, status_code
  - ticket: price, location, event_time, status
  - doc_chunk: source_uri, page, headings, tags

### 5) Retrieval & Answering
- **Direct answer**: for small-talk/formatting/known FAQs at high confidence and allowed by policy
- **Structured fast‑path**: store locator (geo radius), ticket lookup by ID, exact FAQ matches
- **Hybrid search**: BM25 + vector ANN; return top N (e.g., 100) → rerank to 8–12
- **Trust gating**: drop passages below profile `min_trust_level`; if empty and no fallback → clarify or escalate
- **Citations**: include URI/URL/title/chunk_id per profile policy

### 6) Strategy Selection
- Match profile via `profile_targets` using tenant + intent + channel (+ segment)
- Sort by priority, prefer specificity; apply `context_profile_overrides` where applicable

### 7) APIs (contract-first; representative)
- Classification: `POST /classify` → intent {scope, action, detail}
- Answering: `POST /answer` → {answer, citations[], intent_used, profile_id, confidence, latency_ms}
- Preview (admin): `GET /preview?query=...&tenant=...` (dry run, no writes)
- Contexts: CRUD, bulk import/export, link/unlink intents
- Intents: CRUD, safe merge/rename
- Profiles: CRUD, diff, publish, versions
- Profile Targets: CRUD (priority-ordered)
- Overrides: CRUD per context
- Logs: query/filter/export

### 8) Next.js + NextAdmin Interface Requirements
- **Tech**: Next.js 15 (App Router), TypeScript, NextAdmin for admin scaffolding
- **Auth**: Tenant‑scoped admin auth (API key or NextAuth provider); role‑based access optional in MVP
- **Admin Modules (NextAdmin resources)**:
  - Contexts: list/search/filter; create/edit with type‑aware forms; bulk import; bulk link to intents
  - Intents: list/create/edit; merge/rename (with link preservation)
  - Profiles: create/edit; versioning + diffs; preview against sample queries; staged publish flag
  - Profile Targets: ordered list with priority; conflict warnings; impact preview
  - Overrides: per‑context override editor; list/revert
  - Logs & Analytics: searchable logs; charts for volume, zero‑hit, low‑confidence, reranker uplift
  - Preview Tool: run `/preview` end‑to‑end with request knobs; display chosen profile, retrieval hits, citations
- **End‑User Demo Page**: Minimal chat‑like UI calling `/answer` with tenant selection and language auto‑detect
- **Error UX**: Standard error surface with retry guidance, request_id, and escalation hints

### 9) Security & Isolation
- Postgres Row‑Level Security on tenant‑scoped tables; `app.current_tenant_id` session variable
- Tenant context validation at API and cache levels; tenant‑scoped cache keys
- PII redaction per profile; encryption in transit/at rest; audit logging

### 10) Performance & Reliability (SLAs)
- RAG pipeline: p95 < 1.5s; direct/structured: p95 < 400ms
- Graceful degradation: hybrid without reranker if reranker down; cached results if embeddings fail
- Caching: Redis for query results (5m TTL), profile resolution (1h), intent‑context mapping (30m), embedding cache (24h)

### 11) Monitoring & Observability
- Langfuse traces across classification, strategy, retrieval, generation
- Metrics: response times, error rates, zero‑hit, confidence, citation compliance, intent accuracy
- Alerts: high error rate, slow responses, low cache hit rate

### 12) Deployment & Stack
- Dev: Docker Compose for app + Postgres + Redis + OpenSearch + MinIO
- Prod: Kubernetes with HPA; CI/CD via GitHub Actions (tests → build → deploy)

### 13) Acceptance Criteria (MVP)
- Intent detection produces {scope, action, detail} with ≥90% route accuracy on a curated test set
- Profiles can be created/edited, targeted (tenant/intent/channel), versioned, and previewed; changes apply immediately without reindexing
- Contexts support at least 4 types (place, website, ticket, doc_chunk) with flexible attributes; many‑to‑many links to intents
- Overrides: operator can tweak one context’s behavior without affecting others
- Retrieval: hybrid + rerank + trust gate; responses include citations
- Structured fast‑path: places/store_locator (geo radius) and ticket by ID
- Logs: each answer records intent, profile (version), contexts used, confidence, latency
- Admin UX (NextAdmin): operators can complete “five minute tasks” end‑to‑end
  - Add a context and link to an intent
  - Change the profile for an intent via targets and publish
  - Pin a context override and revert it
  - Inspect a query log and view retrieval hits/citations
  - Preview an answer with a custom query

### 14) Phase 1.1 Backlog (nice‑to‑have)
- A/B testing per intent/profile; staged rollouts with auto‑rollback
- Nightly test set runner and dashboard (zero‑hit, citation rate, confidence, FCR proxy)
- Map view for places; schema linter for context attributes; bulk fix workflows
- Dual‑retrieval “strategy discovery” index to assist profile selection
- Per‑tenant glossary management in admin UI

### 15) Deliverables
- Backend service (TypeScript) with all APIs and OpenAPI spec
- Next.js app with NextAdmin admin UI and end‑user demo page
- Docker Compose and Kubernetes manifests; CI/CD workflows
- Seed scripts for demo tenant, intents, contexts, and example profiles
- Documentation: setup, environment, API docs, admin usage guide

### 16) Non‑Goals (MVP)
- Full RBAC across fine‑grained admin roles (basic tenant‑admin is sufficient)
- Multi‑region active‑active deployment
- Advanced PII detection beyond regex rules

### 17) Risks & Mitigations
- External service latency/availability → timeouts, retries, and fallbacks; cache hot paths
- Multi‑language search quality → multilingual embeddings and analyzers; monitor zero‑hit/low‑confidence
- Configuration complexity → NextAdmin forms with previews, diffs, and staged publish

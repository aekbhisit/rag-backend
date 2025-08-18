## 01) Data Structure and Migrations

### Objective
Update Postgres schema to satisfy the mapped UI requirements with RLS.

### Steps
- Create migrations to add/alter these tables and indexes:
  - `tenants`, `users`
  - `intents` (scope, action, detail, slug, created_by, updated_by)
  - `instruction_profiles` (id, tenant_id, name, version, policy_jsonb, min_trust_level)
  - `profile_targets` (tenant_id, profile_id, intent_id, channel, segment, priority)
  - `contexts` (id, tenant_id, type, title, attributes_jsonb, status)
  - `context_intents` (context_id, intent_id)
  - `context_profile_overrides` (context_id, profile_id, override_jsonb)
  - `query_logs` (id, tenant_id, request_jsonb, response_jsonb, intent_used_id, profile_id, confidence, latency_ms, citations_jsonb, created_at)
- Apply RLS policies using `app.current_tenant_id`.
- Add GIN indexes for JSONB attributes and text search where needed.

### Vector Index Note
- OpenSearch OSS k-NN (Lucene) supports max dimension 1024. Set `embedding.dimension` ≤ 1024.
- Update `infra/search/context-index.json` to `dimension: 1024` if using OpenAI 1536-d embeddings; or use a 768/1024-d model.

### Seed
- Add seed scripts for a demo tenant with minimal data for each module.

### Acceptance
- Migrations run cleanly; RLS enforced; seed produces demo data.


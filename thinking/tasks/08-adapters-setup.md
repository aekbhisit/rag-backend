# Task 08: Adapters Setup (DB, Cache, Search, Storage, AI, Telemetry)

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Implement initialization and health checks for external integrations.

## Inputs
- `thinking/structure.md`

## Dependencies
- Tasks 01, 04, 07

## Steps
1. DB: `postgresClient.ts` (pool, migrations runner).
2. Cache: `redisClient.ts` (connect, ping, namespaced keys by tenant).
3. Search: `openSearchClient.ts` (connect, health), `indexManager.ts` (ensure index).
4. Storage: `minioClient.ts` (bucket ensure).
5. AI: `EmbeddingClient.ts`, `LlmClient.ts`, providers (`openai.ts`, `cohere.ts`, `jina.ts`).
6. Telemetry: `langfuseClient.ts` (trace start/finish helpers).

## Deliverables
- Adapter files under `apps/backend/src/adapters/*`

## Acceptance Criteria
- Each adapter exposes `init()` and `health()`.
- Health endpoint aggregates adapter health.

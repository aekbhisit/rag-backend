# Task 05: OpenSearch Index Templates

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Create the context search index with multilingual analyzers and kNN vector mapping.

## Inputs
- `thinking/structure.md`
- `thinking/technical-specification.md` (OpenSearch mapping section)

## Dependencies
- Tasks 01, 04

## Steps
1. Add `infra/search/context-index.json` using the mapping in the technical spec (tenant_id, type, title/body analyzers, knn_vector, intent_scopes/actions, trust_level, language, attributes).
2. Implement `apps/backend/src/adapters/search/indexManager.ts` with functions: `ensureContextIndex()`, `putMappings()`, `health()`.
3. Wire a startup hook in backend to call `ensureContextIndex()`.

## Deliverables
- `infra/search/context-index.json`
- `indexManager.ts`

## Acceptance Criteria
- Index is created with correct settings/mappings.
- Health check passes and reports index status.

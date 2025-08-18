# Task 09: Repositories (Data Access Layer)

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Implement repositories for all entities with strict tenant scoping and pagination.

## Inputs
- `thinking/final-requirements.md`
- `thinking/structure.md`

## Dependencies
- Tasks 06, 08

## Steps
1. Implement repositories for: contexts, intents, profiles, profile_targets, overrides, query_logs, tenants.
2. Methods: list (filters, pagination), get, create, update, delete; ensure `tenant_id` is always applied.
3. Add query performance indexes where needed.
4. Unit tests using a test database.

## Deliverables
- Files under `apps/backend/src/repositories/*`
- Unit tests under `apps/backend/tests/unit/`

## Acceptance Criteria
- CRUD operations work with tenant isolation.
- Unit tests pass locally.

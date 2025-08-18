# Task 06: Database Migrations + Row-Level Security

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Create relational schema and enforce tenant isolation with PostgreSQL RLS.

## Inputs
- `thinking/final-requirements.md` (Data model, RLS snippet)
- `thinking/structure.md`

## Dependencies
- Tasks 01, 04

## Steps
1. Define tables: tenants, intents, contexts, instruction_profiles, profile_targets, context_intents, context_profile_overrides, query_logs.
2. Add common fields: ids (uuid), timestamps, tenant_id where applicable.
3. Implement RLS:
   - Enable RLS on tenant-scoped tables.
   - Create policies using `current_setting('app.current_tenant_id')::uuid`.
4. Add indices: by tenant_id, type, trust_level, language; FKs for relationships; composite for `profile_targets` priority.
5. Provide migration scripts in `infra/db/migrations` and RLS in `infra/db/rls`.

## Deliverables
- SQL migration files
- RLS policy scripts

## Acceptance Criteria
- Fresh migration succeeds on local Postgres.
- RLS prevents cross-tenant access when `app.current_tenant_id` is set.
- All required tables and indexes exist.

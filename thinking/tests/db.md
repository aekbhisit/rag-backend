# Database & RLS Tests

Prereqs: Infra up; Postgres reachable on localhost:5432.

- T-DB-001 Migrations apply
  - Steps: `psql -h localhost -U postgres -d rag_assistant -f infra/db/migrations/0001_init.sql`
  - Expect: tables created: tenants, intents, contexts, instruction_profiles, profile_targets, context_intents, context_profile_overrides, query_logs

- T-DB-002 Indices present
  - Steps: query `pg_indexes` for each table
  - Expect: indexes on tenant_id, type, trust_level, language; composite priority on `profile_targets`

- T-DB-003 Constraints & FKs
  - Steps: attempt to insert child rows with invalid FKs; expect errors
  - Expect: FK violations; composite PK on `profile_targets` blocks duplicates

- T-DB-004 RLS enabled
  - Steps: apply `infra/db/rls/rls_policies.sql`; check `pg_policies`
  - Expect: RLS enabled for tenant-scoped tables; policies present

- T-DB-005 RLS isolation behavior
  - Steps:
    - `SET app.current_tenant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'`; insert a context
    - Switch: `SET app.current_tenant_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'`; try to select previous row
  - Expect: second tenant cannot read row

- T-DB-006 Performance sanity
  - Steps: `EXPLAIN ANALYZE SELECT * FROM contexts WHERE tenant_id=$1 AND type='doc_chunk' LIMIT 10;`
  - Expect: index scan; no sequential scan for selective queries

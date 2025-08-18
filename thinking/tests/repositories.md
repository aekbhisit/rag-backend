# Repositories Tests (Contexts)

Setup:
- Seed Postgres; set `app.current_tenant_id` appropriately.
- Instantiate `ContextsRepository` with a `pg.Pool`.

- T-REP-001 Create
  - Steps: `create(tenantId, { type, title, body, attributes, trust_level, language })`
  - Expect: row returned with ids, timestamps; persisted in DB

- T-REP-002 Get tenant-scoped
  - Steps: `get(tenantA, id)` returns row; `get(tenantB, id)` returns null

- T-REP-003 List with filters/paging
  - Steps: insert 15 rows; `list(tenantId, { type:'doc_chunk', limit:10, offset:5 })`
  - Expect: 10 rows; all type `doc_chunk`; ordering by created_at desc

- T-REP-004 Update
  - Steps: patch title/body/attributes/trust_level
  - Expect: fields updated; `updated_at` > previous

- T-REP-005 Delete
  - Steps: `delete(tenantId, id)`; then `get(tenantId, id)`
  - Expect: delete true; get null

- T-REP-006 SQL injection safety
  - Steps: supply malicious strings; verify parameterized queries prevent injection
  - Expect: no harmful effects; queries still parameterized

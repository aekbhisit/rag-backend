# API Tests

Prereqs: Backend running on 3001.

- T-API-001 Valid retrieve
  - Steps:
    - `curl -s -X POST http://localhost:3001/api/retrieve -H 'Content-Type: application/json' -d '{"query":"hello","tenant_id":"00000000-0000-0000-0000-000000000000"}' | jq`
  - Expect: 200; `retrieval_method:"fallback"`; valid schema fields

- T-API-002 Missing query
  - Steps: POST body without `query`
  - Expect: 400; `error_code:"VALIDATION_ERROR"`; zod details

- T-API-003 Invalid tenant_id
  - Steps: POST with `tenant_id:"not-a-uuid"`
  - Expect: 400

- T-API-004 Oversized query
  - Steps: POST query length > 1000
  - Expect: 400

- T-API-005 Invalid JSON
  - Steps: POST malformed JSON
  - Expect: 400

- T-API-006 Missing Content-Type
  - Steps: POST without header
  - Expect: 400 or parse error handling

- T-API-007 Tenant header passthrough
  - Steps: send `X-Tenant-ID`
  - Expect: request accepted; no error

# Adapters Tests

Prereqs: Infra up.

- T-ADP-001 Postgres health
  - Steps: `GET /api/health` and inspect `db`
  - Expect: `{ status: "ok" }`

- T-ADP-002 Redis health
  - Steps: `GET /api/health` and inspect `cache`
  - Expect: `{ status: "ok" }`

- T-ADP-003 MinIO bucket ensure
  - Steps: call backend init (start server), then `mc ls` or MinIO console to verify default bucket
  - Expect: bucket exists

- T-ADP-004 OpenSearch health
  - Steps: `GET /api/health` and inspect `search`
  - Expect: `{ status: "green"|"yellow"|"red"|"unknown" }`

- T-ADP-005 OpenSearch index
  - Steps: verify index existence after startup
  - Expect: index present with mapping

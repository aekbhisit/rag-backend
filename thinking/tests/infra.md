# Infra Tests

Prereqs: Docker Desktop running.

- T-INF-001 Compose boots
  - Steps: `npm run infra:up`
  - Expect: containers healthy; ports open 5432, 6379, 9200/9600, 9000/9001
  - Verify:
    - `docker ps | grep -E "postgres|redis|opensearch|minio|langfuse"`
    - `nc -z localhost 5432 && nc -z localhost 6379 && nc -z localhost 9200 && nc -z localhost 9000`

- T-INF-002 Service health endpoints
  - Postgres: `PGPASSWORD=password psql -h localhost -U postgres -d rag_assistant -c "SELECT 1;"` → returns 1
  - OpenSearch: `curl -s http://localhost:9200/_cluster/health | jq '.status'` → "green"|"yellow"|"red"
  - MinIO: visit `http://localhost:9001` (console); ensure login `minio/minio123`

- T-INF-003 Volumes & persistence
  - Steps: stop with `npm run infra:down`; start again; re-check Postgres DB exists
  - Expect: `rag_assistant` database persists

- T-INF-004 Logs sanity
  - Steps: `docker logs <service>` for each → no crash loops

- T-INF-005 Teardown
  - Steps: `npm run infra:down`
  - Expect: containers removed; volumes pruned per command

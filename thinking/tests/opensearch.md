# OpenSearch Tests

Prereqs: OpenSearch up on 9200.

- T-OS-001 Mapping JSON valid
  - Steps: parse `infra/search/context-index.json`
  - Expect: valid JSON; required sections present (settings, mappings)

- T-OS-002 Create index with mapping
  - Steps:
    - `curl -X PUT http://localhost:9200/contexts -H 'Content-Type: application/json' --data-binary @infra/search/context-index.json`
    - `curl -s http://localhost:9200/contexts/_mapping | jq`
  - Expect: knn_vector `dimension:1536`; analyzer `multilingual` on title/body

- T-OS-003 Health status
  - Steps: `curl -s http://localhost:9200/_cluster/health | jq '.status'`
  - Expect: `green` or `yellow`

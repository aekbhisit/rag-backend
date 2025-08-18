# Task 04: Docker Compose (Dev)

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Provide a local dev stack for backend + Postgres + Redis + OpenSearch + MinIO + Langfuse.

## Inputs
- `thinking/final-requirements.md`

## Dependencies
- Tasks 01–03

## Steps
1. Create `infra/docker/docker-compose.yml` with services:
   - backend (build later), postgres, redis, opensearch (single node, security disabled), minio, langfuse.
2. Define necessary env vars and volumes; expose ports.
3. Add Makefile/NPM scripts to start/stop stack.

## Deliverables
- `infra/docker/docker-compose.yml`

## Acceptance Criteria
- `docker compose up` brings all infra services to healthy state.
- Postgres, Redis, OpenSearch, MinIO, Langfuse are reachable.

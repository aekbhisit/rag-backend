# Task 07: Backend App Bootstrapping

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Set up Express app with core middleware, routing shell, and standardized error handling.

## Inputs
- `thinking/structure.md`

## Dependencies
- Tasks 01, 03, 04

## Steps
1. Create `src/index.ts` to start server and handle graceful shutdown.
2. Create `src/app.ts` wiring middleware:
   - security (API key, tenant extraction), rate limit, json body, zod validation, error handler.
3. Add routes placeholders: `/health`, `/classify`, `/answer`, `/preview`, admin namespace.
4. Implement standardized `ErrorResponse` JSON shape for errors.

## Deliverables
- `apps/backend/src/index.ts`
- `apps/backend/src/app.ts`

## Acceptance Criteria
- `GET /health` returns 200.
- Invalid requests return 400 with ErrorResponse shape.

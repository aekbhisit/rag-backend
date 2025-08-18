# Task 03: Shared Types, Zod Schemas, and SDK

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Create shared domain types, API contracts, Zod schemas, and a typed SDK used by both backend and admin web.

## Inputs
- `thinking/final-requirements.md`
- `thinking/structure.md`

## Dependencies
- Tasks 01, 02

## Steps
1. In `packages/shared/src/types`, define domain models: Tenant, Intent, Context, Profile, ProfileTarget, Override, QueryLog.
2. In `packages/shared/src/schemas`, define Zod schemas for:
   - classify.request/response, answer.request/response, preview.request/response
   - admin: contexts, intents, profiles, profile-targets, overrides, logs
3. Implement `packages/shared/src/sdk/client.ts` exposing typed functions calling backend endpoints.
4. Export an index barrel file for easier imports.

## Deliverables
- `packages/shared/src/types/*`
- `packages/shared/src/schemas/*`
- `packages/shared/src/sdk/client.ts`

## Acceptance Criteria
- Type checks pass in shared package.
- Example import in admin web compiles.

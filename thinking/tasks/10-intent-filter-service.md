# Task 10: IntentFilterService

Paste the Prompt Prefix from `thinking/ai-master-guidelines.md` at the top of your working prompt.

## Objective
Provide flexible intent-based filtering and query enhancement strategies.

## Inputs
- `thinking/final-requirements.md`

## Dependencies
- Tasks 09

## Steps
1. Implement `filterContextsByIntent(tenantId, query, intentFilters, options)`.
2. Strategies: scope-only, action-only, scope+action, text-only fallback, combined query (detail merge).
3. Return diagnostics: which filters applied, combined query, counts.
4. Add unit tests for each strategy.

## Deliverables
- `apps/backend/src/core/intent/IntentFilterService.ts`
- Tests `apps/backend/tests/unit/IntentFilterService.test.ts`

## Acceptance Criteria
- All strategies behave as specified; tests pass.

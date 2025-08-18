## 06) Testing and Validation

### Objective
Ensure correctness via unit, integration, and UI smoke tests.

### Steps
- Backend tests
  - Unit: repositories/services (Vitest)
  - Integration: API routes with in-memory or test DB
- UI tests
  - Smoke tests for each menu: render, navigate, create/edit basic flow
  - Snapshot minimal where helpful
- Lint/type checks
  - Ensure no linter errors; TypeScript strict for shared types

### Acceptance
- Green test suite; manual verification of key user journeys.


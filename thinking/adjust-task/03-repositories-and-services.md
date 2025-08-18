## 03) Repositories and Services

### Objective
Implement repository and service layers to support CRUD, linking, and query operations required by the UI.

### Steps
- Repositories:
  - `IntentsRepository`, `InstructionProfilesRepository`, `ProfileTargetsRepository`
  - `ContextsRepository` (extend existing), `ContextIntentsRepository`, `ContextOverridesRepository`
  - `QueryLogsRepository`, `UsersRepository`
  - Provide typed methods: list/filter/sort/paginate, CRUD, bulk link/unlink
- Services:
  - `IntentService`: merge/rename intents, safe updates
  - `ProfileService`: resolve profile by target, version/diff
  - `ContextService`: type-aware validation, bulk linking
  - `LogService`: basic analytics for dashboard
- Cache:
  - Use Redis for profile resolution, intent-context mapping; set TTLs

### Acceptance
- All repositories/services compile and have unit tests for core flows.


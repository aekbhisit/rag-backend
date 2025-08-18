## 04) API Routes and Schemas

### Objective
Expose REST APIs with Zod validation to power the admin UI.

### Steps
- Define OpenAPI and Zod schemas in `packages/shared` (or reuse existing):
  - Intents, Profiles, Targets, Contexts, Links, Overrides, Logs, Users
- Backend routes (Express):
  - `POST /classify` (stub ok)
  - `POST /answer` (stub ok)
  - `GET /preview` (dry run)
  - CRUD for `intents`, `instruction-profiles`, `profile-targets`, `contexts`, `context-intents`, `context-overrides`, `query-logs`, `users`
- Implement pagination and filters; enforce tenant context.
- Add basic error envelope with request_id.

### Acceptance
- APIs respond with validated payloads; cover with integration tests.


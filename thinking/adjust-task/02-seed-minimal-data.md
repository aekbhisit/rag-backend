## 02) Seed Minimal Data

### Objective
Insert simple demo data to support UI development and tests.

### Steps
- Create seed scripts in `infra/db/seed/` for:
  - `tenants` (demo)
  - `users` (admin@demo, viewer@demo)
  - `intents` (e.g., general.question, support.technical)
  - `instruction_profiles` (default, cautious)
  - `profile_targets` mapping profiles to intents
  - `contexts` across types with basic attributes
  - `context_intents` links
  - `query_logs` few sample records

### Acceptance
- Running seed populates all required tables and the admin UI lists show data.


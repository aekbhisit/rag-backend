## 00) Design Review and Mapping

### Objective
Review the updated UI design (theme) and map each screen to data entities, APIs, and events needed to make it work.

### Deliverables
- Screen → Data mapping document per module:
  - Dashboards
  - Contexts
  - Intents
  - Instruction Profiles
  - Profile Targets
  - Context Profile Overrides
  - Query Logs
  - Users
- For each, list:
  - Required fields, derived fields, filters/sorts
  - Actions (create, update, delete, link/unlink)
  - API endpoints and payload schemas
  - Simple mock dataset required for development

### Acceptance
- A concise mapping exists per module covering UI needs end-to-end.

### Execution Steps
- Create a short spec block at the top of each admin page component (temporary comment) listing fields/actions used.
- Produce a single mapping note under `thinking/adjust-task/mapping.md` with sections per module:
  - Contexts: {id, tenant_id, type, title, attributes, status, linked_intents[]}
  - Intents: {id, scope, action, detail, slug}
  - Profiles: {id, name, version, min_trust_level, policy_json}
  - Targets: {id, profile_id, intent_id, channel, segment, priority}
  - Overrides: {id, context_id, profile_id, override_json}
  - Logs: {id, intent_used_id, profile_id, confidence, latency_ms, citations[]}
- Include filters/sorts for each list view; and mock entries count for seed.


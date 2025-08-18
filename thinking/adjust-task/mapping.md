## UI ↔ Data Mapping

### Contexts
- Fields: id, tenant_id, type, title, body, attributes{}, trust_level, language, created_at, updated_at
- Links: context_intents (context_id, intent_id)
- List filters: type, trust_level range, language, text search(title/body)

### Intents
- Fields: id, tenant_id, scope, action, description, created_at
- Derived: slug = `${scope}.${action}`
- List filters: scope/action text
- Actions: merge/rename (preserve links)

### Instruction Profiles
- Fields: id, tenant_id, name, version, answer_style{}, retrieval_policy{}, trust_safety{}, glossary{}, ai_instruction_message, is_active, min_trust_level
- Actions: version/diff, staged publish

### Profile Targets
- Fields: profile_id, tenant_id, intent_scope, intent_action, channel, user_segment, priority
- Behavior: sort by priority desc; higher priority wins

### Context Profile Overrides
- Fields: id, tenant_id, context_id, profile_id, instruction_delta
- Derived: effective_profile = base(profile_id) + delta

### Query Logs
- Fields: id, tenant_id, user_id, query, detected_language, profile_id, retrieval_method, latency_ms, confidence, request_jsonb, response_jsonb, citations_jsonb[], created_at
- Filters: time range, intent, confidence, zero-hit

### Users
- Fields: id, tenant_id, email, role, created_at, updated_at


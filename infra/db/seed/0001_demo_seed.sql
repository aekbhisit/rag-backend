-- Demo seed for tenants, users, intents, profiles, targets, contexts, links, logs
INSERT INTO tenants (id, name, settings) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Demo Tenant', '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Users
INSERT INTO rag_users (tenant_id, email, role) VALUES
  ('00000000-0000-0000-0000-000000000000', 'admin@demo.local', 'admin')
ON CONFLICT DO NOTHING;

-- Intents
INSERT INTO intents (tenant_id, scope, action, description) VALUES
  ('00000000-0000-0000-0000-000000000000', 'general', 'question', 'Generic Q&A'),
  ('00000000-0000-0000-0000-000000000000', 'support', 'technical', 'Technical support')
ON CONFLICT DO NOTHING;

-- Profiles
INSERT INTO instruction_profiles (tenant_id, name, version, ai_instruction_message, min_trust_level) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Default', 1, 'Answer concisely with citations.', 0),
  ('00000000-0000-0000-0000-000000000000', 'Cautious', 1, 'Answer conservatively; prefer clarifications.', 2)
ON CONFLICT DO NOTHING;

-- Profile targets (use broad matching by scope/action)
INSERT INTO profile_targets (profile_id, tenant_id, intent_scope, intent_action, priority)
SELECT p.id, p.tenant_id, 'general', 'question', 10 FROM instruction_profiles p WHERE p.name='Default' AND p.tenant_id='00000000-0000-0000-0000-000000000000'
ON CONFLICT DO NOTHING;

-- Contexts
INSERT INTO contexts (tenant_id, type, title, body, attributes, trust_level, language) VALUES
  ('00000000-0000-0000-0000-000000000000', 'website', 'Docs Home', 'Welcome to the docs', '{"url":"https://example.com/docs"}', 1, 'en'),
  ('00000000-0000-0000-0000-000000000000', 'doc_chunk', 'Install Guide', 'Install steps...', '{"page":1}', 1, 'en')
ON CONFLICT DO NOTHING;

-- Link contexts to intents
INSERT INTO context_intents (context_id, intent_id)
SELECT c.id, i.id FROM contexts c, intents i
WHERE c.tenant_id='00000000-0000-0000-0000-000000000000' AND i.scope='general' AND i.action='question'
ON CONFLICT DO NOTHING;

-- Logs
INSERT INTO query_logs (tenant_id, user_id, query, retrieval_method, latency_ms)
VALUES ('00000000-0000-0000-0000-000000000000', 'admin@demo.local', 'hello', 'fallback', 10)
ON CONFLICT DO NOTHING;


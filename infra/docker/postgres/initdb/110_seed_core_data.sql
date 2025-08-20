-- 110_seed_core_data.sql
-- Seed data for core tables: tenants, users, ai_pricing
-- This file contains sample data that will be inserted during database setup

-- -- Insert default admin user
-- INSERT INTO users (id, tenant_id, email, role, name, status, timezone, password_hash, created_at)
-- VALUES (
--   '11111111-1111-1111-1111-111111111111',
--   'acc44cdb-8da5-4226-9569-1233a39f564f',
--   'admin@example.com',
--   'admin',
--   'Admin',
--   'active',
--   'UTC',
--   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: 'password'
--   now()
-- ) ON CONFLICT (tenant_id, email) DO NOTHING;

-- Insert AI pricing data for OpenAI models
INSERT INTO ai_pricing (id, tenant_id, provider, model, input_per_1k, cached_input_per_1k, output_per_1k, embedding_per_1k, currency, version, is_active, created_at)
VALUES 
  -- GPT-5 models
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-5', 0.00125, 0.000125, 0.01, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-5-mini', 0.00025, 0.000025, 0.002, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-5-nano', 0.00005, 0.000005, 0.0004, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-5-chat-latest', 0.00125, 0.000125, 0.01, null, 'USD', '2025-08-16', true, now()),
  
  -- GPT-4.1 models
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4.1', 0.002, 0.0005, 0.008, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4.1-mini', 0.0004, 0.0001, 0.0016, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4.1-nano', 0.0001, 0.000025, 0.0004, null, 'USD', '2025-08-16', true, now()),
  
  -- GPT-4o models
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4o', 0.0025, 0.00125, 0.01, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4o-2024-05-13', 0.005, null, 0.015, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4o-audio-preview', 0.0025, null, 0.01, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4o-realtime-preview', 0.005, 0.0025, 0.02, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4o-mini', 0.00015, 0.000075, 0.0006, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4o-mini-audio-preview', 0.00015, null, 0.0006, null, 'USD', '2025-08-16', true, now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'gpt-4o-mini-realtime-preview', 0.0006, 0.0003, 0.0024, null, 'USD', '2025-08-16', true, now()),
  
  -- Embedding model
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'openai', 'text-embedding-3-small', null, null, null, 0.00002, 'USD', '2025-08-16', true, now())
ON CONFLICT (tenant_id, provider, model) DO NOTHING;

-- Insert some basic categories
INSERT INTO categories (id, tenant_id, name, description, created_at)
VALUES 
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'General', 'General information and documents', now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'Technical', 'Technical documentation and guides', now()),
  (gen_random_uuid(), 'acc44cdb-8da5-4226-9569-1233a39f564f', 'Support', 'Customer support and FAQ content', now())
ON CONFLICT DO NOTHING;

-- Insert some basic prompts
INSERT INTO prompts (id, key, name, template, description, is_default, created_at)
VALUES 
  (gen_random_uuid(), 'general_qa', 'General Q&A', 'You are a helpful assistant. Answer the following question based on the provided context: {{question}}', 'Default prompt for general questions', true, now()),
  (gen_random_uuid(), 'technical_support', 'Technical Support', 'You are a technical support specialist. Help the user with their technical issue: {{issue}}', 'Prompt for technical support questions', false, now()),
  (gen_random_uuid(), 'summarize', 'Document Summary', 'Please provide a concise summary of the following document: {{document}}', 'Prompt for document summarization', false, now())
ON CONFLICT (key) DO NOTHING;

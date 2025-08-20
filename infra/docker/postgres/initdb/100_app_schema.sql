-- 100_app_schema.sql
-- Complete database schema for RAG Assistant
-- This file contains all table definitions and indexes
-- Extensions are handled by 001_extensions.sql

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(255) NOT NULL,
  code varchar(50) UNIQUE NOT NULL,
  slug varchar(100) UNIQUE NOT NULL,
  contact_email varchar(255),
  is_active boolean DEFAULT true,
  settings jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email varchar NOT NULL,
  role varchar NOT NULL DEFAULT 'admin',
  name text,
  status varchar NOT NULL DEFAULT 'active',
  timezone varchar NOT NULL DEFAULT 'UTC',
  password_hash text,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz,
  UNIQUE(tenant_id, email)
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar(255) NOT NULL,
  description text,
  parent_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Contexts table
CREATE TABLE IF NOT EXISTS contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  type varchar(50) DEFAULT 'document',
  title varchar(500) NOT NULL,
  body text NOT NULL,
  instruction text,
  attributes jsonb DEFAULT '{}',
  trust_level varchar(50) DEFAULT 'medium',
  language varchar(10),
  status varchar(30) DEFAULT 'active',
  keywords text[],
  source_url varchar(1000),
  file_path varchar(1000),
  file_size integer,
  embedding vector(1536),
  latitude double precision,
  longitude double precision,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- Context link tables
CREATE TABLE IF NOT EXISTS context_categories (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (tenant_id, context_id, category_id)
);

CREATE TABLE IF NOT EXISTS context_intent_scopes (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  scope_id uuid NOT NULL,
  PRIMARY KEY (tenant_id, context_id, scope_id)
);

CREATE TABLE IF NOT EXISTS context_intent_actions (
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  action_id uuid NOT NULL,
  PRIMARY KEY (tenant_id, context_id, action_id)
);

CREATE TABLE IF NOT EXISTS context_edit_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  user_email varchar(255),
  action varchar(50) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Intents tables
CREATE TABLE IF NOT EXISTS intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope varchar(100) NOT NULL,
  action varchar(100) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS intent_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope varchar(100) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS intent_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  action varchar(100) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Prompts table
CREATE TABLE IF NOT EXISTS prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key varchar(100) NOT NULL,
  name varchar(255) NOT NULL,
  template text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- AI Pricing table
CREATE TABLE IF NOT EXISTS ai_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  provider text NOT NULL,
  model text NOT NULL,
  input_per_1k double precision,
  cached_input_per_1k double precision,
  output_per_1k double precision,
  embedding_per_1k double precision,
  currency text DEFAULT 'USD',
  version text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);

-- AI Usage Logs table
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  observation_id text,
  trace_id text,
  request_id text,
  environment text,
  project_id text,
  endpoint text,
  operation text NOT NULL,
  provider text,
  model text,
  model_version text,
  start_time timestamptz,
  end_time timestamptz,
  latency_ms integer,
  usage_input_tokens integer,
  usage_cached_input_tokens integer,
  usage_output_tokens integer,
  usage_total_tokens integer,
  pricing_input_per_1k double precision,
  pricing_cached_input_per_1k double precision,
  pricing_output_per_1k double precision,
  pricing_total_per_1k double precision,
  pricing_version text,
  pricing_source text,
  cost_input_usd double precision,
  cost_output_usd double precision,
  cost_total_usd double precision,
  cost_currency text,
  cost_source text,
  status text,
  error_message text,
  context_ids text[],
  category_ids text[],
  intent_scope text,
  intent_action text,
  metadata jsonb,
  imported_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- RAG Requests table
CREATE TABLE IF NOT EXISTS rag_requests (
  tenant_id uuid NOT NULL,
  id text PRIMARY KEY,
  endpoint text NOT NULL,
  query text,
  prompt_key text,
  prompt_params jsonb,
  prompt_text text,
  model text,
  answer_text text,
  answer_status boolean DEFAULT false,
  contexts_used text[],
  intent_scope text,
  intent_action text,
  intent_detail text,
  latency_ms integer,
  created_at timestamptz DEFAULT now(),
  request_body jsonb,
  embedding_usage_id text,
  generating_usage_id text
);

-- Query Logs table
CREATE TABLE IF NOT EXISTS query_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  user_email text,
  question text,
  answer text,
  status text,
  latency_ms integer,
  created_at timestamptz DEFAULT now()
);

-- Instruction Profiles table
CREATE TABLE IF NOT EXISTS instruction_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  version integer DEFAULT 1,
  answer_style jsonb,
  retrieval_policy jsonb,
  trust_safety jsonb,
  glossary jsonb,
  ai_instruction_message text NOT NULL,
  is_active boolean DEFAULT true,
  min_trust_level integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Profile Targets table
CREATE TABLE IF NOT EXISTS profile_targets (
  profile_id uuid NOT NULL,
  tenant_id uuid NOT NULL,
  intent_scope text,
  intent_action text,
  channel text NOT NULL DEFAULT '',
  user_segment text NOT NULL DEFAULT '',
  priority integer DEFAULT 0
);

-- Context Profile Overrides table
CREATE TABLE IF NOT EXISTS context_profile_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL,
  overrides jsonb NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Context Images table
CREATE TABLE IF NOT EXISTS context_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt text,
  created_at timestamptz DEFAULT now()
);

-- Context Usage Stats table
CREATE TABLE IF NOT EXISTS context_usage_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  views integer DEFAULT 0,
  likes integer DEFAULT 0,
  dislikes integer DEFAULT 0,
  last_viewed_at timestamptz
);

-- Summary Stats table
CREATE TABLE IF NOT EXISTS summary_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  stat_key text NOT NULL,
  stat_value numeric,
  recorded_at timestamptz DEFAULT now()
);

-- Tenant Settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key text NOT NULL,
  value jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz,
  UNIQUE(tenant_id, key)
);

-- User Sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(session_token)
);

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_type text,
  resource_id text,
  details jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_email ON public.users(tenant_id, email);
CREATE INDEX IF NOT EXISTS idx_categories_tenant_parent ON categories(tenant_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_contexts_tenant_category ON contexts(tenant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_contexts_keywords ON contexts USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_intents_tenant_scope_action ON intents(tenant_id, scope, action);
CREATE INDEX IF NOT EXISTS idx_prompts_key ON prompts(key);
CREATE INDEX IF NOT EXISTS ai_pricing_tenant_idx ON ai_pricing(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS ai_pricing_unique ON ai_pricing(tenant_id, provider, model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant ON ai_usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_usage_logs(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs(model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);
CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON ai_usage_logs(operation);
CREATE INDEX IF NOT EXISTS idx_rag_requests_tenant ON rag_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rag_requests_created ON rag_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_logs_tenant ON query_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_query_logs_created ON query_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instruction_profiles_tenant ON instruction_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_profile_targets_tenant ON profile_targets(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_profile_targets_unique ON profile_targets 
  (profile_id, tenant_id, COALESCE(intent_scope, ''), COALESCE(intent_action, ''), channel, user_segment);
CREATE INDEX IF NOT EXISTS idx_tenant_settings_tenant_key ON tenant_settings(tenant_id, key);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_token ON user_sessions(user_id, session_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_user ON audit_logs(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Vector index for embeddings (if available)
CREATE INDEX IF NOT EXISTS idx_contexts_embedding ON contexts 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Add constraints
ALTER TABLE public.users ADD CONSTRAINT IF NOT EXISTS users_status_chk 
CHECK (status IN ('active','inactive','pending'));

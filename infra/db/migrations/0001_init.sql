-- Initial schema
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar NOT NULL,
  settings jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

CREATE TABLE IF NOT EXISTS intents (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  scope varchar NOT NULL,
  action varchar NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS intents_tenant_scope_action_idx ON intents(tenant_id, scope, action);

CREATE TABLE IF NOT EXISTS contexts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type varchar NOT NULL,
  title varchar NOT NULL,
  body text NOT NULL,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  trust_level integer NOT NULL DEFAULT 0,
  language varchar,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contexts_tenant_idx ON contexts(tenant_id);
CREATE INDEX IF NOT EXISTS contexts_type_idx ON contexts(type);
CREATE INDEX IF NOT EXISTS contexts_trust_idx ON contexts(trust_level);
CREATE INDEX IF NOT EXISTS contexts_lang_idx ON contexts(language);

CREATE TABLE IF NOT EXISTS instruction_profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name varchar NOT NULL,
  version integer NOT NULL DEFAULT 1,
  answer_style jsonb,
  retrieval_policy jsonb,
  trust_safety jsonb,
  glossary jsonb,
  ai_instruction_message text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS instruction_profiles_tenant_idx ON instruction_profiles(tenant_id);

CREATE TABLE IF NOT EXISTS profile_targets (
  profile_id uuid NOT NULL REFERENCES instruction_profiles(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  intent_scope varchar,
  intent_action varchar,
  channel varchar NOT NULL DEFAULT '',
  user_segment varchar NOT NULL DEFAULT '',
  priority integer NOT NULL DEFAULT 0,
  PRIMARY KEY (profile_id, tenant_id, intent_scope, intent_action, channel, user_segment)
);
CREATE INDEX IF NOT EXISTS profile_targets_priority_idx ON profile_targets(tenant_id, priority DESC);

CREATE TABLE IF NOT EXISTS context_intents (
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  intent_id uuid NOT NULL REFERENCES intents(id) ON DELETE CASCADE,
  PRIMARY KEY (context_id, intent_id)
);

CREATE TABLE IF NOT EXISTS context_profile_overrides (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  context_id uuid NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES instruction_profiles(id) ON DELETE CASCADE,
  instruction_delta text
);
CREATE INDEX IF NOT EXISTS cpo_tenant_context_idx ON context_profile_overrides(tenant_id, context_id);

CREATE TABLE IF NOT EXISTS query_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id varchar,
  query text NOT NULL,
  detected_language varchar,
  profile_id uuid REFERENCES instruction_profiles(id) ON DELETE SET NULL,
  retrieval_method varchar,
  latency_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS query_logs_tenant_created_idx ON query_logs(tenant_id, created_at DESC);



-- Add missing fields per mapping (min_trust_level, optional log fields)
ALTER TABLE instruction_profiles ADD COLUMN IF NOT EXISTS min_trust_level integer DEFAULT 0;

-- Optional extended log fields for analytics/audit
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS confidence numeric;
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS request_jsonb jsonb;
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS response_jsonb jsonb;
ALTER TABLE query_logs ADD COLUMN IF NOT EXISTS citations_jsonb jsonb;

-- App users (avoid collision with other services)
CREATE TABLE IF NOT EXISTS rag_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email varchar NOT NULL UNIQUE,
  role varchar NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);
CREATE INDEX IF NOT EXISTS rag_users_tenant_idx ON rag_users(tenant_id);


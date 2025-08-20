-- Migration: Extend rag_users with name, status, last_login
-- Description: Adds commonly used user fields to align with admin UI

ALTER TABLE rag_users ADD COLUMN IF NOT EXISTS name varchar;
ALTER TABLE rag_users ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'active';
ALTER TABLE rag_users ADD COLUMN IF NOT EXISTS last_login timestamptz;

-- Constrain status to expected values
DO $$ BEGIN
  ALTER TABLE rag_users ADD CONSTRAINT rag_users_status_check CHECK (status IN ('active','inactive','pending'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helpful index for tenant filtering
CREATE INDEX IF NOT EXISTS rag_users_status_idx ON rag_users(status);



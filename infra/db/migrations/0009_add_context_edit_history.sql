-- Migration: Add context_edit_history table to track edits

CREATE TABLE IF NOT EXISTS context_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  context_id UUID NOT NULL REFERENCES contexts(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  action VARCHAR(50) NOT NULL, -- CREATE/UPDATE/DELETE
  field VARCHAR(255),
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_context_edit_history_tenant_context ON context_edit_history(tenant_id, context_id, created_at DESC);

-- RLS
ALTER TABLE context_edit_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY context_edit_history_tenant_isolation ON context_edit_history
  USING (tenant_id = current_setting('app.current_tenant')::uuid);

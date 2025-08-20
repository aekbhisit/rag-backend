-- Enable RLS on tenant-scoped tables
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE instruction_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_profile_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rag_users ENABLE ROW LEVEL SECURITY;

-- Application role should be created externally; policies use app.current_tenant_id
CREATE POLICY tenant_isolation_intents ON intents
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_contexts ON contexts
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_instruction_profiles ON instruction_profiles
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_profile_targets ON profile_targets
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_cpo ON context_profile_overrides
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_query_logs ON query_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_rag_users ON rag_users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);



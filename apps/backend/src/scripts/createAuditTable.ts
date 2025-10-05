import { getPostgresPool } from '../adapters/db/postgresClient';

export async function createAuditTable() {
  const pool = getPostgresPool();
  
  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id uuid NOT NULL,
      user_id uuid,
      endpoint text NOT NULL,
      method text NOT NULL,
      ip_address inet,
      user_agent text,
      request_size integer,
      response_status integer NOT NULL,
      response_time integer NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    
    CREATE INDEX IF NOT EXISTS audit_logs_tenant_created_idx ON audit_logs(tenant_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS audit_logs_endpoint_idx ON audit_logs(endpoint, created_at DESC);
  `);
}

// Run this script to create the audit table
if (require.main === module) {
  createAuditTable().then(() => {
    console.log('Audit table created successfully');
    process.exit(0);
  }).catch(error => {
    console.error('Failed to create audit table:', error);
    process.exit(1);
  });
}

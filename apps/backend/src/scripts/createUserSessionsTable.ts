import { getPostgresPool } from '../adapters/db/postgresClient';

async function createUserSessionsTable() {
  try {
    const pool = getPostgresPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_sessions (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL,
        tenant_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000',
        ip_address INET NOT NULL,
        user_agent TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        is_active BOOLEAN DEFAULT true,
        metadata JSONB,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for performance
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_tenant_id ON user_sessions(tenant_id)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(is_active)
    `);

    console.log('✅ User sessions table created successfully');
  } catch (error) {
    console.error('❌ Error creating user sessions table:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createUserSessionsTable()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createUserSessionsTable };

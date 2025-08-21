import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function runMigration() {
  try {
    console.log('🔄 Running error_logs table migration...');
    
    const pool = getPostgresPool();
    const client = await pool.connect();
    
    try {
      // Rename the old 'status' column to 'http_status'
      console.log('🔄 Renaming status column to http_status...');
      await client.query('ALTER TABLE error_logs RENAME COLUMN status TO http_status');
      console.log('✅ Column renamed successfully');
      
      // Add new columns for status management
      console.log('➕ Adding new columns...');
      await client.query('ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS log_status text DEFAULT \'open\'');
      await client.query('ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS notes text');
      await client.query('ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS fixed_by text');
      await client.query('ALTER TABLE error_logs ADD COLUMN IF NOT EXISTS fixed_at timestamptz');
      console.log('✅ New columns added successfully');
      
      // Verify the changes
      console.log('📋 Verifying table structure...');
      const { rows } = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        ORDER BY ordinal_position
      `);
      
      console.log('Final columns:', rows.map(r => r.column_name));
      
      console.log('🎉 Migration completed successfully!');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration().catch(console.error);

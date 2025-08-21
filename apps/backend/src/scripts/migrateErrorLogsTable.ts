import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function migrateErrorLogsTable() {
  try {
    console.log('🔄 Starting error_logs table migration...');
    
    const pool = getPostgresPool();
    const client = await pool.connect();
    
    try {
      // Check current table structure
      console.log('📋 Checking current table structure...');
      const { rows } = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        ORDER BY ordinal_position
      `);
      
      console.log('Current columns:', rows.map(r => r.column_name));
      
      // Check if we need to rename 'status' to 'http_status'
      const hasOldStatus = rows.some(r => r.column_name === 'status');
      const hasHttpStatus = rows.some(r => r.column_name === 'http_status');
      
      if (hasOldStatus && !hasHttpStatus) {
        console.log('🔄 Renaming "status" column to "http_status"...');
        await client.query('ALTER TABLE error_logs RENAME COLUMN status TO http_status');
        console.log('✅ Column renamed successfully');
      }
      
      // Check and add new columns
      const newColumns = [
        { name: 'log_status', type: 'text', default: "'open'", nullable: true },
        { name: 'notes', type: 'text', default: null, nullable: true },
        { name: 'fixed_by', type: 'text', default: null, nullable: true },
        { name: 'fixed_at', type: 'timestamptz', default: null, nullable: true }
      ];
      
      for (const column of newColumns) {
        const exists = rows.some(r => r.column_name === column.name);
        
        if (!exists) {
          console.log(`➕ Adding column "${column.name}"...`);
          let sql = `ALTER TABLE error_logs ADD COLUMN ${column.name} ${column.type}`;
          
          if (column.default) {
            sql += ` DEFAULT ${column.default}`;
          }
          
          if (!column.nullable) {
            sql += ' NOT NULL';
          }
          
          await client.query(sql);
          console.log(`✅ Column "${column.name}" added successfully`);
        } else {
          console.log(`ℹ️  Column "${column.name}" already exists`);
        }
      }
      
      // Verify final structure
      console.log('📋 Verifying final table structure...');
      const finalCheck = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        ORDER BY ordinal_position
      `);
      
      console.log('Final columns:', finalCheck.rows.map(r => r.column_name));
      
      // Test inserting a record
      console.log('🧪 Testing insert with new structure...');
      const testResult = await client.query(`
        INSERT INTO error_logs (
          tenant_id, endpoint, method, http_status, message, error_code, 
          stack, file, line, column_no, headers, query, body, request_id,
          log_status, notes, fixed_by, fixed_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', '/test', 'GET', 500, 
          'Migration test', 'MIGRATION_TEST', 'Test stack', 'migration.ts', 
          1, 1, '{}', '{}', '{}', 'test-request-id',
          'open', 'Migration test note', 'migration-script', now()
        ) RETURNING id
      `);
      
      console.log('✅ Test insert successful, ID:', testResult.rows[0].id);
      
      // Clean up test record
      await client.query('DELETE FROM error_logs WHERE id = $1', [testResult.rows[0].id]);
      console.log('🧹 Test record cleaned up');
      
      console.log('🎉 Migration completed successfully!');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateErrorLogsTable().catch(console.error);

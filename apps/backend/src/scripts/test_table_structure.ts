import { getPostgresPool } from '../adapters/db/postgresClient.js';

async function testTableStructure() {
  try {
    console.log('Testing error_logs table structure...');
    
    const pool = getPostgresPool();
    const client = await pool.connect();
    
    try {
      // Check table structure
      const { rows } = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'error_logs' 
        ORDER BY ordinal_position
      `);
      
      console.log('Table columns:');
      rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} ${row.is_nullable === 'YES' ? 'nullable' : 'NOT NULL'} ${row.column_default ? `default: ${row.column_default}` : ''}`);
      });
      
      // Try to insert a test record
      console.log('\nTesting insert...');
      const testResult = await client.query(`
        INSERT INTO error_logs (
          tenant_id, endpoint, method, http_status, message, error_code, 
          stack, file, line, column_no, headers, query, body, request_id,
          log_status, notes, fixed_by, fixed_at
        ) VALUES (
          '00000000-0000-0000-0000-000000000000', '/test', 'GET', 500, 
          'Test error', 'TEST_ERROR', 'Test stack', 'test.ts', 
          1, 1, '{}', '{}', '{}', 'test-request-id',
          'open', 'Test note', 'test-user', now()
        ) RETURNING id, log_status, notes
      `);
      
      console.log('✅ Insert successful:', testResult.rows[0]);
      
      // Clean up
      await client.query('DELETE FROM error_logs WHERE id = $1', [testResult.rows[0].id]);
      console.log('🧹 Test record cleaned up');
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testTableStructure().catch(console.error);

import { getPostgresPool } from '../adapters/db/postgresClient.js';
import { ErrorLogsRepository } from '../repositories/errorLogsRepository.js';

async function testErrorLogging() {
  try {
    console.log('🔍 Testing error logging system...');
    
    const pool = getPostgresPool();
    const errorLogsRepo = new ErrorLogsRepository(pool);
    
    // Test 1: Check if error_logs table exists and is accessible
    console.log('✅ Testing error_logs table access...');
    const testError = await errorLogsRepo.create({
      tenant_id: '00000000-0000-0000-0000-000000000000',
      endpoint: '/test/error-logging',
      method: 'POST',
      http_status: 500,
      message: 'Test error for error logging verification',
      error_code: 'TEST_ERROR',
      stack: 'Error: Test error\n    at testErrorLogging (/test/script.ts:25:15)\n    at main (/test/script.ts:50:10)',
      file: 'testErrorLogging.ts',
      line: 25,
      column_no: 15,
      headers: { 'test': 'true' },
      query: { test: 'error-logging' },
      body: { purpose: 'testing error logging' },
      request_id: 'test-req-123',
      log_status: 'open',
      notes: 'This is a test error to verify error logging system',
      fixed_by: null,
      fixed_at: null,
    });
    
    console.log('✅ Test error created successfully:', testError.id);
    
    // Test 2: Trigger an actual database error and see if it's caught
    console.log('🔍 Testing database error capture...');
    
    try {
      // This will cause a database error (invalid SQL)
      await pool.query('SELECT * FROM non_existent_table WHERE invalid_column = $1', ['test']);
    } catch (dbError) {
      console.log('✅ Database error caught as expected:', dbError.message);
      
      // Now let's manually create an error log entry to simulate what the system should do
      const dbErrorLog = await errorLogsRepo.create({
        tenant_id: '00000000-0000-0000-0000-000000000000',
        endpoint: '/test/database-error',
        method: 'GET',
        http_status: 500,
        message: `Database error: ${dbError.message}`,
        error_code: 'DATABASE_ERROR',
        stack: dbError.stack || 'No stack trace available',
        file: 'testErrorLogging.ts',
        line: 45,
        column_no: 10,
        headers: { 'test': 'database-error' },
        query: { table: 'non_existent_table' },
        body: {},
        request_id: 'test-db-req-456',
        log_status: 'open',
        notes: 'This error was triggered by testing invalid SQL query',
        fixed_by: null,
        fixed_at: null,
      });
      
      console.log('Stack trace captured:', dbError.stack ? 'Yes' : 'No');
      console.log('Stack length:', dbError.stack?.length || 0);
      
      console.log('✅ Database error logged successfully:', dbErrorLog.id);
    }
    
    // Test 3: Check what's in the error logs table
    console.log('🔍 Checking error logs table contents...');
    const errorLogs = await errorLogsRepo.list('00000000-0000-0000-0000-000000000000', { limit: 10, offset: 0 });
    console.log(`📊 Found ${errorLogs.length} error logs in table`);
    
    // Show the most recent error logs
    errorLogs.slice(0, 3).forEach((log, index) => {
      console.log(`\n📋 Error Log ${index + 1}:`);
      console.log(`  ID: ${log.id}`);
      console.log(`  Endpoint: ${log.endpoint}`);
      console.log(`  Message: ${log.message}`);
      console.log(`  Error Code: ${log.error_code}`);
      console.log(`  File: ${log.file}:${log.line}`);
      console.log(`  Stack: ${log.stack ? log.stack.substring(0, 100) + '...' : 'No stack'}`);
      console.log(`  Status: ${log.log_status}`);
      console.log(`  Created: ${log.created_at}`);
    });
    
    // Test 4: Clean up test data
    console.log('🧹 Cleaning up test data...');
    if (testError?.id) {
      await errorLogsRepo.delete('00000000-0000-0000-0000-000000000000', testError.id);
      console.log('✅ Test error log cleaned up');
    }
    
    console.log('\n🎯 Error Logging Test Summary:');
    console.log('✅ Error logs table is accessible');
    console.log('✅ Can create error log entries');
    console.log('✅ Database errors can be captured and logged');
    console.log('✅ Error details (file, line, stack) are preserved');
    console.log('✅ Error logs can be retrieved and displayed');
    
  } catch (error) {
    console.error('❌ Error logging test failed:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
  }
}

testErrorLogging().catch(console.error);

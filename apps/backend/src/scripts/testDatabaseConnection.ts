import { getPostgresPool } from '../adapters/db/postgresClient.js';
import { ErrorLogsRepository } from '../repositories/errorLogsRepository.js';

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    
    const pool = getPostgresPool();
    
    // Test basic connection
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test if error_logs table exists
    try {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'error_logs'
        );
      `);
      
      const tableExists = result.rows[0]?.exists;
      console.log(`📋 error_logs table exists: ${tableExists}`);
      
      if (!tableExists) {
        console.log('Creating error_logs table...');
        const errorLogsRepo = new ErrorLogsRepository(pool);
        await errorLogsRepo.ensureTable();
        console.log('✅ error_logs table created successfully');
      }
      
      // Test if categories table exists
      const categoriesResult = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'categories'
        );
      `);
      
      const categoriesTableExists = categoriesResult.rows[0]?.exists;
      console.log(`📋 categories table exists: ${categoriesTableExists}`);
      
      if (categoriesTableExists) {
        // Test categories query
        const categoriesCount = await client.query('SELECT COUNT(*) FROM categories');
        console.log(`📊 Categories count: ${categoriesCount.rows[0]?.count}`);
      }
      
    } catch (error) {
      console.error('❌ Error checking tables:', error);
    }
    
    client.release();
    
    // Test error logging
    console.log('Testing error logging...');
    const errorLogsRepo = new ErrorLogsRepository(pool);
    const testError = await errorLogsRepo.create({
      tenant_id: '00000000-0000-0000-0000-000000000000',
      endpoint: '/test',
      method: 'GET',
      http_status: 500,
      message: 'Test error log',
      error_code: 'TEST_ERROR',
      stack: 'Test stack trace',
      file: 'test.ts',
      line: 1,
      column_no: 1,
      headers: { 'test': 'header' },
      query: { test: 'query' },
      body: { test: 'body' },
      request_id: 'test_request_id',
      log_status: 'open',
      notes: null,
      fixed_by: null,
      fixed_at: null
    });
    
    console.log('✅ Error log created successfully:', testError.id);
    
    // List error logs
    const errorLogs = await errorLogsRepo.list('00000000-0000-0000-0000-000000000000', { limit: 10, offset: 0 });
    console.log(`📋 Total error logs: ${errorLogs.length}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testDatabaseConnection().catch(console.error);

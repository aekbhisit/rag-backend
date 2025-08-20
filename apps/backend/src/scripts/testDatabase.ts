import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function testConnection() {
  try {
    console.log('🔌 Testing database connection...');
    
    const client = await pool.connect();
    console.log('✅ Database connection successful');
    
    // Test basic query
    const result = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', result.rows[0].version);
    
    // Test if we can create a simple table
    console.log('🧪 Testing table creation...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS test_table (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Test table created successfully');
    
    // Test insert
    await client.query(`
      INSERT INTO test_table (name) VALUES ($1) 
      ON CONFLICT DO NOTHING
    `, ['test_entry']);
    console.log('✅ Test data inserted successfully');
    
    // Test select
    const testResult = await client.query('SELECT * FROM test_table LIMIT 1');
    console.log('✅ Test data retrieved:', testResult.rows[0]);
    
    // Clean up test table
    await client.query('DROP TABLE IF EXISTS test_table');
    console.log('✅ Test table cleaned up');
    
    client.release();
    console.log('🎉 All database tests passed!');
    
  } catch (error) {
    console.error('❌ Database test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await testConnection();
  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

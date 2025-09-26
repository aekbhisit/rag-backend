import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function checkPromptsTable() {
  const pool = getPostgresPool();
  
  try {
    console.log('Checking prompts table structure...');
    
    // Check if prompts table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'prompts'
      )
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('Prompts table does not exist!');
      return;
    }
    
    // Get table structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'prompts'
      ORDER BY ordinal_position
    `);
    
    console.log('Prompts table structure:');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check sample data
    const sampleData = await pool.query('SELECT * FROM prompts LIMIT 1');
    if (sampleData.rows.length > 0) {
      console.log('\nSample prompt data:');
      console.log(JSON.stringify(sampleData.rows[0], null, 2));
    } else {
      console.log('\nNo prompts found in the table.');
    }
    
  } catch (error) {
    console.error('Error checking prompts table:', error);
  } finally {
    await pool.end();
  }
}

checkPromptsTable();

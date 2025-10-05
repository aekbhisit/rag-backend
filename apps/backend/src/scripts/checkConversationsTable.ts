import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function checkConversationsTable() {
  const pool = getPostgresPool();
  
  try {
    console.log('Checking agent_master_conversations table structure...');
    
    // Get table structure
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agent_master_conversations'
      ORDER BY ordinal_position
    `);
    
    console.log('agent_master_conversations table structure:');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    // Check sample data
    const sampleData = await pool.query('SELECT * FROM agent_master_conversations LIMIT 1');
    if (sampleData.rows.length > 0) {
      console.log('\nSample conversation data:');
      console.log(JSON.stringify(sampleData.rows[0], null, 2));
    } else {
      console.log('\nNo conversations found in the table.');
    }
    
  } catch (error) {
    console.error('Error checking conversations table:', error);
  } finally {
    await pool.end();
  }
}

checkConversationsTable();

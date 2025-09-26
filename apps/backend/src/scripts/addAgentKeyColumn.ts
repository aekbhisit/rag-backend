import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function addAgentKeyColumn() {
  const pool = getPostgresPool();
  
  try {
    console.log('Adding agent_key column to agent_master_conversations table...');
    
    // Check if column already exists
    const columnExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'agent_master_conversations' 
        AND column_name = 'agent_key'
      )
    `);
    
    if (columnExists.rows[0].exists) {
      console.log('agent_key column already exists!');
      return;
    }
    
    // Add the column
    await pool.query(`
      ALTER TABLE agent_master_conversations 
      ADD COLUMN agent_key TEXT
    `);
    
    console.log('Successfully added agent_key column!');
    
    // Verify the column was added
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agent_master_conversations'
      ORDER BY ordinal_position
    `);
    
    console.log('\nUpdated table structure:');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error adding agent_key column:', error);
  } finally {
    await pool.end();
  }
}

addAgentKeyColumn();

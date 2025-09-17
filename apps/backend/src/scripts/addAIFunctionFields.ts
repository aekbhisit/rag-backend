import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function addAIFunctionFields() {
  const pool = getPostgresPool();
  
  try {
    console.log('Adding AI function fields to agent_tools table...');
    
    // Check if columns already exist
    const columnsToAdd = [
      'function_name',
      'function_description', 
      'function_parameters',
      'parameter_mapping'
    ];
    
    for (const columnName of columnsToAdd) {
      const columnExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'agent_tools' 
          AND column_name = $1
        )
      `, [columnName]);
      
      if (columnExists.rows[0].exists) {
        console.log(`${columnName} column already exists!`);
      } else {
        // Add the column
        const dataType = columnName === 'function_parameters' || columnName === 'parameter_mapping' ? 'JSONB' : 'TEXT';
        await pool.query(`
          ALTER TABLE agent_tools 
          ADD COLUMN ${columnName} ${dataType}
        `);
        console.log(`Successfully added ${columnName} column!`);
      }
    }
    
    // Verify the columns were added
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agent_tools'
      ORDER BY ordinal_position
    `);
    
    console.log('\nUpdated agent_tools table structure:');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error adding AI function fields:', error);
  } finally {
    await pool.end();
  }
}

addAIFunctionFields();

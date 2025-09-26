import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function checkAgentPrompts() {
  const pool = getPostgresPool();
  
  try {
    console.log('Checking for agent-specific prompt tables...');
    
    // Check all tables that might contain prompts
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE '%prompt%' OR table_name LIKE '%agent%')
      ORDER BY table_name
    `);
    
    console.log('Relevant tables found:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check if there's an agent_prompts table
    const agentPromptsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'agent_prompts'
      )
    `);
    
    if (agentPromptsExists.rows[0].exists) {
      console.log('\nagent_prompts table exists! Checking structure...');
      const columnsResult = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'agent_prompts'
        ORDER BY ordinal_position
      `);
      
      console.log('agent_prompts table structure:');
      columnsResult.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
      // Check sample data
      const sampleData = await pool.query('SELECT * FROM agent_prompts LIMIT 1');
      if (sampleData.rows.length > 0) {
        console.log('\nSample agent_prompts data:');
        console.log(JSON.stringify(sampleData.rows[0], null, 2));
      }
    } else {
      console.log('\nNo agent_prompts table found. Need to create one or use existing prompts table.');
    }
    
    // Check the existing prompts table for agent-related content
    console.log('\nChecking existing prompts table for agent-related content...');
    const agentPrompts = await pool.query(`
      SELECT * FROM prompts 
      WHERE key LIKE '%agent%' OR name LIKE '%agent%' OR description LIKE '%agent%'
      LIMIT 5
    `);
    
    if (agentPrompts.rows.length > 0) {
      console.log('Found agent-related prompts:');
      agentPrompts.rows.forEach((prompt, index) => {
        console.log(`  ${index + 1}. ${prompt.key} - ${prompt.name}`);
      });
    } else {
      console.log('No agent-related prompts found in existing prompts table.');
    }
    
  } catch (error) {
    console.error('Error checking agent prompts:', error);
  } finally {
    await pool.end();
  }
}

checkAgentPrompts();

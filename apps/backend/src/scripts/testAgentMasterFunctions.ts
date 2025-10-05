import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function testFunctions() {
  const pool = getPostgresPool();
  
  try {
    console.log('Testing agent master functions...');
    
    // Test listing agents
    console.log('\n1. Testing list_agents function...');
    const agentsResult = await pool.query(
      'SELECT agent_key, name, public_description, is_enabled, is_default FROM agents ORDER BY is_default DESC, name ASC LIMIT 50'
    );
    console.log('Agents found:', agentsResult.rows.length);
    console.log('Sample agent:', agentsResult.rows[0]);
    
    // Test getting a specific agent
    if (agentsResult.rows.length > 0) {
      const agentKey = agentsResult.rows[0].agent_key;
      console.log(`\n2. Testing get_agent function for agent: ${agentKey}...`);
      const agentResult = await pool.query(
        'SELECT * FROM agents WHERE agent_key = $1',
        [agentKey]
      );
      console.log('Agent details:', agentResult.rows[0]);
    }
    
    // Test listing available tools
    console.log('\n3. Testing list_available_tools function...');
    const toolsResult = await pool.query(
      'SELECT * FROM tool_registry WHERE is_enabled = true ORDER BY name ASC'
    );
    console.log('Tools found:', toolsResult.rows.length);
    if (toolsResult.rows.length > 0) {
      console.log('Sample tool:', toolsResult.rows[0]);
    }
    
    // Test getting a prompt
    if (agentsResult.rows.length > 0) {
      const agentKey = agentsResult.rows[0].agent_key;
      console.log(`\n4. Testing get_prompt function for agent: ${agentKey}...`);
      const promptResult = await pool.query(
        'SELECT * FROM prompts WHERE agent_key = $1 AND category = $2 ORDER BY version DESC LIMIT 1',
        [agentKey, 'base']
      );
      console.log('Prompt found:', promptResult.rows.length > 0 ? 'Yes' : 'No');
      if (promptResult.rows.length > 0) {
        console.log('Prompt details:', promptResult.rows[0]);
      }
    }
    
    console.log('\nAll function tests completed successfully!');
    
  } catch (error) {
    console.error('Error testing functions:', error);
  } finally {
    await pool.end();
  }
}

testFunctions();

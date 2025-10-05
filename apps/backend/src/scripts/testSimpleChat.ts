import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function testSimpleChat() {
  const pool = getPostgresPool();
  
  try {
    console.log('Testing simple chat functionality...');
    
    // Test the basic database operations that the chat uses
    
    // 1. Test conversation creation
    console.log('\n1. Testing conversation creation...');
    const conversationResult = await pool.query(`
      INSERT INTO agent_master_conversations (tenant_id, session_id, user_id, title, status, metadata, agent_key)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      'acc44cdb-8da5-4226-9569-1233a39f564f',
      'test-session-simple',
      'test-user',
      'Simple Test Chat',
      'active',
      '{}',
      'test'
    ]);
    
    const conversationId = conversationResult.rows[0].id;
    console.log('Created conversation:', conversationId);
    
    // 2. Test message creation
    console.log('\n2. Testing message creation...');
    const userMessageResult = await pool.query(`
      INSERT INTO agent_master_messages (conversation_id, role, content, function_name, function_args, function_result, tokens_used)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      conversationId,
      'user',
      'Test message',
      null,
      null,
      null,
      null
    ]);
    
    const userMessageId = userMessageResult.rows[0].id;
    console.log('Created user message:', userMessageId);
    
    // 3. Test assistant message with function call
    console.log('\n3. Testing assistant message with function call...');
    const assistantMessageResult = await pool.query(`
      INSERT INTO agent_master_messages (conversation_id, role, content, function_name, function_args, function_result, tokens_used)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      conversationId,
      'assistant',
      'I will list the agents for you.',
      'list_agents',
      '{"limit": 50}',
      null,
      100
    ]);
    
    const assistantMessageId = assistantMessageResult.rows[0].id;
    console.log('Created assistant message:', assistantMessageId);
    
    // 4. Test function result message
    console.log('\n4. Testing function result message...');
    const functionMessageResult = await pool.query(`
      INSERT INTO agent_master_messages (conversation_id, role, content, function_name, function_args, function_result, tokens_used)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      conversationId,
      'function',
      '{"agents": [{"agent_key": "test", "name": "test"}]}',
      'list_agents',
      '{"limit": 50}',
      '{"agents": [{"agent_key": "test", "name": "test"}]}',
      null
    ]);
    
    const functionMessageId = functionMessageResult.rows[0].id;
    console.log('Created function message:', functionMessageId);
    
    // 5. Test reading messages back
    console.log('\n5. Testing message retrieval...');
    const messagesResult = await pool.query(`
      SELECT * FROM agent_master_messages 
      WHERE conversation_id = $1 
      ORDER BY created_at ASC
    `, [conversationId]);
    
    console.log('Retrieved messages:', messagesResult.rows.length);
    messagesResult.rows.forEach((msg, index) => {
      console.log(`  ${index + 1}. ${msg.role}: ${msg.content?.substring(0, 50)}...`);
    });
    
    // 6. Clean up
    console.log('\n6. Cleaning up test data...');
    await pool.query('DELETE FROM agent_master_messages WHERE conversation_id = $1', [conversationId]);
    await pool.query('DELETE FROM agent_master_conversations WHERE id = $1', [conversationId]);
    
    console.log('\nAll tests completed successfully!');
    
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await pool.end();
  }
}

testSimpleChat();

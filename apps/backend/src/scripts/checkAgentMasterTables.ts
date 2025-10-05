import { Pool } from 'pg';
import { getPostgresPool } from '../adapters/db/postgresClient';

async function checkAndCreateTables() {
  const pool = getPostgresPool();
  
  try {
    console.log('Checking agent master tables...');
    
    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'agent_master_%'
    `);
    
    console.log('Existing agent master tables:', tablesResult.rows.map(r => r.table_name));
    
    // Create agent_master_conversations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_master_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        session_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        agent_key TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    // Create agent_master_messages table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_master_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES agent_master_conversations(id) ON DELETE CASCADE,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        function_name TEXT NULL,
        function_args JSONB NULL,
        function_result JSONB NULL,
        tokens_used INTEGER NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    // Create agent_master_ai_usage table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_master_ai_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES agent_master_conversations(id) ON DELETE CASCADE,
        message_id UUID NOT NULL REFERENCES agent_master_messages(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL,
        operation TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        model_version TEXT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        usage_input_tokens INTEGER NULL,
        usage_output_tokens INTEGER NULL,
        usage_total_tokens INTEGER NULL,
        pricing_input_per_1k DECIMAL(10,6) NULL,
        pricing_output_per_1k DECIMAL(10,6) NULL,
        pricing_total_per_1k DECIMAL(10,6) NULL,
        cost_input_usd DECIMAL(10,6) NULL,
        cost_output_usd DECIMAL(10,6) NULL,
        cost_total_usd DECIMAL(10,6) NULL,
        cost_currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'success',
        error_message TEXT NULL,
        function_calls JSONB NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    console.log('Tables checked and created successfully!');
    
    // Check the structure of the messages table
    const columnsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agent_master_messages'
      ORDER BY ordinal_position
    `);
    
    console.log('agent_master_messages table structure:');
    columnsResult.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
  } catch (error) {
    console.error('Error checking/creating tables:', error);
  } finally {
    await pool.end();
  }
}

checkAndCreateTables();

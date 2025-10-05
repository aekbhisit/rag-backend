import type { Pool } from 'pg';

export type AgentMasterMessageRow = {
  id?: string;
  conversation_id: string;
  role: string; // user, assistant, system, function
  content: string;
  function_name?: string | null;
  function_args?: any | null;
  function_result?: any | null;
  tokens_used?: number | null;
  created_at?: string;
};

export class AgentMasterMessagesRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTable(): Promise<void> {
    await this.pool.query(`
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
      );
      CREATE INDEX IF NOT EXISTS idx_agent_master_messages_conversation ON agent_master_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_agent_master_messages_role ON agent_master_messages(role);
      CREATE INDEX IF NOT EXISTS idx_agent_master_messages_created ON agent_master_messages(created_at DESC);
    `);
  }

  async create(doc: AgentMasterMessageRow): Promise<string> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `INSERT INTO agent_master_messages (conversation_id, role, content, function_name, function_args, function_result, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        doc.conversation_id,
        doc.role,
        doc.content,
        doc.function_name,
        doc.function_args,
        doc.function_result,
        doc.tokens_used
      ]
    );
    return rows[0].id;
  }

  async get(id: string): Promise<AgentMasterMessageRow | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_messages WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async listByConversation(conversationId: string, limit = 100, offset = 0): Promise<AgentMasterMessageRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC 
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return rows;
  }

  async getConversationHistory(conversationId: string, limit = 50): Promise<AgentMasterMessageRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_messages 
       WHERE conversation_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [conversationId, limit]
    );
    return rows.reverse(); // Return in chronological order
  }

  async getRecentMessages(conversationId: string, count = 10): Promise<AgentMasterMessageRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_messages 
       WHERE conversation_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [conversationId, count]
    );
    return rows.reverse(); // Return in chronological order
  }

  async update(id: string, updates: Partial<AgentMasterMessageRow>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'conversation_id') {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    values.push(id);

    await this.pool.query(
      `UPDATE agent_master_messages SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM agent_master_messages WHERE id = $1`,
      [id]
    );
  }

  async deleteByConversation(conversationId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM agent_master_messages WHERE conversation_id = $1`,
      [conversationId]
    );
  }

  async getTokenUsage(conversationId: string): Promise<number> {
    const { rows } = await this.pool.query(
      `SELECT COALESCE(SUM(tokens_used), 0) as total_tokens 
       FROM agent_master_messages 
       WHERE conversation_id = $1 AND tokens_used IS NOT NULL`,
      [conversationId]
    );
    return parseInt(rows[0].total_tokens) || 0;
  }

  async getFunctionCalls(conversationId: string): Promise<AgentMasterMessageRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_messages 
       WHERE conversation_id = $1 AND function_name IS NOT NULL 
       ORDER BY created_at ASC`,
      [conversationId]
    );
    return rows;
  }
}

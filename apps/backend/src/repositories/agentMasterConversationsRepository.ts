import type { Pool } from 'pg';

export type AgentMasterConversationRow = {
  id?: string;
  tenant_id: string;
  session_id: string;
  user_id: string;
  title: string;
  status: string;
  metadata?: any;
  agent_key?: string | null;
  created_at?: string;
  updated_at?: string;
};

export class AgentMasterConversationsRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTable(): Promise<void> {
    await this.pool.query(`
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
      );
      CREATE INDEX IF NOT EXISTS idx_agent_master_conversations_tenant ON agent_master_conversations(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_agent_master_conversations_user ON agent_master_conversations(user_id);
      CREATE INDEX IF NOT EXISTS idx_agent_master_conversations_status ON agent_master_conversations(status);
      CREATE INDEX IF NOT EXISTS idx_agent_master_conversations_created ON agent_master_conversations(created_at DESC);
    `);
    
    // Add agent_key column if it doesn't exist (for existing tables)
    try {
      await this.pool.query(`
        ALTER TABLE agent_master_conversations 
        ADD COLUMN IF NOT EXISTS agent_key TEXT
      `);
    } catch (error) {
      // Column might already exist, ignore error
      console.log('agent_key column might already exist:', error);
    }
  }

  async create(doc: AgentMasterConversationRow): Promise<string> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `INSERT INTO agent_master_conversations (tenant_id, session_id, user_id, title, status, metadata, agent_key)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [doc.tenant_id, doc.session_id, doc.user_id, doc.title, doc.status, doc.metadata || {}, doc.agent_key]
    );
    return rows[0].id;
  }

  async get(id: string): Promise<AgentMasterConversationRow | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_conversations WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async getBySessionId(sessionId: string): Promise<AgentMasterConversationRow | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_conversations WHERE session_id = $1`,
      [sessionId]
    );
    return rows[0] || null;
  }

  async listByUser(userId: string, limit = 50, offset = 0): Promise<AgentMasterConversationRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_conversations 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );
    return rows;
  }

  async listByTenant(tenantId: string, limit = 50, offset = 0): Promise<AgentMasterConversationRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_conversations 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    return rows;
  }

  async update(id: string, updates: Partial<AgentMasterConversationRow>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      // Skip undefined values to avoid setting columns to NULL unintentionally
      if (value === undefined) continue;
      if (key !== 'id' && key !== 'tenant_id') {
        fields.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    fields.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString());
    values.push(id);

    await this.pool.query(
      `UPDATE agent_master_conversations SET ${fields.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
  }

  async delete(id: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM agent_master_conversations WHERE id = $1`,
      [id]
    );
  }

  async softDelete(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE agent_master_conversations SET status = 'deleted', updated_at = now() WHERE id = $1`,
      [id]
    );
  }

  async archive(id: string): Promise<void> {
    await this.pool.query(
      `UPDATE agent_master_conversations SET status = 'archived', updated_at = now() WHERE id = $1`,
      [id]
    );
  }
}

import type { Pool } from 'pg';

export type MessagePromptRow = {
  id: string;
  tenant_id: string;
  message_id: string;
  template: string;
  params: any;
  tools_declared: any;
  created_at: string;
};

export class MessagePromptsRepository {
  constructor(private readonly pool: Pool) {}

  async getByMessage(tenantId: string, messageId: string): Promise<MessagePromptRow | null> {
    const { rows } = await this.pool.query(`SELECT * FROM message_prompts WHERE tenant_id=$1 AND message_id=$2 ORDER BY created_at DESC LIMIT 1`, [tenantId, messageId]);
    return (rows[0] as MessagePromptRow) || null;
  }

  async create(doc: { tenant_id: string; message_id: string; template: string; params?: any; tools_declared?: any }): Promise<MessagePromptRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO message_prompts (tenant_id, message_id, template, params, tools_declared)
       VALUES ($1,$2,$3,COALESCE($4,'{}'::jsonb),COALESCE($5,'[]'::jsonb))
       RETURNING *`,
      [doc.tenant_id, doc.message_id, doc.template, doc.params ?? {}, doc.tools_declared ?? []]
    );
    return rows[0] as MessagePromptRow;
  }
}



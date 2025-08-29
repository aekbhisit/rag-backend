import type { Pool } from 'pg';

export type MessageRow = {
  id: string;
  tenant_id: string;
  session_id: string;
  role: string;
  type: string;
  content: string | null;
  content_tokens: number | null;
  response_tokens: number | null;
  total_tokens: number | null;
  model: string | null;
  latency_ms: number | null;
  created_at: string;
  meta: any;
};

export class MessagesRepository {
  constructor(private readonly pool: Pool) {}

  async create(doc: Partial<MessageRow> & { tenant_id: string; session_id: string; role: string; type: string }): Promise<MessageRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO messages (
        tenant_id, session_id, role, type, content, content_tokens, response_tokens, total_tokens, model, latency_ms, meta
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
      ) RETURNING *`,
      [
        doc.tenant_id,
        doc.session_id,
        doc.role,
        doc.type,
        doc.content ?? null,
        doc.content_tokens ?? null,
        doc.response_tokens ?? null,
        doc.total_tokens ?? null,
        doc.model ?? null,
        doc.latency_ms ?? null,
        doc.meta ?? {}
      ]
    );
    return rows[0] as MessageRow;
  }

  async getById(tenantId: string, id: string): Promise<MessageRow | null> {
    const { rows } = await this.pool.query(`SELECT * FROM messages WHERE tenant_id=$1 AND id=$2 LIMIT 1`, [tenantId, id]);
    return (rows[0] as MessageRow) || null;
  }
}



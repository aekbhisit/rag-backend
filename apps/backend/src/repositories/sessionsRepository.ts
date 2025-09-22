import type { Pool } from 'pg';

export type SessionRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  channel: string;
  started_at: string;
  ended_at: string | null;
  status: string;
  meta: any;
};

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

export class SessionsRepository {
  constructor(private readonly pool: Pool) {}

  async create(doc: {
    tenant_id: string;
    user_id?: string | null;
    channel: string;
    status?: string;
    meta?: any;
  }): Promise<SessionRow> {
    const { rows } = await this.pool.query(
      `INSERT INTO sessions (tenant_id, user_id, channel, status, meta)
       VALUES ($1,$2,$3,COALESCE($4,'active'),COALESCE($5,'{}'::jsonb))
       RETURNING *`,
      [doc.tenant_id, doc.user_id ?? null, doc.channel, doc.status ?? 'active', doc.meta ?? {}]
    );
    return rows[0] as SessionRow;
  }

  async end(tenantId: string, id: string): Promise<void> {
    await this.pool.query(`UPDATE sessions SET status='ended', ended_at=now() WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
  }

  async list(
    tenantId: string,
    filters: {
      userId?: string;
      status?: string;
      channel?: string;
      from?: string;
      to?: string;
    },
    page: number = 1,
    size: number = 50,
    sortField: string = 'started_at',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<{ items: (SessionRow & { message_count: number; total_tokens: number })[]; total: number }> {
    const params: any[] = [tenantId];
    const where: string[] = ['s.tenant_id = $1'];

    if (filters.userId) { params.push(filters.userId); where.push(`s.user_id = $${params.length}`); }
    if (filters.status) { params.push(filters.status); where.push(`s.status = $${params.length}`); }
    if (filters.channel) { params.push(filters.channel); where.push(`s.channel = $${params.length}`); }
    if (filters.from) { params.push(filters.from); where.push(`s.started_at >= $${params.length}`); }
    if (filters.to) { params.push(filters.to); where.push(`s.started_at <= $${params.length}`); }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    // Validate and sanitize sort field
    const allowedSortFields = ['started_at', 'ended_at', 'user_id', 'channel', 'status', 'message_count', 'total_tokens'];
    const safeSortField = allowedSortFields.includes(sortField) ? sortField : 'started_at';
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const limit = Math.max(1, Math.min(size, 200));
    const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
    params.push(limit, offset);

    const totalQ = await this.pool.query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt FROM sessions s ${whereSql}`,
      params.slice(0, params.length - 2)
    );

    const { rows } = await this.pool.query(
      `SELECT 
         s.*,
         (SELECT COUNT(*) FROM messages m WHERE m.session_id = s.id) AS message_count,
         COALESCE((SELECT SUM(m2.total_tokens) FROM messages m2 WHERE m2.session_id = s.id), 0) AS total_tokens
       FROM sessions s
       ${whereSql}
       ORDER BY s.${safeSortField} ${safeSortOrder}
       LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    return { items: rows as any, total: totalQ.rows[0]?.cnt || 0 };
  }

  async getById(tenantId: string, id: string): Promise<SessionRow | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM sessions WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, id]
    );
    return (rows[0] as SessionRow) || null;
  }

  async listMessages(
    tenantId: string,
    sessionId: string,
    page: number = 1,
    size: number = 100,
    sort: 'asc' | 'desc' = 'asc'
  ): Promise<{ items: MessageRow[]; total: number }> {
    const limit = Math.max(1, Math.min(size, 500));
    const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
    const order = sort?.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    const totalQ = await this.pool.query<{ cnt: number }>(
      `SELECT COUNT(*)::int AS cnt FROM messages WHERE tenant_id = $1 AND session_id = $2`,
      [tenantId, sessionId]
    );

    const { rows } = await this.pool.query(
      `SELECT * FROM messages WHERE tenant_id = $1 AND session_id = $2 ORDER BY created_at ${order}, id ${order} LIMIT $3 OFFSET $4`,
      [tenantId, sessionId, limit, offset]
    );
    return { items: rows as MessageRow[], total: totalQ.rows[0]?.cnt || 0 };
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete all related data first
      await client.query(
        `DELETE FROM rag_citations WHERE message_id IN (SELECT id FROM messages WHERE session_id = $1 AND tenant_id = $2)`,
        [id, tenantId]
      );
      
      await client.query(
        `DELETE FROM tool_calls WHERE message_id IN (SELECT id FROM messages WHERE session_id = $1 AND tenant_id = $2)`,
        [id, tenantId]
      );
      
      await client.query(
        `DELETE FROM messages WHERE session_id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      
      // Finally delete the session
      await client.query(
        `DELETE FROM sessions WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async endOldSessions(tenantId: string, hoursOld: number = 24): Promise<number> {
    const { rows } = await this.pool.query(
      `UPDATE sessions 
       SET status = 'ended', ended_at = now() 
       WHERE tenant_id = $1 
       AND status = 'active' 
       AND started_at < now() - ($2 || ' hours')::interval
       RETURNING id`,
      [tenantId, hoursOld]
    );
    return rows.length;
  }
}



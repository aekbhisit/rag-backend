import type { Pool } from 'pg';

export type QueryLogRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  query: string;
  detected_language: string | null;
  profile_id: string | null;
  retrieval_method: string | null;
  latency_ms: number | null;
  confidence: number | null;
  request_jsonb: any | null;
  response_jsonb: any | null;
  citations_jsonb: any | null;
  created_at: string;
};

export class QueryLogsRepository {
  constructor(private readonly pool: Pool) {}

  async list(tenantId: string, opts: { limit?: number; offset?: number } = {}): Promise<QueryLogRow[]> {
    const { limit = 100, offset = 0 } = opts;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      const { rows } = await client.query(
        `SELECT * FROM query_logs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        [tenantId]
      );
      await client.query('COMMIT');
      return rows as QueryLogRow[];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async create(
    tenantId: string,
    data: {
      userId?: string | null;
      action: string; // e.g., CREATE | UPDATE | DELETE | SETTINGS_UPDATE
      resource: string; // e.g., context | settings
      resourceId?: string | null;
      details?: string;
      request?: any;
      response?: any;
      latencyMs?: number | null;
      confidence?: number | null;
    }
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      const requestJson = {
        resource: data.resource,
        resource_id: data.resourceId || null,
        ...(data.request || {}),
      };
      const responseJson = data.response ?? null;
      await client.query(
        `INSERT INTO query_logs (
            tenant_id, user_id, query, detected_language, profile_id, retrieval_method,
            latency_ms, confidence, request_jsonb, response_jsonb, citations_jsonb, created_at
         ) VALUES (
            $1, $2, $3, NULL, NULL, $4,
            $5, $6, $7, $8, NULL, now()
         )`,
        [
          tenantId,
          data.userId || null,
          data.details || `${data.action} ${data.resource}${data.resourceId ? ` ${data.resourceId}` : ''}`,
          data.action,
          data.latencyMs ?? null,
          data.confidence ?? null,
          requestJson,
          responseJson,
        ]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}



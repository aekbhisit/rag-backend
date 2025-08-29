import type { Pool } from 'pg';

export type ToolCallRow = {
  id: string;
  tenant_id: string;
  message_id: string;
  tool_name: string;
  arguments: any;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  result: any | null;
  status: string;
  error: string | null;
};

export class ToolCallsRepository {
  constructor(private readonly pool: Pool) {}

  async listByMessage(tenantId: string, messageId: string): Promise<ToolCallRow[]> {
    const { rows } = await this.pool.query(`SELECT * FROM tool_calls WHERE tenant_id=$1 AND message_id=$2 ORDER BY started_at ASC`, [tenantId, messageId]);
    return rows as ToolCallRow[];
  }
}



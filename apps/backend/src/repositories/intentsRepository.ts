import type { Pool } from 'pg';

export type IntentRow = {
  id: string;
  tenant_id: string;
  scope: string;
  action: string;
  description: string | null;
  created_at: string;
};

export class IntentsRepository {
  constructor(private readonly pool: Pool) {}

  async list(tenantId: string, opts: { q?: string; limit?: number; offset?: number } = {}): Promise<IntentRow[]> {
    const { q, limit = 100, offset = 0 } = opts;
    const params: any[] = [tenantId];
    let where = 'tenant_id = $1';
    if (q) {
      params.push(`%${q}%`);
      const i = params.length;
      where += ` AND (scope ILIKE $${i} OR action ILIKE $${i} OR description ILIKE $${i})`;
    }
    const sql = `SELECT id, tenant_id, scope, action, description, created_at
                 FROM intents WHERE ${where} ORDER BY scope, action LIMIT ${limit} OFFSET ${offset}`;
    const { rows } = await this.pool.query(sql, params);
    return rows as IntentRow[];
  }

  async get(tenantId: string, id: string): Promise<IntentRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, scope, action, description, created_at FROM intents WHERE tenant_id=$1 AND id=$2`,
      [tenantId, id]
    );
    return (rows[0] as IntentRow) ?? null;
  }

  async create(tenantId: string, input: { scope: string; action: string; description?: string | null }): Promise<IntentRow> {
    const { scope, action, description = null } = input;
    const { rows } = await this.pool.query(
      `INSERT INTO intents (tenant_id, scope, action, description) VALUES ($1,$2,$3,$4)
       RETURNING id, tenant_id, scope, action, description, created_at`,
      [tenantId, scope, action, description]
    );
    return rows[0] as IntentRow;
  }

  async update(tenantId: string, id: string, patch: Partial<{ scope: string; action: string; description: string | null }>): Promise<IntentRow | null> {
    const existing = await this.get(tenantId, id);
    if (!existing) return null;
    const next = {
      scope: patch.scope ?? existing.scope,
      action: patch.action ?? existing.action,
      description: patch.description ?? existing.description,
    };
    const { rows } = await this.pool.query(
      `UPDATE intents SET scope=$3, action=$4, description=$5 WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, scope, action, description, created_at`,
      [tenantId, id, next.scope, next.action, next.description]
    );
    return (rows[0] as IntentRow) ?? null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const result = await this.pool.query(`DELETE FROM intents WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    return (result.rowCount ?? 0) > 0;
  }

  // Merge: move links from sourceId to targetId, then delete source
  async merge(tenantId: string, sourceId: string, targetId: string): Promise<{ merged: boolean }> {
    await this.pool.query('BEGIN');
    try {
      await this.pool.query(
        `INSERT INTO context_intents (context_id, intent_id)
         SELECT context_id, $3 FROM context_intents WHERE intent_id=$2
         ON CONFLICT DO NOTHING`,
        [tenantId, sourceId, targetId]
      );
      await this.pool.query(`DELETE FROM context_intents WHERE intent_id=$2`, [tenantId, sourceId]);
      await this.pool.query(`DELETE FROM intents WHERE tenant_id=$1 AND id=$2`, [tenantId, sourceId]);
      await this.pool.query('COMMIT');
      return { merged: true };
    } catch (e) {
      await this.pool.query('ROLLBACK');
      throw e;
    }
  }
}



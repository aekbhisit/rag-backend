import type { Pool } from 'pg';

export type ContextOverrideRow = {
  id: string;
  tenant_id: string;
  context_id: string;
  profile_id: string;
  instruction_delta: string | null;
};

export class ContextOverridesRepository {
  constructor(private readonly pool: Pool) {}

  async list(tenantId: string, contextId?: string): Promise<ContextOverrideRow[]> {
    const params: any[] = [tenantId];
    let where = 'tenant_id=$1';
    if (contextId) { params.push(contextId); where += ` AND context_id=$${params.length}`; }
    const { rows } = await this.pool.query(`SELECT * FROM context_profile_overrides WHERE ${where} ORDER BY id DESC`, params);
    return rows as ContextOverrideRow[];
  }

  async create(tenantId: string, input: Omit<ContextOverrideRow, 'id' | 'tenant_id'>): Promise<ContextOverrideRow> {
    const { context_id, profile_id, instruction_delta } = input;
    const { rows } = await this.pool.query(
      `INSERT INTO context_profile_overrides (tenant_id, context_id, profile_id, instruction_delta)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [tenantId, context_id, profile_id, instruction_delta ?? null]
    );
    return rows[0] as ContextOverrideRow;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const res = await this.pool.query(`DELETE FROM context_profile_overrides WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    return (res.rowCount ?? 0) > 0;
  }
}



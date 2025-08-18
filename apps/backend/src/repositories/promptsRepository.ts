import type { Pool } from 'pg';

export type PromptRow = {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  template: string;
  description: string | null;
  is_default?: boolean;
  created_at: string;
  updated_at: string | null;
};

export class PromptsRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        key TEXT NOT NULL,
        name TEXT NOT NULL,
        template TEXT NOT NULL,
        description TEXT,
        is_default BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP NOT NULL DEFAULT now(),
        updated_at TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_prompts_tenant ON prompts(tenant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_prompts_tenant_key ON prompts(tenant_id, key);
      CREATE UNIQUE INDEX IF NOT EXISTS ux_prompts_tenant_default ON prompts(tenant_id) WHERE is_default;
    `);
  }

  async list(tenantId: string, opts: { query?: string; limit?: number; offset?: number } = {}): Promise<PromptRow[]> {
    const { query, limit = 100, offset = 0 } = opts;
    const params: any[] = [tenantId];
    let where = 'tenant_id = $1';
    if (query) {
      params.push(`%${query}%`);
      const i = params.length;
      where += ` AND (key ILIKE $${i} OR name ILIKE $${i} OR description ILIKE $${i})`;
    }
    const sql = `SELECT id, tenant_id, key, name, template, description, is_default, created_at, updated_at
                 FROM prompts WHERE ${where}
                 ORDER BY created_at DESC
                 LIMIT ${limit} OFFSET ${offset}`;
    const { rows } = await this.pool.query(sql, params);
    return rows as PromptRow[];
  }

  async get(tenantId: string, id: string): Promise<PromptRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, key, name, template, description, is_default, created_at, updated_at
       FROM prompts WHERE tenant_id=$1 AND id=$2`,
      [tenantId, id]
    );
    return (rows[0] as PromptRow) || null;
  }

  async getByKey(tenantId: string, key: string): Promise<PromptRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, key, name, template, description, is_default, created_at, updated_at
       FROM prompts WHERE tenant_id=$1 AND key=$2`,
      [tenantId, key]
    );
    return (rows[0] as PromptRow) || null;
  }

  async create(tenantId: string, input: { id: string; key: string; name: string; template: string; description?: string | null; is_default?: boolean }): Promise<PromptRow> {
    await this.ensureTable();
    const { id, key, name, template, description = null, is_default = false } = input;
    const { rows } = await this.pool.query(
      `INSERT INTO prompts (id, tenant_id, key, name, template, description, is_default)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, tenant_id, key, name, template, description, is_default, created_at, updated_at`,
      [id, tenantId, key, name, template, description, !!is_default]
    );
    return rows[0] as PromptRow;
  }

  async update(tenantId: string, id: string, patch: Partial<{ key: string; name: string; template: string; description: string | null; is_default: boolean }>): Promise<PromptRow | null> {
    const existing = await this.get(tenantId, id);
    if (!existing) return null;
    const merged = { ...existing, ...patch };
    const { rows } = await this.pool.query(
      `UPDATE prompts SET key=$3, name=$4, template=$5, description=$6, is_default=$7, updated_at=now()
       WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, key, name, template, description, is_default, created_at, updated_at`,
      [tenantId, id, merged.key, merged.name, merged.template, merged.description, !!merged.is_default]
    );
    return (rows[0] as PromptRow) || null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    const r = await this.pool.query(`DELETE FROM prompts WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    return (r.rowCount ?? 0) > 0;
  }

  async setDefault(tenantId: string, id: string): Promise<void> {
    await this.pool.query(`UPDATE prompts SET is_default=false WHERE tenant_id=$1`, [tenantId]);
    await this.pool.query(`UPDATE prompts SET is_default=true, updated_at=now() WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
  }

  async getDefault(tenantId: string): Promise<PromptRow | null> {
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, key, name, template, description, is_default, created_at, updated_at
       FROM prompts WHERE tenant_id=$1 AND is_default=true ORDER BY updated_at DESC NULLS LAST, created_at DESC LIMIT 1`,
      [tenantId]
    );
    return (rows[0] as PromptRow) || null;
  }
}



import type { Pool } from 'pg';

export type AiPricingRow = {
  id: string;
  tenant_id: string;
  provider: string;
  model: string;
  input_per_1k?: number | null;
  cached_input_per_1k?: number | null;
  output_per_1k?: number | null;
  embedding_per_1k?: number | null;
  currency?: string | null; // USD
  version?: string | null;
  is_active?: boolean | null;
  created_at: string;
  updated_at?: string | null;
};

export class AiPricingRepository {
  constructor(private readonly pool: Pool) {}

  private async ensureTable() {
    // Creating extensions often requires elevated privileges; try and ignore failure
    try { await this.pool.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`); } catch { /* ignore */ }
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ai_pricing (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        provider text NOT NULL,
        model text NOT NULL,
        input_per_1k double precision,
        cached_input_per_1k double precision,
        output_per_1k double precision,
        embedding_per_1k double precision,
        currency text DEFAULT 'USD',
        version text,
        is_active boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz
      );
    `);
    await this.pool.query(`CREATE INDEX IF NOT EXISTS ai_pricing_tenant_idx ON ai_pricing(tenant_id);`);
    await this.pool.query(`CREATE UNIQUE INDEX IF NOT EXISTS ai_pricing_unique ON ai_pricing(tenant_id, provider, model);`);
    await this.pool.query(`ALTER TABLE ai_pricing ADD COLUMN IF NOT EXISTS cached_input_per_1k double precision;`);
  }

  async list(): Promise<AiPricingRow[]> {
    await this.ensureTable();
    const { rows } = await this.pool.query(`
      SELECT DISTINCT ON (provider, model) *
      FROM ai_pricing
      WHERE is_active IS TRUE
      ORDER BY provider, model, created_at DESC
    `);
    return rows as AiPricingRow[];
  }

  async get(tenantId: string, id: string): Promise<AiPricingRow | null> {
    await this.ensureTable();
    const { rows } = await this.pool.query(`SELECT * FROM ai_pricing WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    return rows[0] || null;
  }

  async upsert(tenantId: string, row: Omit<AiPricingRow, 'id'|'tenant_id'|'created_at'|'updated_at'> & { id?: string }): Promise<AiPricingRow> {
    await this.ensureTable();
    const { id, provider, model, input_per_1k, cached_input_per_1k, output_per_1k, embedding_per_1k, currency = 'USD', version = null, is_active = true } = row as any;
    if (id) {
      const { rows } = await this.pool.query(`
        UPDATE ai_pricing SET provider=$3, model=$4, input_per_1k=$5, cached_input_per_1k=$6, output_per_1k=$7, embedding_per_1k=$8, currency=$9, version=$10, is_active=$11, updated_at=now()
        WHERE tenant_id=$1 AND id=$2 RETURNING *
      `, [tenantId, id, provider, model, input_per_1k, cached_input_per_1k, output_per_1k, embedding_per_1k, currency, version, is_active]);
      return rows[0] as AiPricingRow;
    } else {
      const { rows } = await this.pool.query(`
        INSERT INTO ai_pricing (tenant_id, provider, model, input_per_1k, cached_input_per_1k, output_per_1k, embedding_per_1k, currency, version, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (tenant_id, provider, model)
        DO UPDATE SET input_per_1k=EXCLUDED.input_per_1k, cached_input_per_1k=EXCLUDED.cached_input_per_1k, output_per_1k=EXCLUDED.output_per_1k, embedding_per_1k=EXCLUDED.embedding_per_1k, currency=EXCLUDED.currency, version=EXCLUDED.version, is_active=EXCLUDED.is_active, updated_at=now()
        RETURNING *
      `, [tenantId, provider, model, input_per_1k, cached_input_per_1k, output_per_1k, embedding_per_1k, currency, version, is_active]);
      return rows[0] as AiPricingRow;
    }
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    await this.ensureTable();
    const { rowCount } = await this.pool.query(`DELETE FROM ai_pricing WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
    return (rowCount || 0) > 0;
  }

  async findByModel(tenantId: string, provider: string, model: string): Promise<AiPricingRow | null> {
    await this.ensureTable();
    const { rows } = await this.pool.query(`
      SELECT * FROM ai_pricing WHERE (tenant_id=$1 OR tenant_id='00000000-0000-0000-0000-000000000000') AND provider=$2 AND model=$3 AND is_active IS TRUE
      ORDER BY CASE WHEN tenant_id=$1 THEN 0 ELSE 1 END LIMIT 1
    `, [tenantId, provider, model]);
    return rows[0] || null;
  }
}



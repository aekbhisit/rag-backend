import type { Pool } from 'pg';

export type TenantRow = {
  id: string;
  name: string;
  code?: string | null;
  slug?: string | null;
  contact_email?: string | null;
  is_active?: boolean | null;
  settings: any | null;
  created_at: string;
  updated_at: string | null;
};

export class TenantsRepository {
  constructor(private readonly pool: Pool) {}

  private async ensureTable() {
    await this.pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS tenants (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        code text,
        slug text,
        contact_email text,
        is_active boolean DEFAULT true,
        settings jsonb,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz
      );
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS code text;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug text;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS contact_email text;
      ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
      CREATE UNIQUE INDEX IF NOT EXISTS tenants_code_uniq ON tenants(code) WHERE code IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_uniq ON tenants(slug) WHERE slug IS NOT NULL;
    `);
  }

  async get(tenantId: string): Promise<TenantRow | null> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `SELECT id, name, code, slug, contact_email, is_active, settings, created_at, updated_at FROM tenants WHERE id=$1`,
      [tenantId]
    );
    return (rows[0] as TenantRow) || null;
  }

  async update(tenantId: string, patch: { name?: string; slug?: string | null; contact_email?: string | null; is_active?: boolean | null; settings?: any }): Promise<TenantRow | null> {
    await this.ensureTable();
    const existing = await this.get(tenantId);
    if (!existing) return null;

    const newName = patch.name !== undefined ? patch.name : existing.name;
    const newSlug = patch.slug !== undefined ? patch.slug : (existing.slug ?? null);
    const newContact = patch.contact_email !== undefined ? patch.contact_email : (existing.contact_email ?? null);
    const newActive = patch.is_active !== undefined ? patch.is_active : (existing.is_active ?? true);
    const newSettings = patch.settings !== undefined ? patch.settings : existing.settings;

    const { rows } = await this.pool.query(
      `UPDATE tenants SET name=$2, slug=$3, contact_email=$4, is_active=$5, settings=$6, updated_at=now()
       WHERE id=$1 RETURNING id, name, code, slug, contact_email, is_active, settings, created_at, updated_at`,
      [tenantId, newName, newSlug, newContact, newActive, newSettings]
    );
    return (rows[0] as TenantRow) || null;
  }

  async list(): Promise<TenantRow[]> {
    await this.ensureTable();
    const { rows } = await this.pool.query(`SELECT id, name, code, slug, contact_email, is_active, settings, created_at, updated_at FROM tenants ORDER BY created_at DESC`);
    return rows as TenantRow[];
  }

  async create(input: { name: string; code?: string | null; slug?: string | null; contact_email?: string | null; is_active?: boolean | null; settings?: any | null }): Promise<TenantRow> {
    await this.ensureTable();
    const code = input.code && input.code.trim() ? input.code.trim() : this.generateCode();
    const { rows } = await this.pool.query(
      `INSERT INTO tenants (name, code, slug, contact_email, is_active, settings) VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, code, slug, contact_email, is_active, settings, created_at, updated_at`,
      [input.name, code, input.slug ?? null, input.contact_email ?? null, input.is_active ?? true, input.settings ?? null]
    );
    return rows[0] as TenantRow;
  }

  private generateCode(): string {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const a = letters[Math.floor(Math.random()*letters.length)];
    const b = letters[Math.floor(Math.random()*letters.length)];
    const n = String(Math.floor(1000 + Math.random()*9000));
    return `${a}${b}${n}`;
  }

  async getByCode(code: string): Promise<TenantRow | null> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `SELECT id, name, code, slug, contact_email, is_active, settings, created_at, updated_at FROM tenants WHERE code=$1`,
      [code]
    );
    return (rows[0] as TenantRow) || null;
  }

  async delete(id: string): Promise<boolean> {
    await this.ensureTable();
    const { rowCount } = await this.pool.query(`DELETE FROM tenants WHERE id=$1`, [id]);
    return (rowCount || 0) > 0;
  }
}



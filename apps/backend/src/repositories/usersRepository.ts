import type { Pool } from 'pg';

export type RagUserRow = {
  id: string;
  tenant_id: string;
  name: string | null;
  email: string;
  role: 'admin' | 'operator' | 'viewer';
  status: 'active' | 'inactive' | 'pending';
  timezone: string;
  last_login: string | null;
  created_at: string;
  updated_at: string | null;
};

export class UsersRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS public.users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        email varchar NOT NULL,
        role varchar NOT NULL DEFAULT 'admin',
        name text,
        status varchar NOT NULL DEFAULT 'active',
        timezone varchar NOT NULL DEFAULT 'UTC',
        password_hash text,
        last_login timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz
      );
      CREATE INDEX IF NOT EXISTS idx_users_tenant ON public.users(tenant_id);
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_email ON public.users(tenant_id, email);
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.constraint_column_usage
          WHERE table_name = 'users' AND constraint_name = 'users_status_chk'
        ) THEN
          ALTER TABLE public.users ADD CONSTRAINT users_status_chk CHECK (status IN ('active','inactive','pending'));
        END IF;
      END$$;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS status varchar NOT NULL DEFAULT 'active';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone varchar NOT NULL DEFAULT 'UTC';
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash text;
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login timestamptz;
    `);
  }

  private columnsInfo: { checked: boolean; hasName: boolean; hasStatus: boolean; hasLastLogin: boolean } = {
    checked: false,
    hasName: false,
    hasStatus: false,
    hasLastLogin: false,
  };

  private async ensureColumnsDetected(): Promise<void> {
    if (this.columnsInfo.checked) return;
    const { rows } = await this.pool.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND table_schema = 'public'`
    );
    const names = new Set<string>(rows.map(r => r.column_name as string));
    this.columnsInfo.hasName = names.has('name');
    this.columnsInfo.hasStatus = names.has('status');
    this.columnsInfo.hasLastLogin = names.has('last_login');
    this.columnsInfo.checked = true;
  }

  async list(tenantId: string): Promise<RagUserRow[]> {
    await this.ensureTable();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      const { rows } = await client.query(`SELECT * FROM users WHERE tenant_id=$1 ORDER BY created_at DESC`, [tenantId]);
      await client.query('COMMIT');
      return rows as RagUserRow[];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async getById(tenantId: string, id: string): Promise<RagUserRow | null> {
    await this.ensureTable();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      const { rows } = await client.query(`SELECT * FROM users WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
      await client.query('COMMIT');
      return (rows[0] as RagUserRow) || null;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async create(tenantId: string, data: { name?: string; email: string; role: RagUserRow['role']; status: RagUserRow['status']; timezone?: string }): Promise<RagUserRow> {
    await this.ensureTable();
    await this.ensureColumnsDetected();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      const columns: string[] = ['tenant_id', 'email', 'role', 'timezone'];
      const values: any[] = [tenantId, data.email, data.role, data.timezone || 'UTC'];
      if (this.columnsInfo.hasName) {
        columns.push('name');
        values.push(data.name ?? null);
      }
      if (this.columnsInfo.hasStatus) {
        columns.push('status');
        values.push(data.status);
      }
      const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
      const sql = `INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const { rows } = await client.query(sql, values);
      await client.query('COMMIT');
      return rows[0] as RagUserRow;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async update(tenantId: string, id: string, data: { name?: string; email?: string; role?: RagUserRow['role']; status?: RagUserRow['status']; timezone?: string }): Promise<RagUserRow | null> {
    await this.ensureTable();
    await this.ensureColumnsDetected();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      // Build dynamic update set
      const fields: string[] = [];
      const values: any[] = [tenantId, id];
      let idx = 2;
      const push = (column: string, val: any) => { fields.push(`${column} = $${++idx}`); values.push(val); };

      if (data.email !== undefined) push('email', data.email);
      if (data.role !== undefined) push('role', data.role);
      if (data.timezone !== undefined) push('timezone', data.timezone);
      if (this.columnsInfo.hasName && data.name !== undefined) push('name', data.name ?? null);
      if (this.columnsInfo.hasStatus && data.status !== undefined) push('status', data.status);
      fields.push('updated_at = now()');

      const sql = `UPDATE users SET ${fields.join(', ')} WHERE tenant_id=$1 AND id=$2 RETURNING *`;
      const { rows } = await client.query(sql, values);
      await client.query('COMMIT');
      return (rows[0] as RagUserRow) || null;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async remove(tenantId: string, id: string): Promise<void> {
    await this.ensureTable();
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_tenant_id', $1, true)", [tenantId]);
      await client.query(`DELETE FROM users WHERE tenant_id=$1 AND id=$2`, [tenantId, id]);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
}



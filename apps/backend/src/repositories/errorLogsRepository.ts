import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

export type ErrorLogRow = {
  id: string;
  tenant_id: string;
  endpoint: string | null;
  method: string | null;
  http_status: number | null;
  message: string | null;
  error_code: string | null;
  stack: string | null;
  file: string | null;
  line: number | null;
  column_no: number | null;
  headers: any | null;
  query: any | null;
  body: any | null;
  request_id: string | null;
  log_status: 'open' | 'fixed' | 'ignored';
  notes: string | null;
  fixed_by: string | null;
  fixed_at: string | null;
  created_at: string;
};

export class ErrorLogsRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTable() {
    try {
      await this.pool.query(`
        CREATE EXTENSION IF NOT EXISTS pgcrypto;
        CREATE TABLE IF NOT EXISTS error_logs (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id uuid NOT NULL,
          endpoint text,
          method text,
          http_status int,
          message text,
          error_code text,
          stack text,
          file text,
          line int,
          column_no int,
          headers jsonb,
          query jsonb,
          body jsonb,
          request_id text,
          log_status text DEFAULT 'open',
          notes text,
          fixed_by text,
          fixed_at timestamptz,
          created_at timestamptz DEFAULT now()
        );
      `);
    } catch {
      // Fallback when extension creation is not permitted
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS error_logs (
          id uuid PRIMARY KEY,
          tenant_id uuid NOT NULL,
          endpoint text,
          method text,
          http_status int,
          message text,
          error_code text,
          stack text,
          file text,
          line int,
          column_no int,
          headers jsonb,
          query jsonb,
          body jsonb,
          request_id text,
          log_status text DEFAULT 'open',
          notes text,
          fixed_by text,
          fixed_at timestamptz,
          created_at timestamptz DEFAULT now()
        );
      `);
    }
    await this.pool.query(`CREATE INDEX IF NOT EXISTS error_logs_tenant_created_idx ON error_logs(tenant_id, created_at DESC);`);
  }

  async create(input: Omit<ErrorLogRow, 'id' | 'created_at'>): Promise<ErrorLogRow> {
    await this.ensureTable();
    const id = randomUUID();
    const { rows } = await this.pool.query(
      `INSERT INTO error_logs (
        id, tenant_id, endpoint, method, http_status, message, error_code, stack, file, line, column_no, headers, query, body, request_id, log_status, notes, fixed_by, fixed_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19
      ) RETURNING id, tenant_id, endpoint, method, http_status, message, error_code, stack, file, line, column_no, headers, query, body, request_id, log_status, notes, fixed_by, fixed_at, created_at`,
      [
        id,
        input.tenant_id,
        input.endpoint ?? null,
        input.method ?? null,
        input.http_status ?? null,
        input.message ?? null,
        input.error_code ?? null,
        input.stack ?? null,
        input.file ?? null,
        input.line ?? null,
        input.column_no ?? null,
        input.headers ?? null,
        input.query ?? null,
        input.body ?? null,
        input.request_id ?? null,
        input.log_status ?? 'open',
        input.notes ?? null,
        input.fixed_by ?? null,
        input.fixed_at ?? null,
      ]
    );
    return rows[0] as ErrorLogRow;
  }

  async list(tenantId: string, opts: { limit: number; offset: number }) {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, endpoint, method, http_status, message, error_code, file, line, column_no, created_at
       FROM error_logs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, opts.limit, opts.offset]
    );
    return rows as ErrorLogRow[];
  }

  async get(tenantId: string, id: string) {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, endpoint, method, http_status, message, error_code, stack, file, line, column_no, headers, query, body, request_id, log_status, notes, fixed_by, fixed_at, created_at
       FROM error_logs WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id]
    );
    return (rows[0] as ErrorLogRow) || null;
  }

  async updateStatus(tenantId: string, id: string, status: 'open' | 'fixed' | 'ignored', notes?: string, fixedBy?: string): Promise<ErrorLogRow | null> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `UPDATE error_logs 
       SET log_status = $3, notes = $4, fixed_by = $5, fixed_at = CASE WHEN $3 = 'fixed' THEN now() ELSE null END
       WHERE tenant_id = $1 AND id = $2
       RETURNING id, tenant_id, endpoint, method, http_status, message, error_code, stack, file, line, column_no, headers, query, body, request_id, log_status, notes, fixed_by, fixed_at, created_at`,
      [tenantId, id, status, notes || null, fixedBy || null]
    );
    return (rows[0] as ErrorLogRow) || null;
  }

  async delete(tenantId: string, id: string): Promise<boolean> {
    await this.ensureTable();
    const { rowCount } = await this.pool.query(
      `DELETE FROM error_logs WHERE tenant_id = $1 AND id = $2`,
      [tenantId, id]
    );
    return rowCount > 0;
  }

  async exportForAnalysis(tenantId: string, filters: {
    status?: 'open' | 'fixed' | 'ignored';
    dateFrom?: string;
    dateTo?: string;
    errorCode?: string;
  } = {}): Promise<ErrorLogRow[]> {
    await this.ensureTable();
    
    let whereClause = 'WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (filters.status) {
      whereClause += ` AND log_status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }

    if (filters.dateFrom) {
      whereClause += ` AND created_at >= $${paramIndex}`;
      params.push(filters.dateFrom);
      paramIndex++;
    }

    if (filters.dateTo) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(filters.dateTo);
      paramIndex++;
    }

    if (filters.errorCode) {
      whereClause += ` AND error_code = $${paramIndex}`;
      params.push(filters.errorCode);
      paramIndex++;
    }

    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, endpoint, method, http_status, message, error_code, stack, file, line, column_no, headers, query, body, request_id, log_status, notes, fixed_by, fixed_at, created_at
       FROM error_logs ${whereClause}
       ORDER BY created_at DESC`,
      params
    );
    
    return rows as ErrorLogRow[];
  }
}



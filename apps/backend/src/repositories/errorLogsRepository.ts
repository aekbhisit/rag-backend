import type { Pool } from 'pg';
import { randomUUID } from 'node:crypto';

export type ErrorLogRow = {
  id: string;
  tenant_id: string;
  endpoint: string | null;
  method: string | null;
  status: number | null;
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
          status int,
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
          status int,
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
        id, tenant_id, endpoint, method, status, message, error_code, stack, file, line, column_no, headers, query, body, request_id
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      ) RETURNING id, tenant_id, endpoint, method, status, message, error_code, stack, file, line, column, headers, query, body, request_id, created_at`,
      [
        id,
        input.tenant_id,
        input.endpoint ?? null,
        input.method ?? null,
        input.status ?? null,
        input.message ?? null,
        input.error_code ?? null,
        input.stack ?? null,
        input.file ?? null,
        input.line ?? null,
        (input as any).column_no ?? null,
        input.headers ?? null,
        input.query ?? null,
        input.body ?? null,
        input.request_id ?? null,
      ]
    );
    return rows[0] as ErrorLogRow;
  }

  async list(tenantId: string, opts: { limit: number; offset: number }) {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, endpoint, method, status, message, error_code, file, line, column, created_at
       FROM error_logs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [tenantId, opts.limit, opts.offset]
    );
    return rows as ErrorLogRow[];
  }

  async get(tenantId: string, id: string) {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `SELECT id, tenant_id, endpoint, method, status, message, error_code, stack, file, line, column, headers, query, body, request_id, created_at
       FROM error_logs WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id]
    );
    return (rows[0] as ErrorLogRow) || null;
  }
}



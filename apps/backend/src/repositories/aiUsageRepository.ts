import type { Pool } from 'pg';

export type AiUsageRow = {
  id?: string;
  tenant_id: string;
  observation_id?: string | null;
  trace_id?: string | null;
  request_id?: string | null;
  environment?: string | null;
  project_id?: string | null;
  endpoint?: string | null;
  operation: string;
  provider?: string | null;
  model?: string | null;
  model_version?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  latency_ms?: number | null;
  usage_input_tokens?: number | null;
  usage_cached_input_tokens?: number | null;
  usage_output_tokens?: number | null;
  usage_total_tokens?: number | null;
  pricing_input_per_1k?: number | null;
  pricing_cached_input_per_1k?: number | null;
  pricing_output_per_1k?: number | null;
  pricing_total_per_1k?: number | null;
  pricing_version?: string | null;
  pricing_source?: string | null;
  cost_input_usd?: number | null;
  cost_output_usd?: number | null;
  cost_total_usd?: number | null;
  cost_currency?: string | null;
  cost_source?: string | null;
  status?: string | null;
  error_message?: string | null;
  context_ids?: string[] | null;
  category_ids?: string[] | null;
  intent_scope?: string | null;
  intent_action?: string | null;
  metadata?: any | null;
  imported_at?: string | null;
};

export class AiUsageRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE EXTENSION IF NOT EXISTS pgcrypto;
      CREATE TABLE IF NOT EXISTS ai_usage_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        observation_id text,
        trace_id text,
        request_id text,
        environment text,
        project_id text,
        endpoint text,
        operation text NOT NULL,
        provider text,
        model text,
        model_version text,
        start_time timestamptz,
        end_time timestamptz,
        latency_ms integer,
        usage_input_tokens integer,
        usage_cached_input_tokens integer,
        usage_output_tokens integer,
        usage_total_tokens integer,
        pricing_input_per_1k double precision,
        pricing_cached_input_per_1k double precision,
        pricing_output_per_1k double precision,
        pricing_total_per_1k double precision,
        pricing_version text,
        pricing_source text,
        cost_input_usd double precision,
        cost_output_usd double precision,
        cost_total_usd double precision,
        cost_currency text,
        cost_source text,
        status text,
        error_message text,
        context_ids text[],
        category_ids text[],
        intent_scope text,
        intent_action text,
        metadata jsonb,
        imported_at timestamptz,
        created_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant ON ai_usage_logs(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_time ON ai_usage_logs(start_time DESC);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage_logs(model);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_provider ON ai_usage_logs(provider);
      CREATE INDEX IF NOT EXISTS idx_ai_usage_operation ON ai_usage_logs(operation);
    `);
  }

  async create(doc: AiUsageRow): Promise<string> {
    await this.ensureTable();
    const sql = `
      INSERT INTO ai_usage_logs (
        tenant_id, observation_id, trace_id, request_id, environment, project_id, endpoint, operation,
        provider, model, model_version, start_time, end_time, latency_ms,
        usage_input_tokens, usage_cached_input_tokens, usage_output_tokens, usage_total_tokens,
        pricing_input_per_1k, pricing_cached_input_per_1k, pricing_output_per_1k, pricing_total_per_1k,
        pricing_version, pricing_source,
        cost_input_usd, cost_output_usd, cost_total_usd, cost_currency, cost_source,
        status, error_message, context_ids, category_ids, intent_scope, intent_action, metadata, imported_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        $9,$10,$11,$12,$13,$14,
        $15,$16,$17,$18,
        $19,$20,$21,$22,
        $23,$24,
        $25,$26,$27,$28,$29,
        $30,$31,$32,$33,$34,$35,$36,$37
      ) RETURNING id`;
    const params = [
      doc.tenant_id,
      doc.observation_id ?? null,
      doc.trace_id ?? null,
      doc.request_id ?? null,
      doc.environment ?? null,
      doc.project_id ?? null,
      doc.endpoint ?? null,
      doc.operation,
      doc.provider ?? null,
      doc.model ?? null,
      doc.model_version ?? null,
      doc.start_time ?? null,
      doc.end_time ?? null,
      doc.latency_ms ?? null,
      doc.usage_input_tokens ?? null,
      doc.usage_cached_input_tokens ?? null,
      doc.usage_output_tokens ?? null,
      doc.usage_total_tokens ?? null,
      doc.pricing_input_per_1k ?? null,
      doc.pricing_cached_input_per_1k ?? null,
      doc.pricing_output_per_1k ?? null,
      doc.pricing_total_per_1k ?? null,
      doc.pricing_version ?? null,
      doc.pricing_source ?? null,
      doc.cost_input_usd ?? null,
      doc.cost_output_usd ?? null,
      doc.cost_total_usd ?? null,
      doc.cost_currency ?? null,
      doc.cost_source ?? null,
      doc.status ?? null,
      doc.error_message ?? null,
      doc.context_ids ?? null,
      doc.category_ids ?? null,
      doc.intent_scope ?? null,
      doc.intent_action ?? null,
      doc.metadata ?? null,
      doc.imported_at ?? null,
    ];
    const { rows } = await this.pool.query(sql, params);
    return rows[0]?.id as string;
  }

  async list(tenantId: string, opts: { from?: string; to?: string; model?: string; provider?: string; operation?: string; q?: string; requestId?: string; limit?: number; offset?: number; sortBy?: string; sortDir?: 'asc' | 'desc' }) {
    await this.ensureTable();
    const params: any[] = [tenantId];
    let where = 'tenant_id = $1';
    if (opts.from || opts.to) {
      params.push(opts.from || '1970-01-01T00:00:00Z');
      params.push(opts.to || new Date().toISOString());
      where += ` AND start_time BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    if (opts.model) { params.push(opts.model); where += ` AND model = $${params.length}`; }
    if (opts.provider) { params.push(opts.provider); where += ` AND provider = $${params.length}`; }
    if (opts.operation) { params.push(opts.operation); where += ` AND operation = $${params.length}`; }
    if (opts.requestId) { params.push(opts.requestId); where += ` AND request_id = $${params.length}`; }
    if (opts.q && opts.q.trim().length > 0) {
      params.push(`%${opts.q}%`);
      const i = params.length;
      where += ` AND (endpoint ILIKE $${i} OR model ILIKE $${i} OR provider ILIKE $${i} OR operation ILIKE $${i} OR status ILIKE $${i} OR error_message ILIKE $${i})`;
    }
    const limit = Math.max(1, Math.min(opts.limit || 100, 500));
    const offset = Math.max(0, opts.offset || 0);
    const validSort: Record<string, string> = {
      start_time: 'start_time',
      cost_total_usd: 'cost_total_usd',
      usage_total_tokens: 'usage_total_tokens',
      latency_ms: 'latency_ms',
      model: 'model',
      provider: 'provider',
      operation: 'operation',
    };
    const sortCol = validSort[(opts.sortBy || 'start_time').toLowerCase()] || 'start_time';
    const sortDir = (opts.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const sql = `SELECT * FROM ai_usage_logs WHERE ${where} ORDER BY ${sortCol} ${sortDir} NULLS LAST, start_time DESC NULLS LAST LIMIT ${limit} OFFSET ${offset}`;
    const { rows } = await this.pool.query(sql, params);
    return rows as AiUsageRow[];
  }

  async count(tenantId: string, opts: { from?: string; to?: string; model?: string; provider?: string; operation?: string; q?: string; requestId?: string }) {
    await this.ensureTable();
    const params: any[] = [tenantId];
    let where = 'tenant_id = $1';
    if (opts.from || opts.to) {
      params.push(opts.from || '1970-01-01T00:00:00Z');
      params.push(opts.to || new Date().toISOString());
      where += ` AND start_time BETWEEN $${params.length - 1} AND $${params.length}`;
    }
    if (opts.model) { params.push(opts.model); where += ` AND model = $${params.length}`; }
    if (opts.provider) { params.push(opts.provider); where += ` AND provider = $${params.length}`; }
    if (opts.operation) { params.push(opts.operation); where += ` AND operation = $${params.length}`; }
    if (opts.requestId) { params.push(opts.requestId); where += ` AND request_id = $${params.length}`; }
    if (opts.q && opts.q.trim().length > 0) {
      params.push(`%${opts.q}%`);
      const i = params.length;
      where += ` AND (endpoint ILIKE $${i} OR model ILIKE $${i} OR provider ILIKE $${i} OR operation ILIKE $${i} OR status ILIKE $${i} OR error_message ILIKE $${i})`;
    }
    const { rows } = await this.pool.query(`SELECT COUNT(*)::int AS cnt FROM ai_usage_logs WHERE ${where}`, params);
    return (rows[0]?.cnt as number) || 0;
  }

  async summary(tenantId: string, from: string, to: string) {
    await this.ensureTable();
    const params = [tenantId, from, to];
    const total = await this.pool.query(
      `SELECT coalesce(sum(cost_total_usd),0) as total_cost, coalesce(sum(usage_total_tokens),0) as total_tokens FROM ai_usage_logs WHERE tenant_id=$1 AND start_time BETWEEN $2 AND $3`,
      params
    );
    const byModel = await this.pool.query(
      `SELECT model as key, coalesce(sum(cost_total_usd),0) as cost FROM ai_usage_logs WHERE tenant_id=$1 AND start_time BETWEEN $2 AND $3 GROUP BY model ORDER BY cost DESC LIMIT 50`,
      params
    );
    const byProvider = await this.pool.query(
      `SELECT provider as key, coalesce(sum(cost_total_usd),0) as cost FROM ai_usage_logs WHERE tenant_id=$1 AND start_time BETWEEN $2 AND $3 GROUP BY provider ORDER BY cost DESC LIMIT 20`,
      params
    );
    const byOperation = await this.pool.query(
      `SELECT operation as key, coalesce(sum(cost_total_usd),0) as cost FROM ai_usage_logs WHERE tenant_id=$1 AND start_time BETWEEN $2 AND $3 GROUP BY operation ORDER BY cost DESC LIMIT 20`,
      params
    );
    return {
      totalCost: Number(total.rows[0]?.total_cost || 0),
      totalTokens: Number(total.rows[0]?.total_tokens || 0),
      byModel: byModel.rows.map(r => ({ key: r.key || 'unknown', cost: Number(r.cost || 0) })),
      byProvider: byProvider.rows.map(r => ({ key: r.key || 'unknown', cost: Number(r.cost || 0) })),
      byOperation: byOperation.rows.map(r => ({ key: r.key || 'unknown', cost: Number(r.cost || 0) })),
    } as const;
  }

  async attachRequestId(tenantId: string, usageId: string, requestId: string): Promise<void> {
    await this.ensureTable();
    await this.pool.query(
      `UPDATE ai_usage_logs SET request_id=$3 WHERE tenant_id=$1 AND id=$2`,
      [tenantId, usageId, requestId]
    );
  }
}



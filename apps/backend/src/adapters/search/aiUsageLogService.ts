import { getPostgresPool } from '../db/postgresClient';
import { AiUsageRepository } from '../../repositories/aiUsageRepository';

export type AiUsageDoc = {
  tenant_id: string;
  observation_id?: string;
  trace_id?: string | null;
  request_id?: string | null;
  environment?: string | null;
  project_id?: string | null;
  endpoint?: string | null;
  operation: 'generate' | 'embedding' | 'rerank' | string;
  provider?: string | null;
  model?: string | null;
  model_version?: string | null;
  start_time?: string; // ISO
  end_time?: string;   // ISO
  latency_ms?: number | null;
  usage?: {
    input_tokens?: number | null;
    cached_input_tokens?: number | null;
    output_tokens?: number | null;
    total_tokens?: number | null;
  };
  pricing?: {
    input_per_1k?: number | null;
    cached_input_per_1k?: number | null;
    output_per_1k?: number | null;
    total_per_1k?: number | null;
    version?: string | null;
    source?: 'sdk' | 'tenant' | 'default' | null;
  };
  cost?: {
    input_usd?: number | null;
    output_usd?: number | null;
    total_usd?: number | null;
    currency?: string | null; // USD
    source?: 'sdk' | 'computed' | null;
  };
  status?: string | null;
  error_message?: string | null;
  context_ids?: string[];
  category_ids?: string[];
  intent_scope?: string | null;
  intent_action?: string | null;
  metadata?: Record<string, any>;
  imported_at?: string; // ISO
};

export async function ensureAiUsageIndex() { /* no-op with Postgres */ }

export async function indexAiUsage(doc: AiUsageDoc): Promise<string | undefined> {
  const repo = new AiUsageRepository(getPostgresPool());
  const id = await repo.create({
    tenant_id: doc.tenant_id,
    observation_id: doc.observation_id ?? null,
    trace_id: doc.trace_id ?? null,
    request_id: doc.request_id ?? null,
    environment: doc.environment ?? null,
    project_id: doc.project_id ?? null,
    endpoint: doc.endpoint ?? null,
    operation: doc.operation,
    provider: doc.provider ?? null,
    model: doc.model ?? null,
    model_version: doc.model_version ?? null,
    start_time: doc.start_time ?? null,
    end_time: doc.end_time ?? null,
    latency_ms: doc.latency_ms ?? null,
    usage_input_tokens: doc.usage?.input_tokens ?? null,
    usage_cached_input_tokens: doc.usage?.cached_input_tokens ?? null,
    usage_output_tokens: doc.usage?.output_tokens ?? null,
    usage_total_tokens: doc.usage?.total_tokens ?? null,
    pricing_input_per_1k: doc.pricing?.input_per_1k ?? null,
    pricing_cached_input_per_1k: doc.pricing?.cached_input_per_1k ?? null,
    pricing_output_per_1k: doc.pricing?.output_per_1k ?? null,
    pricing_total_per_1k: doc.pricing?.total_per_1k ?? null,
    pricing_version: doc.pricing?.version ?? null,
    pricing_source: doc.pricing?.source ?? null,
    cost_input_usd: doc.cost?.input_usd ?? null,
    cost_output_usd: doc.cost?.output_usd ?? null,
    cost_total_usd: doc.cost?.total_usd ?? null,
    cost_currency: doc.cost?.currency ?? null,
    cost_source: doc.cost?.source ?? null,
    status: doc.status ?? null,
    error_message: doc.error_message ?? null,
    context_ids: doc.context_ids ?? null,
    category_ids: doc.category_ids ?? null,
    intent_scope: doc.intent_scope ?? null,
    intent_action: doc.intent_action ?? null,
    metadata: doc.metadata ?? null,
    imported_at: doc.imported_at ?? null,
  });
  return id;
}

export async function setUsageRequestLink(tenantId: string, usageId: string, requestId: string): Promise<void> {
  const repo = new AiUsageRepository(getPostgresPool());
  await repo.attachRequestId(tenantId, usageId, requestId);
}

export async function aggregateSummary(params: { tenantId: string; from: string; to: string; model?: string; provider?: string; }) {
  const repo = new AiUsageRepository(getPostgresPool());
  const { totalCost, totalTokens, byModel, byProvider } = await repo.summary(params.tenantId, params.from, params.to);
  // Add daily trends grouped by day
  const pool = (repo as any).pool;
  const { rows: trendRows } = await pool.query(
    `SELECT date_trunc('day', start_time) AS day,
            coalesce(sum(cost_total_usd),0) AS cost,
            coalesce(sum(usage_total_tokens),0) AS tokens
       FROM ai_usage_logs
      WHERE tenant_id=$1 AND start_time BETWEEN $2 AND $3
   GROUP BY 1
   ORDER BY 1 ASC`,
    [params.tenantId, params.from, params.to]
  );
  const costTrend = trendRows.map((r: any) => ({ date: new Date(r.day).toISOString().slice(0, 10), cost: Number(r.cost || 0) }));
  const tokenTrend = trendRows.map((r: any) => ({ date: new Date(r.day).toISOString().slice(0, 10), tokens: Number(r.tokens || 0) }));
  return { totalCost, totalTokens, costTrend, tokenTrend, modelUsage: byModel, providerUsage: byProvider } as any;
}

export async function topExpensive(params: { tenantId: string; from: string; to: string; limit?: number; offset?: number; sortBy?: string; sortDir?: 'asc' | 'desc' }) {
  const repo = new AiUsageRepository(getPostgresPool());
  const limit = Math.max(1, Math.min(params.limit || 20, 100));
  const offset = Math.max(0, params.offset || 0);
  const validSort: Record<string, string> = {
    cost_total_usd: 'cost_total_usd',
    usage_total_tokens: 'usage_total_tokens',
    start_time: 'start_time',
    latency_ms: 'latency_ms',
  };
  const sortCol = validSort[(params.sortBy || 'cost_total_usd').toLowerCase()] || 'cost_total_usd';
  const sortDir = (params.sortDir || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const { rows } = await (repo as any).pool.query(
    `SELECT * FROM ai_usage_logs
      WHERE tenant_id=$1 AND start_time BETWEEN $2 AND $3
      ORDER BY ${sortCol} ${sortDir} NULLS LAST, start_time DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset}`,
    [params.tenantId, params.from, params.to]
  );
  return rows;
}



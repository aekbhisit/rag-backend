import type { Pool } from 'pg';

export type AgentMasterAiUsageRow = {
  id?: string;
  conversation_id: string;
  message_id: string;
  tenant_id: string;
  operation: string; // 'chat', 'function_call', 'embedding'
  provider: string; // 'openai', 'anthropic', 'google'
  model: string;
  model_version?: string | null;
  start_time: string;
  end_time: string;
  latency_ms: number;
  usage_input_tokens?: number | null;
  usage_output_tokens?: number | null;
  usage_total_tokens?: number | null;
  pricing_input_per_1k?: number | null;
  pricing_output_per_1k?: number | null;
  pricing_total_per_1k?: number | null;
  cost_input_usd?: number | null;
  cost_output_usd?: number | null;
  cost_total_usd?: number | null;
  cost_currency: string;
  status: string; // 'success', 'error', 'rate_limited'
  error_message?: string | null;
  function_calls?: any | null;
  metadata?: any;
  created_at?: string;
};

export class AgentMasterAiUsageRepository {
  constructor(private readonly pool: Pool) {}

  async ensureTable(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS agent_master_ai_usage (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES agent_master_conversations(id) ON DELETE CASCADE,
        message_id UUID NOT NULL REFERENCES agent_master_messages(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL,
        operation TEXT NOT NULL,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        model_version TEXT NULL,
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        latency_ms INTEGER NOT NULL,
        usage_input_tokens INTEGER NULL,
        usage_output_tokens INTEGER NULL,
        usage_total_tokens INTEGER NULL,
        pricing_input_per_1k DECIMAL(10,6) NULL,
        pricing_output_per_1k DECIMAL(10,6) NULL,
        pricing_total_per_1k DECIMAL(10,6) NULL,
        cost_input_usd DECIMAL(10,6) NULL,
        cost_output_usd DECIMAL(10,6) NULL,
        cost_total_usd DECIMAL(10,6) NULL,
        cost_currency TEXT NOT NULL DEFAULT 'USD',
        status TEXT NOT NULL DEFAULT 'success',
        error_message TEXT NULL,
        function_calls JSONB NULL,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_agent_master_ai_usage_conversation ON agent_master_ai_usage(conversation_id);
      CREATE INDEX IF NOT EXISTS idx_agent_master_ai_usage_tenant ON agent_master_ai_usage(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_agent_master_ai_usage_operation ON agent_master_ai_usage(operation);
      CREATE INDEX IF NOT EXISTS idx_agent_master_ai_usage_provider ON agent_master_ai_usage(provider);
      CREATE INDEX IF NOT EXISTS idx_agent_master_ai_usage_created ON agent_master_ai_usage(created_at DESC);
    `);
  }

  async create(doc: AgentMasterAiUsageRow): Promise<string> {
    await this.ensureTable();
    const { rows } = await this.pool.query(
      `INSERT INTO agent_master_ai_usage (
        conversation_id, message_id, tenant_id, operation, provider, model, model_version,
        start_time, end_time, latency_ms, usage_input_tokens, usage_output_tokens, usage_total_tokens,
        pricing_input_per_1k, pricing_output_per_1k, pricing_total_per_1k,
        cost_input_usd, cost_output_usd, cost_total_usd, cost_currency, status, error_message,
        function_calls, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
      RETURNING id`,
      [
        doc.conversation_id,
        doc.message_id,
        doc.tenant_id,
        doc.operation,
        doc.provider,
        doc.model,
        doc.model_version,
        doc.start_time,
        doc.end_time,
        doc.latency_ms,
        doc.usage_input_tokens,
        doc.usage_output_tokens,
        doc.usage_total_tokens,
        doc.pricing_input_per_1k,
        doc.pricing_output_per_1k,
        doc.pricing_total_per_1k,
        doc.cost_input_usd,
        doc.cost_output_usd,
        doc.cost_total_usd,
        doc.cost_currency,
        doc.status,
        doc.error_message,
        doc.function_calls,
        doc.metadata || {}
      ]
    );
    return rows[0].id;
  }

  async get(id: string): Promise<AgentMasterAiUsageRow | null> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_ai_usage WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async listByConversation(conversationId: string, limit = 100, offset = 0): Promise<AgentMasterAiUsageRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_ai_usage 
       WHERE conversation_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return rows;
  }

  async listByTenant(tenantId: string, limit = 100, offset = 0): Promise<AgentMasterAiUsageRow[]> {
    const { rows } = await this.pool.query(
      `SELECT * FROM agent_master_ai_usage 
       WHERE tenant_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [tenantId, limit, offset]
    );
    return rows;
  }

  async getUsageSummary(conversationId: string): Promise<{
    total_cost: number;
    total_tokens: number;
    total_operations: number;
    by_provider: Record<string, { cost: number; tokens: number; operations: number }>;
    by_operation: Record<string, { cost: number; tokens: number; operations: number }>;
  }> {
    const { rows } = await this.pool.query(
      `SELECT 
        COALESCE(SUM(cost_total_usd), 0) as total_cost,
        COALESCE(SUM(usage_total_tokens), 0) as total_tokens,
        COUNT(*) as total_operations,
        provider,
        operation,
        COALESCE(SUM(cost_total_usd), 0) as provider_cost,
        COALESCE(SUM(usage_total_tokens), 0) as provider_tokens,
        COUNT(*) as provider_operations
       FROM agent_master_ai_usage 
       WHERE conversation_id = $1
       GROUP BY provider, operation`,
      [conversationId]
    );

    const summary = {
      total_cost: 0,
      total_tokens: 0,
      total_operations: 0,
      by_provider: {} as Record<string, { cost: number; tokens: number; operations: number }>,
      by_operation: {} as Record<string, { cost: number; tokens: number; operations: number }>
    };

    for (const row of rows) {
      summary.total_cost += parseFloat(row.total_cost) || 0;
      summary.total_tokens += parseInt(row.total_tokens) || 0;
      summary.total_operations += parseInt(row.total_operations) || 0;

      // Group by provider
      if (!summary.by_provider[row.provider]) {
        summary.by_provider[row.provider] = { cost: 0, tokens: 0, operations: 0 };
      }
      summary.by_provider[row.provider].cost += parseFloat(row.provider_cost) || 0;
      summary.by_provider[row.provider].tokens += parseInt(row.provider_tokens) || 0;
      summary.by_provider[row.provider].operations += parseInt(row.provider_operations) || 0;

      // Group by operation
      if (!summary.by_operation[row.operation]) {
        summary.by_operation[row.operation] = { cost: 0, tokens: 0, operations: 0 };
      }
      summary.by_operation[row.operation].cost += parseFloat(row.provider_cost) || 0;
      summary.by_operation[row.operation].tokens += parseInt(row.provider_tokens) || 0;
      summary.by_operation[row.operation].operations += parseInt(row.provider_operations) || 0;
    }

    return summary;
  }

  async getTenantUsageSummary(tenantId: string, fromDate?: string, toDate?: string): Promise<{
    total_cost: number;
    total_tokens: number;
    total_operations: number;
    by_provider: Record<string, { cost: number; tokens: number; operations: number }>;
    by_operation: Record<string, { cost: number; tokens: number; operations: number }>;
    daily_trends: Array<{ date: string; cost: number; tokens: number; operations: number }>;
  }> {
    let dateFilter = '';
    const params: any[] = [tenantId];
    let paramIndex = 1;

    if (fromDate && toDate) {
      dateFilter = `AND created_at BETWEEN $${++paramIndex} AND $${++paramIndex}`;
      params.push(fromDate, toDate);
    }

    const { rows } = await this.pool.query(
      `SELECT 
        COALESCE(SUM(cost_total_usd), 0) as total_cost,
        COALESCE(SUM(usage_total_tokens), 0) as total_tokens,
        COUNT(*) as total_operations,
        provider,
        operation,
        COALESCE(SUM(cost_total_usd), 0) as provider_cost,
        COALESCE(SUM(usage_total_tokens), 0) as provider_tokens,
        COUNT(*) as provider_operations,
        DATE(created_at) as date,
        COALESCE(SUM(cost_total_usd), 0) as daily_cost,
        COALESCE(SUM(usage_total_tokens), 0) as daily_tokens,
        COUNT(*) as daily_operations
       FROM agent_master_ai_usage 
       WHERE tenant_id = $1 ${dateFilter}
       GROUP BY provider, operation, DATE(created_at)
       ORDER BY date ASC`,
      params
    );

    const summary = {
      total_cost: 0,
      total_tokens: 0,
      total_operations: 0,
      by_provider: {} as Record<string, { cost: number; tokens: number; operations: number }>,
      by_operation: {} as Record<string, { cost: number; tokens: number; operations: number }>,
      daily_trends: [] as Array<{ date: string; cost: number; tokens: number; operations: number }>
    };

    const dailyMap = new Map<string, { cost: number; tokens: number; operations: number }>();

    for (const row of rows) {
      summary.total_cost += parseFloat(row.total_cost) || 0;
      summary.total_tokens += parseInt(row.total_tokens) || 0;
      summary.total_operations += parseInt(row.total_operations) || 0;

      // Group by provider
      if (!summary.by_provider[row.provider]) {
        summary.by_provider[row.provider] = { cost: 0, tokens: 0, operations: 0 };
      }
      summary.by_provider[row.provider].cost += parseFloat(row.provider_cost) || 0;
      summary.by_provider[row.provider].tokens += parseInt(row.provider_tokens) || 0;
      summary.by_provider[row.provider].operations += parseInt(row.provider_operations) || 0;

      // Group by operation
      if (!summary.by_operation[row.operation]) {
        summary.by_operation[row.operation] = { cost: 0, tokens: 0, operations: 0 };
      }
      summary.by_operation[row.operation].cost += parseFloat(row.provider_cost) || 0;
      summary.by_operation[row.operation].tokens += parseInt(row.provider_tokens) || 0;
      summary.by_operation[row.operation].operations += parseInt(row.provider_operations) || 0;

      // Daily trends
      if (row.date) {
        const date = row.date;
        if (!dailyMap.has(date)) {
          dailyMap.set(date, { cost: 0, tokens: 0, operations: 0 });
        }
        const daily = dailyMap.get(date)!;
        daily.cost += parseFloat(row.daily_cost) || 0;
        daily.tokens += parseInt(row.daily_tokens) || 0;
        daily.operations += parseInt(row.daily_operations) || 0;
      }
    }

    // Convert daily map to array
    summary.daily_trends = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      ...data
    }));

    return summary;
  }

  async deleteByConversation(conversationId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM agent_master_ai_usage WHERE conversation_id = $1`,
      [conversationId]
    );
  }
}

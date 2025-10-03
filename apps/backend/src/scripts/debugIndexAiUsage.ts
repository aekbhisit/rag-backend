import 'dotenv/config';

async function main() {
  const { indexAiUsage } = await import('../adapters/search/aiUsageLogService');

  const tenantId = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000';
  const now = new Date();
  const start = new Date(now.getTime() - 500);
  const doc = {
    tenant_id: tenantId,
    operation: 'generate',
    provider: 'openai',
    model: 'gpt-4o',
    start_time: start.toISOString(),
    end_time: now.toISOString(),
    latency_ms: 500,
    usage: {
      input_tokens: 1200,
      cached_input_tokens: 200,
      output_tokens: 300,
      total_tokens: 1500,
    },
    pricing: {
      input_per_1k: 0.0025,
      cached_input_per_1k: 0.00125,
      output_per_1k: 0.01,
      version: 'debug',
      source: 'tenant',
    },
    cost: {
      input_usd: 0.0025 + 0.00025, // 1000 non-cached + 200 cached
      output_usd: 0.003,           // 300 output
      total_usd: 0.00575,
      currency: 'USD',
      source: 'computed',
    },
    context_ids: [],
    imported_at: now.toISOString(),
  } as any;

  await indexAiUsage(doc);
  console.log('Indexed ai_usage sample for tenant', tenantId);
}

main().catch((e) => { console.error(e); process.exit(1); });



import { getPostgresPool } from '../adapters/db/postgresClient';
import { AiPricingRepository } from '../repositories/aiPricingRepository';

async function main() {
  const tenantId = process.env.TENANT_ID || '00000000-0000-0000-0000-000000000000';
  const repo = new AiPricingRepository(getPostgresPool());

  // OpenAI pricing (example, adjust to your current contract):
  // Helper to convert per-1M USD to per-1K USD
  const per1M = (usd: number | null | undefined) => (usd == null ? null : usd / 1000);

  // New models (prices per 1M tokens)
  const models: Array<{ model: string; input?: number | null; cached?: number | null; output?: number | null; }>
    = [
      { model: 'gpt-5', input: 1.25, cached: 0.125, output: 10.00 },
      { model: 'gpt-5-mini', input: 0.25, cached: 0.025, output: 2.00 },
      { model: 'gpt-5-nano', input: 0.05, cached: 0.005, output: 0.40 },
      { model: 'gpt-5-chat-latest', input: 1.25, cached: 0.125, output: 10.00 },
      { model: 'gpt-4.1', input: 2.00, cached: 0.50, output: 8.00 },
      { model: 'gpt-4.1-mini', input: 0.40, cached: 0.10, output: 1.60 },
      { model: 'gpt-4.1-nano', input: 0.10, cached: 0.025, output: 0.40 },
      { model: 'gpt-4o', input: 2.50, cached: 1.25, output: 10.00 },
      { model: 'gpt-4o-2024-05-13', input: 5.00, cached: null, output: 15.00 },
      { model: 'gpt-4o-audio-preview', input: 2.50, cached: null, output: 10.00 },
      { model: 'gpt-4o-realtime-preview', input: 5.00, cached: 2.50, output: 20.00 },
      { model: 'gpt-4o-mini', input: 0.15, cached: 0.075, output: 0.60 },
      { model: 'gpt-4o-mini-audio-preview', input: 0.15, cached: null, output: 0.60 },
      { model: 'gpt-4o-mini-realtime-preview', input: 0.60, cached: 0.30, output: 2.40 },
    ];

  for (const m of models) {
    await repo.upsert(tenantId, {
      provider: 'openai',
      model: m.model,
      input_per_1k: per1M(m.input) || null,
      cached_input_per_1k: per1M(m.cached) || null,
      output_per_1k: per1M(m.output) || null,
      embedding_per_1k: null,
      currency: 'USD',
      version: '2025-08-16',
      is_active: true,
    });
  }

  // text-embedding-3-small: $0.02 / 1M (0.00002 / 1K)
  await repo.upsert(tenantId, {
    provider: 'openai',
    model: 'text-embedding-3-small',
    input_per_1k: null,
    output_per_1k: null,
    embedding_per_1k: 0.00002,
    currency: 'USD',
    version: '2025-08-16',
    is_active: true,
  });

  console.log('Seeded AI pricing for tenant', tenantId);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });



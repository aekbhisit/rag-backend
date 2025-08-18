import { Router } from 'express';
import { AiUsageRepository } from '../../repositories/aiUsageRepository';
import { topExpensive, aggregateSummary } from '../../adapters/search/aiUsageLogService';
import { getPostgresPool } from '../../adapters/db/postgresClient';

function rangeToDates(range?: string): { from?: string; to?: string } {
  if (!range) return {};
  const to = new Date();
  const from = new Date();
  switch (range) {
    case '7d': from.setDate(to.getDate() - 7); break;
    case '30d': from.setDate(to.getDate() - 30); break;
    case '90d': from.setDate(to.getDate() - 90); break;
    case '1y': from.setFullYear(to.getFullYear() - 1); break;
    default: return {};
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function buildAiUsageRouter() {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const range = typeof req.query.range === 'string' ? req.query.range : undefined;
      const { from, to } = rangeToDates(range);
      const model = typeof req.query.model === 'string' ? req.query.model : undefined;
      const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
      const operation = typeof req.query.operation === 'string' ? req.query.operation : undefined;
      const requestId = typeof req.query.request_id === 'string' ? req.query.request_id : undefined;
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const size = Math.min(Math.max(Number(req.query.size || 20), 1), 500);
      const page = Math.max(Number(req.query.page || 1), 1);
      const sortBy = typeof req.query.sort_by === 'string' ? req.query.sort_by : 'start_time';
      const sortDir = (typeof req.query.sort_dir === 'string' ? req.query.sort_dir : 'desc') as 'asc' | 'desc';
      const fromOffset = (page - 1) * size;
      const repo = new AiUsageRepository(getPostgresPool());
      const items = await repo.list(tenantId, { from, to, model, provider, operation, q, requestId, limit: size, offset: fromOffset, sortBy, sortDir });
      const total = await repo.count(tenantId, { from, to, model, provider, operation, q, requestId });
      const summary = from && to ? await repo.summary(tenantId, from, to) : { totalCost: 0, totalTokens: 0, byModel: [], byProvider: [], byOperation: [] } as any;
      // Enrich summary with trends and top expensive
      let trends: any = { costTrend: [], tokenTrend: [] };
      let top: any[] = [];
      if (from && to) {
        trends = await aggregateSummary({ tenantId, from, to });
        top = await topExpensive({ tenantId, from, to, limit: 10 });
      }
      res.json({ items, page, size, total, summary: { ...summary, ...trends }, top_expensive: top });
    } catch (e) { next(e); }
  });

  return router;
}



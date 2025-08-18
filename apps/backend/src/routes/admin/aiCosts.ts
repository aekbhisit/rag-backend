import { Router } from 'express';
import { aggregateSummary, topExpensive } from '../../adapters/search/aiUsageLogService';

function rangeToDates(range: string): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  switch (range) {
    case '7d': from.setDate(to.getDate() - 7); break;
    case '90d': from.setDate(to.getDate() - 90); break;
    case '1y': from.setFullYear(to.getFullYear() - 1); break;
    case '30d': default: from.setDate(to.getDate() - 30); break;
  }
  return { from: from.toISOString(), to: to.toISOString() };
}

export function buildAiCostsRouter() {
  const router = Router();

  router.get('/summary', async (req, res) => {
    const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
    const range = typeof req.query.range === 'string' ? req.query.range : '7d';
    const model = typeof req.query.model === 'string' ? req.query.model : undefined;
    const provider = typeof req.query.provider === 'string' ? req.query.provider : undefined;
    const topPage = Math.max(Number(req.query.top_page || 1), 1);
    const topSize = Math.min(Math.max(Number(req.query.top_size || 10), 1), 100);
    const topSortBy = typeof req.query.top_sort_by === 'string' ? req.query.top_sort_by : 'cost_total_usd';
    const topSortDir = (typeof req.query.top_sort_dir === 'string' ? req.query.top_sort_dir : 'desc') as 'asc' | 'desc';
    const { from, to } = rangeToDates(range);
    // Pre-aggregated summary from ai_usage to avoid heavy future queries
    const summary = await aggregateSummary({ tenantId, from, to, model, provider });
    const expensive = await topExpensive({ tenantId, from, to, limit: topSize, offset: (topPage-1)*topSize, sortBy: topSortBy, sortDir: topSortDir });
    res.json({ summary, topExpensive: expensive, topPage, topSize });
  });

  return router;
}



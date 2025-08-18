import { Router } from 'express';

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

export function buildCostsRouter() {
  const router = Router();

  router.get('/summary', async (req, res) => {
    // Deprecated: previously fetched from Langfuse. Now replaced by /api/admin/ai-costs/summary.
    return res.status(410).json({ error: 'DEPRECATED', message: 'Use /api/admin/ai-costs/summary' });
  });

  return router;
}



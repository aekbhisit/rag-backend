import { Router } from 'express';
import type { Pool } from 'pg';
import { ErrorLogsRepository } from '../../repositories/errorLogsRepository';

export function buildErrorLogsRouter(pool: Pool) {
  const repo = new ErrorLogsRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const page = Math.max(Number(req.query.page || 1), 1);
      const size = Math.min(Math.max(Number(req.query.size || 20), 1), 200);
      const offset = (page - 1) * size;
      const items = await repo.list(tenantId, { limit: size, offset });
      const { rows } = await (repo as any).pool.query(`SELECT COUNT(*)::int AS cnt FROM error_logs WHERE tenant_id=$1`, [tenantId]);
      const total = (rows[0]?.cnt as number) || 0;
      res.json({ items, total, page, size });
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const row = await repo.get(tenantId, req.params.id);
      if (!row) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json(row);
    } catch (e) { next(e); }
  });

  return router;
}



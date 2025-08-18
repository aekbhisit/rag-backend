import { Router } from 'express';
import type { Pool } from 'pg';
import { QueryLogsRepository } from '../../repositories/queryLogsRepository';

export function buildLogsRouter(pool: Pool) {
  const repo = new QueryLogsRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const page = Math.max(Number(req.query.page || 1), 1);
      const size = Math.min(Math.max(Number(req.query.size || 20), 1), 200);
      const offset = (page - 1) * size;
      const items = await repo.list(tenantId, { limit: size, offset });
      // total count
      const { rows } = await (repo as any).pool.query(`SELECT COUNT(*)::int AS cnt FROM query_logs WHERE tenant_id=$1`, [tenantId]);
      const total = (rows[0]?.cnt as number) || 0;
      res.json({ items, total, page, size });
    } catch (e) { next(e); }
  });

  return router;
}



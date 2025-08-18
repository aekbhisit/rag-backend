import { Router } from 'express';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { AiPricingRepository } from '../../repositories/aiPricingRepository';

export function buildAiPricingRouter() {
  const router = Router();
  const repo = new AiPricingRepository(getPostgresPool());

  router.get('/', async (_req, res, next) => {
    try {
      const items = await repo.list();
      res.json({ items });
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const created = await repo.upsert(tenantId, req.body);
      res.status(201).json(created);
    } catch (e) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const updated = await repo.upsert(tenantId, { ...(req.body || {}), id: req.params.id });
      res.json(updated);
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const ok = await repo.delete(tenantId, req.params.id);
      res.json({ ok });
    } catch (e) { next(e); }
  });

  return router;
}



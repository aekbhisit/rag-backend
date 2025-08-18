import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { IntentsRepository } from '../../repositories/intentsRepository';

const CreateIntentSchema = z.object({
  scope: z.string().min(1),
  action: z.string().min(1),
  description: z.string().optional(),
});

export function buildIntentsRouter(pool: Pool) {
  const repo = new IntentsRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const items = await repo.list(tenantId, { q, limit: 100 });
      res.json({ items, total: items.length });
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const item = await repo.get(tenantId, id);
      if (!item) return res.status(404).json({ message: 'Not found' });
      res.json(item);
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input = CreateIntentSchema.parse(req.body);
      const created = await repo.create(tenantId, input);
      res.status(201).json(created);
    } catch (e) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const PatchSchema = CreateIntentSchema.partial();
      const patch = PatchSchema.parse(req.body);
      const updated = await repo.update(tenantId, id, patch);
      if (!updated) return res.status(404).json({ message: 'Not found' });
      res.json(updated);
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const ok = await repo.delete(tenantId, id);
      res.status(ok ? 204 : 404).end();
    } catch (e) { next(e); }
  });

  router.post('/:id/merge', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const TargetSchema = z.object({ targetId: z.string().uuid() });
      const { targetId } = TargetSchema.parse(req.body);
      const result = await repo.merge(tenantId, id, targetId);
      res.json(result);
    } catch (e) { next(e); }
  });

  return router;
}



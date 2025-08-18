import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { ContextOverridesRepository } from '../../repositories/contextOverridesRepository';

const CreateOverrideSchema = z.object({
  context_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  instruction_delta: z.string().optional(),
});

export function buildOverridesRouter(pool: Pool) {
  const repo = new ContextOverridesRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const contextId = typeof req.query.context_id === 'string' ? req.query.context_id : undefined;
      const items = await repo.list(tenantId, contextId);
      res.json({ items, total: items.length });
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input = CreateOverrideSchema.parse(req.body);
      const created = await repo.create(tenantId, {
        context_id: input.context_id,
        profile_id: input.profile_id,
        instruction_delta: input.instruction_delta ?? null,
      });
      res.status(201).json(created);
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const ok = await repo.delete(tenantId, req.params.id);
      res.status(ok ? 204 : 404).end();
    } catch (e) { next(e); }
  });

  return router;
}



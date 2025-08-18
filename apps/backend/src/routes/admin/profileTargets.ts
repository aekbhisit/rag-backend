import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { ProfileTargetsRepository } from '../../repositories/profileTargetsRepository';

const TargetSchema = z.object({
  profile_id: z.string().uuid(),
  intent_scope: z.string().optional().nullable(),
  intent_action: z.string().optional().nullable(),
  channel: z.string().optional(),
  user_segment: z.string().optional(),
  priority: z.number().int().optional(),
});

export function buildProfileTargetsRouter(pool: Pool) {
  const repo = new ProfileTargetsRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const items = await repo.list(tenantId);
      res.json({ items, total: items.length });
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input = TargetSchema.parse(req.body);
      const saved = await repo.upsert(tenantId, input as any);
      res.status(201).json(saved);
    } catch (e) { next(e); }
  });

  router.delete('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input = TargetSchema.parse(req.body);
      const ok = await repo.delete(tenantId, input as any);
      res.status(ok ? 204 : 404).end();
    } catch (e) { next(e); }
  });

  return router;
}



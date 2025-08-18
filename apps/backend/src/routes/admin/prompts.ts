import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { PromptsRepository } from '../../repositories/promptsRepository';
import { QueryLogsRepository } from '../../repositories/queryLogsRepository';

export function buildPromptsRouter(pool: Pool) {
  const repo = new PromptsRepository(pool);
  const logsRepo = new QueryLogsRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const items = await repo.list(tenantId, { query: q, limit: 200 });
      res.json({ items, total: items.length });
    } catch (e) { next(e); }
  });

  const CreateSchema = z.object({
    key: z.string().min(1),
    name: z.string().min(1),
    template: z.string().min(1),
    description: z.string().nullable().optional(),
    is_default: z.boolean().optional(),
  });

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const input = CreateSchema.parse(req.body || {});
      const created = await repo.create(tenantId, { id: randomUUID(), ...input });
      if (input.is_default) {
        await repo.setDefault(tenantId, created.id);
      }
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'CREATE',
          resource: 'prompt',
          resourceId: created.id,
          details: `Created prompt ${created.key}`,
          request: { body: req.body },
          response: { id: created.id },
        });
      } catch {}
      res.status(201).json(created);
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

  router.put('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const PatchSchema = CreateSchema.partial();
      const patch = PatchSchema.parse(req.body || {});
      const updated = await repo.update(tenantId, id, patch);
      if (updated && patch.is_default === true) {
        await repo.setDefault(tenantId, id);
      }
      if (!updated) return res.status(404).json({ message: 'Not found' });
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'UPDATE',
          resource: 'prompt',
          resourceId: id,
          details: `Updated prompt ${updated.key}`,
          request: { body: req.body },
          response: { id },
        });
      } catch {}
      res.json(updated);
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const id = req.params.id;
      const ok = await repo.delete(tenantId, id);
      if (!ok) return res.status(404).json({ message: 'Not found' });
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'DELETE',
          resource: 'prompt',
          resourceId: id,
          details: `Deleted prompt ${id}`,
          request: { params: req.params },
          response: { id },
        });
      } catch {}
      res.status(204).end();
    } catch (e) { next(e); }
  });

  return router;
}



import { Router } from 'express';
import type { Pool } from 'pg';
import { TenantsRepository } from '../../repositories/tenantsRepository';
import { z } from 'zod';
import { QueryLogsRepository } from '../../repositories/queryLogsRepository';

export function buildSettingsRouter(pool: Pool) {
  const repo = new TenantsRepository(pool);
  const logsRepo = new QueryLogsRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const tenant = await repo.get(tenantId);
      if (!tenant) return res.status(404).json({ message: 'Tenant not found' });
      res.json({ tenant: { id: tenant.id, name: tenant.name, settings: tenant.settings || {} } });
    } catch (e) { next(e); }
  });

  router.put('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const schema = z.object({
        name: z.string().min(1).optional(),
        settings: z.record(z.any()).optional(),
      });
      const body = schema.parse(req.body || {});
      const updated = await repo.update(tenantId, body);
      if (!updated) return res.status(404).json({ message: 'Tenant not found' });
      // Audit: settings update
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'SETTINGS_UPDATE',
          resource: 'settings',
          resourceId: updated.id,
          details: 'Updated tenant settings',
          request: { body: req.body },
          response: { id: updated.id },
        });
      } catch {}
      res.json({ tenant: { id: updated.id, name: updated.name, settings: updated.settings || {} } });
    } catch (e) { next(e); }
  });

  return router;
}



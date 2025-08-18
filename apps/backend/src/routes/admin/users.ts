import { Router } from 'express';
import type { Pool } from 'pg';
import { UsersRepository } from '../../repositories/usersRepository';
import { QueryLogsRepository } from '../../repositories/queryLogsRepository';
import { z } from 'zod';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import bcrypt from 'bcryptjs';

export function buildUsersRouter(pool: Pool) {
  const repo = new UsersRepository(pool);
  const logsRepo = new QueryLogsRepository(pool);
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const page = Math.max(Number(req.query.page || 1), 1);
      const size = Math.min(Math.max(Number(req.query.size || 20), 1), 200);
      const offset = (page - 1) * size;
      const items = await repo.list(tenantId);
      const total = items.length;
      const pageItems = items.slice(offset, offset + size);
      res.json({ items: pageItems, total, page, size });
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const item = await repo.getById(tenantId, req.params.id);
      if (!item) return res.status(404).json({ message: 'Not found' });
      res.json({ item });
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const schema = z.object({
        name: z.string().trim().min(1).optional(),
        email: z.string().trim().email(),
        role: z.enum(['admin','operator','viewer']),
        status: z.enum(['active','inactive','pending']),
        password: z.string().min(6).optional(),
      });
      const { name, email, role, status, password } = schema.parse(req.body || {});
      const created = await repo.create(tenantId, { name, email, role, status });
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(`UPDATE users SET password_hash=$3 WHERE tenant_id=$1 AND id=$2`, [tenantId, created.id, hash]);
      }
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'CREATE',
          resource: 'user',
          resourceId: created.id,
          details: `Created user ${created.email}`,
          request: { body: req.body },
          response: { id: created.id },
        });
      } catch {}
      res.status(201).json({ item: created });
    } catch (e: any) {
      if (e?.code === '23505') {
        return res.status(409).json({ message: 'Email already exists' });
      }
      next(e);
    }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      const schema = z.object({
        name: z.string().trim().min(1).optional(),
        email: z.string().trim().email().optional(),
        role: z.enum(['admin','operator','viewer']).optional(),
        status: z.enum(['active','inactive','pending']).optional(),
        password: z.string().min(6).optional(),
      });
      const parsed = schema.parse(req.body || {});
      const { password, ...rest } = parsed as any;
      const updated = await repo.update(tenantId, req.params.id, rest);
      if (updated && password) {
        const hash = await bcrypt.hash(password, 10);
        await pool.query(`UPDATE users SET password_hash=$3 WHERE tenant_id=$1 AND id=$2`, [tenantId, req.params.id, hash]);
      }
      if (!updated) return res.status(404).json({ message: 'Not found' });
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'UPDATE',
          resource: 'user',
          resourceId: req.params.id,
          details: `Updated user ${updated.email}`,
          request: { body: req.body },
          response: { id: req.params.id },
        });
      } catch {}
      res.json({ item: updated });
    } catch (e: any) {
      if (e?.code === '23505') {
        return res.status(409).json({ message: 'Email already exists' });
      }
      next(e);
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = (req.header('X-Tenant-ID') || '00000000-0000-0000-0000-000000000000').toString();
      await repo.remove(tenantId, req.params.id);
      try {
        await logsRepo.create(tenantId, {
          userId: (req as any).userId || null,
          action: 'DELETE',
          resource: 'user',
          resourceId: req.params.id,
          details: `Deleted user ${req.params.id}`,
          request: { params: req.params },
          response: { id: req.params.id },
        });
      } catch {}
      res.status(204).send();
    } catch (e) { next(e); }
  });

  return router;
}



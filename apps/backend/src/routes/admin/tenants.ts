import { Router } from 'express';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { TenantsRepository } from '../../repositories/tenantsRepository';

export function buildTenantsRouter() {
  const router = Router();
  const repo = new TenantsRepository(getPostgresPool());

  router.get('/', async (_req, res, next) => {
    try { res.json({ items: await repo.list() }); } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const t = await repo.get(req.params.id);
      if (!t) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json(t);
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const name = String(req.body?.name || '').trim();
      const code = (req.body?.code ?? '').toString().trim() || null;
      const slug = (req.body?.slug ?? '').toString().trim() || null;
      const contact_email = (req.body?.contact_email ?? '').toString().trim() || null;
      const is_active = typeof req.body?.is_active === 'boolean' ? req.body.is_active : true;
      const settings = (req.body?.settings ?? null);
      if (!name) return res.status(400).json({ error: 'NAME_REQUIRED' });
      const created = await repo.create({ name, code, slug, contact_email, is_active, settings });
      res.status(201).json(created);
    } catch (e) { next(e); }
  });

  router.put('/:id', async (req, res, next) => {
    try {
      const id = req.params.id;
      const patch: any = {};
      if ('name' in req.body) patch.name = req.body.name;
      if ('slug' in req.body) patch.slug = req.body.slug;
      if ('contact_email' in req.body) patch.contact_email = req.body.contact_email;
      if ('is_active' in req.body) patch.is_active = req.body.is_active;
      if ('settings' in req.body) patch.settings = req.body.settings;
      const updated = await repo.update(id, patch);
      if (!updated) return res.status(404).json({ error: 'NOT_FOUND' });
      res.json(updated);
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const ok = await repo.delete(req.params.id);
      res.json({ ok });
    } catch (e) { next(e); }
  });

  return router;
}



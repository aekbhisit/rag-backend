import { Router } from 'express';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { SessionsRepository } from '../../repositories/sessionsRepository';
import { getTenantIdFromReq } from '../../config/tenant';

export function buildSessionsRouter(_pool: Pool) {
  const router = Router();
  const repo = new SessionsRepository(getPostgresPool());

  router.get('/', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const page = Math.max(Number(req.query.page || 1), 1);
      const size = Math.min(Math.max(Number(req.query.size || 50), 1), 200);
      const userId = typeof req.query.user_id === 'string' ? req.query.user_id : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;
      const channel = typeof req.query.channel === 'string' ? req.query.channel : undefined;
      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;
      const sort = typeof req.query.sort === 'string' ? req.query.sort : 'started_at';
      const order = (typeof req.query.order === 'string' ? req.query.order : 'desc') as 'asc' | 'desc';

      const { items, total } = await repo.list(tenantId, { userId, status, channel, from, to }, page, size, sort, order);
      res.json({ items, total, page, size });
    } catch (e) { next(e); }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const row = await repo.getById(tenantId, id);
      if (!row) return res.status(404).json({ message: 'Not found' });
      return res.json(row);
    } catch (e) { next(e); }
  });

  router.post('/', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const { user_id, channel, status, meta } = req.body || {};
      if (!channel) return res.status(400).json({ error: 'Missing channel' });
      const row = await repo.create({ tenant_id: tenantId, user_id, channel, status, meta });
      return res.status(201).json(row);
    } catch (e) { next(e); }
  });

  router.post('/:id/end', async (req, res, next) => {
    try {
      // Try to get tenant ID from header first, then from body (for sendBeacon compatibility)
      let tenantId = getTenantIdFromReq(req);
      if (!tenantId && req.body && req.body.tenantId) {
        tenantId = req.body.tenantId;
      }
      if (!tenantId) {
        return res.status(400).json({ error: 'Missing tenant ID' });
      }
      
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      await repo.end(tenantId, id);
      return res.json({ ok: true });
    } catch (e) { next(e); }
  });

  router.get('/:id/messages', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const page = Math.max(Number(req.query.page || 1), 1);
      const size = Math.min(Math.max(Number(req.query.size || 100), 1), 500);
      const sort = (typeof req.query.sort === 'string' ? req.query.sort : 'asc') as 'asc' | 'desc';
      const data = await repo.listMessages(tenantId, id, page, size, sort);
      return res.json({ ...data, page, size });
    } catch (e) { next(e); }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const id = req.params.id;
      if (!id) return res.status(400).json({ error: 'Missing id' });
      
      // Check if session exists first
      const session = await repo.getById(tenantId, id);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
      
      await repo.delete(tenantId, id);
      return res.json({ ok: true });
    } catch (e) { next(e); }
  });

  router.post('/cleanup', async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const hoursOld = Number(req.body?.hoursOld || 24);
      const endedCount = await repo.endOldSessions(tenantId, hoursOld);
      return res.json({ ok: true, endedCount });
    } catch (e) { next(e); }
  });

  return router;
}



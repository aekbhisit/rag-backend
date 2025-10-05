import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';
import { SessionsRepository } from '../../repositories/sessionsRepository';
import { enhancedRateLimiters } from '../../middleware/rateLimiter';
import { jwtAuthMiddleware } from '../../middleware/jwtAuth';

export function buildPublicSessionsRouter(pool?: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();
  const repo = new SessionsRepository(pg);

  // Optional JWT (if provided), otherwise continue anonymous
  router.use(jwtAuthMiddleware as any);

  // User/IP based rate limiting for session ops
  const rateLimit = enhancedRateLimiters.userBased({
    windowMs: 60_000,
    maxRequests: 60,
    message: 'Rate limit exceeded',
  } as any);

  // POST /api/sessions - create a public session (returns UUID)
  router.post('/sessions', rateLimit, async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const CreateSchema = z.object({
        channel: z.string().default('web'),
        status: z.string().optional(),
        meta: z.record(z.any()).optional(),
      });
      const input = CreateSchema.parse(req.body || {});

      const userId = (req as any).user?.userId || null;
      const row = await repo.create({
        tenant_id: tenantId,
        user_id: userId,
        channel: input.channel,
        status: input.status,
        meta: input.meta,
      });

      return res.status(201).json(row);
    } catch (e) { next(e); }
  });

  // POST /api/sessions/:id/end - end a public session (UUID only)
  router.post('/sessions/:id/end', rateLimit, async (req, res, next) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      const id = req.params.id;
      if (!z.string().uuid().safeParse(id).success) {
        return res.status(400).json({ error: 'Invalid session id format' });
      }
      await repo.end(tenantId, id);
      return res.json({ ok: true });
    } catch (e) { next(e); }
  });

  return router;
}



import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';
import { SessionsRepository } from '../../repositories/sessionsRepository';

export function buildPublicMessagesRouter(pool?: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();

  // POST /api/messages - log conversation messages
  router.post('/messages', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      
      // Validate request body
      const MessageSchema = z.object({
        session_id: z.string().min(1),
        role: z.enum(['user', 'assistant', 'system']),
        type: z.enum(['text', 'image', 'audio', 'system']),
        content: z.string().min(1),
        channel: z.string().optional(),
        meta: z.record(z.any()).optional(),
      });
      
      const input = MessageSchema.parse(req.body);

      // Resolve or create a valid session_id (UUID)
      const sessionsRepo = new SessionsRepository(pg);
      const rawSessionId = input.session_id;
      const isUuid = z.string().uuid().safeParse(rawSessionId).success;
      let sessionId = rawSessionId;

      if (!isUuid) {
        const newSession = await sessionsRepo.create({
          tenant_id: tenantId,
          user_id: null,
          channel: input.channel || 'web',
          status: 'active',
          meta: { created_from: 'messages_api', original_session_id: rawSessionId },
        });
        sessionId = newSession.id;
      }

      // Debug: verify resolved session id
      // Note: safe to log here, no PII; helps verify sanitization behavior
      console.log('Messages route session resolution', { rawSessionId, isUuid, sessionId });
      
      // Insert message into database
      const { rows } = await pg.query(
        `INSERT INTO messages (
          tenant_id, session_id, role, type, content, meta, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, created_at`,
        [
          tenantId,
          sessionId,
          input.role,
          input.type,
          input.content,
          JSON.stringify({
            ...input.meta,
            channel: input.channel || 'web'
          })
        ]
      );
      
      res.status(201).json({
        id: rows[0].id,
        created_at: rows[0].created_at,
        status: 'logged',
        session_id: sessionId,
      });
      
    } catch (error) {
      console.error('Error logging message:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten()
        });
      }
      
      res.status(500).json({
        error: 'Failed to log message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

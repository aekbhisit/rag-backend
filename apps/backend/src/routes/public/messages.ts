import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';

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
      
      // Use session_id as provided (simplified for now)
      const sessionId = input.session_id;
      
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
        status: 'logged'
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

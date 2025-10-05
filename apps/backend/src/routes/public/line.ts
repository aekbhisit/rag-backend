import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';
import { SessionsRepository } from '../../repositories/sessionsRepository';

export function buildPublicLineRouter(pool?: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();

  // POST /api/line/push - push LINE messages
  router.post('/line/push', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      
      // Validate request body
      const LinePushSchema = z.object({
        text: z.string().min(1),
        user_id: z.string().optional(),
        channel: z.string().optional().default('line'),
        metadata: z.record(z.any()).optional(),
      });
      
      const input = LinePushSchema.parse(req.body);
      
      // Get LINE configuration for tenant
      const configResult = await pg.query(
        `SELECT settings FROM tenants WHERE id = $1`,
        [tenantId]
      );
      
      if (configResult.rows.length === 0) {
        return res.status(404).json({
          error: 'Tenant not found'
        });
      }
      
      const tenantSettings = configResult.rows[0].settings;
      const lineConfig = tenantSettings?.line || {};
      
      // Check if LINE is configured
      if (!lineConfig.channel_access_token || !lineConfig.channel_secret) {
        return res.status(400).json({
          error: 'LINE integration not configured for this tenant'
        });
      }
      
      // Resolve or create a valid chat session (UUID)
      const sessionsRepo = new SessionsRepository(pg);
      const session = await sessionsRepo.create({
        tenant_id: tenantId,
        user_id: input.user_id || null,
        channel: input.channel || 'line',
        status: 'active',
        meta: { created_from: 'line_push' },
      });

      // Log to database
      await pg.query(
        `INSERT INTO messages (
          tenant_id, session_id, role, type, content, meta, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          tenantId,
          session.id,
          'assistant',
          'text',
          input.text,
          JSON.stringify({
            ...input.metadata,
            channel: input.channel,
            line_user_id: input.user_id,
            pushed_at: new Date().toISOString()
          })
        ]
      );
      
      res.json({
        status: 'pushed',
        message: 'Message pushed to LINE successfully',
        session_id: session.id,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error pushing LINE message:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten()
        });
      }
      
      res.status(500).json({
        error: 'Failed to push LINE message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

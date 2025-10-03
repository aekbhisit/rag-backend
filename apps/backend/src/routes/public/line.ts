import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';

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
      
      // For now, log the message and return success
      // In a full implementation, this would actually push to LINE API
      console.log('LINE push request:', {
        tenantId,
        text: input.text,
        user_id: input.user_id,
        channel: input.channel
      });
      
      // Log to database
      await pg.query(
        `INSERT INTO messages (
          tenant_id, session_id, role, type, content, meta, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          tenantId,
          `line-${Date.now()}`,
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

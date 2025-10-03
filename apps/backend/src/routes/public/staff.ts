import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';

export function buildPublicStaffRouter(pool?: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();

  // GET /api/staff/availability - check staff availability
  router.get('/staff/availability', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      
      // Get staff availability status
      // For now, return a simple availability check
      // In a full implementation, this would check actual staff schedules
      const availabilityResult = await pg.query(
        `SELECT COUNT(*) as active_staff FROM staff_sessions 
         WHERE tenant_id = $1 AND status = 'active' AND expires_at > NOW()`,
        [tenantId]
      );
      
      const activeStaff = parseInt(availabilityResult.rows[0]?.active_staff || '0');
      const isAvailable = activeStaff > 0;
      
      res.json({
        available: isAvailable,
        active_staff: activeStaff,
        estimated_wait_time: isAvailable ? 0 : 5, // minutes
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error checking staff availability:', error);
      
      // Return unavailable on error
      res.json({
        available: false,
        active_staff: 0,
        estimated_wait_time: 10,
        error: 'Service temporarily unavailable',
        timestamp: new Date().toISOString()
      });
    }
  });

  // POST /api/staff/messages - send message to staff
  router.post('/staff/messages', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      
      // Validate request body
      const StaffMessageSchema = z.object({
        message: z.string().min(1),
        user_id: z.string().optional(),
        session_id: z.string().optional(),
        priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
        metadata: z.record(z.any()).optional(),
      });
      
      const input = StaffMessageSchema.parse(req.body);
      
      // Create staff message session if not exists
      const sessionId = input.session_id || `staff-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      
      // Log staff message
      await pg.query(
        `INSERT INTO messages (
          tenant_id, session_id, role, type, content, meta, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          tenantId,
          sessionId,
          'user',
          'text',
          input.message,
          JSON.stringify({
            ...input.metadata,
            channel: 'staff',
            user_id: input.user_id,
            priority: input.priority,
            staff_message: true
          })
        ]
      );
      
      // Create or update staff session
      await pg.query(
        `INSERT INTO staff_sessions (
          tenant_id, session_id, status, created_at, expires_at
        ) VALUES ($1, $2, 'pending', NOW(), NOW() + INTERVAL '30 minutes')
        ON CONFLICT (tenant_id, session_id) 
        DO UPDATE SET 
          status = 'pending',
          expires_at = NOW() + INTERVAL '30 minutes',
          updated_at = NOW()`,
        [tenantId, sessionId]
      );
      
      res.json({
        status: 'queued',
        session_id: sessionId,
        estimated_wait_time: 5, // minutes
        message: 'Message sent to staff successfully',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error sending staff message:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten()
        });
      }
      
      res.status(500).json({
        error: 'Failed to send staff message',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}

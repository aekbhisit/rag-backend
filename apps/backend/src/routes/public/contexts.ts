import { Router } from 'express';
import { z } from 'zod';
import type { Pool } from 'pg';
import { getPostgresPool } from '../../adapters/db/postgresClient';
import { getTenantIdFromReq } from '../../config/tenant';

export function buildPublicContextsRouter(pool?: Pool) {
  const router = Router();
  const pg = pool || getPostgresPool();

  // POST /api/contexts/import - import contexts (public version)
  router.post('/contexts/import', async (req, res) => {
    try {
      const tenantId = getTenantIdFromReq(req);
      
      // Validate request body - simplified version of admin import
      const ImportSchema = z.object({
        type: z.enum(['place', 'text', 'product', 'website', 'ticket', 'document']),
        category: z.string().min(1),
        title: z.string().min(1),
        content: z.string().min(1),
        metadata: z.record(z.any()).optional(),
        lat: z.number().optional(),
        long: z.number().optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        website: z.string().optional(),
        images: z.array(z.string()).optional(),
      });
      
      const input = ImportSchema.parse(req.body);
      
      // Validate category exists
      const categoryResult = await pg.query(
        `SELECT id FROM categories WHERE tenant_id = $1 AND (slug = $2 OR name ILIKE $2)`,
        [tenantId, input.category]
      );
      
      if (categoryResult.rows.length === 0) {
        return res.status(400).json({
          error: 'Category not found',
          category: input.category
        });
      }
      
      const categoryId = categoryResult.rows[0].id;
      
      // Create context
      const { rows } = await pg.query(
        `INSERT INTO contexts (
          tenant_id, type, category_id, title, content, metadata,
          lat, long, address, phone, website, images, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active', NOW())
        RETURNING id, created_at`,
        [
          tenantId,
          input.type,
          categoryId,
          input.title,
          input.content,
          JSON.stringify(input.metadata || {}),
          input.lat || null,
          input.long || null,
          input.address || null,
          input.phone || null,
          input.website || null,
          JSON.stringify(input.images || []),
        ]
      );
      
      res.status(201).json({
        id: rows[0].id,
        created_at: rows[0].created_at,
        status: 'imported',
        type: input.type,
        category: input.category
      });
      
    } catch (error) {
      console.error('Error importing context:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid request body',
          details: error.flatten()
        });
      }
      
      res.status(500).json({
        error: 'Failed to import context',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}
